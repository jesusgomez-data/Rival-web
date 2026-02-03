'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notifications-actions";

export async function getTeamMessages(centerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autorizado" };

    // Fetch messages joined with profile
    // We will manually attach organization info in the UI or fetch it here if needed
    const { data, error } = await supabase
        .from('team_messages')
        .select(`
            *,
            user:user_id (full_name, avatar_url),
            organization:organization_id (name, logo_url)
        `)
        .eq('organization_id', centerId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching team messages:", error);
        return { error: error.message };
    }

    return { messages: data || [] };
}

export async function sendTeamMessage(centerId: string, content: string, asOrg: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autorizado" };

    // Security check: Only owner can post as org
    if (asOrg) {
        const { data: org } = await supabase
            .from('organizations')
            .select('owner_id')
            .eq('id', centerId)
            .single();

        if (org?.owner_id !== user.id) {
            asOrg = false; // Fallback to personal if not owner
        }
    }

    const { error } = await supabase
        .from('team_messages')
        .insert({
            organization_id: centerId,
            user_id: user.id,
            content: content,
            as_org: asOrg
        });

    if (error) {
        console.error("Error sending team message:", error);
        return { error: error.message };
    }

    // 1. Get current time and day in Madrid/Local (assuming server is UTC, we should handle timezone if needed)
    // For now, let's use the current hour/day.
    const now = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // 2. Find who should get a notification
    // a) Coach on duty
    const { data: activeShifts } = await supabase
        .from('coach_shifts')
        .select('user_id')
        .eq('organization_id', centerId)
        .eq('day_of_week', currentDay)
        .lte('start_time', currentTime)
        .gte('end_time', currentTime);

    // b) Head Coach and Owner
    const { data: org } = await supabase
        .from('organizations')
        .select('owner_id, head_coach_id, name')
        .eq('id', centerId)
        .single();

    const recipients = new Set<string>();

    // Add owner and head coach
    if (org?.owner_id) recipients.add(org.owner_id);
    if (org?.head_coach_id) recipients.add(org.head_coach_id);

    // Add active coaches
    activeShifts?.forEach(s => recipients.add(s.user_id));

    // Remove sender from recipients
    recipients.delete(user.id);

    // 3. Send notifications
    const notificationPromises = Array.from(recipients).map(recipientId =>
        createNotification({
            userId: recipientId,
            type: 'team_message',
            title: `Mensaje de Equipo - ${org?.name || 'Rival'}`,
            content: `${asOrg ? org?.name : 'Un miembro del equipo'} ha publicado en Notas del Equipo: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            link: `/dashboard/gyms/${centerId}`
        })
    );

    await Promise.all(notificationPromises);

    revalidatePath(`/dashboard/gyms/${centerId}`);
    return { success: true };
}

export async function getCoachShifts(centerId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('coach_shifts')
        .select(`
            *,
            user:user_id (id, full_name, avatar_url, username)
        `)
        .eq('organization_id', centerId)
        .order('start_time', { ascending: true });

    if (error) return { error: error.message };
    return { shifts: data || [] };
}

export async function upsertCoachShift(centerId: string, shift: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    const { error } = await supabase
        .from('coach_shifts')
        .upsert({
            id: shift.id || undefined,
            organization_id: centerId,
            user_id: shift.user_id,
            day_of_week: shift.day_of_week,
            start_time: shift.start_time,
            end_time: shift.end_time,
            updated_at: new Date().toISOString()
        });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/team`);
    return { success: true };
}

export async function deleteCoachShift(centerId: string, shiftId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('coach_shifts')
        .delete()
        .eq('id', shiftId)
        .eq('organization_id', centerId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/team`);
    return { success: true };
}

export async function checkStaffRole(centerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { isStaff: false };

    const { data: org } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', centerId)
        .single();

    const { data: roleData } = await supabase
        .from('center_roles')
        .select('role')
        .eq('organization_id', centerId)
        .eq('user_id', user.id)
        .maybeSingle();

    const role = roleData?.role || (org?.owner_id === user.id ? 'owner' : null);
    const isStaff = ['owner', 'head_coach', 'coach'].includes(role);

    return { isStaff, role };
}

export async function getUserPermissionLevel(centerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { level: 'none' };

    const { data: org } = await supabase
        .from('organizations')
        .select('owner_id, head_coach_id')
        .eq('id', centerId)
        .single();

    if (org?.owner_id === user.id) return { level: 'owner' };
    if (org?.head_coach_id === user.id) return { level: 'head_coach' };

    const { data: roleData } = await supabase
        .from('center_roles')
        .select('role')
        .eq('organization_id', centerId)
        .eq('user_id', user.id)
        .single();

    if (roleData?.role === 'head_coach') return { level: 'head_coach' };
    if (roleData?.role === 'coach') return { level: 'coach' };

    return { level: 'none' };
}
