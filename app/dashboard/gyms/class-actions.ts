'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { updateMissionProgress } from "../training/actions";

// Extracted from management-actions.ts to avoid bundling 'stripe' (server-only) in client components like PendingReviewPrompt

export async function saveClassResult(classId: string, resultData: any, notes: string, shareToFeed: boolean = false, datePerformed: string = new Date().toISOString()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Debes iniciar sesión" };

    // 1. Get Class & Org Info
    const { data: classData } = await supabase
        .from('classes')
        .select(`
            organization_id, 
            scheduled_time
        `)
        .eq('id', classId)
        .single();

    if (!classData) return { error: "Clase no encontrada" };

    // Fetch Organization Name explicitly to ensure it exists
    const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', classData.organization_id)
        .single();

    // @ts-ignore
    classData.organizations = orgData;

    // 2. Check if enrolled
    const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select(`id, member:member_id!inner(user_id)`)
        .eq('class_id', classId)
        .eq('member.user_id', user.id);

    if (enrollmentError || !enrollments || enrollments.length === 0) {
        return { error: "No estás inscrito en esta clase" };
    }

    // 3. Save result
    const { error } = await supabase
        .from('class_results')
        .upsert({
            class_id: classId,
            user_id: user.id,
            result_type: 'custom',
            result_value: 'Detailed Result',
            data: resultData,
            notes: notes,
            date_performed: datePerformed,
            updated_at: new Date().toISOString()
        }, { onConflict: 'class_id, user_id' });

    if (error) return { error: error.message };

    // 4. Update Missions & XP
    // Track session count
    await updateMissionProgress(user.id, 'sessions_count', 1);

    // Calculate Volume from resultData
    let totalVolume = 0;
    if (resultData && Array.isArray(resultData)) {
        resultData.forEach((block: any) => {
            if (block.type === 'weight' && block.exercises) {
                block.exercises.forEach((ex: any) => {
                    const w = parseFloat(ex.value) || 0;
                    const r = parseInt(ex.reps) || 0;
                    const s = parseInt(ex.sets) || 1;
                    totalVolume += w * r * s;
                });
            } else if (block.wod_weight) {
                totalVolume += parseFloat(block.wod_weight) || 0;
            }
        });
    }

    if (totalVolume > 0) {
        await updateMissionProgress(user.id, 'volume_kg', totalVolume);
    }

    // Give XP
    await supabase.rpc('increment_xp', { amount: 100, profile_id: user.id });

    // 5. Share to Feed
    if (shareToFeed) {
        // Caption corta: el desglose completo de bloques/ejercicios ya lo
        // renderiza la tarjeta "ENTRENAMIENTO COMPLETADO" en el feed a partir
        // de media_url — duplicarlo aquí como texto plano solo lo hacía ver
        // feo y redundante encima de la propia tarjeta.
        let caption = `🔥 ¡WOD FINALIZADO!`;
        if (notes) caption += `\n\n📝 ${notes}`;

        // Inject Metadata for FeedPost
        const feedData = Array.isArray(resultData) ? [...resultData] : [];
        // @ts-ignore
        const centerName = classData.organizations?.name || 'Centro Deportivo';

        feedData.push({
            type: 'metadata',
            centerName: centerName
        });

        await supabase.from('posts').insert({
            user_id: user.id,
            caption: caption,
            media_type: 'class_result',
            media_url: JSON.stringify(feedData)
        });
    }

    // Revalidate relevant paths
    const { data: c } = await supabase.from('classes').select('organization_id').eq('id', classId).single();
    if (c) {
        revalidatePath(`/gym/${c.organization_id}`);
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/community');
    }

    return { success: true };
}

