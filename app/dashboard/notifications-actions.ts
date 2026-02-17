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
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
        .from('notifications')
        .insert({
            user_id: userId,
            type,
            title,
            content,
            link
        });

    if (error) return { error: error.message };

    // Send Push Notification
    // Don't await this to avoid slowing down the response
    sendPushNotification(userId, title, content || '', link || '/')
        .catch(err => console.error("Failed to send push:", err));

    return { success: true };
}
