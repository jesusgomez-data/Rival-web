'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Book a trial class
 * - Checks if user is authenticated
 * - Checks if class has availability
 * - Creates trial enrollment
 * - Sends notifications to gym owner and head coach
 */
export async function bookTrialClass(classId: string, centerId: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "Debes iniciar sesión para reservar una clase de prueba" };
    }

    // 2. Get class details and check availability
    const { data: classData, error: classError } = await adminSupabase
        .from('classes')
        .select(`
            id,
            name,
            scheduled_time,
            max_capacity,
            organization_id,
            enrollments:class_enrollments(count)
        `)
        .eq('id', classId)
        .single();

    if (classError || !classData) {
        return { error: "Clase no encontrada" };
    }

    const enrolledCount = classData.enrollments?.[0]?.count || 0;
    if (enrolledCount >= classData.max_capacity) {
        return { error: "Esta clase está completa. No hay plazas disponibles." };
    }

    // 3. Check if user already has a trial booking OR is a member
    // Use admin client to check membership status reliably
    const { data: existingMember } = await adminSupabase
        .from('members')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('center_id', centerId)
        .maybeSingle();

    let memberId = existingMember?.id;

    // 4. Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single();

    // 5. If not a member, create a Trial Member record automatically using ADMIN privileges
    if (!memberId) {
        const { data: newMember, error: createMemberError } = await adminSupabase
            .from('members')
            .insert({
                center_id: centerId,
                user_id: user.id,
                full_name: profile?.full_name || 'Atleta en Prueba',
                email: profile?.email || `user_${user.id.substring(0, 8)}@rival.app`,
                avatar_url: profile?.avatar_url || null,
                plan: 'trial',
                status: 'trial',
                membership_start_date: new Date().toISOString(),
                membership_end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day pass
            })
            .select('id')
            .single();

        if (createMemberError) {
            console.error("Error creating trial member:", createMemberError);
            return { error: "No se pudo crear el perfil de prueba. Inténtalo de nuevo." };
        }
        memberId = newMember.id;
    }

    // 6. Enroll in the class (This makes them appear in the attendance list) using ADMIN privileges
    const { error: enrollError } = await adminSupabase
        .from('class_enrollments')
        .insert({
            class_id: classId,
            member_id: memberId,
            attended: false,
            enrollment_date: new Date().toISOString()
        });

    if (enrollError) {
        console.error("Error enrolling in class:", enrollError);
        // Check if double booking manually if needed, but UI should handle it.
        return { error: "Error al inscribirse en la clase. Es posible que ya estés inscrito." };
    }

    // 7. Log the trial request as 'approved' for analytics/history
    // Use admin client to bypass any user RLS on trial_requests if strict
    await adminSupabase
        .from('trial_requests')
        .insert({
            user_id: user.id,
            organization_id: centerId,
            class_id: classId,
            scheduled_date: classData.scheduled_time,
            status: 'approved'
        });

    // 8. Get gym details for notifications
    const { data: gym } = await adminSupabase
        .from('organizations')
        .select('name, owner_id, head_coach_id')
        .eq('id', centerId)
        .single();

    // 9. Notifications (Existing logic...)
    const notifications = [];

    if (gym?.owner_id) {
        notifications.push({
            user_id: gym.owner_id,
            type: 'trial_booked',
            title: 'Nueva reserva de prueba confirmada',
            content: `${profile?.full_name || 'Un usuario'} se ha inscrito a la clase de prueba: ${classData.name}`,
            link: `/dashboard/gyms/${centerId}/schedule/${classId}`,
            is_read: false
        });
    }

    if (gym?.head_coach_id && gym.head_coach_id !== gym.owner_id) {
        notifications.push({
            user_id: gym.head_coach_id,
            type: 'trial_booked',
            title: 'Nueva reserva de prueba confirmada',
            content: `${profile?.full_name || 'Un usuario'} se ha inscrito a la clase de prueba: ${classData.name}`,
            link: `/dashboard/gyms/${centerId}/schedule/${classId}`,
            is_read: false
        });
    }

    // Notify the user
    notifications.push({
        user_id: user.id,
        type: 'trial_confirmation',
        title: '¡Clase de Prueba Confirmada!',
        content: `Tu clase en ${gym?.name} está agendada para el ${new Date(classData.scheduled_time).toLocaleDateString()} a las ${new Date(classData.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        link: `/dashboard/profile`,
        is_read: false
    });

    if (notifications.length > 0) {
        await adminSupabase.from('notifications').insert(notifications);
    }

    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/profile`); // Revalidate profile to show upcoming trial
    return { success: true, message: "¡Clase reservada con éxito! Te hemos añadido a la lista." };
}

export async function getUpcomingTrial() {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: trials } = await adminSupabase
        .from('trial_requests')
        .select(`
            id, 
            scheduled_date, 
            organization:organization_id(name), 
            class:class_id(name)
        `)
        .eq('user_id', user.id)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(1);

    return trials?.[0] || null;
}
