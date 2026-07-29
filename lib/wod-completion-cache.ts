"use client";

/**
 * Caché de "¿completé este WOD?" compartida por toda la sesión.
 *
 * Primera versión: una sola llamada por WOD por sesión (evitaba duplicados
 * del MISMO wodPostId). Pero un dashboard con 7 WODs distintos seguía
 * disparando 7 llamadas independientes a /api/wod/my-completion — Sentry lo
 * marcó como N+1 (7 requests, 1.5-3s cada una, en una sola carga de
 * /dashboard). Ahora las peticiones que llegan en la misma ráfaga (mismo
 * tick / mismos ~20ms, que es como montan las tarjetas de un feed) se
 * agrupan en UNA sola llamada batch a wodPostIds=id1,id2,...
 */

interface CompletionResponse {
    completion: any | null;
}

const cache = new Map<string, Promise<CompletionResponse>>();

let pendingIds: string[] = [];
let pendingResolvers = new Map<string, { resolve: (v: CompletionResponse) => void; reject: (e: any) => void }[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
        const ids = pendingIds;
        const resolvers = pendingResolvers;
        pendingIds = [];
        pendingResolvers = new Map();
        flushTimer = null;

        if (ids.length === 0) return;

        try {
            const res = await fetch(`/api/wod/my-completion?wodPostIds=${ids.join(',')}`);
            const data = await res.json();
            const byId = (data?.success && data?.completions) ? data.completions : {};
            for (const id of ids) {
                const result: CompletionResponse = { completion: byId[id] || null };
                (resolvers.get(id) || []).forEach(r => r.resolve(result));
            }
        } catch (e) {
            // Error de red: no envenenar la caché, permitir reintento.
            for (const id of ids) {
                cache.delete(id);
                (resolvers.get(id) || []).forEach(r => r.resolve({ completion: null }));
            }
        }
    }, 20);
}

export function fetchWodCompletion(wodPostId: string): Promise<CompletionResponse> {
    if (!cache.has(wodPostId)) {
        const promise = new Promise<CompletionResponse>((resolve, reject) => {
            const list = pendingResolvers.get(wodPostId) || [];
            list.push({ resolve, reject });
            pendingResolvers.set(wodPostId, list);
        });
        pendingIds.push(wodPostId);
        cache.set(wodPostId, promise);
        scheduleFlush();
    }
    return cache.get(wodPostId)!;
}

/** Llamar tras registrar un resultado para que la UI refleje el cambio */
export function invalidateWodCompletion(wodPostId: string) {
    cache.delete(wodPostId);
}
