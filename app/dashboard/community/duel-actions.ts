'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notifications-actions";

export async function createDuel(opponentId: string, type: string = 'classic', relatedPostId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Check Plan Restrictions
    // ... logic omitted for brevity in replace_file_content if I want, but I should probably keep it ...
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

    if (profile?.subscription_tier === 'free') {
        const { count } = await supabase
            .from('duels')
            .select('id', { count: 'exact', head: true })
            .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
            .in('status', ['active', 'pending']);

        if ((count || 0) >= 1) {
            return { error: "Plan Gratuito limitado a 1 Duelo activo. Mejora a Premium para duelos ilimitados." };
        }
    }

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('duels')
        .insert({
            challenger_id: user.id,
            opponent_id: opponentId,
            status: 'pending',
            start_date: startDate,
            end_date: endDate,
            type: type,
            related_post_id: relatedPostId
        })
        .select()
        .single();

    if (error) return { error: error.message };

    // Trigger Notification
    await createNotification({
        userId: opponentId,
        type: 'duel_challenge',
        title: 'Duel Issued!',
        content: `${user.user_metadata?.full_name || 'A Rival'} has challenged you to a 7-day duel.`,
        link: '/dashboard#duels-section'
    });

    revalidatePath('/dashboard/community');
    revalidatePath('/dashboard');
    return { success: true, duel: data };
}

async function calculateDuelScores(duel: any) {
    const supabase = await createAdminClient();
    const getUserScore = async (userId: string) => {
        // Adjust end date to include the full end day
        const endDateTime = new Date(duel.end_date);
        endDateTime.setHours(23, 59, 59, 999);

        // 1. Fetch Regular Workouts
        const { data: workouts } = await supabase
            .from('workouts')
            .select('id, total_volume_kg, duration_seconds, metrics')
            .eq('user_id', userId)
            .gte('start_time', duel.start_date)
            .lte('start_time', endDateTime.toISOString());

        // 2. Fetch Class Results (WODs Arena)
        const { data: classResults } = await supabase
            .from('class_results')
            .select('data, date_performed')
            .eq('user_id', userId)
            .gte('date_performed', duel.start_date)
            .lte('date_performed', endDateTime.toISOString());

        // 3. Fetch Manual Posts (WOD/PR from feed not linked to workouts)
        const { data: manualPosts } = await supabase
            .from('posts')
            .select('id, media_type, workout_id')
            .eq('user_id', userId)
            .in('media_type', ['wod', 'pr'])
            .is('workout_id', null)
            .gte('created_at', duel.start_date)
            .lte('created_at', endDateTime.toISOString());

        let totalScore = 0;

        // Process Regular Workouts Score
        if (workouts) {
            totalScore += workouts.reduce((acc: number, w: any) => {
                let vol = (w.total_volume_kg || 0);

                // Fallback: Calculate volume from metrics blocks if header is 0
                if (vol === 0 && w.metrics?.blocks) {
                    w.metrics.blocks.forEach((block: any) => {
                        if (block.exercises) {
                            block.exercises.forEach((ex: any) => {
                                const weight = parseFloat(ex.value || ex.weight) || 0;
                                const sets = parseInt(ex.sets) || 1;
                                const reps = parseInt(ex.reps) || 1;
                                vol += weight * sets * reps;
                            });
                        }
                    });
                }

                let durationMins = (w.duration_seconds || 0) / 60;
                // Fallback for Hybrid: Roughly 12 mins per block if duration is 0
                if (durationMins === 0 && w.metrics?.blocks) {
                    durationMins = w.metrics.blocks.length * 12;
                }

                // Ensure at least 20 mins for any workout that has data
                if (durationMins === 0 && (vol > 0 || w.metrics?.blocks?.length > 0)) {
                    durationMins = 20;
                }

                return acc + (vol * 0.2) + (durationMins * 30);
            }, 0);
        }

        // Process Class Results Score
        if (classResults) {
            totalScore += classResults.reduce((acc: number, c: any) => {
                let classVolume = 0;
                if (c.data && Array.isArray(c.data)) {
                    c.data.forEach((block: any) => {
                        if (block.type === 'weight' && block.exercises) {
                            block.exercises.forEach((ex: any) => {
                                const w = parseFloat(ex.value) || 0;
                                const r = parseInt(ex.reps) || 0;
                                const s = parseInt(ex.sets) || 1;
                                classVolume += w * r * s;
                            });
                        } else if (block.wod_weight) {
                            classVolume += parseFloat(block.wod_weight) || 0;
                        }
                    });
                }
                const volScore = classVolume * 0.2;
                // Classes are assumed to be 60 mins -> 1800 pts
                return acc + volScore + 1800;
            }, 0);
        }

        // Process Manual Posts Score
        if (manualPosts) {
            totalScore += (manualPosts.length * 1800); // 1800 pts (1h) baseline per manual WOD/PR
        }

        return totalScore;
    };

    const challengerScore = Math.floor(await getUserScore(duel.challenger_id));
    const opponentScore = Math.floor(await getUserScore(duel.opponent_id));

    return { challengerScore, opponentScore };
}