export async function getPendingClassReviews() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Find class enrollments where attended is true OR date is past
    // And user has NOT submitted a result

    // 1. Get Enrollments (past)
    const now = new Date();
    // Allow reviewing classes from last 24h that passed
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select(`
            class_id,
            class:classes!inner (
                id,
                name,
                scheduled_time,
                organization_id,
                organization:organization_id (name),
                coach:profiles!coach_id (full_name)
            ),
            member:member_id!inner (
                user_id
            )
        `)
        .eq('member.user_id', user.id)
        .gte('class.scheduled_time', yesterday)
        .lte('class.scheduled_time', now.toISOString());

    if (!enrollments || enrollments.length === 0) return [];

    // 2. Get Existing Results
    const classIds = enrollments.map(e => e.class_id);
    const { data: results } = await supabase
        .from('class_results')
        .select('class_id')
        .eq('user_id', user.id)
        .in('class_id', classIds);

    const completedClassIds = new Set(results?.map(r => r.class_id));

    // 3. Filter pending
    const pending = enrollments.filter(e => !completedClassIds.has(e.class_id));

    if (pending.length === 0) return [];

    // 4. Fetch WODs for pending classes (optimized)
    // Supabase join return types can be tricky (array vs object)
    // @ts-ignore
    const orgIds = [...new Set(pending.map((p: any) => {
        const cls = Array.isArray(p.class) ? p.class[0] : p.class;
        return cls?.organization_id;
    }).filter(Boolean))];

    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString();

    const { data: wods } = await supabase
        .from('center_posts')
        .select('organization_id, scheduled_for, content')
        .eq('post_type', 'wod')
        .in('organization_id', orgIds)
        .gte('scheduled_for', fifteenDaysAgo)
        .order('scheduled_for', { ascending: false });

    // Attach WOD to class
    return pending.map((p: any) => {
        const cls = Array.isArray(p.class) ? p.class[0] : p.class;
        if (!cls) return null;

        const dateStr = cls.scheduled_time ? cls.scheduled_time.split('T')[0] : '';
        
        // Try to match the WOD on the exact same date first
        let wod = wods?.find(w => w.organization_id === cls.organization_id && w.scheduled_for.split('T')[0] === dateStr);
        
        // Fallback: use the latest WOD of the organization
        if (!wod) {
            wod = wods?.find(w => w.organization_id === cls.organization_id);
        }

        const coach = Array.isArray(cls.coach) ? cls.coach[0] : cls.coach;
        const org = Array.isArray(cls.organization) ? cls.organization[0] : cls.organization;

        return {
            ...cls,
            coach: coach,
            wod: wod,
            organizationName: org?.name || 'Rival Fit Madrid'
        };
    }).filter(Boolean);
}

export async function getDayRankings(centerId: string, date: string) {
    const supabase = await createClient();

    // 1. Get classes for that day/center
    const startOfDay = new Date(date).toISOString();
    const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999)).toISOString();

    const { data: classes } = await supabase
        .from('classes')
        .select('id')
        .eq('organization_id', centerId)
        .gte('scheduled_time', startOfDay)
        .lte('scheduled_time', endOfDay);

    if (!classes || classes.length === 0) return {};

    const classIds = classes.map(c => c.id);

    // 2. Get results for these classes
    const { data: results } = await supabase
        .from('class_results')
        .select(`
            data,
            user:profiles!user_id (full_name, username, avatar_url)
        `)
        .in('class_id', classIds);

    if (!results) return {};

    // 3. Group by Block Title
    const leaderboard: Record<string, any[]> = {};

    results.forEach((r: any) => {
        if (!r.data || !Array.isArray(r.data)) return;

        r.data.forEach((block: any) => {
            const title = (block.title || 'WORKOUT').toUpperCase();

            // Only include blocks that have a value
            if (block.type === 'weight') {
                // For weight, we might want to list top lifts.
                // For now, let's include if any exercise has value.
                if (block.exercises && block.exercises.some((e: any) => e.value)) {
                    // Weight usually logic is max weight lifted. 
                    // This is simplified. We take the max value found in any exercise of this block.
                    const maxWeight = Math.max(...block.exercises.map((e: any) => parseFloat(e.value) || 0));

                    if (maxWeight > 0) {
                        if (!leaderboard[title]) leaderboard[title] = [];
                        leaderboard[title].push({
                            user: r.user,
                            value: maxWeight + " KG",
                            raw_value: maxWeight,
                            type: 'weight',
                            rx_level: block.rx_level || 'Intermedio'
                        });
                    }
                }
            } else {
                if (block.value) {
                    if (!leaderboard[title]) leaderboard[title] = [];
                    leaderboard[title].push({
                        user: r.user,
                        value: block.value,
                        wod_weight: block.wod_weight,
                        type: block.type, // 'rounds' or 'time'
                        rx_level: block.rx_level || 'Intermedio'
                    });
                }
            }
        });
    });

    // 4. Sort Rankings
    Object.keys(leaderboard).forEach(key => {
        leaderboard[key].sort((a, b) => {
            // Priority 1: Rx Level (Avanzado > Intermedio > Escalado)
            const rxScore = { 'Avanzado': 3, 'Intermedio': 2, 'Escalado': 1 };
            // @ts-ignore
            const diffRx = (rxScore[b.rx_level] || 0) - (rxScore[a.rx_level] || 0);
            if (diffRx !== 0) return diffRx;

            // Priority 2: Value
            if (a.type === 'time') {
                // Lower time is better. 
                // BUT value is a string "MM:SS" or just number.
                // Simple string compare works for MM:SS if format is consistent.
                return a.value.localeCompare(b.value);
            } else if (a.type === 'rounds' || a.type === 'weight') {
                // Higher rounds/weight is better.
                // Use raw_value for weight if available
                const valA = a.raw_value || parseFloat(a.value) || 0;
                const valB = b.raw_value || parseFloat(b.value) || 0;
                return valB - valA;
            }
            return 0;
        });
    });

    return leaderboard;
}
