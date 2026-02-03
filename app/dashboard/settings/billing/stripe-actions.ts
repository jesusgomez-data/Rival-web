'use server'

import { stripe } from "@/utils/stripe/config";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function createCheckoutSession(priceId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("No estás autenticado");
    }

    // 1. Get user profile for metadata
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?status=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?status=canceled`,
        metadata: {
            userId: user.id
        },
    });

    if (!session.url) {
        throw new Error("Error al crear la sesión de pago");
    }

    redirect(session.url);
}

export async function createPortalSession() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Acceso denegado");

    // We need to fetch the customer ID from Supabase (you'll need to store it)
    // For now, we'll try to find it by email in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
        throw new Error("No se encontró una suscripción activa para este usuario en Stripe.");
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    });

    redirect(session.url);
}
