'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getNotifications() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    return data || [];
}

export async function markAsRead(notificationId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) return { error: error.message };
    revalidatePath('/dashboard');
    return { success: true };
}

export async function markAllAsRead() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No user" };

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    if (error) return { error: error.message };
    revalidatePath('/dashboard');
    return { success: true };
}

import { sendPushNotification } from "./push-actions";

export async function createNotification({ userId, type, title, content, link }: {
    userId: string,
    type: string,
    title: string,
    content?: string,
    link?: string
}) {
    console.log(`[createNotification] Attempting to create notification for ${userId}, type: ${type}`);
    const adminSupabase = createAdminClient();
    const { data: insertData, error } = await adminSupabase
        .from('notifications')
        .insert({
            user_id: userId,
            type,
            title,
            content,
            link
        })
        .select();

    if (error) {
        console.error(`[createNotification] Database error:`, error);
        return { error: error.message };
    }

    const inserted = insertData?.[0];

    // ── Broadcast to user's realtime channel for INSTANT delivery ──────────────
    // This fires before postgres_changes propagates, so the bell updates immediately
    if (inserted) {
        const broadcastClient = createAdminClient();
        broadcastClient
            .channel(`notifications-live-${userId}`)
            .send({
                type: 'broadcast',
                event: 'new_notification',
                payload: inserted,
            })
            .catch(() => {}); // fire-and-forget
    }

    // ── Send Push Notification (background, no await) ──────────────────────────
    sendPushNotification(userId, title, content || '', link || '/')
        .catch(err => console.error("Failed to send push:", err));

    return { success: true };
}

export async function markMessageNotificationsAsRead() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No user" };

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('type', 'message')
        .eq('is_read', false);

    if (error) return { error: error.message };
    revalidatePath('/dashboard');
    return { success: true };
}
