"use server";

import { createClient } from "@/utils/supabase/server";

export async function getRankings(category: 'xp' | 'combat' | 'social') {
    const supabase = await createClient();

    if (category === 'xp') {
        const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, xp_points, level, is_official')
            .neq('username', 'rivalfit') // Exclude official account from rankings
            .order('xp_points', { ascending: false })
            .limit(20);
        return data || [];
    }

    if (category === 'combat') {
        // Complex query: Join profiles with a count of duels where they are the winner
        // Since we can't easily do complex group by joins in a single simple supabase call without RPC, 
        // we'll use raw SQL or a view. For now, let's try a clever select.

        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id, username, full_name, avatar_url, level,
                duels_won:duels!winner_id(count)
            `)
            .neq('username', 'rivalfit') // Exclude official account from rankings
            .order('duels_won', { ascending: false }) // Note: This might not work directly on a count alias in PostgREST
            .limit(20);

        // If the ordering above fails (PostgREST limitation), we sort in JS
        const sorted = (data || []).sort((a: any, b: any) => {
            const winsA = a.duels_won?.[0]?.count || 0;
            const winsB = b.duels_won?.[0]?.count || 0;
            return winsB - winsA;
        });

        return sorted;
    }

    if (category === 'social') {
        const { data } = await supabase
            .from('profiles')
            .select(`
                id, username, full_name, avatar_url, level,
                followers:follows!following_id(count)
            `)
            .neq('username', 'rivalfit') // Exclude official account from rankings
            .limit(100); // Fetch a bunch to sort

        const sorted = (data || []).sort((a: any, b: any) => {
            const fA = a.followers?.[0]?.count || 0;
            const fB = b.followers?.[0]?.count || 0;
            return fB - fA;
        }).slice(0, 20);

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

    const { error } = await supabase
        .from('challenge_participants')
        .insert({
            challenge_id: challengeId,
            user_id: user.id
        });

    if (error) return { error: error.message };
    return { success: true };
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

