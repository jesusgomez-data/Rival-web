import type { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/lib/seo';
import { createAdminClient } from '@/utils/supabase/admin';
import { isProfessional } from '@/lib/professional-types';

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/for-centers', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/center-signup', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/signup', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/legal/terms', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/legal/privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/legal/notice', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/legal/support', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = SEO_CONFIG.siteUrl;
    const now = new Date();

    const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(r => ({
        url: `${baseUrl}${r.path}`,
        lastModified: now,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }));

    // Perfiles publicos de centros/entrenadores — contenido real indexable,
    // no requieren login para verse.
    try {
        const admin = createAdminClient();
        const { data: orgs } = await admin
            .from('organizations')
            .select('id, center_type, updated_at')
            .limit(500);

        for (const org of orgs || []) {
            const base = isProfessional(org.center_type) ? '/trainer' : '/gym';
            entries.push({
                url: `${baseUrl}${base}/${org.id}`,
                lastModified: org.updated_at ? new Date(org.updated_at) : now,
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
    } catch (e) {
        console.error('[sitemap] error fetching organizations:', e);
    }

    return entries;
}
