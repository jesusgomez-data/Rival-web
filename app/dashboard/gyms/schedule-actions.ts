'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "../notifications-actions";

export async function getCenterClasses(id: string, date?: string, isCenterId: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
        .from('classes')
        .select(`
            *,
            coach:profiles!coach_id (full_name, avatar_url),
            enrollments:class_enrollments(count)
        `)
        .order('scheduled_time', { ascending: true });

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    if (date) {
        const startOfDay = new Date(date).toISOString();
        const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999)).toISOString();
        query = query.gte('scheduled_time', startOfDay).lte('scheduled_time', endOfDay);
    } else {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        query = query.gte('scheduled_time', startOfToday.toISOString());
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching classes:", error);
        return [];
    }

    // Fetch user's results for these classes
    let userResults: any[] = [];
    let userEnrollments: any[] = [];
    if (user && data.length > 0) {
        const classIds = data.map(c => c.id);

        const { data: results } = await supabase
            .from('class_results')
            .select('*')
            .eq('user_id', user.id)
            .in('class_id', classIds);
        userResults = results || [];

        // Check if user is enrolled
        const { data: enrollments } = await supabase
            .from('class_enrollments')
            .select('class_id, member!inner(user_id)')
            .eq('member.user_id', user.id)
            .in('class_id', classIds);

        userEnrollments = enrollments || [];
    }

    return data.map((c: any) => ({
        ...c,
        enrolled_count: c.enrollments?.[0]?.count || 0,
        my_result: userResults.find(r => r.class_id === c.id) || null,
        is_enrolled: userEnrollments.some(e => e.class_id === c.id)
    }));
}

export async function getClassesRange(id: string, startDate: string, endDate: string, isCenterId: boolean = false) {
    const supabase = await createClient();

    let query = supabase
        .from('classes')
        .select(`
            *,
            enrollments:class_enrollments(count)
        `);

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    const { data, error } = await query
        .gte('scheduled_time', startDate)
        .lte('scheduled_time', endDate)
        .order('scheduled_time', { ascending: true });

    if (error) {
        console.error("Error fetching classes range:", error);
        return [];
    }

    if (!data) return [];

    const coachIds = [...new Set(data.map(c => c.coach_id).filter(Boolean))];
    let coaches: any[] = [];
    if (coachIds.length > 0) {
        const { data: coachData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', coachIds);
        coaches = coachData || [];
    }

    const classIds = data.map(c => c.id);
    let pendingRequestCounts: Record<string, number> = {};
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

    return data.map((c: any) => {
        const coach = coaches.find(coach => coach.id === c.coach_id);
        return {
            ...c,
            enrolled_count: (c.enrollments?.[0]?.count || 0) + (pendingRequestCounts[c.id] || 0),
            coach: coach || { full_name: 'Staff' }
        };
    });
}

export async function getClassDetails(classId: string) {
    const supabase = await createClient();

    // 1. Fetch Class Data (Simple select)
    const { data: classData, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

    if (error || !classData) {
        console.error("Error fetching class details:", error);
        return null;
    }

    // 2. Fetch Coach Profile separately
    let coach = null;
    if (classData.coach_id) {
        const { data: coachData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', classData.coach_id)
            .single();
        coach = coachData;
    }

    const finalClassData = { ...classData, coach };

    const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select(`
            id,
            enrollment_date,
            attended,
            member:member_id (
                id,
                full_name,
                email,
                avatar_url,
                plan,
                status,
                user_id,
                birth_date,
                user:profiles!user_id (
                    username
                )
            )
        `)
        .eq('class_id', classId);

    return {
        ...finalClassData,
        enrollments: enrollments || []
    };
}

export async function createClass(centerId: string, data: any) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        // PERMISSION CHECK & PLAN LIMITS
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id, plan').eq('id', centerId).single();

        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);
        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') return { error: "Unauthorized: Only Owners and Head Coaches can manage classes." };
        }

        // Check Free Plan Limits (10 classes/week)
        if (org?.plan === 'free') {
            const targetDate = new Date(data.scheduled_time);
            const day = targetDate.getDay(); // 0 (Sun) to 6 (Sat)
            // Adjust to Monday start
            const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);

            const startOfWeek = new Date(targetDate);
            startOfWeek.setDate(diff);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            const { count } = await supabase
                .from('classes')
                .select('id', { count: 'exact', head: true })
                .eq('organization_id', centerId)
                .gte('scheduled_time', startOfWeek.toISOString())
                .lte('scheduled_time', endOfWeek.toISOString());

            if ((count || 0) >= 10) {
                return { error: "Plan Gratuito limitado a 10 clases/semana. Mejora a Starter para clases ilimitadas." };
            }
        }

        const scheduledDate = new Date(data.scheduled_time);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[scheduledDate.getUTCDay()];

        const hours = String(scheduledDate.getUTCHours()).padStart(2, '0');
        const minutes = String(scheduledDate.getUTCMinutes()).padStart(2, '0');
        const seconds = String(scheduledDate.getUTCSeconds()).padStart(2, '0');
        const timeString = `${hours}:${minutes}:${seconds}`;

        const { error } = await supabase
            .from('classes')
            .insert({
                organization_id: centerId,
                center_id: data.center_id || null,
                name: data.name || 'Unnamed Class',
                description: data.description || '',
                coach_id: data.coach_id || null,
                day_of_week: dayOfWeek,
                time: timeString,
                capacity: parseInt(data.capacity) || 20,
                max_capacity: parseInt(data.capacity) || 20,
                duration_minutes: parseInt(data.duration) || 60,
                scheduled_time: data.scheduled_time,
                class_type: data.type || 'general',
                difficulty: data.difficulty || 'intermediate',
                color: data.color || '#dc2626'
            });

        if (error) return { error: error.message };

        revalidatePath(`/dashboard/gyms/${centerId}/schedule`);
        revalidatePath(`/dashboard/gyms/${centerId}/schedule/[classId]`, 'page');
        revalidatePath(`/gym/${centerId}`);
        return { success: true };
    } catch (err: any) {
        return { error: err.message || 'Unknown error' };
    }
}

