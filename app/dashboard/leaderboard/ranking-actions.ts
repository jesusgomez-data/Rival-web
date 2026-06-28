"use server";

import { createClient } from "@/utils/supabase/server";

export async function getRankings(category: 'xp' | 'combat' | 'social') {
    const supabase = await createClient();

    if (category === 'xp') {
        const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, xp_points, level, is_official')
            .eq('is_official', false) // Exclude official account from rankings
            .order('xp_points', { ascending: false })
            .limit(20);
        return data || [];
    }

    if (category === 'combat') {
        // Safe aggregation method avoiding complex PostgREST join errors
        const { data: duels, error: duelsError } = await supabase
            .from('duels')
            .select('winner_id')
            .eq('status', 'completed')
            .not('winner_id', 'is', null);

        if (duelsError) console.error("Error fetching duels for combat ranking:", duelsError);
        if (!duels || duels.length === 0) return [];

        // Count wins per user
        const winCounts: Record<string, number> = {};
        duels.forEach((d: any) => {
            if (d.winner_id) {
                winCounts[d.winner_id] = (winCounts[d.winner_id] || 0) + 1;
            }
        });

        const topWinnerIds = Object.entries(winCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([id]) => id);

        if (topWinnerIds.length === 0) return [];

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, level, is_official')
            .in('id', topWinnerIds)
            .eq('is_official', false);

        if (profilesError) console.error("Error fetching profiles for combat ranking:", profilesError);

        const sorted = topWinnerIds
            .map(id => {
                const profile = profiles?.find((p: any) => p.id === id);
                if (profile) {
                    return {
                        ...profile,
                        duels_won: [{ count: winCounts[id] }]
                    };
                }
                return null;
            })
            .filter(Boolean);

        return sorted;
    }

    if (category === 'social') {
        // Safe aggregation method avoiding complex PostgREST join errors
        const { data: follows, error: followsError } = await supabase
            .from('follows')
            .select('following_id');

        if (followsError) console.error("Error fetching follows for social ranking:", followsError);
        if (!follows || follows.length === 0) return [];

        // Count followers per user
        const followerCounts: Record<string, number> = {};
        follows.forEach((f: any) => {
            if (f.following_id) {
                followerCounts[f.following_id] = (followerCounts[f.following_id] || 0) + 1;
            }
        });

        const topFollowedIds = Object.entries(followerCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([id]) => id);

        if (topFollowedIds.length === 0) return [];

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, level, is_official')
            .in('id', topFollowedIds)
            .eq('is_official', false);

        if (profilesError) console.error("Error fetching profiles for social ranking:", profilesError);

        const sorted = topFollowedIds
            .map(id => {
                const profile = profiles?.find((p: any) => p.id === id);
                if (profile) {
                    return {
                        ...profile,
                        followers: [{ count: followerCounts[id] }]
                    };
                }
                return null;
            })
            .filter(Boolean);

        return sorted;
    }

    return [];
}

export async function getActiveChallenges() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: challenges } = await supabase
        .from('community_challenges')
        .select(`
            *,
            participants:challenge_participants(user_id, current_progress, is_completed)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return challenges || [];
}

export async function joinChallenge(challengeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No auth" };

    const { data: profile } = await supabase.from('profiles').select('is_official').eq('id', user.id).single();
    if (profile?.is_official) {
        return { error: "Las cuentas oficiales no pueden participar en los retos." };
    }

    const { error } = await supabase
        .from('challenge_participants')
        .insert({
            challenge_id: challengeId,
            user_id: user.id
        });

    if (error) {
        if (error.code === '23505') {
            return { success: true }; // Already joined
        }
        return { error: error.message };
    }
    return { success: true };
}

export async function getChallengeParticipants(challengeId: string) {
    const supabase = await createClient();
    const { data: participants, error: partError } = await supabase
        .from('challenge_participants')
        .select(`
            user_id,
            current_progress,
            is_completed
        `)
        .eq('challenge_id', challengeId)
        .order('current_progress', { ascending: false });
        
    if (partError) {
        console.error("Error fetching participants:", partError);
        return { success: false, error: partError.message };
    }

    if (!participants || participants.length === 0) {
        return { success: true, participants: [] };
    }

    const userIds = participants.map((p: any) => p.user_id);

    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, level, is_official')
        .in('id', userIds);

    if (profError) {
        console.error("Error fetching profiles:", profError);
    }

    const mergedData = participants.map((p: any) => ({
        ...p,
        profiles: profiles?.find((prof: any) => prof.id === p.user_id) || null
    }));

    return { success: true, participants: mergedData };
}

export async function updateChallengeProgress(challengeId: string, progress: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No auth" };

    // 1. Get challenge target value
    console.log('Server Action: Updating progress for challengeId:', challengeId);

    const { data: challenge, error: challengeFetchError } = await supabase
        .from('community_challenges')
        .select('goal_value')
        .eq('id', challengeId)
        .single();

    if (challengeFetchError || !challenge) {
        console.error('Error fetching challenge target:', challengeFetchError);
        return { error: challengeFetchError?.message || "Challenge not found lookup failed" };
    }

    const isCompleted = progress >= (challenge.goal_value || 999999);

    // 2. Update progress and completion status
    const { error } = await supabase
        .from('challenge_participants')
        .update({
            current_progress: progress,
            is_completed: isCompleted
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { success: true, completed: isCompleted };
}

export async function createChallenge(data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No auth" };

    const { error } = await supabase
        .from('community_challenges')
        .insert({
            ...data,
            created_by: user.id,
            is_active: true
        });

    if (error) return { error: error.message };
    return { success: true };
}

export async function updateChallenge(id: string, data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No auth" };

    const { error } = await supabase
        .from('community_challenges')
        .update(data)
        .eq('id', id);

    if (error) return { error: error.message };
    return { success: true };
}

export async function deleteChallenge(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No auth" };

    const { error } = await supabase
        .from('community_challenges')
        .delete()
        .eq('id', id);

    if (error) return { error: error.message };
    return { success: true };
}

export async function shareChallengeToFeed(challengeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No auth" };

    const { data: challenge, error: fetchError } = await supabase
        .from('community_challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

    if (fetchError || !challenge) return { error: "Challenge not found" };

    const { error } = await supabase
        .from('posts')
        .insert({
            user_id: user.id,
            caption: `¡Únete al reto: ${challenge.title}! 🔥\n\n${challenge.description}`,
            media_type: 'challenge',
            media_url: JSON.stringify(challenge)
        });

    if (error) return { error: error.message };
    return { success: true };
}


