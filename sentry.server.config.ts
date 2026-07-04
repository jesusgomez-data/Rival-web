import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    // 10% de las transacciones para performance (los errores se capturan SIEMPRE)
    tracesSampleRate: 0.1,
    // No enviar datos personales de más
    sendDefaultPii: false,
});
