import { NextRequest, NextResponse } from 'next/server'

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'rivalfit_webhook_2026'

const WELCOME_MESSAGE = `👋 ¡Bienvenido/a a RivalFit!

Somos la primera red social fitness creada para atletas que quieren ir al siguiente nivel.

🔥 Con RivalFit puedes:
• Registrar y trackear tus entrenamientos
• Competir con atletas de todo el mundo
• Conectar con tu gym o box favorito
• Acceder a programación con IA

🎯 Regístrate GRATIS ahora y empieza a superarte:
👉 https://rivalfit.app

¡Face Yourself. Conquer All! 💪`

/**
 * GET: Verificación del webhook de Facebook/Instagram
 * Facebook envía hub.mode, hub.verify_token y hub.challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('[webhook] Webhook verificado correctamente')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verificación fallida' }, { status: 403 })
}

/**
 * POST: Recibe eventos de Instagram (nuevos seguidores, mensajes, etc.)
 * Cuando alguien sigue la cuenta → envía DM de bienvenida
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Verificar que viene de Facebook
    const signature = req.headers.get('x-hub-signature-256')
    if (!signature) {
      console.warn('[webhook] Request sin firma x-hub-signature-256')
    }

    console.log('[webhook] Evento recibido:', JSON.stringify(body, null, 2))

    // Procesar cada entrada del webhook
    for (const entry of body.entry || []) {
      // Evento de nuevo seguidor
      for (const change of entry.changes || []) {
        if (change.field === 'follows' || change.field === 'follow') {
          const followerIgsid = change.value?.sender?.id || change.value?.id
          if (followerIgsid) {
            await sendWelcomeDM(followerIgsid)
          }
        }
      }

      // Evento de mensaje entrante (para no responder en bucle)
      for (const messaging of entry.messaging || []) {
        if (messaging.message && !messaging.message.is_echo) {
          // Solo enviar bienvenida si es el primer mensaje (texto específico)
          const text = messaging.message.text?.toLowerCase() || ''
          if (text.includes('hola') || text.includes('info') || text.includes('que es')) {
            await sendWelcomeDM(messaging.sender.id)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('[webhook] Error procesando evento:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function sendWelcomeDM(recipientIgsid: string) {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
    console.error('[webhook] Faltan credenciales de Instagram')
    return
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientIgsid },
          message: { text: WELCOME_MESSAGE },
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    )

    const result = await res.json()
    if (result.error) {
      console.error('[webhook] Error enviando DM:', result.error)
    } else {
      console.log('[webhook] DM de bienvenida enviado a:', recipientIgsid)
    }
  } catch (err) {
    console.error('[webhook] Error en sendWelcomeDM:', err)
  }
}
