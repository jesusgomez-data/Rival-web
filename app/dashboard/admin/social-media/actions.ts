'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── POSTS ───────────────────────────────────────────────────────────────────

export async function getSocialPosts() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase
        .from('social_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true })
    return data || []
}

export async function createSocialPost(post: {
    title: string
    caption?: string
    platform: string
    post_type?: string
    status?: string
    scheduled_for?: string
    thumbnail_url?: string
    tags?: string[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('social_posts').insert({ ...post, user_id: user.id })
    if (error) throw error
    revalidatePath('/dashboard/admin/social-media')
}

export async function updateSocialPost(id: string, updates: Partial<{
    title: string; caption: string; status: string; scheduled_for: string; thumbnail_url: string
}>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('social_posts').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
    revalidatePath('/dashboard/admin/social-media')
}

export async function deleteSocialPost(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('social_posts').delete().eq('id', id).eq('user_id', user.id)
    revalidatePath('/dashboard/admin/social-media')
}

// ─── IDEAS ───────────────────────────────────────────────────────────────────

export async function getIdeas() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase
        .from('content_ideas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    return data || []
}

export async function createIdea(idea: { title: string; description?: string; platform?: string; content_type?: string; priority?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('content_ideas').insert({ ...idea, user_id: user.id })
    revalidatePath('/dashboard/admin/social-media/ideas')
}

export async function deleteIdea(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('content_ideas').delete().eq('id', id).eq('user_id', user.id)
    revalidatePath('/dashboard/admin/social-media/ideas')
}

export async function markIdeaUsed(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('content_ideas').update({ is_used: true }).eq('id', id).eq('user_id', user.id)
    revalidatePath('/dashboard/admin/social-media/ideas')
}

// ─── SCRIPTS ─────────────────────────────────────────────────────────────────

export async function getScripts() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase
        .from('social_scripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    return data || []
}

export async function generateScript(topic: string, format?: string, tone?: string) {
    const message = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        messages: [{
            role: 'user',
            content: `Eres un experto en contenido para redes sociales fitness y entrenamiento deportivo. Genera un guion completo en español para un video de redes sociales sobre: "${topic}".

Formato preferido: ${format || 'reel/video corto'}
Tono: ${tone || 'profesional pero cercano, como hablando con un amigo'}

Responde SOLO con un JSON válido con esta estructura exacta:
{
  "title": "título atractivo del video",
  "hook": "gancho inicial poderoso (primeros 3 segundos)",
  "key_points": ["punto clave 1", "punto clave 2", "punto clave 3"],
  "call_to_action": "llamada a la acción al final",
  "suggested_duration": "duración sugerida en segundos o minutos",
  "suggested_format": "reel | corto | video largo | historia",
  "full_script": "guion completo con pausas y énfasis indicados"
}`
        }]
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Invalid response')

    let parsed
    try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch?.[0] || content.text)
    } catch {
        throw new Error('Error parsing AI response')
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    await supabase.from('social_scripts').insert({
        user_id: user.id,
        topic,
        title: parsed.title,
        hook: parsed.hook,
        key_points: parsed.key_points,
        call_to_action: parsed.call_to_action,
        suggested_duration: parsed.suggested_duration,
        suggested_format: parsed.suggested_format,
        full_script: parsed.full_script,
        tone: tone || 'professional'
    })

    revalidatePath('/dashboard/admin/social-media/scripts')
    return parsed
}

export async function deleteScript(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('social_scripts').delete().eq('id', id).eq('user_id', user.id)
    revalidatePath('/dashboard/admin/social-media/scripts')
}

// ─── CAROUSELS ────────────────────────────────────────────────────────────────

export async function generateCarousel(topic: string, style: string, slides: number) {
    const message = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{
            role: 'user',
            content: `Eres un experto en marketing de contenido fitness. Genera un carrusel de Instagram en español sobre: "${topic}".
Número de diapositivas: ${slides}
Estilo visual: ${style}

Responde SOLO con un JSON válido con esta estructura:
{
  "title": "título del carrusel",
  "slides": [
    {
      "number": 1,
      "type": "hook",
      "headline": "título grande de la diapositiva",
      "body": "texto secundario breve",
      "cta": null
    },
    {
      "number": 2,
      "type": "content",
      "headline": "punto clave",
      "body": "explicación breve",
      "cta": null
    }
  ],
  "caption": "caption completo para Instagram con emojis y hashtags"
}`
        }]
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Invalid response')

    let parsed
    try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch?.[0] || content.text)
    } catch {
        throw new Error('Error parsing AI response')
    }

    return parsed
}

// ─── METRICS ─────────────────────────────────────────────────────────────────

export async function getMetrics() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase
        .from('social_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
    return data || []
}

export async function saveMetrics(metrics: {
    platform: string
    followers: number
    avg_engagement: number
    monthly_views: number
    posts_count: number
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await supabase.from('social_metrics').insert({ ...metrics, user_id: user.id })
    revalidatePath('/dashboard/admin/social-media/metrics')
}
