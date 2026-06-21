'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { PUBLIC_ORG_COLUMNS } from "@/lib/org-columns";

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

    const { data: existingMember } = await supabase.from('members').select('id').eq('center_id', centerId).eq('user_id', user.id).maybeSingle();
    if (existingMember) return { error: "Ya eres miembro." };

    const { data: existingReq } = await supabase.from('trial_requests').select('id').eq('organization_id', centerId).eq('user_id', user.id).eq('status', 'pending').maybeSingle();
    if (existingReq) return { error: "Ya tienes una solicitud." };

    const { error } = await supabase.from('trial_requests').insert({ organization_id: centerId, user_id: user.id, status: 'pending', request_date: new Date().toISOString(), scheduled_date: date || null, class_id: classId || null });
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
        if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
    }

    revalidatePath(`/dashboard/gyms/${centerId}/members`);
    revalidatePath(`/dashboard/gyms/${centerId}/memberships`);
    return { success: true };
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

    const finalClasses = sorted.map((c: any) => ({
        ...c,
        coach: coaches.find(coach => coach.id === c.coach_id) || { full_name: 'Staff' },
        scheduled_time: c.scheduled_time || `${date}T${c.time || '00:00:00'}`,
        enrolled_count: (c.scheduled_time && c.scheduled_time.split('T')[0] === date) 
            ? ((c.enrollments?.[0]?.count || 0) + (pendingRequestCounts[c.id] || 0)) 
            : 0,
        wod: dailyWod,
        is_enrolled: userEnrollments.has(c.id)
    }));

    return finalClasses;
}
