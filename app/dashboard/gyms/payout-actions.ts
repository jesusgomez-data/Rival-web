'use server'

import { stripe } from "@/utils/stripe/config";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getProfessionalBalance(orgId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const admin = createAdminClient();
    const { data: org } = await admin
        .from('organizations')
        .select('owner_id, stripe_account_id, stripe_onboarding_complete')
        .eq('id', orgId)
        .single();

    if (!org || org.owner_id !== user.id) return { error: 'Solo el propietario puede ver el saldo' };
    if (!org.stripe_account_id || !org.stripe_onboarding_complete) return { error: 'Cuenta de Stripe no configurada' };

    try {
        const balance = await stripe.balance.retrieve({ stripeAccount: org.stripe_account_id });
        
        // Sum up the available balance in EUR
        const availableAmount = balance.available
            .filter(b => b.currency === 'eur')
            .reduce((sum, b) => sum + b.amount, 0);

        // Sum up the pending balance in EUR
        const pendingAmount = balance.pending
            .filter(b => b.currency === 'eur')
            .reduce((sum, b) => sum + b.amount, 0);

        return {
            available: availableAmount / 100, // Convert to euros
            pending: pendingAmount / 100,
        };
    } catch (e: any) {
        console.error('Error fetching balance:', e);
        return { error: 'Error al obtener el saldo de Stripe' };
    }
}

export async function requestPayout(orgId: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const admin = createAdminClient();
    const { data: org } = await admin
        .from('organizations')
        .select('owner_id, stripe_account_id, stripe_onboarding_complete')
        .eq('id', orgId)
        .single();

    if (!org || org.owner_id !== user.id) return { error: 'Solo el propietario puede solicitar retiros' };
    if (!org.stripe_account_id || !org.stripe_onboarding_complete) return { error: 'Cuenta de Stripe no configurada' };

    try {
        // Convert amount to cents
        const amountCents = Math.round(amount * 100);
        
        if (amountCents <= 0) return { error: 'La cantidad debe ser mayor a 0' };

        const payout = await stripe.payouts.create({
            amount: amountCents,
            currency: 'eur',
        }, {
            stripeAccount: org.stripe_account_id,
        });

        return { success: true, payoutId: payout.id };
    } catch (e: any) {
        console.error('Error requesting payout:', e);
        return { error: e.message || 'Error al solicitar el retiro' };
    }
}
