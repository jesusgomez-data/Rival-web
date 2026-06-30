import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe/config'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://rivalfit.app').replace(/\/$/, '')

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 })

    const admin = createAdminClient()

    // Load booking with service and professional org data
    const { data: booking } = await admin
        .from('service_bookings')
        .select(`
            id, status, client_id, service_name, service_price, duration_minutes,
            platform_fee_amount, professional_payout_amount,
            organization:professional_id (
                id, name, stripe_account_id, stripe_onboarding_complete
            )
        `)
        .eq('id', bookingId)
        .eq('client_id', user.id)
        .single()

    if (!booking) return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    if (booking.status !== 'accepted') return NextResponse.json({ error: 'La reserva debe estar aceptada para pagar' }, { status: 400 })

    const org = booking.organization as any
    if (org?.stripe_account_id && !org?.stripe_onboarding_complete) {
        try {
            const account = await stripe.accounts.retrieve(org.stripe_account_id)
            if (account.details_submitted && account.payouts_enabled) {
                org.stripe_onboarding_complete = true
                await admin.from('organizations').update({ stripe_onboarding_complete: true }).eq('id', org.id)
            }
        } catch (e) {
            console.error('Error auto-syncing Stripe account in checkout:', e)
        }
    }

    if (!org?.stripe_account_id || !org?.stripe_onboarding_complete) {
        return NextResponse.json({ error: 'El profesional aún no tiene configurado su cuenta de pagos' }, { status: 400 })
    }

    const amountCents = Math.round(Number(booking.service_price) * 100)
    const feeCents = Math.round(Number(booking.platform_fee_amount) * 100)

    // Create Stripe Checkout in payment mode with destination charge
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
            quantity: 1,
            price_data: {
                currency: 'eur',
                unit_amount: amountCents,
                product_data: {
                    name: booking.service_name,
                    description: `Duración: ${booking.duration_minutes} min · ${org.name}`,
                },
            },
        }],
        payment_intent_data: {
            application_fee_amount: feeCents,
            transfer_data: {
                destination: org.stripe_account_id,
            },
        },
        metadata: {
            type: 'service_booking',
            bookingId: booking.id,
            clientId: user.id,
            organizationId: org.id,
        },
        success_url: `${APP_URL}/dashboard/my-bookings?payment=success&booking=${booking.id}`,
        cancel_url: `${APP_URL}/dashboard/my-bookings?payment=cancelled`,
    })

    return NextResponse.json({ url: session.url })
}
