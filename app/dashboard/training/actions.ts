'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getMissions() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // 1. Get all active missions
    const { data: missions, error: missionsError } = await supabase
        .from('missions')
        .select('*')

    if (missionsError) {
        console.error('Error fetching missions:', missionsError)
        return []
    }

    // 2. Get user's progress for this week
    // We assume week starts on Monday for simplicity, or just use CURRENT_DATE's week
    const { data: userMissions, error: progressError } = await supabase
        .from('user_missions')
        .select('*')
        .eq('user_id', user.id)

    if (progressError) {
        console.error('Error fetching user progress:', progressError)
    }

    // 3. Merge data
    return missions.map(mission => {
        const progress = userMissions?.find(um => um.mission_id === mission.id)
        return {
            ...mission,
            current_value: progress?.current_value || 0,
            is_completed: progress?.is_completed || false
        }
    })
}

export async function updateMissionProgress(userId: string, type: 'volume_kg' | 'sessions_count' | 'social_interactions', amount: number) {
    const supabase = await createClient()

    // 1. Find relevant missions
    const { data: relevantMissions } = await supabase
        .from('missions')
        .select('id, goal_value, xp_reward')
        .eq('goal_type', type)

    if (!relevantMissions) return

    for (const mission of relevantMissions) {
        // 2. Upsert progress
        const { data: existingProgress } = await supabase
            .from('user_missions')
            .select('*')
            .eq('user_id', userId)
            .eq('mission_id', mission.id)
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
                    week_start: new Date().toISOString().split('T')[0] // simplified
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
    const { data: { user } } = await supabase.auth.getUser()
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
            })
            .select()
            .single();
        workout = data;
        workoutError = error;
    }

    if (workoutError) {
        console.error('SERVER ACTION ERROR: saving workout header:', workoutError)
        return { error: 'Failed to save workout header: ' + workoutError.message }
    }

    if (!workout) {
        return { error: 'Failed to create workout header - no data returned' }
    }

    // 3. Prepare Sets Data and Detect PRs
    const setsToInsert = []
    let totalVolume = 0
    let sessionMaxWeight = 0
    let hasAtLeastOnePR = false

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
        let isExercisePR = false

        for (const set of exercise.sets) {
            // Safeguard values
            const weight = parseFloat(set.weight) || 0
            const reps = parseInt(set.reps) || 0
            const setOrder: number = parseInt(set.order) || (setsToInsert.length + 1)

            totalVolume += weight * reps
            if (weight > sessionMaxWeight) sessionMaxWeight = weight;

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

    // 6. AUTO-POST to Community Feed
    // We only post if it's a new workout (not an edit) or if specifically requested
    if (!workoutData.id) {
        let caption = `¡Sesión completada! 🏁`;

        if (workoutData.sportType === 'Running' && workoutData.metrics) {
            caption = `🏃‍♂️ Carrera completada: ${(workoutData.metrics.distance / 1000).toFixed(2)}km en ${Math.floor(workoutData.duration / 60)}min. Ritmo: ${workoutData.metrics.pace}/km.`;
        } else if (workoutData.sportType === 'CrossFit' && workoutData.metrics) {
            if (workoutData.metrics.type === 'FOR_TIME' && workoutData.metrics.time) {
                caption = `🏋️‍♀️ WOD Finalizado en ${workoutData.metrics.time}. 🔥`;
            } else if (workoutData.metrics.rounds) {
                caption = `🏋️‍♀️ WOD Completado: ${workoutData.metrics.rounds} Rondas. 🔥`;
            } else {
                caption = `🏋️‍♀️ WOD CrossFit completado con éxito! 🔥`;
            }
        } else if (workoutData.metrics && sessionMaxWeight > 0) {
            caption += ` Levanté un máximo de ${sessionMaxWeight}kg.`;
        } else {
            caption += ` ¡Gran esfuerzo en el ${workoutData.sportType}!`;
        }

        await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                workout_id: workout.id,
                caption: caption,
                media_url: workoutData.imageUrl || null, // Optional image
            })
    }

    // 7. Give XP Points for completion
    await supabase.rpc('increment_xp', { amount: 100, profile_id: user.id });

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard/training')
    return { success: true }
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

