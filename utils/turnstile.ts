// Verifica un token de Cloudflare Turnstile en el servidor antes de dejar
// pasar un login o registro. Si TURNSTILE_SECRET_KEY no esta configurada
// (ej. en local/dev), no bloquea — solo en producción con la clave puesta
// se exige el check.
export async function verifyTurnstileToken(token: string | null, ip: string): Promise<{ success: boolean; error?: string }> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) return { success: true }

    if (!token) {
        return { success: false, error: 'Verificación de seguridad requerida. Recarga la página e inténtalo de nuevo.' }
    }

    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        })
        const data = await res.json()
        if (!data.success) {
            console.warn('[turnstile] verificación fallida:', data['error-codes'])
            return { success: false, error: 'No pudimos verificar que eres una persona real. Inténtalo de nuevo.' }
        }
        return { success: true }
    } catch (e) {
        console.error('[turnstile] error al verificar:', e)
        // Si Cloudflare esta caido, no bloqueamos el login/registro de nadie por eso.
        return { success: true }
    }
}
