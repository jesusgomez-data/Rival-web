import type Stripe from 'stripe';

/**
 * Devuelve un customer de Stripe válido para el modo actual (test/live).
 *
 * Si el id guardado pertenece al otro modo (p. ej. se creó en test y ahora
 * usamos claves live), o el customer fue borrado, lo descarta y crea uno
 * nuevo, persistiéndolo mediante el callback. Auto-reparación: evita el error
 * "No such customer: ...; a similar object exists in test mode".
 */
export async function ensureStripeCustomer(
    stripe: Stripe,
    existingId: string | null | undefined,
    params: { email?: string | null; name?: string | null; metadata?: Record<string, string> },
    saveCustomerId: (id: string) => Promise<void>
): Promise<string> {
    if (existingId) {
        try {
            const existing = await stripe.customers.retrieve(existingId);
            if (!(existing as any).deleted) return existingId;
        } catch {
            console.warn('[ensureStripeCustomer] Customer inexistente en este modo (test/live); se recrea:', existingId);
        }
    }

    const created = await stripe.customers.create({
        email: params.email || undefined,
        name: params.name || undefined,
        metadata: params.metadata,
    });
    await saveCustomerId(created.id);
    return created.id;
}
