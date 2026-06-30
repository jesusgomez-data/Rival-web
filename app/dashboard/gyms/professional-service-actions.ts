'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createNotification } from '@/app/dashboard/notifications-actions'
import { stripe } from '@/utils/stripe/config'

// ─────────────────────────────────────────────────────────────────────
// SERVICIOS: CRUD
// ─────────────────────────────────────────────────────────────────────

export async function getProfessionalServices(organizationId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('professional_services')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
    return data || []
}

export async function createProfessionalService(organizationId: string, data: {
    name: string
    description?: string
    price: number
    duration_minutes: number
    modalities: string[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .eq('owner_id', user.id)
        .single()
    if (!org) return { error: 'Sin permiso' }

    const { error } = await supabase.from('professional_services').insert({
        organization_id: organizationId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        duration_minutes: data.duration_minutes,
        modalities: data.modalities,
    })

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/gyms/${organizationId}`)
    return { success: true }
}

export async function updateProfessionalService(serviceId: string, organizationId: string, data: {
    name?: string
    description?: string
    price?: number
    duration_minutes?: number
    modalities?: string[]
    is_active?: boolean
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { error } = await supabase
        .from('professional_services')
        .update(data)
        .eq('id', serviceId)
        .eq('organization_id', organizationId)

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/gyms/${organizationId}`)
    return { success: true }
}

export async function deleteProfessionalService(serviceId: string, organizationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { error } = await supabase
        .from('professional_services')
        .delete()
        .eq('id', serviceId)
        .eq('organization_id', organizationId)

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/gyms/${organizationId}`)
    return { success: true }
}

// ─────────────────────────────────────────────────────────────────────
// DISPONIBILIDAD: CRUD
// ─────────────────────────────────────────────────────────────────────

export async function getProfessionalAvailability(organizationId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('day_of_week')
    return data || []
}

export async function saveProfessionalAvailability(
    organizationId: string,
    slots: { day_of_week: number; start_time: string; end_time: string }[]
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .eq('owner_id', user.id)
        .single()
    if (!org) return { error: 'Sin permiso' }

    // Eliminar disponibilidad anterior y reemplazar
    await supabase
        .from('professional_availability')
        .delete()
        .eq('organization_id', organizationId)

    if (slots.length > 0) {
        const { error } = await supabase.from('professional_availability').insert(
            slots.map(s => ({ ...s, organization_id: organizationId }))
        )
        if (error) return { error: error.message }
    }

    revalidatePath(`/dashboard/gyms/${organizationId}`)
    return { success: true }
}

// ─────────────────────────────────────────────────────────────────────
// RESERVAS: FLUJO COMPLETO
// ─────────────────────────────────────────────────────────────────────

export async function getPublicProfessionalServices(organizationId: string) {
    const admin = createAdminClient()
    const { data } = await admin
        .from('professional_services')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('price')
    return data || []
}

export async function createServiceBooking(input: {
    professionalId: string
    serviceId: string
    modality: string
    scheduledAt?: string
    address?: string
    notes?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Debes iniciar sesión para hacer una reserva' }

    const admin = createAdminClient()

    // Obtener detalles del servicio
    const { data: service } = await admin
        .from('professional_services')
        .select('*')
        .eq('id', input.serviceId)
        .eq('organization_id', input.professionalId)
        .eq('is_active', true)
        .single()

    if (!service) return { error: 'Servicio no encontrado' }

    // Verificar que el cliente no tenga ya una reserva pendiente/activa con este profesional
    const { data: existingBooking } = await admin
        .from('service_bookings')
        .select('id, status')
        .eq('professional_id', input.professionalId)
        .eq('client_id', user.id)
        .in('status', ['pending', 'accepted', 'paid', 'in_progress'])
        .maybeSingle()

    if (existingBooking) {
        return { error: 'Ya tienes una reserva activa con este profesional.' }
    }

    const platformFeeAmount = +(service.price * 0.10).toFixed(2)
    const professionalPayoutAmount = +(service.price * 0.90).toFixed(2)

    const { data: booking, error } = await admin
        .from('service_bookings')
        .insert({
            professional_id: input.professionalId,
            client_id: user.id,
            service_id: input.serviceId,
            service_name: service.name,
            service_price: service.price,
            duration_minutes: service.duration_minutes,
            modality: input.modality,
            scheduled_at: input.scheduledAt || null,
            address: input.address || null,
            notes: input.notes || null,
            status: 'pending',
            platform_fee_pct: 10,
            platform_fee_amount: platformFeeAmount,
            professional_payout_amount: professionalPayoutAmount,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    // Notificar al profesional
    const { data: org } = await admin
        .from('organizations')
        .select('name, owner_id')
        .eq('id', input.professionalId)
        .single()

    const { data: clientProfile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

    if (org?.owner_id) {
        await createNotification({
            userId: org.owner_id,
            type: 'service_booking_request',
            title: 'Nueva solicitud de servicio',
            content: `${clientProfile?.full_name || 'Un cliente'} ha solicitado: "${service.name}" (${service.price}€)`,
            link: `/dashboard/gyms/${input.professionalId}/bookings`,
        })
    }

    revalidatePath(`/trainer/${input.professionalId}`)
    return { success: true, bookingId: booking.id }
}

export async function acceptServiceBooking(bookingId: string, professionalId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()

    const { data: booking } = await admin
        .from('service_bookings')
        .select('*, professional:professional_id(owner_id, name)')
        .eq('id', bookingId)
        .eq('professional_id', professionalId)
        .single()

    if (!booking) return { error: 'Reserva no encontrada' }
    if ((booking.professional as any)?.owner_id !== user.id) return { error: 'Sin permiso' }
    if (booking.status !== 'pending') return { error: 'Esta reserva ya fue procesada' }

    const { error } = await admin
        .from('service_bookings')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', bookingId)

    if (error) return { error: error.message }

    // Crear conversación de chat
    const { data: conv } = await admin
        .from('service_conversations')
        .insert({
            booking_id: bookingId,
            professional_id: professionalId,
            professional_user_id: user.id,
            client_id: booking.client_id,
        })
        .select()
        .single()

    // Notificar al cliente
    await createNotification({
        userId: booking.client_id,
        type: 'service_booking_accepted',
        title: '¡Reserva aceptada!',
        content: `Tu solicitud de "${booking.service_name}" ha sido aceptada. Ya puedes chatear con el profesional y realizar el pago.`,
        link: `/dashboard/bookings/${bookingId}`,
    })

    revalidatePath(`/dashboard/gyms/${professionalId}/bookings`)
    return { success: true, conversationId: conv?.id }
}

export async function rejectServiceBooking(bookingId: string, professionalId: string, reason: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()

    const { data: booking } = await admin
        .from('service_bookings')
        .select('client_id, service_name, professional:professional_id(owner_id, name)')
        .eq('id', bookingId)
        .eq('professional_id', professionalId)
        .single()

    if (!booking) return { error: 'Reserva no encontrada' }
    if ((booking.professional as any)?.owner_id !== user.id) return { error: 'Sin permiso' }

    const { error } = await admin
        .from('service_bookings')
        .update({ status: 'rejected', rejection_reason: reason, rejected_at: new Date().toISOString() })
        .eq('id', bookingId)

    if (error) return { error: error.message }

    await createNotification({
        userId: booking.client_id,
        type: 'service_booking_rejected',
        title: 'Reserva rechazada',
        content: `Tu solicitud de "${booking.service_name}" ha sido rechazada. Motivo: ${reason}`,
        link: `/dashboard/gyms`,
    })

    revalidatePath(`/dashboard/gyms/${professionalId}/bookings`)
    return { success: true }
}

export async function getProfessionalBookings(professionalId: string) {
    const admin = createAdminClient()
    const { data } = await admin
        .from('service_bookings')
        .select(`
            *,
            client:client_id(id, full_name, username, avatar_url),
            service:service_id(name, price, duration_minutes)
        `)
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false })
    return data || []
}

export async function getClientBookings(clientId: string) {
    const admin = createAdminClient()
    const { data } = await admin
        .from('service_bookings')
        .select(`
            *,
            professional:professional_id(id, name, logo_url, center_type, city)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
    return data || []
}

// ─────────────────────────────────────────────────────────────────────
// CONFIRMACIÓN DE SERVICIO COMPLETADO
// ─────────────────────────────────────────────────────────────────────

export async function confirmServiceCompletedByPro(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: booking } = await admin
        .from('service_bookings')
        .select('*, professional:professional_id(owner_id)')
        .eq('id', bookingId)
        .single()

    if (!booking) return { error: 'Reserva no encontrada' }
    if ((booking.professional as any)?.owner_id !== user.id) return { error: 'Sin permiso' }
    if (!['paid', 'in_progress'].includes(booking.status)) return { error: 'Estado inválido' }

    const newStatus = booking.status === 'completed_by_client' ? 'completed' : 'completed_by_pro'

    const { error } = await admin
        .from('service_bookings')
        .update({
            status: newStatus,
            professional_completed_at: new Date().toISOString(),
            completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', bookingId)

    if (error) return { error: error.message }

    await createNotification({
        userId: booking.client_id,
        type: 'service_completed_by_pro',
        title: 'El profesional ha marcado el servicio como completado',
        content: `Por favor confirma que "${booking.service_name}" ha finalizado para liberar el pago.`,
        link: `/dashboard/bookings/${bookingId}`,
    })

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { success: true, newStatus }
}

export async function confirmServiceCompletedByClient(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: booking } = await admin
        .from('service_bookings')
        .select('*, professional:professional_id(owner_id)')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .single()

    if (!booking) return { error: 'Reserva no encontrada' }

    const newStatus = booking.status === 'completed_by_pro' ? 'completed' : 'completed_by_client'

    const { error } = await admin
        .from('service_bookings')
        .update({
            status: newStatus,
            client_completed_at: new Date().toISOString(),
            completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', bookingId)

    if (error) return { error: error.message }

    if (newStatus === 'completed') {
        // Ambos confirmaron → ejecutar payout via Stripe Connect
        try {
            const { data: org } = await admin
                .from('organizations')
                .select('stripe_account_id, stripe_onboarding_complete, owner_id')
                .eq('id', booking.professional_id)
                .single()

            if (org?.stripe_account_id && org?.stripe_onboarding_complete && booking.stripe_payment_intent_id) {
                const payoutAmountCents = Math.round(Number(booking.professional_payout_amount) * 100)

                // Retrieve payment intent to get the charge
                const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id)
                const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id

                if (chargeId) {
                    await stripe.transfers.create({
                        amount: payoutAmountCents,
                        currency: 'eur',
                        destination: org.stripe_account_id,
                        source_transaction: chargeId,
                        metadata: { bookingId, type: 'service_payout' },
                    })

                    await admin
                        .from('service_bookings')
                        .update({ status: 'paid_out', paid_out_at: new Date().toISOString() })
                        .eq('id', bookingId)
                }
            }

            await createNotification({
                userId: (booking.professional as any)?.owner_id,
                type: 'service_payout_sent',
                title: '¡Pago enviado!',
                content: `Has recibido €${booking.professional_payout_amount} por el servicio "${booking.service_name}".`,
                link: `/dashboard/gyms/${booking.professional_id}/bookings`,
            })
        } catch (payoutErr) {
            console.error('[payout] Error executing transfer:', payoutErr)
            // Don't fail the whole action — booking is still completed
        }
    }

    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { success: true, newStatus }
}

// ─────────────────────────────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────────────────────────────

export async function getConversation(bookingId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('service_conversations')
        .select('*, booking:booking_id(*)')
        .eq('booking_id', bookingId)
        .single()
    return data
}

export async function sendServiceMessage(conversationId: string, content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { error } = await supabase
        .from('service_messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, content })

    // Actualizar timestamp de última actividad
    await supabase
        .from('service_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function getServiceMessages(conversationId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('service_messages')
        .select('*, sender:sender_id(id, full_name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
    return data || []
}

// ─────────────────────────────────────────────────────────────────────
// RESEÑA POST-SERVICIO
// ─────────────────────────────────────────────────────────────────────

export async function createServiceReview(bookingId: string, rating: number, reviewText: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: booking } = await admin
        .from('service_bookings')
        .select('professional_id, service_name')
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .in('status', ['completed', 'paid_out'])
        .single()

    if (!booking) return { error: 'Solo puedes reseñar servicios completados' }

    const { error } = await admin.from('service_reviews').insert({
        booking_id: bookingId,
        professional_id: booking.professional_id,
        client_id: user.id,
        rating,
        review_text: reviewText,
    })

    if (error) return { error: error.message }
    revalidatePath(`/trainer/${booking.professional_id}`)
    return { success: true }
}

export async function getProfessionalReviews(professionalId: string) {
    const admin = createAdminClient()
    const { data } = await admin
        .from('service_reviews')
        .select('*, client:client_id(full_name, avatar_url, username)')
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false })
        .limit(20)
    return data || []
}

// ─────────────────────────────────────────────────────────────────────
// BLOCKED SLOTS: gestión de horas bloqueadas manualmente
// ─────────────────────────────────────────────────────────────────────

export async function getBlockedSlots(organizationId: string, dateFrom: string, dateTo: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('professional_blocked_slots')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date').order('start_time')
    return data || []
}

export async function blockTimeSlot(organizationId: string, date: string, startTime: string, endTime: string, reason?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    // Verify ownership
    const { data: org } = await supabase.from('organizations').select('owner_id').eq('id', organizationId).single()
    if (!org || org.owner_id !== user.id) return { error: 'Sin permisos' }

    // Avoid duplicates
    await supabase.from('professional_blocked_slots')
        .delete()
        .eq('organization_id', organizationId)
        .eq('date', date)
        .eq('start_time', startTime)
        .eq('end_time', endTime)

    const { error } = await supabase.from('professional_blocked_slots').insert({
        organization_id: organizationId,
        date,
        start_time: startTime,
        end_time: endTime,
        reason: reason || null,
    })

    if (error) return { error: error.message }
    return { success: true }
}

export async function unblockTimeSlot(slotId: string, organizationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { error } = await supabase
        .from('professional_blocked_slots')
        .delete()
        .eq('id', slotId)
        .eq('organization_id', organizationId)

    if (error) return { error: error.message }
    return { success: true }
}

export async function verifyBookingPayment(bookingId: string) {
    const admin = createAdminClient()
    const { data: booking } = await admin
        .from('service_bookings')
        .select('status, client_id, service_name, organization:organization_id(id, owner_id)')
        .eq('id', bookingId)
        .single()
        
    if (!booking) return { error: 'No encontrado' }
    if (booking.status === 'paid' || booking.status === 'completed') return { success: true, status: booking.status }

    try {
        const sessions = await stripe.checkout.sessions.list({ limit: 50 })
        const session = sessions.data.find(s => s.metadata?.bookingId === bookingId && s.payment_status === 'paid')
        if (session) {
            await admin.from('service_bookings').update({ 
                status: 'paid', 
                stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : undefined 
            }).eq('id', bookingId)
            
            // Notify professional
            const org = booking.organization as any
            if (org?.owner_id) {
                await createNotification({
                    userId: org.owner_id,
                    type: 'booking_paid',
                    title: 'Pago recibido (Auto-verificado)',
                    content: `El cliente ha pagado la sesión de ${booking.service_name}. Ya puedes confirmar el servicio cuando lo realices.`,
                    link: `/dashboard/gyms/${org.id}/bookings`,
                })
            }
            
            return { success: true, status: 'paid' }
        }
    } catch (e) {
        console.error('Error verificando pago manual:', e)
    }
    return { success: false }
}
