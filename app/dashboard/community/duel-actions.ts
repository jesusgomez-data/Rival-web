'use server'

import { createClient } from "@/utils/supabase/server";
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
        link: '/dashboard'
    });

    revalidatePath('/dashboard/community');
    revalidatePath('/dashboard');
    return { success: true, duel: data };
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
        link: '/dashboard'
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

    return data || [];
}

export async function getPublicProfile(username: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            followers_count:follows!following_id(count),
            following_count:follows!follower_id(count)
        `)
        .eq('username', username) // Try exact match first for performance/indexes
        .maybeSingle();

    if (!data) {
        // Fallback to case-insensitive match
        const { data: insensitiveData, error: insensitiveError } = await supabase
            .from('profiles')
            .select(`
            *,
            followers_count:follows!following_id(count),
            following_count:follows!follower_id(count)
        `)
            .ilike('username', username)
            .single();

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
