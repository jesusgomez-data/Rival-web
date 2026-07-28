/**
 * RIVALFIT - SEO & Metadata Configuration
 * Optimizado para búsqueda orgánica multi-país
 */

import { Metadata } from 'next';

// ============================================
// SEO BASE CONFIG
// ============================================

export const SEO_CONFIG = {
  siteName: 'RivalFit',
  siteUrl: (process.env.NEXT_PUBLIC_APP_URL || 'https://rivalfit.app').replace(/\/$/, ''),
  twitterHandle: '@rivalfitapp',
  defaultLocale: 'es',
};

// ============================================
// KEYWORDS POR IDIOMA
// ============================================

const KEYWORDS_BY_LOCALE: Record<string, string[]> = {
  es: [
    'software gestión gimnasio',
    'app reservas crossfit',
    'sistema gestión box',
    'crm fitness',
    'plataforma centros deportivos',
    'software yoga studio',
    'gestión clases deportivas',
    'app pagos gimnasio',
    'software box crossfit',
    'reservas clases online',
  ],
  en: [
    'gym management software',
    'crossfit booking app',
    'fitness center crm',
    'sports center platform',
    'yoga studio software',
    'class booking system',
    'gym payment software',
    'crossfit box software',
    'fitness class scheduling',
    'sports facility management',
  ],
  pt: [
    'software gestão academia',
    'app reservas crossfit',
    'sistema gestão box',
    'crm fitness',
    'plataforma centros esportivos',
    'software estúdio yoga',
    'gestão aulas esportivas',
    'app pagamentos academia',
    'software box crossfit',
    'reservas aulas online',
  ],
};

// ============================================
// METADATA GENERATORS
// ============================================

interface PageSEOProps {
  title: string;
  description: string;
  locale?: string;
  keywords?: string[];
  image?: string;
  noindex?: boolean;
  canonical?: string;
}

export function generatePageMetadata({
  title,
  description,
  locale = 'es',
  keywords = [],
  image = '/og-image.jpg',
  noindex = false,
  canonical,
}: PageSEOProps): Metadata {
  const fullTitle = `${title} | ${SEO_CONFIG.siteName}`;
  const ogImage = image.startsWith('http') ? image : `${SEO_CONFIG.siteUrl}${image}`;
  const allKeywords = [...(KEYWORDS_BY_LOCALE[locale] || []), ...keywords];

  return {
    title: fullTitle,
    description,
    keywords: allKeywords.join(', '),
    authors: [{ name: 'RivalFit Team' }],
    creator: 'RivalFit',
    publisher: 'RivalFit Inc.',
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    alternates: {
      canonical: canonical || SEO_CONFIG.siteUrl,
      languages: {
        'es': `${SEO_CONFIG.siteUrl}/es`,
        'en': `${SEO_CONFIG.siteUrl}/en`,
        'pt': `${SEO_CONFIG.siteUrl}/pt`,
      },
    },
    openGraph: {
      type: 'website',
      locale,
      url: canonical || SEO_CONFIG.siteUrl,
      siteName: SEO_CONFIG.siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: SEO_CONFIG.twitterHandle,
      creator: SEO_CONFIG.twitterHandle,
      title: fullTitle,
      description,
      images: [ogImage],
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      // yandex, bing, etc.
    },
  };
}

// ============================================
// STRUCTURED DATA (JSON-LD)
// ============================================

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'RivalFit',
    url: SEO_CONFIG.siteUrl,
    logo: `${SEO_CONFIG.siteUrl}/logo.svg`,
    description: 'Plataforma de gestión para centros deportivos y fitness.',
    sameAs: [
      'https://twitter.com/rivalfitapp',
      'https://www.instagram.com/rivalfitapp',
      'https://www.linkedin.com/company/rivalfit',
    ],
    // Sin telefono de soporte real todavia — un numero inventado en datos
    // estructurados es peor que no tener contactPoint (usuarios reales lo
    // marcarian, y Google penaliza datos estructurados falsos).
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'sales@rivalfit.app',
      contactType: 'Customer Service',
      availableLanguage: ['es', 'en', 'pt'],
    },
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'RivalFit Centers',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '299.99',
      priceCurrency: 'EUR',
      offeredBy: {
        '@type': 'Organization',
        name: 'RivalFit',
      },
    },
    // Sin aggregateRating: Google prohibe explicitamente valoraciones
    // inventadas en datos estructurados (es motivo de accion manual/penalizacion).
    // Cuando haya reseñas reales de centros, se añade con datos verdaderos.
    description: 'Software de gestión integral para centros deportivos: reservas, pagos, comunidad y analytics.',
  };
}

export function generateProductSchema(
  planName: string,
  price: number,
  currency: string,
  features: string[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `RivalFit ${planName}`,
    description: `Plan ${planName} para centros deportivos: ${features.join(', ')}`,
    brand: {
      '@type': 'Brand',
      name: 'RivalFit',
    },
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        .toISOString()
        .split('T')[0],
      seller: {
        '@type': 'Organization',
        name: 'RivalFit',
      },
    },
  };
}

export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ============================================
// SITEMAP GENERATION
// ============================================

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: {
    languages: Record<string, string>;
  };
}

export function generateSitemap(): SitemapEntry[] {
  const baseUrl = SEO_CONFIG.siteUrl;

  return [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          es: `${baseUrl}/es`,
          en: `${baseUrl}/en`,
          pt: `${baseUrl}/pt`,
        },
      },
    },
    // For Centers Landing
    {
      url: `${baseUrl}/for-centers`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          es: `${baseUrl}/es/for-centers`,
          en: `${baseUrl}/en/for-centers`,
          pt: `${baseUrl}/pt/for-centers`,
        },
      },
    },
    // Center Signup
    {
      url: `${baseUrl}/center-signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Add more pages...
  ];
}

// ============================================
// ROBOTS.TXT GENERATION
// ============================================

export function generateRobotsTxt(): string {
  const baseUrl = SEO_CONFIG.siteUrl;

  return `
# RivalFit - Robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /center/*/admin/
Disallow: /_next/

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-es.xml
Sitemap: ${baseUrl}/sitemap-en.xml
Sitemap: ${baseUrl}/sitemap-pt.xml

# Crawl-delay for aggressive bots
User-agent: Googlebot
Crawl-delay: 1

User-agent: Bingbot
Crawl-delay: 1
  `.trim();
}
