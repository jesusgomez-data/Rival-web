'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notifications-actions";

export async function createDuel(opponentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('duels')
        .insert({
            challenger_id: user.id,
            opponent_id: opponentId,
            status: 'pending',
            start_date: startDate,
            end_date: endDate
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
        .select('*')
        .eq('username', username)
        .single();

    if (error) return null;
    return data;
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
