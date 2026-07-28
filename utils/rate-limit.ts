import { createAdminClient } from '@/utils/supabase/admin'
import { headers } from 'next/headers'

type AttemptType = 'login' | 'signup'

const LIMITS: Record<AttemptType, { maxAttempts: number; windowMinutes: number }> = {
    // 5 intentos de login por email o IP en 15 min — deja margen para errores
    // de tecleo reales sin permitir fuerza bruta/credential stuffing.
    login: { maxAttempts: 5, windowMinutes: 15 },
    // Los registros son mas caros de scriptear en masa, pero igual se limita
    // por IP para frenar creacion masiva de cuentas falsas.
    signup: { maxAttempts: 3, windowMinutes: 60 },
}

export async function getClientIp(): Promise<string> {
    const h = await headers()
    const forwarded = h.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    return h.get('x-real-ip') || 'unknown'
}

// Comprueba si `identifier` (email o IP) ha superado el limite de intentos
// recientes para `type`. Si la tabla auth_rate_limits todavia no existe
// (falla el 'not.eq'), no bloquea — falla abierto para no romper el login
// de nadie por una migracion pendiente, solo avisa por consola.
export async function isRateLimited(identifier: string, type: AttemptType): Promise<{ limited: boolean; retryAfterMinutes?: number }> {
    const { maxAttempts, windowMinutes } = LIMITS[type]
    const admin = createAdminClient()
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString()

    const { count, error } = await admin
        .from('auth_rate_limits')
        .select('id', { count: 'exact', head: true })
        .eq('identifier', identifier.toLowerCase())
        .eq('attempt_type', type)
        .eq('success', false)
        .gte('created_at', since)

    if (error) {
        console.warn('[rate-limit] auth_rate_limits query failed (¿falta la migracion?):', error.message)
        return { limited: false }
    }

    if ((count || 0) >= maxAttempts) {
        return { limited: true, retryAfterMinutes: windowMinutes }
    }
    return { limited: false }
}

export async function recordAttempt(identifier: string, type: AttemptType, success: boolean): Promise<void> {
    try {
        const admin = createAdminClient()
        await admin.from('auth_rate_limits').insert({
            identifier: identifier.toLowerCase(),
            attempt_type: type,
            success,
        })
    } catch (e) {
        console.warn('[rate-limit] no se pudo registrar el intento:', e)
    }
}