export async function getExercises(sport: 'gym' | 'crossfit' = 'gym') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('exercises_catalog')
        .select('*')
        .order('name', { ascending: true })

    const gymExercises = [
        { name: 'Abdominal Crunches', muscle_group: 'Core' },
        { name: 'Adductor Machine', muscle_group: 'Legs' },
        { name: 'Abductor Machine', muscle_group: 'Legs' },
        { name: 'Arnold Press', muscle_group: 'Shoulders' },
        { name: 'Back Extension', muscle_group: 'Posterior Chain' },
        { name: 'Barbell Bicep Curl', muscle_group: 'Arms' },
        { name: 'Barbell Row', muscle_group: 'Back' },
        { name: 'Barbell Shrug', muscle_group: 'Shoulders' },
        { name: 'Bench Press', muscle_group: 'Chest' },
        { name: 'Bulgarian Split Squat', muscle_group: 'Legs' },
        { name: 'Cable Crossover', muscle_group: 'Chest' },
        { name: 'Cable Face Pull', muscle_group: 'Shoulders' },
        { name: 'Cable Lateral Raise', muscle_group: 'Shoulders' },
        { name: 'Cable Tricep Pushdown', muscle_group: 'Arms' },
        { name: 'Calf Raise (Seated)', muscle_group: 'Legs' },
        { name: 'Calf Raise (Standing)', muscle_group: 'Legs' },
        { name: 'Chest Fly (Machine)', muscle_group: 'Chest' },
        { name: 'Chest Press (Machine)', muscle_group: 'Chest' },
        { name: 'Chin Up', muscle_group: 'Back' },
        { name: 'Deadlift', muscle_group: 'Posterior Chain' },
        { name: 'Dip', muscle_group: 'Arms' },
        { name: 'Dumbbell Bicep Curl', muscle_group: 'Arms' },
        { name: 'Dumbbell Chest Fly', muscle_group: 'Chest' },
        { name: 'Dumbbell Incline Bench Press', muscle_group: 'Chest' },
        { name: 'Dumbbell Lateral Raise', muscle_group: 'Shoulders' },
        { name: 'Dumbbell Press (Seated)', muscle_group: 'Shoulders' },
        { name: 'Dumbbell Row', muscle_group: 'Back' },
        { name: 'Dumbbell Shoulder Press', muscle_group: 'Shoulders' },
        { name: 'Front Squat', muscle_group: 'Legs' },
        { name: 'Hack Squat', muscle_group: 'Legs' },
        { name: 'Hammer Curl', muscle_group: 'Arms' },
        { name: 'Hip Thrust', muscle_group: 'Legs' },
        { name: 'Incline Bench Press', muscle_group: 'Chest' },
        { name: 'Lat Pulldown', muscle_group: 'Back' },
        { name: 'Leg Curl (Lying)', muscle_group: 'Legs' },
        { name: 'Leg Curl (Seated)', muscle_group: 'Legs' },
        { name: 'Leg Extension', muscle_group: 'Legs' },
        { name: 'Leg Press', muscle_group: 'Legs' },
        { name: 'Lunge (Dumbbell)', muscle_group: 'Legs' },
        { name: 'Military Press', muscle_group: 'Shoulders' },
        { name: 'Pec Deck', muscle_group: 'Chest' },
        { name: 'Preacher Curl', muscle_group: 'Arms' },
        { name: 'Pull Up', muscle_group: 'Back' },
        { name: 'Push Up', muscle_group: 'Chest' },
        { name: 'Romanian Deadlift', muscle_group: 'Posterior Chain' },
        { name: 'Seated Row (Cable)', muscle_group: 'Back' },
        { name: 'Shoulder Press (Machine)', muscle_group: 'Shoulders' },
        { name: 'Skull Crusher', muscle_group: 'Arms' },
        { name: 'Smith Machine Squat', muscle_group: 'Legs' },
        { name: 'Squat', muscle_group: 'Legs' },
        { name: 'T-Bar Row', muscle_group: 'Back' },
        { name: 'Tricep Extension (Overhead)', muscle_group: 'Arms' },
    ];

    const crossFitExercises = [
        { name: 'Air Squat', muscle_group: 'Legs' },
        { name: 'Assault Bike', muscle_group: 'Cardio' },
        { name: 'Back Parallel Squat', muscle_group: 'Legs' },
        { name: 'Back Squat', muscle_group: 'Legs' },
        { name: 'Bar Muscle Up', muscle_group: 'Full Body' },
        { name: 'Bar Facing Burpee', muscle_group: 'Full Body' },
        { name: 'Bench Press', muscle_group: 'Chest' },
        { name: 'Box Jump', muscle_group: 'Legs' },
        { name: 'Box Jump Over', muscle_group: 'Legs' },
        { name: 'Burpee', muscle_group: 'Full Body' },
        { name: 'Burpee Box Jump Over', muscle_group: 'Full Body' },
        { name: 'Chest to Bar Pull Up', muscle_group: 'Back' },
        { name: 'Clean', muscle_group: 'Full Body' },
        { name: 'Clean & Jerk', muscle_group: 'Full Body' },
        { name: 'Deadlift', muscle_group: 'Posterior Chain' },
        { name: 'Devil Press', muscle_group: 'Full Body' },
        { name: 'Double Under', muscle_group: 'Cardio' },
        { name: 'Dumbbell Snatch', muscle_group: 'Full Body' },
        { name: 'Echo Bike', muscle_group: 'Cardio' },
        { name: 'Front Squat', muscle_group: 'Legs' },
        { name: 'GHD Sit Up', muscle_group: 'Core' },
        { name: 'Goblet Squat', muscle_group: 'Legs' },
        { name: 'Handstand Push Up', muscle_group: 'Shoulders' },
        { name: 'Handstand Walk', muscle_group: 'Shoulders' },
        { name: 'Hang Clean', muscle_group: 'Full Body' },
        { name: 'Hang Snatch', muscle_group: 'Full Body' },
        { name: 'Kettlebell Swing', muscle_group: 'Posterior Chain' },
        { name: 'Lunges', muscle_group: 'Legs' },
        { name: 'Muscle Up', muscle_group: 'Full Body' },
        { name: 'Overhead Squat', muscle_group: 'Full Body' },
        { name: 'Pistol Squat', muscle_group: 'Legs' },
        { name: 'Power Clean', muscle_group: 'Full Body' },
        { name: 'Power Snatch', muscle_group: 'Full Body' },
        { name: 'Pull Up', muscle_group: 'Back' },
        { name: 'Push Jerk', muscle_group: 'Shoulders' },
        { name: 'Push Press', muscle_group: 'Shoulders' },
        { name: 'Ring Muscle Up', muscle_group: 'Full Body' },
        { name: 'Rope Climb', muscle_group: 'Full Body' },
        { name: 'Row', muscle_group: 'Cardio' },
        { name: 'Run', muscle_group: 'Cardio' },
        { name: 'Ski Erg', muscle_group: 'Cardio' },
        { name: 'Snatch', muscle_group: 'Full Body' },
        { name: 'Strict Press', muscle_group: 'Shoulders' },
        { name: 'Sumo Deadlift High Pull', muscle_group: 'Full Body' },
        { name: 'Thruster', muscle_group: 'Full Body' },
        { name: 'Toes to Bar', muscle_group: 'Core' },
        { name: 'Wall Ball', muscle_group: 'Full Body' },
        { name: 'Walking Lunge', muscle_group: 'Legs' },
        { name: 'Weighted Pull Up', muscle_group: 'Back' },
    ];

    const targetList = sport === 'crossfit' ? crossFitExercises : gymExercises;

    if (error) {
        console.error('Error fetching exercises:', error)
        return targetList.map((dummy, index) => ({ id: `static-${sport}-${index}`, ...dummy }));
    }

    // Merge and Deduplicate
    const dbData = data || [];
    const dbNames = new Set(dbData.map(e => e.name.toLowerCase()));

    // Add missing CF exercises
    const merged = [...dbData];
    targetList.forEach((ex, index) => {
        if (!dbNames.has(ex.name.toLowerCase())) {
            merged.push({ id: `static-${sport}-${index}`, ...ex });
        }
    });

    return merged.sort((a, b) => a.name.localeCompare(b.name));
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
    const { data: { user } } = await supabase.auth.getUser()
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

