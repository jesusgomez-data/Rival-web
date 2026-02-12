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
            center_id,
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
        .select('full_name, email, username, avatar_url')
        .eq('id', user.id)
        .single();

    // 5. Create a PENDING Trial Request (does NOT create member yet)
    const { error: requestError } = await adminSupabase
        .from('trial_requests')
        .insert({
            user_id: user.id,
            organization_id: centerId,
            center_id: classData.center_id,
            class_id: classId,
            scheduled_date: classData.scheduled_time,
            status: 'pending' // Corrected: Start as pending
        });

    if (requestError) {
        console.error("Error creating trial request:", requestError);
        return { error: "No se pudo procesar la solicitud de prueba." };
    }

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
            title: 'Nueva solicitud de clase de prueba',
            content: `${profile?.full_name || 'Un usuario'} ha solicitado asistir a la clase: ${classData.name}`,
            link: `/dashboard/gyms/${centerId}/schedule/${classId}`,
            is_read: false
        });
    }

    if (gym?.head_coach_id && gym.head_coach_id !== gym.owner_id) {
        notifications.push({
            user_id: gym.head_coach_id,
            type: 'trial_booked',
            title: 'Nueva solicitud de clase de prueba',
            content: `${profile?.full_name || 'Un usuario'} ha solicitado asistir a la clase: ${classData.name}`,
            link: `/dashboard/gyms/${centerId}/schedule/${classId}`,
            is_read: false
        });
    }

    // Notify the user
    notifications.push({
        user_id: user.id,
        type: 'trial_confirmation',
        title: 'Solicitud de Clase de Prueba Enviada',
        content: `Has solicitado una clase en ${gym?.name} para el ${new Date(classData.scheduled_time).toLocaleDateString()} a las ${new Date(classData.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. El centro debe confirmar tu plaza.`,
        link: `/dashboard/profile`,
        is_read: false
    });

    if (notifications.length > 0) {
        await adminSupabase.from('notifications').insert(notifications);
    }

    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/profile`); // Revalidate profile to show upcoming trial
    return { success: true, message: "¡Solicitud enviada con éxito! El centro confirmará tu plaza pronto." };
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
