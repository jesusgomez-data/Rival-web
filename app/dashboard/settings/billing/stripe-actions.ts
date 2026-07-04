'use server'

import { stripe, STRIPE_PRICES } from "@/utils/stripe/config";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function createCheckoutSession(priceId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "No estás autenticado. Por favor, inicia sesión." };
        }

        // 1. Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, email, stripe_customer_id')
            .eq('id', user.id)
            .single();

        // 2. Customer válido para el modo actual (auto-repara test/live)
        const { ensureStripeCustomer } = await import("@/utils/stripe/customer");
        const customerId = await ensureStripeCustomer(
            stripe,
            profile?.stripe_customer_id,
            {
                email: user.email || undefined,
                name: profile?.full_name || user.email || 'Atleta Rival',
                metadata: { userId: user.id }
            },
            async (id) => {
                await supabase
                    .from('profiles')
                    .update({ stripe_customer_id: id })
                    .eq('id', user.id);
            }
        );

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rivalfit.app').replace(/\/$/, '');

        // 3. Create Session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${appUrl}/dashboard/settings/billing?status=success`,
            cancel_url: `${appUrl}/dashboard/settings/billing?status=canceled`,
            metadata: {
                userId: user.id
            },
        });

        if (!session.url) {
            return { error: "No se pudo generar el enlace de pago. Inténtalo de nuevo." };
        }

        return { url: session.url };
    } catch (error: any) {
        console.error("STRIPE_CHECKOUT_ERROR:", error);
        return {
            error: error.message || "Error interno al procesar el pago. Contacta con soporte@rivalfit.app"
        };
    }
}

export async function createPortalSession() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Acceso denegado" };

        // 1. Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        let customerId = profile?.stripe_customer_id;

        // 2. Fallback: Find by email if not in DB
        if (!customerId && user.email) {
            const customers = await stripe.customers.list({ email: user.email, limit: 1 });
            customerId = customers.data[0]?.id;
        }

        // 3. Last Resort: Create new customer
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email || undefined,
                metadata: { userId: user.id }
            });
            customerId = customer.id;
            await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
        }

        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rivalfit.app').replace(/\/$/, '');

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${appUrl}/dashboard/settings/billing`,
        });

        return { url: session.url };
    } catch (error: any) {
        console.error("STRIPE_PORTAL_ERROR:", error);
        return { error: "Error al abrir el portal de suscripción." };
    }
}

export async function createOrganizationCheckoutSession(priceId: string, organizationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("No autorizado");

    const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        subscription_data: {
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
        if (priceId === STRIPE_PRICES.athlete.premium) tier = 'premium';
        if (priceId === STRIPE_PRICES.athlete.elite) tier = 'elite';

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