export async function getPerformanceStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { daily: [], fatigue: 0 }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: stats } = await supabase
        .from('workouts')
        .select('created_at, total_volume_kg, max_weight_kg, effort_rpe')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })

    const statsData = stats || []

    // Calculate Fatigue Score (Simplified Heuristic)
    let fatigueScore = 20 // base
    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000))

    const recentSessions = statsData.filter(s => new Date(s.created_at) > fortyEightHoursAgo)
    const avgRpe = recentSessions.length > 0
        ? recentSessions.reduce((acc: number, s: any) => acc + (s.effort_rpe || 0), 0) / recentSessions.length
        : 0

    fatigueScore += statsData.length * 8
    if (avgRpe > 7) fatigueScore += 25
    if (statsData.length > 5) fatigueScore += 20

    return {
        daily: statsData,
        fatigue: Math.min(fatigueScore, 100)
    }
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

    // 1. Muscle Group Distribution
    const { data: muscleStats } = await supabase
        .from('workout_sets')
        .select(`
            exercise_name,
            weight_kg,
            reps,
            workouts!inner(user_id)
        `)
        .eq('workouts.user_id', user.id)

    // We need to fetch catalog to map exercise -> muscle_group
    const { data: catalog } = await supabase.from('exercises_catalog').select('name, muscle_group')

    const muscleGroups: Record<string, number> = {}
    muscleStats?.forEach(set => {
        const exercise = catalog?.find(c => c.name === set.exercise_name)
        const group = exercise?.muscle_group || 'Other'
        const volume = (set.weight_kg || 0) * (set.reps || 0)
        muscleGroups[group] = (muscleGroups[group] || 0) + volume
    })

    // 2. PR History (Last 10)
    const { data: prHistory } = await supabase
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
        .limit(10)

    // 3. Weekly Frequency (Last 4 weeks - Unified)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    // Independent Workouts
    const { data: independentFreq } = await supabase
        .from('workouts')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', fourWeeksAgo.toISOString())

    // Class Results
    const { data: classFreq } = await supabase
        .from('class_results')
        .select('date_performed')
        .eq('user_id', user.id)
        .gte('date_performed', fourWeeksAgo.toISOString())

    const weeklyFreq = [0, 0, 0, 0] // [W-3, W-2, W-1, CurrentW]
    const now = new Date()

    // Process Independent
    independentFreq?.forEach(w => {
        const date = new Date(w.created_at)
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))
        const weekIndex = 3 - Math.floor(diffDays / 7)
        if (weekIndex >= 0 && weekIndex < 4) {
            weeklyFreq[weekIndex]++
        }
    })

    // Process Classes
    classFreq?.forEach(c => {
        const date = new Date(c.date_performed)
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))
        const weekIndex = 3 - Math.floor(diffDays / 7)
        if (weekIndex >= 0 && weekIndex < 4) {
            weeklyFreq[weekIndex]++
        }
    })

    // 4. Current Streak Calculation (Unified)
    const { data: wDates } = await supabase.from('workouts').select('created_at').eq('user_id', user.id);
    const { data: cDates } = await supabase.from('class_results').select('date_performed').eq('user_id', user.id);

    const allDates = [
        ...(wDates || []).map(w => w.created_at),
        ...(cDates || []).map(c => c.date_performed)
    ];

    let streak = 0;
    if (allDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const uniqueDates = Array.from(new Set(allDates.map(d => {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        }))).sort((a, b) => b - a);

        let lastDate = new Date(uniqueDates[0]);
        const diffFromToday = (today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);

        if (diffFromToday <= 1) { // If latest workout was today or yesterday
            streak = 1;
            for (let i = 1; i < uniqueDates.length; i++) {
                const currentDate = new Date(uniqueDates[i]);
                const diff = (new Date(uniqueDates[i - 1]).getTime() - currentDate.getTime()) / (1000 * 3600 * 24);
                if (diff === 1) {
                    streak++;
                } else {
                    break;
                }
            }
        }
    }

    return {
        muscleGroups,
        prHistory: prHistory || [],
        weeklyFreq,
        streak,
        percentile: 85 // Mocked for now, could be calculated based on global leaderboard
    }
}


// 14. Get Workout History
export async function getWorkoutHistory(limit = 10) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // 1. Fetch Independent Workouts
    const { data: workouts, error: wError } = await supabase
        .from('workouts')
        .select(`
            *,
            workout_sets (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    // 2. Fetch Class Results (WODs)
    const { data: classResults, error: cError } = await supabase
        .from('class_results')
        .select(`
            *,
            class:class_id (name, organization:organization_id (name))
        `)
        .eq('user_id', user.id)
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

    const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error deleting workout:', error)
        return { error: 'Failed to delete' }
    }

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
