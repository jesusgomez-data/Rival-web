import * as Sentry from '@sentry/nextjs';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    // 10% de las transacciones para performance (los errores se capturan SIEMPRE)
    tracesSampleRate: 0.1,
    // No enviar datos personales de más
    sendDefaultPii: false,
    // "aborted" en abortIncoming(node:_http_server): el cliente corta la
    // conexión a medio request (cierra pestaña, navega fuera, cancela una
    // subida) antes de que el servidor termine — es Node reportando la
    // desconexión, no un bug de la app. Se descarta solo cuando el stack
    // confirma que viene de las internals HTTP de Node, para no ocultar un
    // "aborted" real disparado por código nuestro.
    beforeSend(event, hint) {
        const err = hint?.originalException;
        const msg = String(err instanceof Error ? err.message : event.message || '');
        if (/^aborted$/i.test(msg.trim())) {
            const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];
            const fromNodeHttpInternals = frames.some(f => /node:_http_server/i.test(f.filename || ''));
            if (fromNodeHttpInternals) return null;
        }
        return event;
    },
});
