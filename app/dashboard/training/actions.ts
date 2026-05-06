'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });


async function calculateWorkoutStreak(supabase: any, userId: string) {
    // Fetch unified history (independent and classes)
    const [
        { data: workouts },
        { data: classResults },
        { data: checkins }
    ] = await Promise.all([
        supabase.from('workouts').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        supabase.from('class_results').select('date_performed').eq('user_id', userId).order('date_performed', { ascending: false }).limit(100),
        supabase.from('daily_checkins').select('checkin_date').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(100)
    ]);

    const allDates = [
        ...(workouts || []).map((w: any) => new Date(w.created_at).toISOString().split('T')[0]),
        ...(classResults || []).map((c: any) => new Date(c.date_performed).toISOString().split('T')[0]),
        ...(checkins || []).map((ch: any) => ch.checkin_date)
    ];

    // Unique dates and sort descending
    const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => b.localeCompare(a));

    if (uniqueDates.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // If no workout today or yesterday, streak is 0 (broken)
    // Note: If they haven't worked out yet today, streak is still alive from yesterday
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let streak = 0;
    // Start checking from the most recent workout date
    let currentCheckDate = new Date(uniqueDates[0]);

    for (const dateStr of uniqueDates) {
        const date = new Date(dateStr);
        const diffMs = currentCheckDate.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 1) {
            streak++;
            currentCheckDate = date;
        } else {
            break;
        }
    }

    return streak;
}

import { getMonday } from '@/utils/date'

export async function getMissions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const currentWeekStart = getMonday();
    const weekStartDate = new Date(currentWeekStart);

    // 1-4. Batch all history and mission queries in parallel
    const [
        { data: missions, error: missionsError },
        { data: userMissions, error: progressError },
        { data: workoutsThisWeek },
        { data: classesThisWeek },
        realStreak
    ] = await Promise.all([
        supabase.from('missions').select('*'),
        supabase.from('user_missions').select('*').eq('user_id', user.id).eq('week_start', currentWeekStart),
        supabase.from('workouts').select('total_volume_kg, created_at').eq('user_id', user.id).gte('created_at', weekStartDate.toISOString()),
        supabase.from('class_results').select('date_performed').eq('user_id', user.id).gte('date_performed', weekStartDate.toISOString()),
        calculateWorkoutStreak(supabase, user.id)
    ]);

    if (missionsError || !missions) {
        console.error('Error fetching missions:', missionsError)
        return []
    }

    if (progressError) {
        console.error('Error fetching user progress:', progressError)
    }

    // 5. Merge and update missions
    const finalMissions = []
    const missionsToUpsert = []
    const xpUpdates = []

    // 3. ACTUAL SYNC: Calculate real sessions and volume for this week to fix any sync issues
    const realSessionsCount = (workoutsThisWeek?.length || 0) + (classesThisWeek?.length || 0);
    const realTotalVolume = (workoutsThisWeek || []).reduce((acc: number, w: any) => acc + (Number(w.total_volume_kg) || 0), 0);

    for (const mission of missions) {
        const progress = userMissions?.find(um => um.mission_id === mission.id)
        let currentValue = progress?.current_value || 0;

        // Auto-sync for sessions and volume
        if (mission.goal_type === 'sessions_count' || mission.goal_type === 'workouts') {
            currentValue = realSessionsCount;
        } else if (mission.goal_type === 'volume_kg' || mission.goal_type === 'volume') {
            currentValue = realTotalVolume;
        } else if (mission.goal_type === 'streak') {
            currentValue = realStreak;
        }

        // If DB is out of sync or mission just completed, update it
        const isCompleted = currentValue >= mission.goal_value;
        const needsUpdate = currentValue !== (progress?.current_value || 0) || (isCompleted && !progress?.is_completed);

        if (needsUpdate) {
            missionsToUpsert.push({
                user_id: user.id,
                mission_id: mission.id,
                current_value: currentValue,
                is_completed: isCompleted,
                completed_at: isCompleted ? (progress?.completed_at || new Date().toISOString()) : null,
                week_start: currentWeekStart
            });

            if (isCompleted && (!progress || !progress.is_completed)) {
                xpUpdates.push(mission.xp_reward);
            }
        }

        finalMissions.push({
            ...mission,
            current_value: currentValue,
            is_completed: isCompleted
        });
    }

    // Perform batched updates
    if (missionsToUpsert.length > 0) {
        await supabase
            .from('user_missions')
            .upsert(missionsToUpsert, { onConflict: 'user_id,mission_id,week_start' });
    }

    if (xpUpdates.length > 0) {
        const totalXp = xpUpdates.reduce((acc, xp) => acc + xp, 0);
        await supabase.rpc('increment_xp', { amount: totalXp, profile_id: user.id });
    }

    return finalMissions;
}

export async function updateMissionProgress(userId: string, type: 'volume_kg' | 'sessions_count' | 'social_interactions', amount: number) {
    const supabase = await createClient()

    // Verify the caller is authenticated and only updates their own progress
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) return

    // 1. Find relevant missions
    const { data: relevantMissions } = await supabase
        .from('missions')
        .select('id, goal_value, xp_reward')
        .eq('goal_type', type)

    if (!relevantMissions) return

    const currentWeekStart = getMonday();

    for (const mission of relevantMissions) {
        // 2. Upsert progress
        const { data: existingProgress } = await supabase
            .from('user_missions')
            .select('*')
            .eq('user_id', userId)
            .eq('mission_id', mission.id)
            .eq('week_start', currentWeekStart)
            .single()

        if (existingProgress) {
            if (existingProgress.is_completed) continue

            const newValue = existingProgress.current_value + amount
            const isCompleted = newValue >= mission.goal_value

            await supabase
                .from('user_missions')
                .update({
                    current_value: newValue,
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date().toISOString() : null
                })
                .eq('id', existingProgress.id)

            if (isCompleted) {
                await supabase.rpc('increment_xp', { amount: mission.xp_reward, profile_id: userId })
            }
        } else {
            const isCompleted = amount >= mission.goal_value
            await supabase
                .from('user_missions')
                .insert({
                    user_id: userId,
                    mission_id: mission.id,
                    current_value: amount,
                    is_completed: isCompleted,
                    completed_at: isCompleted ? new Date().toISOString() : null,
                    week_start: currentWeekStart
                })

            if (isCompleted) {
                await supabase.rpc('increment_xp', { amount: mission.xp_reward, profile_id: userId })
            }
        }
    }
}

