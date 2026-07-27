import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    // Solo errores: cero trazado en el cliente (recorta el costo de runtime
    // en móviles; la vigilancia de errores queda intacta)
    tracesSampleRate: 0,
    sendDefaultPii: false,
    // Ruido conocido que no aporta nada
    ignoreErrors: [
        'ResizeObserver loop',
        'AbortError',
        'NotAllowedError', // autoplay bloqueado: comportamiento normal del navegador
    ],
    // "Load failed"/"Failed to fetch" es el mensaje generico que da el
    // navegador (sobre todo Safari/iOS) cuando se corta la conexion a medio
    // fetch — real y esperado en movil. Pero el mensaje es demasiado
    // generico para ignorarlo en todo el sitio (podria ocultar un fallo de
    // carga real en otro fetch), asi que solo se descarta cuando el propio
    // stack confirma que viene del fetch interno de Server Actions de Next.
    beforeSend(event, hint) {
        const msg = String(hint?.originalException instanceof Error ? hint.originalException.message : event.message || '');
        if (/^(Load failed|Failed to fetch)$/i.test(msg.trim())) {
            const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
            const fromServerActionFetch = frames.some(f => /server-action-reducer/i.test(f.filename || ''));
            if (fromServerActionFetch) return null;
        }
        return event;
    },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// ── Anti "version skew" (el 404 DEPLOYMENT_NOT_FOUND) ──────────────────────
// Si el cliente tiene una versión vieja de la app tras un deploy, los chunks
// del deployment anterior ya no existen. Detectamos ese fallo y recargamos
// una sola vez (máx. 1 vez por minuto) para traer la versión nueva.
if (typeof window !== 'undefined') {
    const isStaleChunkError = (msg: string) =>
        /Loading chunk .* failed|ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Server Action .* was not found on the server|Failed to find Server Action/i.test(msg);

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
