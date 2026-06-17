'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createNotification } from '../notifications-actions'

// ─── ATHLETE: request cancellation ───────────────────────────────────────────
export async function requestCancellation(centerId: string, reason?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()

    // Find the member record for this user+center
    const { data: member, error: findError } = await admin
        .from('members')
        .select('id, full_name, center_id, cancellation_requested_at')
        .eq('center_id', centerId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (findError || !member) return { error: 'No se encontró tu membresía en este centro' }
    if (member.cancellation_requested_at) return { error: 'Ya tienes una solicitud de baja pendiente' }

    // Mark cancellation requested
    const { error } = await admin
        .from('members')
        .update({
            cancellation_requested_at: new Date().toISOString(),
            cancellation_reason: reason?.trim() || null,
        })
        .eq('id', member.id)

    if (error) return { error: error.message }

    // Get user profile for notification content
    const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

    // Notify center owners / coaches
    const { data: staffRoles } = await admin
        .from('center_roles')
        .select('user_id, role')
        .eq('organization_id', centerId)
        .in('role', ['owner', 'head_coach'])

    const { data: org } = await admin
        .from('organizations')
        .select('name, owner_id')
        .eq('id', centerId)
        .maybeSingle()

    const targetUsers = Array.from(new Set([
        ...(staffRoles?.map(r => r.user_id) || []),
        ...(org?.owner_id ? [org.owner_id] : [])
    ]))

    const athleteName = profile?.full_name || member.full_name || 'Un atleta'
    const centerName  = org?.name || 'el centro'

    await Promise.all(targetUsers.map(uid =>
        createNotification({
            userId: uid,
            type: 'cancellation_request',
            title: '📋 Solicitud de Baja',
            content: `${athleteName} ha solicitado darse de baja en ${centerName}.${reason ? ` Motivo: "${reason}"` : ''}`,
            link: `/dashboard/gyms/${centerId}/members`,
        })
    ))

    revalidatePath('/dashboard/gyms')
    return { success: true }
}

// ─── ADMIN: accept cancellation ───────────────────────────────────────────────
export async function acceptCancellation(memberId: string, centerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()

    const { data: member } = await admin
        .from('members')
        .select('id, user_id, full_name, cancellation_reason')
        .eq('id', memberId)
        .eq('center_id', centerId)
        .maybeSingle()

    if (!member) return { error: 'Miembro no encontrado' }

    const { data: org } = await admin
        .from('organizations')
        .select('name')
        .eq('id', centerId)
        .maybeSingle()

    // Remove class enrollments first (FK constraint)
    await admin.from('class_enrollments').delete().eq('member_id', memberId)

    // Delete the member
    const { error } = await admin.from('members').delete().eq('id', memberId)
    if (error) return { error: error.message }

    // Notify the athlete if they have a linked user account
    if (member.user_id) {
        await createNotification({
            userId: member.user_id,
            type: 'cancellation_accepted',
            title: '✅ Baja Confirmada',
            content: `Tu solicitud de baja en ${org?.name || 'el centro'} ha sido aceptada. ¡Hasta pronto!`,
            link: '/dashboard/gyms',
        })
    }

    revalidatePath(`/dashboard/gyms/${centerId}/members`)
    revalidatePath('/dashboard/gyms')
    return { success: true }
}

// ─── ADMIN: reject cancellation ───────────────────────────────────────────────
export async function rejectCancellation(memberId: string, centerId: string, adminMessage?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()

    const { data: member } = await admin
        .from('members')
        .select('id, user_id, full_name')
        .eq('id', memberId)
        .eq('center_id', centerId)
        .maybeSingle()

    if (!member) return { error: 'Miembro no encontrado' }

    const { data: org } = await admin
        .from('organizations')
        .select('name')
        .eq('id', centerId)
        .maybeSingle()

    // Clear the cancellation request
    const { error } = await admin
        .from('members')
        .update({
            cancellation_requested_at: null,
            cancellation_reason: null,
        })
        .eq('id', memberId)

    if (error) return { error: error.message }

    // Notify the athlete
    if (member.user_id) {
        await createNotification({
            userId: member.user_id,
            type: 'cancellation_rejected',
            title: '❌ Solicitud de Baja Rechazada',
            content: `${org?.name || 'El centro'} ha rechazado tu solicitud de baja.${adminMessage ? ` Mensaje: "${adminMessage}"` : ' Contacta con el centro para más información.'}`,
            link: '/dashboard/gyms',
        })
    }

    revalidatePath(`/dashboard/gyms/${centerId}/members`)
    revalidatePath('/dashboard/gyms')
    return { success: true }
}

// ─── Get pending cancellation requests for a center ──────────────────────────
export async function getPendingCancellations(centerId: string) {
    const admin = createAdminClient()
    const { data } = await admin
        .from('members')
        .select('id, full_name, cancellation_requested_at, cancellation_reason, user_id, plan, profiles:user_id(full_name, avatar_url, username)')
        .eq('center_id', centerId)
        .not('cancellation_requested_at', 'is', null)
        .order('cancellation_requested_at', { ascending: true })

    return data || []
}