export async function saveWorkout(workoutData: any) {
    const supabase = await createClient()

    // 1. Get Current User
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) {
        return { error: 'Unauthorized' }
    }

    // 1.5 SELF-HEALING: Ensure Profile Exists
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

    if (!profile) {
        console.log("Profile missing for user, attempting self-healing...");
        const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            username: user.email?.split('@')[0] || 'user_' + Math.floor(Math.random() * 1000),
            full_name: user.user_metadata?.full_name || 'Agente Desconocido',
            avatar_url: user.user_metadata?.avatar_url || '',
        });
        if (profileError) {
            console.error("Failed to recover profile:", profileError);
            return { error: 'Critical: User profile missing and could not be created. ' + profileError.message };
        }
    }

    // 2. Insert or Update Workout Header
    let workout;
    let workoutError;

    if (workoutData.id) {
        // Update mode
        const { data, error } = await supabase
            .from('workouts')
            .update({
                title: workoutData.title || 'Untitled Session',
                end_time: new Date().toISOString(),
                duration_seconds: workoutData.duration,
                effort_rpe: workoutData.rpe,
                location_name: workoutData.locationName || null,
                sport_type: workoutData.sportType || 'fitness',
                metrics: workoutData.metrics || null,
                is_guided: workoutData.isGuided || false,
            })
            .eq('id', workoutData.id)
            .eq('user_id', user.id)
            .select()
            .single();
        workout = data;
        workoutError = error;

        // Delete old sets to replace them
        if (!workoutError) {
            await supabase.from('workout_sets').delete().eq('workout_id', workoutData.id);
        }
    } else {
        // Insert mode
        const { data, error } = await supabase
            .from('workouts')
            .insert({
                user_id: user.id,
                title: workoutData.title || 'Untitled Session',
                start_time: workoutData.startTime,
                end_time: new Date().toISOString(),
                duration_seconds: workoutData.duration,
                effort_rpe: workoutData.rpe,
                location_name: workoutData.locationName || null,
                sport_type: workoutData.sportType || 'fitness',
                metrics: workoutData.metrics || null,
                is_guided: workoutData.isGuided || false,
            })
            .select()
            .single();
        workout = data;
        workoutError = error;
    }

    if (workoutError) {
        console.error('SERVER ACTION ERROR: saving workout header:', workoutError)
        return { error: 'Error al guardar el entrenamiento. Intenta de nuevo.' }
    }

    if (!workout) {
        return { error: 'Failed to create workout header - no data returned' }
    }

    // 3. Prepare Sets Data and Detect PRs
    const setsToInsert = []
    let totalVolume = 0
    let sessionMaxWeight = 0
    let hasAtLeastOnePR = false
    const prAchievements: any[] = []

    // Fetch existing PRs for these exercises
    const exerciseNames = [...new Set(workoutData.exercises.map((ex: any) => ex.name))]
    // Correct query: get max weights for each exercise for THIS user
    const { data: maxWeights } = await supabase
        .from('workout_sets')
        .select(`
            exercise_name,
            weight_kg,
            workouts!inner(user_id)
        `)
        .eq('workouts.user_id', user.id)
        .in('exercise_name', exerciseNames)
        .order('weight_kg', { ascending: false })

    const prMap: Record<string, number> = {}
    if (maxWeights) {
        maxWeights.forEach((set: any) => {
            if (!prMap[set.exercise_name] || set.weight_kg > prMap[set.exercise_name]) {
                prMap[set.exercise_name] = set.weight_kg
            }
        })
    }

    for (const exercise of workoutData.exercises) {
        if (!exercise.name) continue; // Skip if no name

        const currentExerciseMax = prMap[exercise.name] || 0
        let maxWeightInSessionForExercise = 0
        let isExercisePR = false

        for (const set of exercise.sets) {
            // Safeguard values
            const weight = parseFloat(set.weight) || 0
            const reps = parseInt(set.reps) || 0
            const setOrder: number = parseInt(set.order) || (setsToInsert.length + 1)

            totalVolume += weight * reps
            if (weight > sessionMaxWeight) sessionMaxWeight = weight
            if (weight > maxWeightInSessionForExercise) maxWeightInSessionForExercise = weight

            const isSetPR = weight > currentExerciseMax
            if (isSetPR) {
                isExercisePR = true
                hasAtLeastOnePR = true
            }

            setsToInsert.push({
                workout_id: workout.id,
                exercise_name: exercise.name,
                set_order: setOrder,
                weight_kg: weight,
                reps: reps,
                is_pr: isSetPR
            })
        }

        if (isExercisePR && currentExerciseMax > 0) {
            prAchievements.push({
                name: exercise.name,
                previousMax: currentExerciseMax,
                newMax: maxWeightInSessionForExercise,
                improvement: maxWeightInSessionForExercise - currentExerciseMax
            })
        }
    }

    // 5. Insert All Sets
    if (setsToInsert.length > 0) {
        const { error: insertError } = await supabase
            .from('workout_sets')
            .insert(setsToInsert)

        if (insertError) {
            console.error('SERVER ACTION ERROR: saving workout sets:', insertError)
            return { error: 'Failed to save workout sets: ' + insertError.message }
        }

        // UPDATE WORKOUT WITH MAX WEIGHT AND VOLUME
        await supabase
            .from('workouts')
            .update({
                total_volume_kg: totalVolume,
                max_weight_kg: sessionMaxWeight,
                is_pr: hasAtLeastOnePR
            })
            .eq('id', workout.id);
    }

    // 5. Update Missions
    await updateMissionProgress(user.id, 'sessions_count', 1)
    if (totalVolume > 0) {
        await updateMissionProgress(user.id, 'volume_kg', totalVolume)
    }

    // NEW: Update Skill Stats & Fatigue Index
    try {
        const { data: currentStats } = await supabase
            .from('profiles')
            .select('power_stat, endurance_stat, agility_stat, consistency_stat')
            .eq('id', user.id)
            .single();

        if (currentStats) {
            // Power: derived from max weight
            const powerGain = Math.floor(sessionMaxWeight / 50) || 1;
            // Endurance: derived from volume/duration
            const enduranceGain = Math.floor(totalVolume / 500) || 1;
            // Agility: based on sport type
            const agilityGain = (workoutData.sportType?.toLowerCase().includes('cross') || workoutData.sportType?.toLowerCase().includes('function')) ? 3 : 1;

            await supabase
                .from('profiles')
                .update({
                    power_stat: (currentStats.power_stat || 0) + powerGain,
                    endurance_stat: (currentStats.endurance_stat || 0) + enduranceGain,
                    agility_stat: (currentStats.agility_stat || 0) + agilityGain,
                    consistency_stat: (currentStats.consistency_stat || 0) + 1
                })
                .eq('id', user.id);

            // Calculate Fatigue Index (RPE and Duration based)
            const rpe = parseFloat(workoutData.rpe) || 5;
            const durationMin = (workoutData.duration || 0) / 60;
            const fatigueIndex = (rpe * 0.7) + (durationMin * 0.3); // Simple heuristic

            await supabase
                .from('workouts')
                .update({ fatigue_index: fatigueIndex })
                .eq('id', workout.id);
        }
    } catch (err) {
        console.error("Error updating skills/fatigue:", err);
    }

    // 6. AUTO-POST to Community Feed & Stories
    const isNewWorkout = !workoutData.id;
    const shouldPostToArena = workoutData.shareToArena || (isNewWorkout && workoutData.shareToArena !== false);
    const shouldPostToStory = workoutData.shareToStory;

    if (shouldPostToArena || shouldPostToStory) {
        // Use user's caption if provided, otherwise null (will show just the workout details)
        const finalCaption = workoutData.caption || null;

        // 6a. Post to Arena (Feed)
        if (shouldPostToArena) {
            await supabase
                .from('posts')
                .insert({
                    user_id: user.id,
                    workout_id: workout.id,
                    caption: finalCaption,
                    media_url: workoutData.imageUrl || null,
                    media_type: workoutData.mediaType || 'image',
                });
        }

        // 6b. Post to Stories
        if (shouldPostToStory && workoutData.imageUrl) {
            await supabase
                .from('stories')
                .insert({
                    user_id: user.id,
                    media_url: workoutData.imageUrl,
                    media_type: workoutData.mediaType || 'image',
                    duration_seconds: 15,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    metadata: {
                        type: 'workout',
                        workout_id: workout.id,
                        caption: finalCaption,
                        summary: {
                            title: workoutData.title,
                            sportType: workoutData.sportType,
                            duration: workoutData.duration,
                            metrics: workoutData.metrics,
                            exercises: workoutData.exercises
                        }
                    }
                });
        }
    }

    // 7. Give XP Points for completion
    await supabase.rpc('increment_xp', { amount: 100, profile_id: user.id });

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard/training')
    return { success: true, prAchievements }
}

