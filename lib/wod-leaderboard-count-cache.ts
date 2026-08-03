"use client";

// Mismo patrón de micro-batching que wod-completion-cache.ts: cada tarjeta
// de WOD visible pedía su propio contador a /api/wod/leaderboard?wodPostId=X
// para el chip "X ATLETAS" — Sentry lo marcó como N+1 (una llamada por post
// en el mismo momento). Las peticiones que llegan en la misma ráfaga se
// agrupan en una sola llamada a wodPostIds=id1,id2,...

const cache = new Map<string, Promise<number>>();

let pendingIds: string[] = [];
let pendingResolvers = new Map<string, ((count: number) => void)[]>();
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
            const res = await fetch(`/api/wod/leaderboard?wodPostIds=${ids.join(',')}`);
            const data = await res.json();
            const counts = (data?.success && data?.counts) ? data.counts : {};
            for (const id of ids) {
                (resolvers.get(id) || []).forEach(resolve => resolve(counts[id] || 0));
            }
        } catch (e) {
            for (const id of ids) {
                cache.delete(id);
                (resolvers.get(id) || []).forEach(resolve => resolve(0));
            }
        }
    }, 20);
}

export function fetchWodCompletionsCount(wodPostId: string): Promise<number> {
    if (!cache.has(wodPostId)) {
        const promise = new Promise<number>((resolve) => {
            const list = pendingResolvers.get(wodPostId) || [];
            list.push(resolve);
            pendingResolvers.set(wodPostId, list);
        });
        pendingIds.push(wodPostId);
        cache.set(wodPostId, promise);
        scheduleFlush();
    }
    return cache.get(wodPostId)!;
}
