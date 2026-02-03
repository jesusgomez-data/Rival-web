import Stripe from 'stripe';

// Initialize Stripe with a fallback to avoid build-time errors
// The actual key should be provided in Vercel Environment Variables
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
    apiVersion: '2024-12-18.acacia' as any, // Latest stable or specified
    appInfo: {
        name: 'Rival Web',
        version: '1.0.0',
    },
});
