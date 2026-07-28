import type { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/dashboard/',
                '/center-owner/',
                '/api/',
                '/onboarding',
                '/reset-password',
                '/forgot-password',
                '/profile-mock',
            ],
        },
        sitemap: `${SEO_CONFIG.siteUrl}/sitemap.xml`,
    };
}
