import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
});

// Centralized Stripe Price IDs — single source of truth
export const STRIPE_PRICES = {
    athlete: {
        premium: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || 'price_1SzepeCuIXDNtJ7AFKkDXv4H',
        elite: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || 'price_1SzeqjCuIXDNtJ7ApOSdRJre',
    },
    center: {
        starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_1SzerFCuIXDNtJ7A4vqazU9O',
        pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_1SzernCuIXDNtJ7AWHGJMqLi',
    },
} as const;