export async function uploadWorkoutMedia(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const file = formData.get('file') as File
    if (!file) return { error: 'No file provided' }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
        .from('posts')
        .upload(fileName, file)

    if (error) {
        return { error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
}

export async function getExercises(sport: string | null | undefined = 'gym') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('exercises_catalog')
        .select('*')
        .order('name', { ascending: true })

    const gymExercises = [
        { name: 'Abdominal Crunches', muscle_group: 'Core', video_url: 'https://www.youtube.com/watch?v=Xyd_fa5zoEU' },
        { name: 'Adductor Machine', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=FfC5WzM9Fxo' },
        { name: 'Abductor Machine', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=Um5s7yF3djk' },
        { name: 'Arnold Press', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=3tOj07f4_e4' },
        { name: 'Back Extension', muscle_group: 'Posterior Chain', video_url: 'https://www.youtube.com/watch?v=ph3pddpKzzw' },
        { name: 'Barbell Bicep Curl', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=kwG2ipFRgfo' },
        { name: 'Barbell Row', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=G8l_8chR5BE' },
        { name: 'Barbell Shrug', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=M2ygZ46vYUE' },
        { name: 'Bench Press', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
        { name: 'Bulgarian Split Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=2C-uNgKwPLE' },
        { name: 'Cable Crossover', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=taI4XduLpTk' },
        { name: 'Cable Face Pull', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=V8dZqdIdeCc' },
        { name: 'Cable Lateral Raise', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=lq7eLC30b9w' },
        { name: 'Cable Tricep Pushdown', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=2-LAMcpzODU' },
        { name: 'Calf Raise (Seated)', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=JbyjNymZOt0' },
        { name: 'Calf Raise (Standing)', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=YMmgqO8Jo-k' },
        { name: 'Chest Fly (Machine)', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=Z57CtFmRMkA' },
        { name: 'Chest Press (Machine)', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=xUm0BiZCWlQ' },
        { name: 'Chin Up', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=brhRXlOhsAM' },
        { name: 'Deadlift', muscle_group: 'Posterior Chain', video_url: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
        { name: 'Dip', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=2z8DdDvMcXc' },
        { name: 'Dumbbell Bicep Curl', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo' },
        { name: 'Dumbbell Chest Fly', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=eozdVDA78K0' },
        { name: 'Dumbbell Incline Bench Press', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=8iPEnn-ltC8' },
        { name: 'Dumbbell Lateral Raise', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=3VcKaXpzqRo' },
        { name: 'Dumbbell Press (Seated)', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=qEwKCR5JCog' },
        { name: 'Dumbbell Row', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=pYcpY20QaE8' },
        { name: 'Dumbbell Shoulder Press', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=qEwKCR5JCog' },
        { name: 'Front Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=HHxN6GMdphE' },
        { name: 'Hack Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=0tn5K9NlCfo' },
        { name: 'Hammer Curl', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=zC3nLlEvin4' },
        { name: 'Hip Thrust', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=SEdqd1n0cvg' },
        { name: 'Incline Bench Press', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=SrqOu55lrJU' },
        { name: 'Lat Pulldown', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=CAwf7n6Luuc' },
        { name: 'Leg Curl (Lying)', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs' },
        { name: 'Leg Curl (Seated)', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=OrxowZ4GTts' },
        { name: 'Leg Extension', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=YyvSfVjQeL0' },
        { name: 'Leg Press', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ' },
        { name: 'Lunge (Dumbbell)', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=D7KaRcUTQeE' },
        { name: 'Military Press', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=2yjwXTZQDDI' },
        { name: 'Pec Deck', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=eOrL2YjP75I' },
        { name: 'Preacher Curl', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=fIWP-FRFNU0' },
        { name: 'Pull Up', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
        { name: 'Push Up', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=IODxDxX7oi4' },
        { name: 'Romanian Deadlift', muscle_group: 'Posterior Chain', video_url: 'https://www.youtube.com/watch?v=JCXUYuzwNrM' },
        { name: 'Seated Row (Cable)', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=GZbfZ033f74' },
        { name: 'Shoulder Press (Machine)', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=Wp4BlxcFTkE' },
        { name: 'Skull Crusher', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=d_KZxkY_0cM' },
        { name: 'Smith Machine Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=dFzUj0zW8dM' },
        { name: 'Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=MVMh0HiJCXQ' },
        { name: 'T-Bar Row', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=j3Igk5nyZE4' },
        { name: 'Tricep Extension (Overhead)', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=nRiJVZDpdL0' },
    ];

    const crossTrainingExercises = [
        { name: 'Air Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=rMCN4HlgSCA' }, // WODprep
        { name: 'Assault Bike', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=OBrX2Y6qfVc' }, // Assault Fitness
        { name: 'Back Parallel Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=UltWZBBL8p4' }, // CrossFit (reliable)
        { name: 'Back Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=UltWZBBL8p4' }, // CrossFit (reliable)
        { name: 'Bar Muscle Up', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=OCMJj10G1QM' }, // WODprep
        { name: 'Bar Facing Burpee', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=TU8QYVW0gDU' }, // CrossFit
        { name: 'Bench Press', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=SCVCLChPQFY' }, // CrossFit
        { name: 'Box Jump', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=bxVzL0gq0-0' }, // WODprep
        { name: 'Box Jump Over', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=bxVzL0gq0-0' }, // WODprep
        { name: 'Burpee', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=0h09e-7T8rI' }, // WODprep
        { name: 'Burpee Box Jump Over', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=bxVzL0gq0-0' }, // WODprep
        { name: 'Chest to Bar Pull Up', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=Pr1ieGZ5atk' }, // Misfit
        { name: 'Clean', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=KzW315a6b7Y' }, // CrossFit
        { name: 'Clean & Jerk', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=TjGZ9T3Fj_M' }, // Catalyst Athletics
        { name: 'Deadlift', muscle_group: 'Posterior Chain', video_url: 'https://www.youtube.com/watch?v=op9kVnSso6Q' }, // CrossFit
        { name: 'Devil Press', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=XX1f3r6Hqco' }, // CrossFit
        { name: 'Double Under', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=h3C5lX5-y-U' }, // WODprep
        { name: 'Dumbbell Snatch', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=9520DJiFmvE' }, // CrossFit
        { name: 'Echo Bike', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=rXjE3n6eCgE' }, // Rogue
        { name: 'Front Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=uYumuL_G_V0' }, // CrossFit
        { name: 'GHD Sit Up', muscle_group: 'Core', video_url: 'https://www.youtube.com/watch?v=1t22r4g7hJs' }, // CrossFit
        { name: 'Goblet Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=MeIiIdhvXT4' }, // CrossFit
        { name: 'Handstand Push Up', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=_L-e07eXw9s' }, // CrossFit
        { name: 'Handstand Walk', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=d_k6k3k5e5k' }, // CrossFit
        { name: 'Hang Clean', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=wc4IqM2Pjts' }, // CrossFit
        { name: 'Hang Snatch', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=b4N3d0x2QVY' }, // CrossFit
        { name: 'Kettlebell Swing', muscle_group: 'Posterior Chain', video_url: 'https://www.youtube.com/watch?v=v1Z3R3Cp2yw' }, // CrossFit
        { name: 'Lunges', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U' }, // CrossFit
        { name: 'Muscle Up', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=vSa4O6r3T4k' }, // CrossFit
        { name: 'Overhead Squat', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=pn8mqlG0nkE' }, // CrossFit
        { name: 'Pistol Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=qDcniqddTeE' }, // CrossFit
        { name: 'Power Clean', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=KwYJTpQ_x5A' }, // CrossFit
        { name: 'Power Snatch', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=TL8SMp7PsnA' }, // CrossFit
        { name: 'Pull Up', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=HRV5YKKaeVw' }, // WODprep
        { name: 'Push Jerk', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=V-MEmyJd8bU' }, // CrossFit
        { name: 'Push Press', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=X6-DMh-t4nQ' }, // CrossFit
        { name: 'Ring Muscle Up', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=vSa4O6r3T4k' }, // CrossFit
        { name: 'Rope Climb', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=F3G1jioK6J0' }, // CrossFit
        { name: 'Row', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=H0r_Z7p7b_k' }, // Concept2
        { name: 'Run', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=_kGEMtdqbHQ' }, // Global Triathlon (Good form)
        { name: 'Ski Erg', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=4T1f-F2_Bzo' }, // Concept2
        { name: 'Snatch', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=_T0wvtkaonk' }, // WODprep
        { name: 'Strict Press', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=5yWaNOvgFCM' }, // CrossFit
        { name: 'Sumo Deadlift High Pull', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=gh57d7zO6kI' }, // CrossFit
        { name: 'Thruster', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=aea5Z9-FzXg' }, // WODprep
        { name: 'Toes to Bar', muscle_group: 'Core', video_url: 'https://www.youtube.com/watch?v=_03p6QPB3gQ' }, // WODprep
        { name: 'Wall Ball', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=LpS_S-m8zMg' }, // CrossFit (verified)
        { name: 'Walking Lunge', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=L8fvMqT8o2M' }, // CrossFit
        { name: 'Weighted Pull Up', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=HRV5YKKaeVw' }, // WODprep
    ];

    const ocrExercises = [
        { name: 'Rope Climb', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=F3G1jioK6J0' },
        { name: 'Dead Hang', muscle_group: 'Grip', video_url: 'https://www.youtube.com/watch?v=KR16M5Tttxc' },
        { name: 'Monkey Bars', muscle_group: 'Grip', video_url: 'https://www.youtube.com/watch?v=WvzKQrFEvv0' }, // Tutorial Spartan Race
        { name: 'Wall Climb', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=Yp1Y7oREI2M' },
        { name: 'Spear Throw', muscle_group: 'Skill', video_url: 'https://www.youtube.com/watch?v=GPhKEYDOIV8' },
        { name: 'Sandbag Carry', muscle_group: 'Legs/Core', video_url: 'https://www.youtube.com/watch?v=Uq1u-8kIn1A' },
        { name: 'Bucket Carry', muscle_group: 'Legs/Grip', video_url: 'https://www.youtube.com/watch?v=_u_Xv7Rz9f0' },
        { name: 'Atlas Stone Carry', muscle_group: 'Strongman', video_url: 'https://www.youtube.com/watch?v=go0WMsBSN6w' },
        { name: 'Sled Push', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=S7bU_-v9eR0' },
        { name: 'Sled Pull', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=S7bU_-v9eR0' },
        { name: 'Burpee Broad Jump', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=UTO-GzRXF-Q' },
        { name: 'Bear Crawl', muscle_group: 'Core', video_url: 'https://www.youtube.com/watch?v=qTfL-2jJ98g' },
        { name: 'Z Wall Traverse', muscle_group: 'Grip/Balance', video_url: 'https://www.youtube.com/watch?v=vSa4O6r3T4k' },
        { name: 'Tyre Flip', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=6Yt-XmXf_zM' },
        { name: 'Log Carry', muscle_group: 'Strongman', video_url: 'https://www.youtube.com/watch?v=zT37o9rO984' },
        { name: 'Trail Run Interval', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=_kGEMtdqbHQ' },
        { name: 'Farmers Carry', muscle_group: 'Grip', video_url: 'https://www.youtube.com/watch?v=NH7Xv-7NQNQ' },
        { name: 'Sandbag Lunges', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=J3m67m_O0-I' },
        { name: 'Barbed Wire Crawl', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=R3nNndV7Oas' },
        { name: 'Hercules Hoist', muscle_group: 'Back/Grip', video_url: 'https://www.youtube.com/watch?v=G1iHr743oB8' },
        { name: 'Run', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=_kGEMtdqbHQ' },
    ];

    const hybridExercises = [
        { name: 'Ski Erg', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=4T1f-F2_Bzo' },
        { name: 'Sled Push', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=W0S8O-c85vM' },
        { name: 'Sled Pull', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=FqSgG2U-D8w' },
        { name: 'Burpee Broad Jump', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=52r_Ul5k03g' },
        { name: 'Row', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=H0r_Z7p7b_k' },
        { name: 'Farmers Carry', muscle_group: 'Grip', video_url: 'https://www.youtube.com/watch?v=Tgi5SNDbBZQ' },
        { name: 'Sandbag Lunges', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=MeIiIdhvXT4' },
        { name: 'Wall Balls', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=LpS_S-m8zMg' },
        { name: 'Run', muscle_group: 'Cardio', video_url: 'https://www.youtube.com/watch?v=_kGEMtdqbHQ' },
    ];

    const calisthenicsExercises = [
        { name: 'Muscle Up', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=f7w7fXWkI1k' },
        { name: 'Pull Up', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
        { name: 'Push Up', muscle_group: 'Chest', video_url: 'https://www.youtube.com/watch?v=IODxDxX7oi4' },
        { name: 'Dip', muscle_group: 'Arms', video_url: 'https://www.youtube.com/watch?v=2z8DdDvMcXc' },
        { name: 'Handstand Hold', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=_L-e07eXw9s' },
        { name: 'Pistol Squat', muscle_group: 'Legs', video_url: 'https://www.youtube.com/watch?v=qDcniqddTeE' },
        { name: 'Front Lever', muscle_group: 'Core/Back', video_url: 'https://www.youtube.com/watch?v=ym09f8xJqfQ' },
        { name: 'Back Lever', muscle_group: 'Full Body', video_url: 'https://www.youtube.com/watch?v=BqB3G5mOqZM' },
        { name: 'Planche Lean', muscle_group: 'Shoulders', video_url: 'https://www.youtube.com/watch?v=Vl3oKzXqM98' },
        { name: 'L-Sit', muscle_group: 'Core', video_url: 'https://www.youtube.com/watch?v=re310q5SgJE' },
        { name: 'Skin the Cat', muscle_group: 'Shoulders/Mobility', video_url: 'https://www.youtube.com/watch?v=5rXy1pPqf4I' },
        { name: 'Chin Up', muscle_group: 'Back', video_url: 'https://www.youtube.com/watch?v=brhRXlOhsAM' },
    ];

    // 'all' mode: merge every static list for the WOD creator search
    const allStaticLists = sport === 'all'
        ? [...gymExercises, ...crossTrainingExercises, ...calisthenicsExercises, ...ocrExercises, ...hybridExercises]
        : sport === 'ocr' ? ocrExercises
        : sport === 'hybrid' ? hybridExercises
        : sport === 'cross_training' ? crossTrainingExercises
        : sport === 'calisthenics' ? calisthenicsExercises
        : gymExercises;

    // Deduplicate static list by name
    const seenNames = new Set<string>();
    const targetList = allStaticLists.filter(ex => {
        const key = ex.name.toLowerCase();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
    });

    if (error) {
        console.error('Error fetching exercises:', error)
        return targetList.map((dummy, index) => ({ id: `static-${sport}-${index}`, ...dummy }));
    }

    // Merge and Deduplicate with Fallback for video_url
    const dbData = data || [];
    const dbNames = new Set(dbData.map((e: any) => e.name.toLowerCase()));

    // 1. Process DB Data, enriching with video_url if missing in DB but present in Static
    const enrichedDbData = dbData.map((dbEx: any) => {
        const staticEx = targetList.find(t => t.name.toLowerCase() === dbEx.name.toLowerCase());
        return {
            ...dbEx,
            video_url: dbEx.video_url || staticEx?.video_url || null
        };
    });

    // 2. Add missing exercises from Static
    const merged = [...enrichedDbData];
    targetList.forEach((ex, index) => {
        if (!dbNames.has(ex.name.toLowerCase())) {
            merged.push({ id: `static-${sport}-${index}`, ...ex });
        }
    });

    return merged.sort((a: any, b: any) => a.name.localeCompare(b.name));
}

// 8. Get Recent PRs (Unified)
export async function getRecentPRs() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // 1. Fetch Independent PRs
    const { data: independentPrs } = await supabase
        .from('workout_sets')
        .select(`
            exercise_name,
            weight_kg,
            created_at,
            workouts!inner(user_id)
        `)
        .eq('workouts.user_id', user.id)
        .eq('is_pr', true)
        .order('created_at', { ascending: false })
        .limit(3)

    // 2. Fetch Class Results (potentially PRs too)
    // For now, we'll just fetch latest class results and extract max weights as potential trophies
    const { data: classPrs } = await supabase
        .from('class_results')
        .select('data, date_performed')
        .eq('user_id', user.id)
        .order('date_performed', { ascending: false })
        .limit(3)

    const unifiedPrs: any[] = [
        ...(independentPrs || []).map(pr => ({
            exercise_name: pr.exercise_name,
            weight_kg: pr.weight_kg,
            created_at: pr.created_at
        }))
    ];

    classPrs?.forEach(c => {
        if (c.data && Array.isArray(c.data)) {
            c.data.forEach((block: any) => {
                if (block.type === 'weight' && block.exercises) {
                    block.exercises.forEach((ex: any) => {
                        if (parseFloat(ex.value) > 0) {
                            unifiedPrs.push({
                                exercise_name: ex.name || 'Ejercicio',
                                weight_kg: parseFloat(ex.value),
                                created_at: c.date_performed
                            });
                        }
                    });
                }
            });
        }
    });

    return unifiedPrs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
}

// 9. Get User Profile
export async function getUserProfile() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return profile
}

// 10. Schedule a Workout
export async function scheduleWorkout(data: { title: string, date: string, exercises: any[] }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('scheduled_workouts')
        .insert({
            user_id: user.id,
            title: data.title,
            scheduled_date: data.date,
            exercises: data.exercises
        })

    if (error) {
        console.error('Error scheduling workout:', error)
        return { error: 'Failed to schedule workout' }
    }

    revalidatePath('/dashboard/training')
    return { success: true }
}

export async function deleteScheduledWorkout(workoutId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('scheduled_workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user.id) // Security: only delete own workouts

    if (error) {
        console.error('Error deleting scheduled workout:', error)
        return { error: 'Failed to delete workout' }
    }

    revalidatePath('/dashboard/training')
    return { success: true }
}

export async function getPerformanceStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { daily: [], fatigue: 0 }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // 1. Fetch Independent Workouts
    const { data: workouts } = await supabase
        .from('workouts')
        .select('created_at, total_volume_kg, max_weight_kg, effort_rpe')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

    // 2. Fetch Class Results (WODs)
    const { data: classResults } = await supabase
        .from('class_results')
        .select('date_performed, data')
        .eq('user_id', user.id)
        .gte('date_performed', thirtyDaysAgo.toISOString())
        .order('date_performed', { ascending: true })

    // 3. Fetch WOD Completions (New System) - Simplified query to avoid join issues
    const { data: wodCompletions } = await supabase
        .from('wod_completions')
        .select('completed_at, weight_kg, completion_type, score, effort_rpe, original_wod_post_id')
        .eq('user_id', user.id)
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: true })

    // 4. Map and Unify stats
    const statsData: any[] = [
        ...(workouts || []).map(w => ({
            created_at: w.created_at,
            total_volume_kg: Number(w.total_volume_kg) || 0,
            max_weight_kg: Math.max(Number(w.max_weight_kg) || 0, 5), // Min 5 for visibility
            effort_rpe: Number(w.effort_rpe) || 0,
            session_type: 'gym',
            title: 'Entrenamiento'
        }))
    ];

    classResults?.forEach(c => {
        let maxW = 0;
        if (c.data && Array.isArray(c.data)) {
            c.data.forEach((block: any) => {
                if (block.type === 'weight' && block.exercises) {
                    block.exercises.forEach((ex: any) => {
                        const val = parseFloat(ex.value) || 0;
                        if (val > maxW) maxW = val;
                    });
                }
            });
        }
        statsData.push({
            created_at: c.date_performed,
            total_volume_kg: 0,
            max_weight_kg: Math.max(maxW, 10), // WODs usually have some weight or intensity
            effort_rpe: 8,
            session_type: 'class_result',
            title: 'WOD Centro'
        });
    });

    wodCompletions?.forEach(wc => {
        const weight = Number(wc.weight_kg) || 0;
        // Non-weight WODs get a simulated weight based on score or default
        const visualWeight = weight > 0 ? weight : (wc.completion_type === 'score' ? (Number(wc.score) / 5) : 15);
        
        statsData.push({
            created_at: wc.completed_at,
            total_volume_kg: 0,
            max_weight_kg: visualWeight,
            effort_rpe: wc.effort_rpe || 9,
            session_type: 'wod_completion',
            title: 'WOD Completado'
        });
    });

    // 5. Sort aggregated data
    statsData.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Calculate Fatigue Score (Simplified Heuristic)
    let fatigueScore = 15 
    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000))

    const recentSessions = statsData.filter(s => new Date(s.created_at) > fortyEightHoursAgo)
    const avgRpe = recentSessions.length > 0
        ? recentSessions.reduce((acc: number, s: any) => acc + (s.effort_rpe || 0), 0) / recentSessions.length
        : 0

    fatigueScore += statsData.length * 5 
    if (avgRpe > 7.5) fatigueScore += 20 
    if (statsData.length > 7) fatigueScore += 15 

    const consistencyBonus = Math.min(statsData.length * 2, 20);
    fatigueScore = Math.max(fatigueScore - consistencyBonus, 10);

    return {
        daily: statsData,
        fatigue: Math.min(fatigueScore, 100)
    }
}

export async function getGuidedWorkoutsCount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    // Get Monday of current week
    const now = new Date()
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_guided', true)
        .gte('created_at', startOfWeek.toISOString())

    if (error) {
        console.error('Error fetching guided workouts count:', error)
        return 0
    }

    return count || 0
}

// 12. Get Scheduled Workouts
export async function getScheduledWorkouts() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: scheduled } = await supabase
        .from('scheduled_workouts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .order('scheduled_date', { ascending: true })

    return scheduled || []
}

// 13. Get Detailed Analytics
export async function getDetailedAnalytics() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 0. Base dates
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    // 1. Muscle Group Distribution (Fetch both independent sets and class results)
    const { data: muscleStats } = await supabase
        .from('workout_sets')
        .select(`exercise_name, weight_kg, reps, workouts!inner(user_id)`)
        .eq('workouts.user_id', user.id)

    const { data: classResults } = await supabase
        .from('class_results')
        .select(`data, date_performed`)
        .eq('user_id', user.id)

    const { data: wodCompletions } = await supabase
        .from('wod_completions')
        .select(`weight_kg, completion_type, score, completed_at, notes`)
        .eq('user_id', user.id)

    const { data: catalog } = await supabase.from('exercises_catalog').select('name, muscle_group')

    const muscleGroups: Record<string, number> = {}
    
    // Process independent sets
    muscleStats?.forEach(set => {
        const exercise = catalog?.find(c => c.name === set.exercise_name)
        const group = exercise?.muscle_group || 'Other'
        const volume = (Number(set.weight_kg) || 0) * (Number(set.reps) || 0)
        muscleGroups[group] = (muscleGroups[group] || 0) + volume
    })

    // Process class results for volume
    classResults?.forEach(c => {
        if (c.data && Array.isArray(c.data)) {
            c.data.forEach((block: any) => {
                if (block.type === 'weight' && block.exercises) {
                    block.exercises.forEach((ex: any) => {
                        const weight = parseFloat(ex.value) || 0;
                        const reps = parseInt(ex.reps) || 1;
                        const catalogEx = catalog?.find(cat => cat.name.toLowerCase() === ex.name?.toLowerCase());
                        const group = catalogEx?.muscle_group || 'Other';
                        muscleGroups[group] = (muscleGroups[group] || 0) + (weight * reps);
                    });
                } else if (block.wod_weight) {
                    const weight = parseFloat(block.wod_weight) || 0;
                    const group = 'Other'; 
                    muscleGroups[group] = (muscleGroups[group] || 0) + weight;
                }
            });
        }
    })

    // Process wod completions for volume
    wodCompletions?.forEach(wc => {
        const weight = Number(wc.weight_kg) || 0;
        if (weight > 0) {
            muscleGroups['Other'] = (muscleGroups['Other'] || 0) + weight;
        }
    });

    // 2. PR History (Unified - Last 28 days)
    const { data: rawPrHistory } = await supabase
        .from('workout_sets')
        .select(`exercise_name, weight_kg, workouts!inner(user_id, created_at)`)
        .eq('workouts.user_id', user.id)
        .eq('is_pr', true)
        .gte('workouts.created_at', fourWeeksAgo.toISOString())
        .order('created_at', { referencedTable: 'workouts', ascending: false })

    const prHistory = rawPrHistory?.map((pr: any) => ({
        exercise_name: pr.exercise_name,
        weight_kg: pr.weight_kg,
        created_at: pr.workouts.created_at
    })) || []

    // Add potential class records
    classResults?.filter(c => new Date(c.date_performed) >= fourWeeksAgo).forEach(c => {
        if (c.data && Array.isArray(c.data)) {
            c.data.forEach((block: any) => {
                if (block.type === 'weight' && block.exercises) {
                    block.exercises.forEach((ex: any) => {
                        const val = parseFloat(ex.value) || 0;
                        if (val > 0) {
                            prHistory.push({
                                exercise_name: ex.name || 'Ejercicio',
                                weight_kg: val,
                                created_at: c.date_performed
                            });
                        }
                    });
                } else if (block.wod_weight) {
                    const val = parseFloat(block.wod_weight) || 0;
                    if (val > 0) {
                        prHistory.push({
                            exercise_name: 'WOD Weight',
                            weight_kg: val,
                            created_at: c.date_performed
                        });
                    }
                }
            });
        }
    });

    // Add potential WOD system records
    wodCompletions?.filter(wc => new Date(wc.completed_at) >= fourWeeksAgo).forEach(wc => {
        const weight = Number(wc.weight_kg) || 0;
        if (weight > 0) {
            prHistory.push({
                exercise_name: 'WOD PR',
                weight_kg: weight,
                created_at: wc.completed_at
            });
        }
    });

    // 3. Weekly Frequency (Unified)
    const { data: independentFreq } = await supabase
        .from('workouts')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', fourWeeksAgo.toISOString())

    const weeklyFreq = [0, 0, 0, 0] // [W-3, W-2, W-1, CurrentW]
    const now = new Date()

    independentFreq?.forEach(w => {
        const date = new Date(w.created_at)
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))
        const weekIndex = 3 - Math.floor(diffDays / 7)
        if (weekIndex >= 0 && weekIndex < 4) weeklyFreq[weekIndex]++
    })

    classResults?.filter(c => new Date(c.date_performed) >= fourWeeksAgo).forEach(c => {
        const date = new Date(c.date_performed)
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))
        const weekIndex = 3 - Math.floor(diffDays / 7)
        if (weekIndex >= 0 && weekIndex < 4) weeklyFreq[weekIndex]++
    })

    wodCompletions?.filter(wc => new Date(wc.completed_at) >= fourWeeksAgo).forEach(wc => {
        const date = new Date(wc.completed_at)
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))
        const weekIndex = 3 - Math.floor(diffDays / 7)
        if (weekIndex >= 0 && weekIndex < 4) weeklyFreq[weekIndex]++
    })

    // 4. Current Streak Calculation (Unified - reused logic or call helper)
    const streak = await calculateWorkoutStreak(supabase, user.id);

    return {
        muscleGroups,
        prHistory: prHistory.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
        weeklyFreq,
        streak,
        percentile: 85
    }
}


// 14. Get Workout History
export async function getWorkoutHistory(limit = 10, userId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Use provided userId or fallback to current user
    const targetUserId = userId || user?.id
    if (!targetUserId) return []

    // 1. Fetch Independent Workouts
    const { data: workouts, error: wError } = await supabase
        .from('workouts')
        .select(`
            *,
            workout_sets (*)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit)

    // 2. Fetch Class Results (WODs)
    const { data: classResults, error: cError } = await supabase
        .from('class_results')
        .select(`
            *,
            class:class_id (name, organization:organization_id (name))
        `)
        .eq('user_id', targetUserId)
        .order('date_performed', { ascending: false })
        .limit(limit)

    if (wError) console.error('Error fetching workouts:', wError)
    if (cError) console.error('Error fetching class results:', cError)

    // 3. Map and Unify structures
    const unifiedWorkouts = [
        ...(workouts || []).map(w => ({
            ...w,
            display_date: w.created_at,
            type: 'independent',
            title: w.title || 'Sesión de Entrenamiento'
        })),
        ...(classResults || []).map(c => {
            // Calculate max weight from class result data blocks
            let maxW = 0;
            if (c.data && Array.isArray(c.data)) {
                c.data.forEach((block: any) => {
                    if (block.type === 'weight' && block.exercises) {
                        block.exercises.forEach((ex: any) => {
                            const val = parseFloat(ex.value) || 0;
                            if (val > maxW) maxW = val;
                        });
                    } else if (block.wod_weight) {
                        const val = parseFloat(block.wod_weight) || 0;
                        if (val > maxW) maxW = val;
                    }
                });
            }

            return {
                ...c,
                display_date: c.date_performed,
                type: 'class_result',
                title: `WOD ${c.class?.organization?.name || 'Centro'}`,
                duration_seconds: 0,
                effort_rpe: 8,
                max_weight_kg: maxW,
                is_pr: false // This could be calculated by comparing with previous records if needed
            };
        })
    ];

    // 4. Sort and Limit
    return unifiedWorkouts
        .sort((a, b) => new Date(b.display_date).getTime() - new Date(a.display_date).getTime())
        .slice(0, limit);
}

// 15. Get Specific Workout Details
export async function getWorkoutDetails(workoutId: string) {
    const supabase = await createClient()
    const { data: workout, error } = await supabase
        .from('workouts')
        .select(`
            *,
            workout_sets (*),
            profiles (username, full_name, avatar_url)
        `)
        .eq('id', workoutId)
        .single()

    if (error) {
        console.error('Error fetching workout details:', error)
        return null
    }

    return workout
}
// 16. Get Exercise Previous Record
export async function getExercisePreviousRecord(exerciseName: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('workout_sets')
        .select(`
            weight_kg,
            reps,
            workouts!inner(user_id)
        `)
        .eq('workouts.user_id', user.id)
        .eq('exercise_name', exerciseName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error || !data) return null
    return `${data.weight_kg}kg x ${data.reps}`
}

// 17. Delete Workout
export async function deleteWorkout(workoutId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Delete associated feed post first (to avoid FK constraint issues)
    await supabase
        .from('posts')
        .delete()
        .eq('workout_id', workoutId)
        .eq('user_id', user.id)

    const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error deleting workout:', error)
        return { error: 'Failed to delete' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard/training/logs')
    return { success: true }
}
// 18. Get Published Class Results
export async function getPublishedResults(limit = 1) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('class_results')
        .select(`
            *,
            class:class_id (
                name,
                organization:organization_id (
                    name
                )
            )
        `)
        .eq('user_id', user.id)
        .order('date_performed', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching published results:', error)
        return []
    }

    return data
}

// 19. Delete Profile (Account Checkout)
export async function deleteProfile() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Deleting the profile will cascade to other tables (workouts, posts, etc)
    // as per our database cascade constraints.
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

    if (error) {
        console.error('Error al borrar el perfil:', error)
        return { error: 'Error al eliminar los datos del perfil' }
    }

    // Sign out the user
    await supabase.auth.signOut()

    return { success: true }
}

// --- NEW HEALTH & NUTRITION ACTIONS ---

export async function getHealthHistory(days: number = 7) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: true })
        .limit(days);

    if (error) console.error("Error fetching health history:", error);
    return data || [];
}

export async function getHealthMetrics() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') console.error("Error fetching health metrics:", error);
    return data;
}

export async function syncHealthData(metrics: { steps: number, sleep_hours: number, avg_hr: number }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Calculate recovery score based on HR and sleep
    // This is a simplified mock simulation
    const hrFactor = Math.max(0, 100 - (metrics.avg_hr - 50) * 1.5);
    const sleepFactor = Math.min(100, (metrics.sleep_hours / 8) * 100);
    const recoveryScore = Math.floor((hrFactor + sleepFactor) / 2);

    const { data, error } = await supabase
        .from('health_metrics')
        .insert({
            user_id: user.id,
            steps: metrics.steps,
            sleep_hours: metrics.sleep_hours,
            avg_hr: metrics.avg_hr,
            recovery_score: recoveryScore
        })
        .select()
        .single();

    if (error) return { error: error.message };
    return { success: true, data };
}


export async function getAIPredictions() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch recent workouts and fatigue
    const { data: recentWorkouts } = await supabase
        .from('workouts')
        .select('fatigue_index, effort_rpe, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

    // Fetch recent recovery
    const { data: health } = await supabase
        .from('health_metrics')
        .select('recovery_score, sleep_hours')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false })
        .limit(3);

    const avgFatigue = (recentWorkouts?.reduce((acc, w) => acc + (Number(w.fatigue_index) || 0), 0) || 0) / (recentWorkouts?.length || 1);
    const lastRecovery = health?.[0]?.recovery_score || null;

    if (lastRecovery === null) {
        return {
            recommendation: "Sincroniza tus datos de salud para recibir recomendaciones de la IA.",
            plan: "Esperando biometría...",
            fatigueLevel: "0",
            recoveryScore: 0
        };
    }

    let recommendation = "¡Listo para la acción! Tu recuperación es óptima.";
    let plan = "Sesión de alta intensidad recomendada.";

    if (avgFatigue > 7 && lastRecovery < 60) {
        recommendation = "Cuidado. Tu fatiga acumulada es alta y la recuperación baja.";
        plan = "Día de descanso activo o movilidad ligera.";
    } else if (avgFatigue > 5) {
        recommendation = "Nivel de carga moderado. Mantén la consistencia.";
        plan = "Entrenamiento de fuerza controlada.";
    }

    return {
        recommendation,
        plan,
        fatigueLevel: Math.min(10, avgFatigue).toFixed(1),
        recoveryScore: lastRecovery
    };
}

export async function addNewExercise(exercise: { name: string, muscle_group?: string, video_url?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Check if it already exists (case insensitive)
    const { data: existing } = await supabase
        .from('exercises_catalog')
        .select('id')
        .ilike('name', exercise.name)
        .maybeSingle();

    if (existing) return { success: true, data: existing, note: 'Already exists' };

    const { data, error } = await supabase
        .from('exercises_catalog')
        .insert({
            name: exercise.name,
            muscle_group: exercise.muscle_group || 'Otros',
            video_url: exercise.video_url || null
        })
        .select()
        .single();

    if (error) {
        console.error("Error adding new exercise:", error);
        return { error: error.message };
    }

    return { success: true, data };
}

export async function parseWodFromImage(base64Image: string) {
    try {
        const prompt = `
            Eres un experto en CrossFit y entrenamiento funcional. Tu tarea es analizar la imagen de una pizarra de entrenamiento (WOD) y extraer la estructura de ejercicios.
            
            Reglas de extracción:
            1. Identifica los bloques (ej. calentamiento, fuerza, WOD principal).
            2. Para cada bloque, identifica el formato (AMRAP, FOR TIME, EMOM, TABATA, etc).
            3. Extrae los ejercicios, repeticiones y detalles (pesos, notas).
            4. Si hay textos de descanso o separadores (como "4 min REST"), inclúyelos como tipo 'separator'.
            5. Si hay esquemas de reps (como "21-15-9"), inclúyelos como tipo 'scheme'.
            6. Devuelve la información en un JSON estricto con esta estructura:
            
            {
              "title": "Nombre del entreno",
              "category": "CROSS_TRAINING",
              "blocks": [
                {
                  "title": "Título del bloque",
                  "format": "AMRAP",
                  "config": { "timecap": "20:00", "rounds": null },
                  "exercises": [
                    { "name": "Burpees", "reps": "15", "detail": "Rx", "type": "exercise" }
                  ]
                }
              ],
              "summary": { "totalTime": "45:00", "scoreType": "REPS", "scoreLabel": "" }
            }
            
            Formatos permitidos: 'AMRAP', 'FOR TIME', 'EMOM', 'TABATA', 'INTERVALS', 'DEATH BY', 'ROUNDS FOR TIME', '21-15-9', 'FUERZA', 'LIBRE'.
            Categorías: 'CROSS_TRAINING', 'RUNNING', 'GYM', 'OCR', 'HYROX', 'CYCLING', 'SWIMMING', 'YOGA', 'BOXING'.
            
            Responde ÚNICAMENTE con el objeto JSON, sin markdown, sin texto adicional.
        `;

        const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

        const result = await aiModel.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        
        // Clean markdown if present
        const jsonString = text.replace(/```json|```/gi, '').trim();
        const parsed = JSON.parse(jsonString);
        
        return { success: true, data: parsed };
    } catch (e: any) {
        console.error('Error parsing WOD image with Gemini:', e);
        return { error: `Error de IA: ${e.message || 'No se pudo analizar la imagen.'}` };
    }
}
