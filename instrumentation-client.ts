import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // Ruido conocido que no aporta nada
    ignoreErrors: [
        'ResizeObserver loop',
        'AbortError',
        'NotAllowedError', // autoplay bloqueado: comportamiento normal del navegador
    ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// ── Anti "version skew" (el 404 DEPLOYMENT_NOT_FOUND) ──────────────────────
// Si el cliente tiene una versión vieja de la app tras un deploy, los chunks
// del deployment anterior ya no existen. Detectamos ese fallo y recargamos
// una sola vez (máx. 1 vez por minuto) para traer la versión nueva.
if (typeof window !== 'undefined') {
    const isStaleChunkError = (msg: string) =>
        /Loading chunk .* failed|ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(msg);

    const reloadOnce = () => {
        const key = 'rival-chunk-reload-ts';
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 60_000) {
            sessionStorage.setItem(key, String(Date.now()));
            window.location.reload();
        }
    };

    window.addEventListener('unhandledrejection', (event) => {
        const msg = String((event.reason && (event.reason.message || event.reason)) || '');
        if (isStaleChunkError(msg)) reloadOnce();
    });

    window.addEventListener('error', (event) => {
        if (isStaleChunkError(String(event.message || ''))) reloadOnce();
    });
}
