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
        'window.webkit.messageHandlers', // navegador in-app de Instagram/TikTok/Facebook: su propio puente nativo falla, no es codigo nuestro
        'Object Not Found Matching Id', // firma conocida de extensiones de Chrome (ej. Grammarly) inyectando su propio postMessage/promise, no es codigo nuestro
    ],
    // "Load failed"/"Failed to fetch" es el mensaje generico que da el
    // navegador (sobre todo Safari/iOS) cuando se corta la conexion a medio
    // fetch — real y esperado en movil, y tambien el sintoma de un Server
    // Action fallando por version skew (deploy nuevo mientras el usuario
    // sigue con el bundle viejo). Es demasiado generico para ignorarlo en
    // todo el sitio, asi que solo se descarta cuando ademas hay evidencia de
    // que vino de esa llamada interna de Next.
    //
    // OJO: NO se puede confiar en el nombre de archivo del stack trace aqui.
    // beforeSend corre en el navegador ANTES de que Sentry resuelva
    // sourcemaps (eso pasa despues, en el servidor de Sentry, solo para la
    // vista del dashboard) — en produccion el bundle esta minificado, asi
    // que f.filename nunca contiene "server-action-reducer" de verdad. La
    // señal fiable que si esta disponible en este momento es el propio
    // breadcrumb del fetch: los Server Actions siempre hacen POST a la URL
    // actual de la pagina, y ese breadcrumb queda marcado como error si el
    // fetch fallo.
    beforeSend(event, hint) {
        const msg = String(hint?.originalException instanceof Error ? hint.originalException.message : event.message || '');
        if (/^(Load failed|Failed to fetch)$/i.test(msg.trim())) {
            // Server Actions siempre hacen POST a la URL de la propia
            // pagina (no a /api/*, que es donde vive nuestro codigo de
            // servidor) — asi se evita silenciar un POST nuestro que falle
            // por un bug real en /api/*.
            const breadcrumbs = event.breadcrumbs || [];
            const fromFailedServerActionFetch = breadcrumbs.some(b =>
                b.category === 'fetch' &&
                (b.data as any)?.method === 'POST' &&
                !String((b.data as any)?.url || '').includes('/api/') &&
                (b.level === 'error' || !(b.data as any)?.status_code)
            );
            if (fromFailedServerActionFetch) return null;
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
