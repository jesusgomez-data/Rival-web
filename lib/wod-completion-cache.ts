"use client";

/**
 * Caché de "¿completé este WOD?" compartida por toda la sesión.
 *
 * Antes: cada tarjeta de WOD disparaba su propia llamada al montarse
 * (N+1 detectado por Sentry en /gym/*: 10 WODs = 10 llamadas, repetidas
 * en cada navegación). Ahora: una sola llamada por WOD por sesión,
 * compartida entre feed, página del box y visor.
 */

interface CompletionResponse {
    completion: any | null;
}

const cache = new Map<string, Promise<CompletionResponse>>();

export function fetchWodCompletion(wodPostId: string): Promise<CompletionResponse> {
    if (!cache.has(wodPostId)) {
        cache.set(
            wodPostId,
            fetch(`/api/wod/my-completion?wodPostId=${wodPostId}`)
                .then(r => r.json())
                .then(d => ({ completion: (d?.success && d?.completion) ? d.completion : (d?.completion || null) }))
                .catch(() => {
                    // Error de red: no envenenar la caché, permitir reintento
                    cache.delete(wodPostId);
                    return { completion: null };
                })
        );
    }
    return cache.get(wodPostId)!;
}

/** Llamar tras registrar un resultado para que la UI refleje el cambio */
export function invalidateWodCompletion(wodPostId: string) {
    cache.delete(wodPostId);
}
