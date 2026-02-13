"use server";

import { createClient } from "@/utils/supabase/server";

export async function getRankings(category: 'xp' | 'combat' | 'social') {
    const supabase = await createClient();

    if (category === 'xp') {
        const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, xp_points, level, is_official')
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
