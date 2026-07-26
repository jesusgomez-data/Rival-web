'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
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

    // Waitlist (ordered by arrival) — visible to staff on the class detail
    const { data: waitlist } = await supabase
        .from('class_waitlist')
        .select(`
            id,
            created_at,
            member:member_id (
                id,
                full_name,
                avatar_url,
                email
            )
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

    return {
        ...finalClassData,
        enrollments: enrollments || [],
        waitlist: waitlist || []
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

    // If capacity was increased, promote people waiting for a spot
    await promoteFromWaitlist(classId);

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
        // members.avatar_url es un campo del registro de socio del centro
        // (casi nunca se rellena) — la foto real del atleta vive en
        // profiles.avatar_url. Antes solo se traía username de aquí, así que
        // la foto real nunca llegaba y siempre se veía el fallback genérico.
        const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
        if (profiles) {
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            attendees.forEach((a: any) => {
                const profile = profileMap.get(a.user_id);
                if (a.user_id && profile) {
                    a.username = profile.username;
                    a.avatar_url = profile.avatar_url || a.avatar_url;
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

    const { data: member } = await supabase.from('members').select('id, status, membership_end_date').eq('center_id', centerId).eq('user_id', user.id).single();
    if (!member || (member.status !== 'active' && member.status !== 'trial')) return { error: "Membresía no válida." };

    // Expired membership → block booking
    if (member.membership_end_date && new Date(member.membership_end_date) < new Date(new Date().toDateString())) {
        return { error: "Tu membresía ha vencido. Renuévala para volver a reservar clases." };
    }

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

    const getScheduledTime = (e: any) => {
        if (!e.class) return null;
        if (Array.isArray(e.class)) return e.class[0]?.scheduled_time;
        return e.class.scheduled_time;
    };

    const nowStr = now.toISOString();
    const past = (pastEnrollments || [])
        .filter((e: any) => {
            const t = getScheduledTime(e);
            return t && t < nowStr;
        })
        .sort((a: any, b: any) => {
            const tA = getScheduledTime(a);
            const tB = getScheduledTime(b);
            return new Date(tB || 0).getTime() - new Date(tA || 0).getTime();
        });

    if (past.length >= 3) {
        const last3NoShows = past.slice(0, 3).every((e: any) => e.attended === false);
        if (last3NoShows) {
            // Penalty starts at the scheduled time of the most recent missed class
            const lastMissedTime = new Date(getScheduledTime(past[0]) || 0);
            const penaltyEndTime = new Date(lastMissedTime.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days penalty

            if (now < penaltyEndTime) {
                const diffTime = penaltyEndTime.getTime() - now.getTime();
                const hoursLeft = Math.ceil(diffTime / (1000 * 60 * 60));
                return { error: `Reserva no permitida. Tienes una penalización activa de 2 días por acumular 3 inasistencias consecutivas. Podrás reservar en ${hoursLeft} horas.` };
            }
        }
    }

    // 4. Validate capacity → if full, signal the UI so it can offer the waitlist
    if ((classData.class_enrollments?.[0]?.count || 0) >= classData.max_capacity) {
        return { error: "Clase completa. Puedes unirte a la lista de espera.", full: true };
    }

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

    // Promote the first person on the waitlist into the freed spot (fire-and-forget safe)
    await promoteFromWaitlist(classId);
    revalidatePath('/dashboard/my-bookings');

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

// ═══════════════════════════════════════════════════════════════
// LISTA DE ESPERA
// ═══════════════════════════════════════════════════════════════

/**
 * Promotes waitlisted members into free spots of a class.
 * Runs with the admin client (enrollment is created on behalf of the member).
 * Safe to call anytime: it checks free capacity and that the class hasn't started.
 */
async function promoteFromWaitlist(classId: string) {
    try {
        const admin = createAdminClient();

        const { data: classData } = await admin
            .from('classes')
            .select('id, name, scheduled_time, max_capacity, organization_id, organization:organization_id(name), enrollments:class_enrollments(count)')
            .eq('id', classId)
            .single();

        if (!classData) return;
        if (new Date(classData.scheduled_time) <= new Date()) return; // Class already started

        let freeSpots = (classData.max_capacity || 0) - (classData.enrollments?.[0]?.count || 0);
        if (freeSpots <= 0) return;

        const { data: waitlist } = await admin
            .from('class_waitlist')
            .select('id, member:member_id (id, user_id, full_name, status)')
            .eq('class_id', classId)
            .order('created_at', { ascending: true })
            .limit(freeSpots);

        if (!waitlist || waitlist.length === 0) return;

        const orgName = Array.isArray(classData.organization)
            ? (classData.organization[0] as any)?.name
            : (classData.organization as any)?.name;

        for (const entry of waitlist) {
            const member: any = Array.isArray(entry.member) ? entry.member[0] : entry.member;
            if (!member) continue;

            // Skip members whose membership is no longer valid; free their spot on the list
            if (member.status !== 'active' && member.status !== 'trial') {
                await admin.from('class_waitlist').delete().eq('id', entry.id);
                continue;
            }

            const { error: enrollError } = await admin.from('class_enrollments').insert({
                class_id: classId,
                member_id: member.id,
                enrollment_date: new Date().toISOString(),
                attended: null
            });
            if (enrollError) {
                console.error('[promoteFromWaitlist] Enroll error:', enrollError);
                continue;
            }

            await admin.from('class_waitlist').delete().eq('id', entry.id);

            if (member.user_id) {
                const timeStr = new Date(classData.scheduled_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                await createNotification({
                    userId: member.user_id,
                    type: 'waitlist_promoted',
                    title: '¡Tienes plaza! 🎉',
                    content: `Se ha liberado una plaza en ${classData.name} (${timeStr}) de ${orgName || 'tu centro'}. Tu reserva se ha confirmado automáticamente.`,
                    link: `/gym/${classData.organization_id}`
                });
            }
        }
    } catch (err) {
        console.error('[promoteFromWaitlist] Unexpected error:', err);
    }
}

export async function joinWaitlist(centerId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión." };

    const { data: member } = await supabase.from('members').select('id, status, membership_end_date').eq('center_id', centerId).eq('user_id', user.id).single();
    if (!member || (member.status !== 'active' && member.status !== 'trial')) return { error: "Membresía no válida." };

    // Expired membership → block waitlist too
    if (member.membership_end_date && new Date(member.membership_end_date) < new Date(new Date().toDateString())) {
        return { error: "Tu membresía ha vencido. Renuévala para volver a reservar clases." };
    }

    const { data: classData } = await supabase
        .from('classes')
        .select('name, scheduled_time, max_capacity, class_enrollments(count)')
        .eq('id', classId)
        .single();
    if (!classData) return { error: "Clase no encontrada." };

    if (new Date(classData.scheduled_time) <= new Date()) {
        return { error: "La clase ya ha comenzado." };
    }

    // Only makes sense if the class is actually full
    if ((classData.class_enrollments?.[0]?.count || 0) < classData.max_capacity) {
        return { error: "Hay plazas libres. Reserva directamente." };
    }

    const { data: enrolled } = await supabase.from('class_enrollments').select('id').eq('class_id', classId).eq('member_id', member.id).maybeSingle();
    if (enrolled) return { error: "Ya estás inscrito en esta clase." };

    const { data: existing } = await supabase.from('class_waitlist').select('id').eq('class_id', classId).eq('member_id', member.id).maybeSingle();
    if (existing) return { error: "Ya estás en la lista de espera." };

    const { error } = await supabase.from('class_waitlist').insert({ class_id: classId, member_id: member.id });
    if (error) {
        console.error('[joinWaitlist] Insert error:', error);
        return { error: "No se pudo apuntar a la lista de espera. Inténtalo de nuevo." };
    }

    const { count } = await supabase.from('class_waitlist').select('id', { count: 'exact', head: true }).eq('class_id', classId);

    revalidatePath(`/gym/${centerId}`);
    return {
        success: true,
        position: count || 1,
        message: `Estás en la lista de espera (posición ${count || 1}). Si se libera una plaza, tu reserva se confirmará automáticamente y te avisaremos.`
    };
}

export async function leaveWaitlist(centerId: string, classId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Inicia sesión." };

    const { data: member } = await supabase.from('members').select('id').eq('center_id', centerId).eq('user_id', user.id).single();
    if (!member) return { error: "Membresía no encontrada." };

    const { error } = await supabase.from('class_waitlist').delete().eq('class_id', classId).eq('member_id', member.id);
    if (error) return { error: "No se pudo salir de la lista de espera." };

    revalidatePath(`/gym/${centerId}`);
    revalidatePath('/dashboard/my-bookings');
    return { success: true };
}

/**
 * Próximas clases del usuario en todos sus centros:
 * reservas confirmadas + entradas en lista de espera.
 */
export async function getMyUpcomingClasses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { enrollments: [], waitlist: [] };

    const { data: memberships } = await supabase
        .from('members')
        .select('id, center_id')
        .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) return { enrollments: [], waitlist: [] };
    const memberIds = memberships.map(m => m.id);

    const nowIso = new Date().toISOString();
    const classSelect = `
        id,
        created_at,
        class:class_id (
            id,
            name,
            scheduled_time,
            duration_minutes,
            organization_id,
            coach:profiles!coach_id (full_name),
            organization:organization_id (name, logo_url)
        )
    `;

    const [{ data: enrollRows }, { data: waitlistRows }] = await Promise.all([
        supabase.from('class_enrollments').select(classSelect).in('member_id', memberIds),
        supabase.from('class_waitlist').select(classSelect).in('member_id', memberIds)
    ]);

    const normalize = (rows: any[] | null) =>
        (rows || [])
            .map((r: any) => {
                const cls = Array.isArray(r.class) ? r.class[0] : r.class;
                if (!cls) return null;
                const coach = Array.isArray(cls.coach) ? cls.coach[0] : cls.coach;
                const org = Array.isArray(cls.organization) ? cls.organization[0] : cls.organization;
                return {
                    id: r.id,
                    class_id: cls.id,
                    name: cls.name,
                    scheduled_time: cls.scheduled_time,
                    duration_minutes: cls.duration_minutes,
                    center_id: cls.organization_id,
                    center_name: org?.name || 'Centro',
                    center_logo: org?.logo_url || null,
                    coach_name: coach?.full_name || null
                };
            })
            .filter((r: any) => r && r.scheduled_time && r.scheduled_time >= nowIso)
            .sort((a: any, b: any) => a.scheduled_time.localeCompare(b.scheduled_time));

    return {
        enrollments: normalize(enrollRows),
        waitlist: normalize(waitlistRows)
    };
}

