import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe/config'
import { createClient } from '@/utils/supabase/server'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://rivalfit.app').replace(/\/$/, '')

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                quantity: 1,
                price_data: {
                    currency: 'eur',
                    recurring: { interval: 'month' },
                    unit_amount: 299, // 2.99 EUR
                    product_data: {
                        name: 'Rival Fit Colaborador',
                        description: 'Apoya el proyecto, elimina la publicidad y obtén tu insignia.',
                    },
                },
            }],
            metadata: {
                type: 'colaborador_subscription',
                userId: user.id,
            },
            success_url: `${APP_URL}/dashboard/settings/billing?payment=success`,
            cancel_url: `${APP_URL}/dashboard/settings/billing?payment=cancelled`,
        });

        return NextResponse.json({ url: session.url })
    } catch (err: any) {
        console.error('Stripe error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