export async function updateClass(centerId: string, classId: string, data: any) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // PERMISSION CHECK
    const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
    const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);
    if (!isOwnerOrHead) {
        const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
        if (roleData?.role !== 'head_coach') return { error: "Unauthorized: Only Owners and Head Coaches can manage classes." };
    }

    const d = new Date(data.scheduled_time);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[d.getUTCDay()];

    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    const { error } = await supabase
        .from('classes')
        .update({
            name: data.name,
            coach_id: data.coach_id || null,
            scheduled_time: data.scheduled_time,
            duration_minutes: parseInt(data.duration),
            capacity: parseInt(data.capacity),
            max_capacity: parseInt(data.capacity),
            class_type: data.type,
            difficulty: data.difficulty,
            day_of_week: dayOfWeek,
            time: timeString,
            description: data.description || ''
        })
        .eq('id', classId)
        .eq('organization_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/schedule`);
    revalidatePath(`/dashboard/gyms/${centerId}/schedule/${classId}`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function deleteClass(centerId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // PERMISSION CHECK
    const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
    const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);
    if (!isOwnerOrHead) {
        const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
        if (roleData?.role !== 'head_coach') return { error: "Unauthorized: Only Owners and Head Coaches can manage classes." };
    }

    const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId)
        .eq('organization_id', centerId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/gyms/${centerId}/schedule`);
    return { success: true };
}

export async function getClassResults(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('class_results')
        .select(`
            *,
            user:user_id (full_name, avatar_url)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data;
}

export async function markAttendance(enrollmentId: string, attended: boolean | null, path: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('class_enrollments')
        .update({ attended: attended })
        .eq('id', enrollmentId);

    if (error) return { error: error.message };
    revalidatePath(path);
    return { success: true };
}

export async function getClassAttendees(classId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('class_enrollments')
        .select(`
            member:member_id (
                full_name,
                avatar_url,
                user_id
            )
        `)
        .eq('class_id', classId);

    if (!data) return [];

    const attendees = data.map((d: any) => d.member);

    const userIds = attendees.filter((a: any) => a.user_id).map((a: any) => a.user_id);
    if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
        if (profiles) {
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            attendees.forEach((a: any) => {
                const profile = profileMap.get(a.user_id);
                if (a.user_id && profile) {
                    a.username = profile.username;
                }
            });
        }
    }

    return attendees;
}

