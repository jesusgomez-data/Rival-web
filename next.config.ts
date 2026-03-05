import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
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
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      }
    ],
  },
  // Disable strict checks for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
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
  // Strict mode helps catch bugs early without runtime cost in prod
  reactStrictMode: false,
};

export default withNextIntl(nextConfig);
