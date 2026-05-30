import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe/config';
import { createAdminClient } from '@/utils/supabase/admin';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://rivalfit.app').replace(/\/$/, '');

// Stripe redirects here when the onboarding link has expired.
// We generate a fresh link and redirect the center owner back to it.
export async function GET(req: Request) {
    const url = new URL(req.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
        return NextResponse.redirect(`${APP_URL}/dashboard/gyms`);
    }

    try {
        const admin = createAdminClient();
        const { data: org } = await admin
            .from('organizations')
            .select('stripe_account_id')
            .eq('id', orgId)
            .single();

        if (!org?.stripe_account_id) {
            return NextResponse.redirect(`${APP_URL}/dashboard/gyms/${orgId}/settings/billing?stripe=error`);
        }

        const accountLink = await stripe.accountLinks.create({
            account: org.stripe_account_id,
            refresh_url: `${APP_URL}/api/stripe/connect/refresh?orgId=${orgId}`,
            return_url: `${APP_URL}/dashboard/gyms/${orgId}/settings/billing?stripe=connected`,
            type: 'account_onboarding',
        });

        return NextResponse.redirect(accountLink.url);
    } catch (err) {
        console.error('[stripe/connect/refresh] Error:', err);
        return NextResponse.redirect(`${APP_URL}/dashboard/gyms/${orgId}/settings/billing?stripe=error`);
    }
}
