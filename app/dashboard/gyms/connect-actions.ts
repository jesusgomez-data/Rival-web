'use server'

import { stripe } from "@/utils/stripe/config";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://rivalfit.app').replace(/\/$/, '');

export async function initiateStripeConnect(orgId: string) {
    try {
        const supabase = await createClient();
        const admin = createAdminClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'No autorizado' };

        const { data: org } = await admin
            .from('organizations')
            .select('id, owner_id, name, stripe_account_id, stripe_onboarding_complete')
            .eq('id', orgId)
            .single();

        if (!org || org.owner_id !== user.id) return { error: 'Solo el propietario puede configurar los cobros' };

        let accountId = org.stripe_account_id;

        // Create Express account if none exists
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'ES',
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                settings: {
                    payouts: {
                        schedule: {
                            interval: 'manual',
                        },
                    },
                },
                metadata: { organizationId: orgId },
            });
            accountId = account.id;

            const { error: updateError } = await admin
                .from('organizations')
                .update({ stripe_account_id: accountId, stripe_onboarding_complete: false })
                .eq('id', orgId);

            if (updateError) {
                console.error('[initiateStripeConnect] DB update error:', updateError);
                // Column may not exist yet — remind to run SQL migration
                return { error: `Error de base de datos: ${updateError.message}. ¿Ejecutaste el SQL de migración en Supabase?` };
            }
        }

        // Generate onboarding link
        let accountLink;
        try {
            accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: `${APP_URL}/api/stripe/connect/refresh?orgId=${orgId}`,
                return_url: `${APP_URL}/dashboard/gyms/${orgId}/settings/billing?stripe=connected`,
                type: 'account_onboarding',
            });
        } catch (linkErr: any) {
            if (linkErr?.message?.includes('test mode') || linkErr?.message?.includes('live mode')) {
                console.warn('[initiateStripeConnect] Environment mismatch. Resetting Stripe account ID.');
                await admin.from('organizations').update({ stripe_account_id: null, stripe_onboarding_complete: false }).eq('id', orgId);
                return initiateStripeConnect(orgId);
            }
            throw linkErr;
        }

        return { url: accountLink.url };
    } catch (err: any) {
        console.error('[initiateStripeConnect] Error:', err);
        return { error: err?.message || 'Error al conectar con Stripe. Verifica la configuración.' };
    }
}

export async function getConnectStatus(orgId: string) {
    const supabase = await createClient();

    const { data: org } = await supabase
        .from('organizations')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', orgId)
        .single();

    if (!org?.stripe_account_id) {
        return { connected: false, onboarding_complete: false, payouts_enabled: false, charges_enabled: false };
    }

    try {
        const account = await stripe.accounts.retrieve(org.stripe_account_id);
        const isOnboardingComplete = account.details_submitted && (account.payouts_enabled ?? false);

        if (isOnboardingComplete !== org.stripe_onboarding_complete) {
            const admin = createAdminClient();
            await admin.from('organizations').update({ stripe_onboarding_complete: isOnboardingComplete }).eq('id', orgId);
        }

        return {
            connected: true,
            onboarding_complete: isOnboardingComplete,
            payouts_enabled: account.payouts_enabled ?? false,
            charges_enabled: account.charges_enabled ?? false,
            account_id: org.stripe_account_id,
        };
    } catch {
        return { connected: false, onboarding_complete: false, payouts_enabled: false, charges_enabled: false };
    }
}

export async function getConnectDashboardLink(orgId: string) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: org } = await admin
        .from('organizations')
        .select('owner_id, stripe_account_id, stripe_onboarding_complete')
        .eq('id', orgId)
        .single();

    if (!org || org.owner_id !== user.id) return { error: 'No autorizado' };
    if (!org.stripe_account_id) return { error: 'Cuenta de cobros no configurada' };

    const loginLink = await stripe.accounts.createLoginLink(org.stripe_account_id);
    return { url: loginLink.url };
}

export async function refreshOnboardingLink(orgId: string) {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const { data: org } = await admin
        .from('organizations')
        .select('owner_id, stripe_account_id')
        .eq('id', orgId)
        .single();

    if (!org || org.owner_id !== user.id) return { error: 'No autorizado' };
    if (!org.stripe_account_id) return { error: 'Cuenta no encontrada' };

    const accountLink = await stripe.accountLinks.create({
        account: org.stripe_account_id,
        refresh_url: `${APP_URL}/api/stripe/connect/refresh?orgId=${orgId}`,
        return_url: `${APP_URL}/dashboard/gyms/${orgId}/settings/billing?stripe=connected`,
        type: 'account_onboarding',
    });

    return { url: accountLink.url };
}
