import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.unsplash.com https://ui-avatars.com https://ralskslspvskjqqgzbiv.supabase.co https://rivalfit.app https://randomuser.me",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://api.stripe.com https://api.resend.com",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "media-src 'self' https://*.supabase.co blob: data:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    // Use modern formats: AVIF first (best compression), then WebP
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 1 week in browser
    minimumCacheTTL: 604800,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'ralskslspvskjqqgzbiv.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'rivalfit.app',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
    // Enable optimistic client cache for faster navigations
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // Enable gzip/brotli compression on responses
  compress: true,
  // Production: remove console.logs for smaller JS bundle
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
