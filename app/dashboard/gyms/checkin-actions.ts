'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getTodayClasses(orgId: string) {
    const admin = createAdminClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const { data: classes } = await admin
        .from('classes')
        .select('id, name, scheduled_time, capacity, coach_id')
        .eq('organization_id', orgId)
        .gte('scheduled_time', startOfDay)
        .lt('scheduled_time', endOfDay)
        .order('scheduled_time', { ascending: true });

    return classes || [];
}

export async function getClassWithEnrollments(classId: string, orgId: string) {
    const admin = createAdminClient();

    const [{ data: classData }, { data: enrollments }] = await Promise.all([
        admin.from('classes').select('id, name, scheduled_time, capacity, coach_id').eq('id', classId).single(),
        admin.from('class_enrollments').select('id, member_id, attended, created_at').eq('class_id', classId)
    ]);

    if (!classData) return null;

    // Get member details
    const memberIds = (enrollments || []).map((e: any) => e.member_id);
    let memberMap: Record<string, any> = {};
    if (memberIds.length > 0) {
        const { data: members } = await admin
            .from('members')
            .select('id, full_name, plan, status')
            .in('id', memberIds);
        (members || []).forEach((m: any) => { memberMap[m.id] = m; });
    }

    const enrichedEnrollments = (enrollments || []).map((e: any) => ({
        ...e,
        member: memberMap[e.member_id] || null
    }));

    return { ...classData, enrollments: enrichedEnrollments };
}

export async function markMemberAttended(enrollmentId: string, attended: boolean, orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const admin = createAdminClient();
    const { error } = await admin
        .from('class_enrollments')
        .update({ attended })
        .eq('id', enrollmentId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${orgId}/checkin`);
    return { success: true };
}

export async function quickEnrollAndCheckin(orgId: string, memberId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const admin = createAdminClient();

    // Check if already enrolled
    const { data: existing } = await admin
        .from('class_enrollments')
        .select('id, attended')
        .eq('class_id', classId)
        .eq('member_id', memberId)
        .single();

    if (existing) {
        // Already enrolled — just mark as attended
        const { error } = await admin
            .from('class_enrollments')
            .update({ attended: true })
            .eq('id', existing.id);
        if (error) return { error: error.message };
        revalidatePath(`/dashboard/gyms/${orgId}/checkin`);
        return { success: true };
    }

    // Enroll and mark attended
    const { error } = await admin
        .from('class_enrollments')
        .insert({ class_id: classId, member_id: memberId, attended: true });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${orgId}/checkin`);
    return { success: true };
}

export async function getCheckinStats(orgId: string) {
    const admin = createAdminClient();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - (day === 0 ? 6 : day - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const [{ data: todayClasses }, { data: weekEnrollments }] = await Promise.all([
        admin.from('classes').select('id').eq('organization_id', orgId).gte('scheduled_time', startOfDay),
        admin.from('class_enrollments')
            .select('member_id, attended, class:classes!inner(organization_id, scheduled_time)')
            .eq('class.organization_id', orgId)
            .eq('attended', true)
            .gte('class.scheduled_time', startOfWeek.toISOString())
    ]);

    const classIds = (todayClasses || []).map((c: any) => c.id);
    let todayAttended = 0;
    if (classIds.length > 0) {
        const { count } = await admin
            .from('class_enrollments')
            .select('id', { count: 'exact', head: true })
            .in('class_id', classIds)
            .eq('attended', true);
        todayAttended = count || 0;
    }

    const weekUnique = new Set((weekEnrollments || []).map((e: any) => e.member_id)).size;

    return {
        todayAttended,
        weekUniqueAttendees: weekUnique,
        todayClassCount: (todayClasses || []).length,
    };
}

export async function getOrgMembersForCheckin(orgId: string) {
    const admin = createAdminClient();
    const { data: members } = await admin
        .from('members')
        .select('id, full_name, plan, status')
        .eq('center_id', orgId)
        .eq('status', 'active')
        .order('full_name', { ascending: true });
    return members || [];
}

export async function checkinWithQR(classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión para realizar check-in." };

    const admin = createAdminClient();

    // 1. Get Class Details & Organization
    const { data: classData, error: classError } = await admin
        .from('classes')
        .select('id, name, organization_id, max_capacity, enrollments:class_enrollments(count)')
        .eq('id', classId)
        .single();

    if (classError || !classData) {
        return { error: "Clase no encontrada." };
    }

    const orgId = classData.organization_id;

    // 2. Find member record
    const { data: member, error: memberError } = await admin
        .from('members')
        .select('id, status')
        .eq('center_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (memberError || !member) {
        return { error: "No eres miembro de este centro. Debes inscribirte primero." };
    }

    if (member.status !== 'active' && member.status !== 'trial') {
        return { error: "Tu membresía no está activa." };
    }

    // 3. Check existing enrollment
    const { data: existing } = await admin
        .from('class_enrollments')
        .select('id, attended')
        .eq('class_id', classId)
        .eq('member_id', member.id)
        .maybeSingle();

    if (existing) {
        if (existing.attended) {
            return { success: true, alreadyCheckedIn: true, className: classData.name };
        }
        // Mark as attended
        const { error } = await admin
            .from('class_enrollments')
            .update({ attended: true })
            .eq('id', existing.id);
        if (error) return { error: error.message };
    } else {
        // Check capacity
        const enrolledCount = classData.enrollments?.[0]?.count || 0;
        if (enrolledCount >= (classData.max_capacity || 20)) {
            return { error: "La clase está completa." };
        }

        // Create enrollment and mark attended
        const { error } = await admin
            .from('class_enrollments')
            .insert({
                class_id: classId,
                member_id: member.id,
                attended: true,
                enrollment_date: new Date().toISOString()
            });
        if (error) return { error: error.message };
    }

    revalidatePath(`/dashboard/gyms/${orgId}/checkin`);
    revalidatePath(`/gym/${orgId}`);
    return { success: true, className: classData.name };
}

