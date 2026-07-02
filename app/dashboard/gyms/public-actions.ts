'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { PUBLIC_ORG_COLUMNS } from "@/lib/org-columns";
import { headers } from "next/headers";
import { broadcastNotifications } from "@/app/dashboard/notifications-actions";

export async function getPublicCenter(centerId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('organizations')
        .select(`${PUBLIC_ORG_COLUMNS}, head_coach:head_coach_id (id, full_name, avatar_url, username)`)
        .eq('id', centerId)
        .single();
    return data;
}

export async function checkFollowStatus(centerId: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await adminSupabase.from('center_followers').select('id').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
    return !!data;
}

export async function checkCenterFollowing(centerId: string) {
    return checkFollowStatus(centerId);
}

export async function toggleFollow(centerId: string, isFollowing: boolean) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión para seguir." };

    if (isFollowing) {
        await adminSupabase.from('center_followers').delete().eq('organization_id', centerId).eq('user_id', user.id);
    } else {
        await adminSupabase.from('center_followers').insert({ organization_id: centerId, user_id: user.id });
    }
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function getMemberStatus(centerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('members').select('id, status, plan, cancellation_requested_at').eq('center_id', centerId).eq('user_id', user.id).maybeSingle();
    return data;
}

export async function requestTrial(centerId: string, date?: string, classId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión para solicitar una prueba." };

    // Get client IP address and enforce strict trial rules
    const headersList = await headers();
    const rawIp = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "127.0.0.1";
    const ip = rawIp.split(',')[0].trim();
    const ipPattern = `IP: ${ip}`;

    // Validation 1: Only 1 trial request/booking per center per user
    const { data: existingTrial } = await supabase
        .from('trial_requests')
        .select('id')
        .eq('organization_id', centerId)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

    const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('center_id', centerId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existingTrial || existingMember) {
        return { error: "Ya has reservado o solicitado una clase de prueba en este centro." };
    }

    // Validation 2: Evasion check using client IP (double accounts)
    const { data: duplicateIpRequest } = await supabase
        .from('trial_requests')
        .select('id')
        .eq('organization_id', centerId)
        .eq('feedback_text', ipPattern)
        .limit(1)
        .maybeSingle();

    if (duplicateIpRequest) {
        return { error: "Ya se ha registrado una clase de prueba desde este dispositivo o conexión a internet para este centro." };
    }

    // Validation 3: Maximum of 3 trials per calendar month across all centers
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: trialCount } = await supabase
        .from('trial_requests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth);

    if (trialCount !== null && trialCount >= 3) {
        return { error: "Has alcanzado el límite máximo de 3 clases de prueba por mes." };
    }

    const { error } = await supabase.from('trial_requests').insert({ 
        organization_id: centerId, 
        user_id: user.id, 
        status: 'pending', 
        request_date: new Date().toISOString(), 
        scheduled_date: date || null, 
        class_id: classId || null,
        feedback_text: ipPattern
    });
    if (error) return { error: error.message };

    // Trigger Notification for Staff
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const { data: org } = await supabase.from('organizations').select('name, owner_id, head_coach_id').eq('id', centerId).single();

    if (org) {
        const notifications = [];
        const message = `${profile?.full_name || 'Un usuario'} ha solicitado una prueba gratuita.`;
        const link = `/dashboard/gyms/${centerId}/members`;

        if (org.owner_id && org.owner_id !== user.id) {
            notifications.push({ user_id: org.owner_id, type: 'trial_request', title: 'Solicitud de Prueba', content: message, link, is_read: false });
        }
        if (org.head_coach_id && org.head_coach_id !== user.id && org.head_coach_id !== org.owner_id) {
            notifications.push({ user_id: org.head_coach_id, type: 'trial_request', title: 'Solicitud de Prueba', content: message, link, is_read: false });
        }
        // @ts-ignore
        if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
            broadcastNotifications(notifications).catch(() => {});
        }
    }

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    return { success: true };
}