export async function enrollInClass(centerId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión." };

    const { data: member } = await supabase.from('members').select('id, status').eq('center_id', centerId).eq('user_id', user.id).single();
    if (!member || (member.status !== 'active' && member.status !== 'trial')) return { error: "Membresía no válida." };

    // 1. Fetch Class Data (including scheduled_time)
    const { data: classData } = await supabase.from('classes').select('scheduled_time, max_capacity, class_enrollments(count)').eq('id', classId).single();
    if (!classData) return { error: "Clase no encontrada." };

    // 2. Validate Booking Window: Must be at least 20 minutes before start time
    const now = new Date();
    const classTime = new Date(classData.scheduled_time);
    const diffMs = classTime.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins < 20) {
        return { error: "Solo se puede reservar hasta 20 minutos antes del inicio de la clase." };
    }

    // 3. Check for No-Show Penalty (3 consecutive no-shows = 2 days ban)
    const { data: pastEnrollments } = await supabase
        .from('class_enrollments')
        .select(`
            id,
            attended,
            class:classes!inner(scheduled_time)
        `)
        .eq('member_id', member.id);

    const nowStr = now.toISOString();
    const past = (pastEnrollments || [])
        .filter((e: any) => e.class && e.class.scheduled_time < nowStr)
        .sort((a: any, b: any) => new Date(b.class.scheduled_time).getTime() - new Date(a.class.scheduled_time).getTime());

    if (past.length >= 3) {
        const last3NoShows = past.slice(0, 3).every((e: any) => e.attended === false);
        if (last3NoShows) {
            // Penalty starts at the scheduled time of the most recent missed class
            const lastMissedTime = new Date(past[0].class.scheduled_time);
            const penaltyEndTime = new Date(lastMissedTime.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days penalty

            if (now < penaltyEndTime) {
                const diffTime = penaltyEndTime.getTime() - now.getTime();
                const hoursLeft = Math.ceil(diffTime / (1000 * 60 * 60));
                return { error: `Reserva no permitida. Tienes una penalización activa de 2 días por acumular 3 inasistencias consecutivas. Podrás reservar en ${hoursLeft} horas.` };
            }
        }
    }

    // 4. Validate capacity
    if ((classData.class_enrollments?.[0]?.count || 0) >= classData.max_capacity) return { error: "Sin cupo." };

    const { data: existing } = await supabase.from('class_enrollments').select('id').eq('class_id', classId).eq('member_id', member.id).maybeSingle();
    if (existing) return { error: "Ya inscrito." };

    await supabase.from('class_enrollments').insert({ class_id: classId, member_id: member.id, enrollment_date: new Date().toISOString(), attended: null });

    // Notification
    const { data: classInfo } = await supabase.from('classes').select('name, organization:organization_id(name)').eq('id', classId).single();
    if (classInfo) {
        await createNotification({
            userId: user.id,
            type: 'class_reservation',
            title: 'Reserva Confirmada',
            // @ts-ignore
            content: `Has reservado tu lugar en ${classInfo.name} en ${classInfo.organization?.name || 'el centro'}.`,
            link: `/gym/${centerId}`
        });
    }

    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function unenrollFromClass(centerId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión." };

    const { data: member } = await supabase.from('members').select('id').eq('center_id', centerId).eq('user_id', user.id).single();
    if (!member) return { error: "Membresía no encontrada." };

    // 1. Fetch Class Data (including scheduled_time)
    const { data: classInfo } = await supabase.from('classes').select('name, scheduled_time, organization:organization_id(name)').eq('id', classId).single();
    if (!classInfo) return { error: "Clase no encontrada." };

    // 2. Validate Cancellation Window: Must be at least 15 minutes before start time
    const now = new Date();
    const classTime = new Date(classInfo.scheduled_time);
    const diffMs = classTime.getTime() - now.getTime();
    const diffMins = diffMs / (1000 * 60);

    if (diffMins < 15) {
        return { error: "Solo puedes cancelar la reserva hasta 15 minutos antes del inicio de la clase." };
    }

    const { data: existing } = await supabase.from('class_enrollments').select('id').eq('class_id', classId).eq('member_id', member.id).maybeSingle();
    if (!existing) return { error: "No estás inscrito." };

    const { error } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('id', existing.id);

    if (error) return { error: error.message };

    // Notification for cancellation
    if (classInfo) {
        await createNotification({
            userId: user.id,
            type: 'class_cancellation',
            title: 'Reserva Cancelada',
            // @ts-ignore
            content: `Has cancelado tu reserva en ${classInfo.name} en ${classInfo.organization?.name || 'el centro'}.`,
            link: `/gym/${centerId}`
        });
    }

    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