export async function acceptDuel(duelId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated" };

    // Check Plan Restrictions
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

    if (profile?.subscription_tier === 'free') {
        const { count } = await supabase
            .from('duels')
            .select('id', { count: 'exact', head: true })
            .or(`and(status.eq.active,or(challenger_id.eq.${user.id},opponent_id.eq.${user.id})),and(status.eq.pending,challenger_id.eq.${user.id})`);

        if ((count || 0) >= 1) {
            return { error: "Plan Gratuito limitado a 1 Duelo activo. Termina o cancela tu duelo actual para aceptar este." };
        }
    }

    const { data, error } = await supabase
        .from('duels')
        .update({ status: 'active' })
        .eq('id', duelId)
        .select()
        .single();

    if (error) return { error: error.message };

    // Trigger Notification for the Challenger
    await createNotification({
        userId: data.challenger_id,
        type: 'duel_active',
        title: 'Duel Accepted!',
        content: `Your challenge has been accepted. The 7-day clash begins now!`,
        link: '/dashboard#duels-section'
    });

    revalidatePath('/dashboard/community');
    revalidatePath('/dashboard');
    return { success: true, duel: data };
}

export async function getMyDuels() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('duels')
        .select(`
            *,
            challenger:challenger_id (username, full_name, avatar_url),
            opponent:opponent_id (username, full_name, avatar_url)
        `)
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    const duelsWithScores = await Promise.all((data || []).map(async (duel: any) => {
        // Only calculate for active or completed, or just active to show progress
        if (duel.status !== 'pending') {
            const { challengerScore, opponentScore } = await calculateDuelScores(duel);

            // --- AUTO CLOSE EXPIRED DUELS ---
            const endDate = new Date(duel.end_date);
            const now = new Date();
            // If active and past end date, finalize it
            if (duel.status === 'active' && now > endDate) {
                let winnerId = null;
                if (challengerScore > opponentScore) winnerId = duel.challenger_id;
                else if (opponentScore > challengerScore) winnerId = duel.opponent_id;

                // Update DB
                await supabase.from('duels').update({
                    status: 'completed',
                    winner_id: winnerId
                }).eq('id', duel.id);

                // Notify Winner (if not a draw)
                if (winnerId) {
                    await createNotification({
                        userId: winnerId,
                        type: 'duel_won',
                        title: '¡Victoria!',
                        content: `Has ganado el duelo contra ${winnerId === duel.challenger_id ? duel.opponent.full_name : duel.challenger.full_name}`,
                        link: '/dashboard#duels-section'
                    });
                }

                return { ...duel, status: 'completed', winner_id: winnerId, challenger_score: challengerScore, opponent_score: opponentScore };
            }

            return { ...duel, challenger_score: challengerScore, opponent_score: opponentScore };
        }
        return { ...duel, challenger_score: 0, opponent_score: 0 };
    }));

    return duelsWithScores;
}

export async function getPublicProfile(username: string) {
    const supabase = await createClient();

    // Decoded just in case
    const target = decodeURIComponent(username);

    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            followers_count:follows!following_id(count),
            following_count:follows!follower_id(count)
        `)
        .or(`username.eq."${target}",email.eq."${target}"`)
        .maybeSingle();

    if (!data) {
        // Fallback to case-insensitive match on username ONLY
        const { data: insensitiveData, error: insensitiveError } = await supabase
            .from('profiles')
            .select(`
            *,
            followers_count:follows!following_id(count),
            following_count:follows!follower_id(count)
        `)
            .ilike('username', target)
            .maybeSingle(); // Changed from .single() to avoid throws

        if (insensitiveError || !insensitiveData) return null;

        return {
            ...insensitiveData,
            followers_count: insensitiveData.followers_count?.[0]?.count || 0,
            following_count: insensitiveData.following_count?.[0]?.count || 0
        };
    }

    // Flatten count results
    return {
        ...data,
        followers_count: data.followers_count?.[0]?.count || 0,
        following_count: data.following_count?.[0]?.count || 0
    };
}

export async function getCombatStats(userId: string) {
    const supabase = await createClient();

    // Fetch all completed duels for this user
    const { data: duels } = await supabase
        .from('duels')
        .select('*')
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq('status', 'completed');

    const stats = {
        total: duels?.length || 0,
        wins: duels?.filter(d => d.winner_id === userId).length || 0,
        losses: duels?.filter(d => d.winner_id && d.winner_id !== userId).length || 0,
        draws: duels?.filter(d => d.status === 'completed' && !d.winner_id).length || 0
    };

    return stats;
}

export async function getActiveDuel(userId1: string, userId2: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('duels')
        .select('*')
        .or(`and(challenger_id.eq.${userId1},opponent_id.eq.${userId2}),and(challenger_id.eq.${userId2},opponent_id.eq.${userId1})`)
        .in('status', ['active', 'pending'])
        .maybeSingle();

    if (error) return null;
    return data;
}