export async function hasUsedTrialStatus(centerId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if there's any trial request at this center for this user
    const { data: trialReq } = await supabase
        .from('trial_requests')
        .select('id')
        .eq('organization_id', centerId)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

    if (trialReq) return true;

    // Also check if there's a member record for this user at this center
    const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('center_id', centerId)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

    return !!member;
}

export async function getClassesForDate(centerId: string, date: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser(); // Get user

    const d = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[d.getDay()];
    const startOfDay = new Date(date).toISOString();
    const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999)).toISOString();

    const { data, error } = await supabase
        .from('classes')
        .select(`id, name, scheduled_time, day_of_week, time, duration_minutes, max_capacity, coach_id, enrollments:class_enrollments(count)`)
        .eq('organization_id', centerId)
        .gte('scheduled_time', startOfDay)
        .lte('scheduled_time', endOfDay);

    if (error) return [];

    const coachIds = [...new Set(data.map(c => c.coach_id).filter(Boolean))];
    let coaches: any[] = [];
    if (coachIds.length > 0) {
        const { data: coachData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', coachIds);
        coaches = coachData || [];
    }

    const filtered = data;

    const sorted = [...filtered].sort((a, b) => (a.scheduled_time || "").localeCompare(b.scheduled_time || ""));

    const { data: wods } = await supabase
        .from('center_posts')
        .select('*')
        .eq('organization_id', centerId)
        .eq('post_type', 'wod')
        .gte('scheduled_for', startOfDay)
        .lte('scheduled_for', endOfDay);

    const dailyWod = wods && wods.length > 0 ? wods[0] : null;

    // Check user enrollment if logged in
    let userEnrollments = new Set();
    const classIds = sorted.map(c => c.id);
    let pendingRequestCounts: Record<string, number> = {};

    if (user && classIds.length > 0) {
        const { data: enrolls } = await supabase
            .from('class_enrollments')
            .select('class_id, member!inner(user_id)')
            .eq('member.user_id', user.id)
            .in('class_id', classIds);

        if (enrolls) {
            enrolls.forEach(e => userEnrollments.add(e.class_id));
        }
    }

    if (classIds.length > 0) {
        const { data: pendingReqs } = await supabase
            .from('trial_requests')
            .select('class_id')
            .in('class_id', classIds)
            .eq('status', 'pending');

        if (pendingReqs) {
            pendingReqs.forEach(req => {
                if (req.class_id) {
                    pendingRequestCounts[req.class_id] = (pendingRequestCounts[req.class_id] || 0) + 1;
                }
            });
        }
    }

    // Waitlist info: total per class + whether current user is on it
    // (Fails gracefully if the class_waitlist table doesn't exist yet)
    const waitlistCounts: Record<string, number> = {};
    const userWaitlisted = new Set();
    if (classIds.length > 0) {
        const { data: waitlistRows } = await supabase
            .from('class_waitlist')
            .select('class_id, member:member_id (user_id)')
            .in('class_id', classIds);

        if (waitlistRows) {
            waitlistRows.forEach((w: any) => {
                waitlistCounts[w.class_id] = (waitlistCounts[w.class_id] || 0) + 1;
                const memberUserId = Array.isArray(w.member) ? w.member[0]?.user_id : w.member?.user_id;
                if (user && memberUserId === user.id) {
                    userWaitlisted.add(w.class_id);
                }
            });
        }
    }

    const finalClasses = sorted.map((c: any) => ({
        ...c,
        coach: coaches.find(coach => coach.id === c.coach_id) || { full_name: 'Staff' },
        scheduled_time: c.scheduled_time || `${date}T${c.time || '00:00:00'}`,
        enrolled_count: (c.scheduled_time && c.scheduled_time.split('T')[0] === date)
            ? ((c.enrollments?.[0]?.count || 0) + (pendingRequestCounts[c.id] || 0))
            : 0,
        wod: dailyWod,
        is_enrolled: userEnrollments.has(c.id),
        waitlist_count: waitlistCounts[c.id] || 0,
        is_waitlisted: userWaitlisted.has(c.id)
    }));

    return finalClasses;
}
