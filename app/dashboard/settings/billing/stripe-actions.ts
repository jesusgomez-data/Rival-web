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

    // 1. Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, stripe_customer_id')
        .eq('id', user.id)
        .single();

    let customerId = profile?.stripe_customer_id;

    // 2. Create Stripe Customer if doesn't exist
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            name: profile?.full_name || user.email,
            metadata: {
                userId: user.id
            }
        });
        customerId = customer.id;

        // Save to DB
        await supabase
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', user.id);
    }

    // 3. Calculate anchor
    const now = new Date();
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const anchorTimestamp = Math.floor(firstOfNextMonth.getTime() / 1000);

    // 4. Create Session
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        subscription_data: {
            billing_cycle_anchor: anchorTimestamp,
            proration_behavior: 'create_prorations',
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?status=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?status=canceled`,
        metadata: {
            userId: user.id
        },
    });

    if (!session.url) {
        throw new Error("Error al crear la sesión de pago");
    }

    return session.url;
}

export async function createPortalSession() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Acceso denegado");

    // 1. Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

    let customerId = profile?.stripe_customer_id;

    // 2. Fallback: Find by email if not in DB
    if (!customerId) {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        customerId = customers.data[0]?.id;
    }

    // 3. Last Resort: Create new customer (empty portal)
    if (!customerId) {
        const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
        customerId = customer.id;
        // Save for future
        await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    });

    return session.url;
}

export async function createOrganizationCheckoutSession(priceId: string, organizationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("No autorizado");

    // 1. Calculate anchor for the 1st of next month
    const now = new Date();
    const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const anchorTimestamp = Math.floor(firstOfNextMonth.getTime() / 1000);

    const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        subscription_data: {
            billing_cycle_anchor: anchorTimestamp,
            proration_behavior: 'create_prorations',
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gyms/${organizationId}/settings/billing?status=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/gyms/${organizationId}/settings/billing?status=canceled`,
        metadata: {
            userId: user.id,
            organizationId: organizationId
        },
    });

    if (session.url) redirect(session.url);
}

export async function verifyStripeSubscription() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Acceso denegado");

    const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

    if (!profile?.stripe_customer_id) return { success: false, message: "No customer ID" };

    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: 'active',
            limit: 1,
            expand: ['data.items.data.price']
        });

        if (subscriptions.data.length === 0) {
            // No active subscription found
            return { success: true, tier: 'free' };
        }

        const sub = subscriptions.data[0];
        const priceId = sub.items.data[0].price.id;

        let tier = 'free';
        // Check against hardcoded IDs (same as in page.tsx) or env
        const premiumPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || 'price_1SxdaPCpwHwK9MuevBVancPf';
        const elitePrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || 'price_1SxdavCpwHwK9Mueeesvlq6T';

        if (priceId === premiumPrice) tier = 'premium';
        if (priceId === elitePrice) tier = 'elite';

        // Update DB
        const { error } = await supabase
            .from('profiles')
            .update({ subscription_tier: tier })
            .eq('id', user.id);

        if (error) console.error("Update error:", error);

        return { success: true, tier };
    } catch (e: any) {
        console.error("Stripe sync error:", e);
        return { success: false, message: e.message };
    }
}
