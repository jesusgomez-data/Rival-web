'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY })
}

function getAnthropic() {
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

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
    const anthropic = getAnthropic()

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        tools: [{
            name: 'generate_script',
            description: 'Genera un guion estructurado para video de redes sociales',
            input_schema: {
                type: 'object' as const,
                properties: {
                    title: { type: 'string', description: 'Título atractivo del video' },
                    hook: { type: 'string', description: 'Gancho inicial poderoso (primeros 3 segundos)' },
                    key_points: { type: 'array', items: { type: 'string' }, description: '3-5 puntos clave del contenido' },
                    call_to_action: { type: 'string', description: 'Llamada a la acción al final' },
                    suggested_duration: { type: 'string', description: 'Duración sugerida (ej: "30-60s", "2-3 min")' },
                    suggested_format: { type: 'string', enum: ['reel', 'corto', 'video largo', 'historia', 'carrusel'] },
                    full_script: { type: 'string', description: 'Guion completo con pausas e indicaciones de énfasis' },
                },
                required: ['title', 'hook', 'key_points', 'call_to_action', 'suggested_duration', 'suggested_format', 'full_script'],
            }
        }],
        tool_choice: { type: 'tool', name: 'generate_script' },
        messages: [{
            role: 'user',
            content: `Eres un experto en contenido para redes sociales fitness y entrenamiento deportivo. Genera un guion completo en español para un video de redes sociales sobre: "${topic}".

Formato preferido: ${format || 'reel/video corto'}
Tono: ${tone || 'profesional pero cercano, como hablando con un amigo'}`
        }]
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No se pudo generar el guion')
    const parsed = toolUse.input as any

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

export async function generateCarouselHTML(topic: string, slideCount: number): Promise<{ html: string; slides: any[]; caption: string; title: string }> {
    const anthropic = getAnthropic()

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        tools: [{
            name: 'generate_carousel',
            description: 'Genera un carrusel estructurado para Instagram',
            input_schema: {
                type: 'object' as const,
                properties: {
                    title: { type: 'string' },
                    caption: { type: 'string', description: 'Caption completo para Instagram con emojis y hashtags' },
                    slides: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['cover', 'anatomy', 'data_grid', 'list', 'errors', 'tips', 'statement', 'cta'] },
                                eyebrow: { type: 'string' },
                                headline: { type: 'string' },
                                subheadline: { type: 'string' },
                                body: { type: 'string' },
                                section: { type: 'string' },
                                body_part: { type: 'string' },
                                caption: { type: 'string' },
                                sub: { type: 'string' },
                                items: { type: 'array', items: { type: 'object' } },
                            },
                            required: ['type', 'headline']
                        }
                    }
                },
                required: ['title', 'slides', 'caption']
            }
        }],
        tool_choice: { type: 'tool', name: 'generate_carousel' },
        messages: [{
            role: 'user',
            content: `Eres el director de contenido de RivalFit, red social fitness de élite con enfoque técnico y científico. Crea un carrusel de Instagram PROFESIONAL y DETALLADO en español sobre: "${topic}".
Total: ${slideCount} slides. La primera es portada (type: "cover"). La última es CTA (type: "cta"). Las del medio son contenido rico y específico.

Tipos disponibles:
- "cover": portada impactante (campos: eyebrow, headline, subheadline, body)
- "anatomy": cuando el tema sea biomecánica/músculos/lesiones (campos: section, headline, body_part: "hombro"|"rodilla"|"columna"|"cadera"|"codo", caption)
- "data_grid": grid de 4 estadísticas (campos: section, headline, items: [{value, label, note}])
- "list": lista numerada (campos: section, headline, items: [{num, title, desc, detail}])
- "errors": errores comunes (campos: section, headline, items: [{num, title, desc, risk}])
- "tips": consejos prácticos (campos: section, headline, items: [{icon, title, desc}])
- "statement": frase impactante (campos: headline, body)
- "cta": llamada a acción (campos: headline, sub)

IMPORTANTE: contenido TÉCNICO, ESPECÍFICO y EDUCATIVO. Genera exactamente ${slideCount} slides.`
        }]
    })

    const toolUse = response.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No se pudo generar el carrusel')
    const data = toolUse.input as any

    const slides: any[] = data.slides || []
    const html = buildRivalFitCarouselHTML(data.title || topic, topic, slides)
    return { html, slides, caption: data.caption || '', title: data.title || topic }
}

function buildRivalFitCarouselHTML(title: string, topic: string, slides: any[]): string {
    const total = slides.length
    const totalPad = String(total).padStart(2, '0')
    const slug = topic.slice(0, 24).replace(/\s+/g, '-').toLowerCase()

    const slidesHTML = slides.map((slide, i) => {
        const num = i + 1
        const numPad = String(num).padStart(2, '0')
        const isFirst = i === 0
        const isLast = i === total - 1
        const dots = Array.from({ length: Math.min(total, 7) }, (_, j) =>
            `<div class="dot${j === i ? ' active' : ''}"></div>`
        ).join('')

        if (isFirst || slide.type === 'cover') return slideCover(slide, num, numPad, totalPad, dots, slug)
        if (isLast || slide.type === 'cta') return slideCTA(slide, num, numPad, slug)
        if (slide.type === 'anatomy') return slideAnatomy(slide, num, numPad, totalPad, slug, topic)
        if (slide.type === 'data_grid') return slideDataGrid(slide, num, numPad, totalPad, slug)
        if (slide.type === 'list') return slideList(slide, num, numPad, totalPad, slug)
        if (slide.type === 'errors') return slideErrors(slide, num, numPad, totalPad, slug)
        if (slide.type === 'tips') return slideTips(slide, num, numPad, totalPad, slug)
        return slideStatement(slide, i, num, numPad, totalPad, slug)
    }).join('\n')

    const dlItems = slides.map((_, i) => `{id:'s${i+1}',name:'rivalfit-${slug}-${String(i+1).padStart(2,'0')}.png'}`).join(',')

    return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>RivalFit — ${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#111;display:flex;flex-direction:column;align-items:center;padding:24px;gap:16px;font-family:'Outfit',sans-serif;}
.pt{color:#DC2626;font-size:13px;font-weight:700;letter-spacing:4px;text-transform:uppercase;}
.dla{background:#DC2626;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:1px;}
.dla:hover{background:#b91c1c;}.dla:disabled{background:#444;cursor:wait;}
.sw{display:flex;flex-direction:column;align-items:center;gap:8px;}
.sl{color:#555;font-size:11px;letter-spacing:3px;text-transform:uppercase;}
.db{background:#1e1e1e;color:#aaa;border:1px solid #333;padding:8px 20px;border-radius:6px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;cursor:pointer;}
.db:hover{border-color:#DC2626;color:#DC2626;}
.canvas{width:1080px;height:1350px;background:#0a0a0a;position:relative;overflow:hidden;flex-shrink:0;}
.noise{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.025) 1px,transparent 1px);background-size:28px 28px;z-index:0;}
.la{position:absolute;bottom:60px;left:90px;right:90px;display:flex;align-items:center;justify-content:space-between;z-index:10;}
.logo{font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;}
.logo span{color:#DC2626;}
.logosm{font-size:22px;font-weight:900;color:rgba(255,255,255,0.6);}
.dots{display:flex;gap:8px;align-items:center;}
.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.15);}
.dot.active{background:#DC2626;width:24px;border-radius:4px;}
.ctr{font-size:11px;font-weight:700;letter-spacing:4px;color:rgba(255,255,255,0.25);}
</style></head><body>
<div class="pt">${title}</div>
<button class="dla" onclick="downloadAll()">⬇ Descargar todos los slides (${total} PNGs)</button>
${slidesHTML}
<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
<script>
async function downloadSlide(id,filename){
  const el=document.getElementById(id),btn=el.nextElementSibling;
  btn.textContent='Generando...';btn.disabled=true;
  const c=await html2canvas(el,{scale:2,useCORS:true,backgroundColor:null,logging:false});
  const a=document.createElement('a');a.download=filename;a.href=c.toDataURL('image/png',1.0);a.click();
  btn.textContent='✓ Descargado';btn.disabled=false;
}
async function downloadAll(){
  const btn=document.querySelector('.dla');
  btn.textContent='Generando...';btn.disabled=true;
  const slides=[${dlItems}];
  for(const s of slides){
    const c=await html2canvas(document.getElementById(s.id),{scale:2,useCORS:true,backgroundColor:null,logging:false});
    const a=document.createElement('a');a.download=s.name;a.href=c.toDataURL('image/png',1.0);a.click();
    await new Promise(r=>setTimeout(r,800));
  }
  btn.textContent='✓ Todos descargados';btn.disabled=false;
  setTimeout(()=>{btn.textContent='⬇ Descargar todos los slides (${total} PNGs)';},3000);
}
</script></body></html>`
}

function canvasWrap(id: number, bg: string, inner: string, logoArea: string): string {
    return `<div class="canvas" id="s${id}" style="background:${bg};">${inner}${logoArea}</div>`
}

function logoRow(numPad: string, totalPad: string): string {
    return `<div class="la"><div class="logo">RIVAL<span>FIT</span></div><div class="ctr">${numPad} / ${totalPad}</div></div>`
}

function sectionTitle(label: string): string {
    return `<div style="font-size:11px;font-weight:700;letter-spacing:6px;color:rgba(220,38,38,0.6);text-transform:uppercase;margin-bottom:20px;">${label || ''}</div>`
}

function slideWrap(num: number, label: string, slug: string, numPad: string, inner: string): string {
    return `<div class="sw"><div class="sl">Slide ${num} — ${label}</div>${inner}<button class="db" onclick="downloadSlide('s${num}','rivalfit-${slug}-${numPad}.png')">⬇ Descargar Slide ${num}</button></div>`
}

function slideCover(s: any, num: number, numPad: string, totalPad: string, dots: string, slug: string): string {
    const hl = (s.headline || '').toUpperCase()
    const hl2 = s.subheadline ? (s.subheadline).toUpperCase() : ''
    const fs = hl.length > 18 ? 86 : hl.length > 12 ? 108 : 128
    const inner = `
<div class="noise"></div>
<div style="position:absolute;bottom:-200px;right:-200px;width:900px;height:900px;background:radial-gradient(circle,rgba(220,38,38,0.22)0%,transparent 60%);"></div>
<div style="position:absolute;top:-100px;left:-200px;width:600px;height:600px;background:radial-gradient(circle,rgba(220,38,38,0.07)0%,transparent 65%);"></div>
<div style="position:absolute;inset:0;background:repeating-linear-gradient(-55deg,transparent,transparent 80px,rgba(255,255,255,0.012)80px,rgba(255,255,255,0.012)81px);"></div>
<div style="position:absolute;top:0;left:0;right:0;height:4px;background:#DC2626;"></div>
<div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:#DC2626;"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;height:100%;padding:0 90px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:8px;color:rgba(220,38,38,0.7);text-transform:uppercase;margin-bottom:64px;">${s.eyebrow || 'RivalFit · Content'}</div>
  <div style="font-size:${fs}px;font-weight:900;line-height:0.88;color:#fff;text-transform:uppercase;letter-spacing:-4px;">${hl}</div>
  ${hl2 ? `<div style="font-size:${fs}px;font-weight:900;line-height:0.88;color:#DC2626;text-transform:uppercase;letter-spacing:-4px;">${hl2}</div>` : ''}
  <div style="font-size:22px;font-weight:400;color:rgba(255,255,255,0.4);margin-top:56px;letter-spacing:1px;">${s.body || 'Desliza y descubre →'}</div>
</div>
<div class="la"><div class="logo">RIVAL<span>FIT</span></div><div class="dots">${dots}</div><div class="ctr">${numPad} / ${totalPad}</div></div>`
    return slideWrap(num, 'Portada', slug, numPad, canvasWrap(num, '#0a0a0a', inner, ''))
}

function slideCTA(s: any, num: number, numPad: string, slug: string): string {
    const hl = (s.headline || '¿LISTO PARA COMPETIR?').toUpperCase()
    const fs = hl.length > 22 ? 70 : hl.length > 15 ? 88 : 108
    const inner = `
<div style="position:absolute;inset:0;background:repeating-linear-gradient(-45deg,transparent,transparent 60px,rgba(0,0,0,0.06)60px,rgba(0,0,0,0.06)61px);"></div>
<div style="position:absolute;top:-200px;right:-200px;width:800px;height:800px;background:radial-gradient(circle,rgba(255,255,255,0.12)0%,transparent 60%);"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;height:100%;padding:0 90px;">
  <div style="font-size:${fs}px;font-weight:900;line-height:0.88;color:#fff;text-transform:uppercase;letter-spacing:-4px;margin-bottom:48px;">${hl}</div>
  <div style="background:rgba(0,0,0,0.2);border:2px solid rgba(255,255,255,0.3);border-radius:16px;padding:24px 60px;margin-bottom:32px;">
    <div style="font-size:14px;color:rgba(255,255,255,0.6);letter-spacing:3px;margin-bottom:8px;text-transform:uppercase;">Únete gratis en</div>
    <div style="font-size:52px;font-weight:900;color:#fff;letter-spacing:-1px;">rivalfit.app</div>
  </div>
  <div style="font-size:20px;color:rgba(255,255,255,0.7);font-weight:400;">${s.sub || 'Red social fitness. Gratis para siempre.'}</div>
</div>
<div class="la"><div class="logosm">RIVALFIT</div><div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:4px;">#RivalMindset</div></div>`
    return slideWrap(num, 'CTA', slug, numPad, canvasWrap(num, '#DC2626', inner, ''))
}

function slideDataGrid(s: any, num: number, numPad: string, totalPad: string, slug: string): string {
    const items = (s.items || []).slice(0, 4)
    const cards = items.map((item: any) => `
  <div style="background:#141414;border:1px solid rgba(220,38,38,0.2);border-radius:20px;padding:50px 40px;">
    <div style="font-size:76px;font-weight:900;color:#DC2626;letter-spacing:-3px;line-height:1;">${item.value || ''}</div>
    <div style="font-size:22px;font-weight:700;color:#fff;margin-top:12px;text-transform:uppercase;letter-spacing:1px;">${item.label || ''}</div>
    <div style="font-size:15px;color:rgba(255,255,255,0.35);margin-top:8px;line-height:1.5;">${item.note || ''}</div>
  </div>`).join('')
    const inner = `
<div class="noise"></div>
<div style="position:absolute;bottom:-100px;right:-100px;width:600px;height:600px;background:radial-gradient(circle,rgba(220,38,38,0.1)0%,transparent 60%);"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;height:100%;padding:80px 90px 140px;">
  ${sectionTitle(s.section)}
  <div style="font-size:72px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-3px;line-height:0.9;margin-bottom:60px;">${(s.headline || '').toUpperCase()}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex:1;">${cards}</div>
</div>`
    return slideWrap(num, 'Datos', slug, numPad, canvasWrap(num, '#0a0a0a', inner, logoRow(numPad, totalPad)))
}

function slideList(s: any, num: number, numPad: string, totalPad: string, slug: string): string {
    const items = (s.items || []).slice(0, 4)
    const rows = items.map((item: any) => `
  <div style="display:flex;gap:28px;align-items:flex-start;padding:28px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
    <div style="min-width:52px;font-size:13px;font-weight:900;color:#DC2626;letter-spacing:4px;padding-top:4px;text-transform:uppercase;">${item.num || ''}</div>
    <div style="flex:1;">
      <div style="font-size:30px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-1px;line-height:1;">${item.title || ''}</div>
      <div style="font-size:17px;color:rgba(255,255,255,0.4);margin-top:8px;line-height:1.5;">${item.desc || ''}</div>
      ${item.detail ? `<div style="font-size:15px;color:#DC2626;margin-top:10px;font-weight:700;">${item.detail}</div>` : ''}
    </div>
  </div>`).join('')
    const inner = `
<div class="noise"></div>
<div style="position:absolute;bottom:-100px;left:-100px;width:600px;height:600px;background:radial-gradient(circle,rgba(220,38,38,0.12)0%,transparent 65%);"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;height:100%;padding:80px 90px 140px;">
  ${sectionTitle(s.section)}
  <div style="font-size:68px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-3px;line-height:0.9;margin-bottom:48px;">${(s.headline || '').toUpperCase()}</div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${rows}</div>
</div>`
    return slideWrap(num, 'Lista', slug, numPad, canvasWrap(num, '#050505', inner, logoRow(numPad, totalPad)))
}

function slideErrors(s: any, num: number, numPad: string, totalPad: string, slug: string): string {
    const items = (s.items || []).slice(0, 3)
    const cards = items.map((item: any) => `
  <div style="display:flex;gap:24px;align-items:flex-start;background:#0f0f0f;border:1px solid rgba(220,38,38,0.15);border-radius:16px;padding:32px;">
    <div style="min-width:48px;font-size:12px;font-weight:900;color:#DC2626;letter-spacing:4px;padding-top:2px;">${item.num || ''}</div>
    <div style="flex:1;">
      <div style="font-size:26px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-1px;">${item.title || ''}</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.35);margin-top:6px;line-height:1.5;">${item.desc || ''}</div>
      ${item.risk ? `<div style="font-size:14px;font-weight:700;color:rgba(220,38,38,0.8);margin-top:10px;background:rgba(220,38,38,0.08);display:inline-block;padding:4px 12px;border-radius:6px;">${item.risk}</div>` : ''}
    </div>
  </div>`).join('')
    const inner = `
<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.015)1px,transparent 1px);background-size:32px 32px;"></div>
<div style="position:absolute;bottom:-100px;right:-100px;width:600px;height:600px;background:radial-gradient(circle,rgba(220,38,38,0.08)0%,transparent 60%);"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;height:100%;padding:80px 90px 140px;">
  ${sectionTitle(s.section)}
  <div style="font-size:68px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-3px;line-height:0.9;margin-bottom:12px;">${(s.headline || 'ERRORES QUE').toUpperCase()}</div>
  <div style="font-size:68px;font-weight:900;color:#DC2626;text-transform:uppercase;letter-spacing:-3px;line-height:0.9;margin-bottom:48px;">LESIONAN.</div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px;">${cards}</div>
</div>`
    return slideWrap(num, 'Errores', slug, numPad, canvasWrap(num, '#080808', inner, logoRow(numPad, totalPad)))
}

function slideTips(s: any, num: number, numPad: string, totalPad: string, slug: string): string {
    const items = (s.items || []).slice(0, 4)
    const rows = items.map((item: any) => `
  <div style="display:flex;gap:24px;align-items:flex-start;padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
    <div style="font-size:36px;min-width:52px;">${item.icon || '✓'}</div>
    <div>
      <div style="font-size:24px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-0.5px;">${item.title || ''}</div>
      <div style="font-size:16px;color:rgba(255,255,255,0.4);margin-top:6px;line-height:1.5;">${item.desc || ''}</div>
    </div>
  </div>`).join('')
    const inner = `
<div class="noise"></div>
<div style="position:absolute;top:-100px;right:-100px;width:600px;height:600px;background:radial-gradient(circle,rgba(220,38,38,0.1)0%,transparent 60%);"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;height:100%;padding:80px 90px 140px;">
  ${sectionTitle(s.section)}
  <div style="font-size:68px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-3px;line-height:0.9;margin-bottom:48px;">${(s.headline || '').toUpperCase()}</div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${rows}</div>
</div>`
    return slideWrap(num, 'Tips', slug, numPad, canvasWrap(num, '#0a0a0a', inner, logoRow(numPad, totalPad)))
}

function slideAnatomy(s: any, num: number, numPad: string, totalPad: string, slug: string, topic: string): string {
    const bodyPart = (s.body_part || '').toLowerCase()
    const svgContent = generateAnatomySVG(bodyPart, topic)
    const inner = `
<div style="position:absolute;top:0;left:0;right:0;height:4px;background:#DC2626;z-index:20;"></div>
<div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:#DC2626;z-index:20;"></div>
<div class="noise"></div>
<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 48%,rgba(220,38,38,0.09)0%,transparent 60%);"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;height:100%;padding:64px 70px 150px;">
  ${sectionTitle(s.section)}
  <div style="font-size:56px;font-weight:900;color:#fff;text-transform:uppercase;letter-spacing:-3px;line-height:0.9;margin-bottom:12px;">${(s.headline || 'ANATOMÍA').toUpperCase()}</div>
  ${s.caption ? `<div style="font-size:13px;color:rgba(255,255,255,0.28);margin-bottom:18px;font-weight:400;letter-spacing:3px;text-transform:uppercase;">${s.caption}</div>` : ''}
  <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;">${svgContent}</div>
</div>`
    return slideWrap(num, 'Anatomía', slug, numPad, canvasWrap(num, '#060606', inner, logoRow(numPad, totalPad)))
}

function generateAnatomySVG(bodyPart: string, topic: string): string {
    const check = (bodyPart + ' ' + topic).toLowerCase()
    if (check.includes('hombro') || check.includes('shoulder') || check.includes('glenohumeral') || check.includes('rotador') || check.includes('manguito')) return shoulderSVG()
    if (check.includes('rodilla') || check.includes('knee') || check.includes('menisco') || check.includes('cruzado') || check.includes('acl') || check.includes('ligamento')) return kneeSVG()
    if (check.includes('columna') || check.includes('spine') || check.includes('lumbar') || check.includes('cervical') || check.includes('vertebra') || check.includes('disco')) return spineSVG()
    if (check.includes('cadera') || check.includes('hip') || check.includes('acetabulo') || check.includes('coxofemoral')) return hipSVG()
    return genericMuscleSVG()
}

function shoulderSVG(): string {
    return `<svg viewBox="0 0 960 900" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-width:940px;max-height:870px;">
<defs>
  <radialGradient id="bonGr" cx="30%" cy="25%" r="70%">
    <stop offset="0%" stop-color="#f5edda"/>
    <stop offset="55%" stop-color="#d8ccaa"/>
    <stop offset="100%" stop-color="#b0a285"/>
  </radialGradient>
  <radialGradient id="headGr" cx="32%" cy="28%" r="68%">
    <stop offset="0%" stop-color="#f0e8d0"/>
    <stop offset="48%" stop-color="#ddd2b0"/>
    <stop offset="100%" stop-color="#a89878"/>
  </radialGradient>
  <radialGradient id="jGl" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="rgba(220,38,38,0.32)"/>
    <stop offset="100%" stop-color="rgba(220,38,38,0)"/>
  </radialGradient>
</defs>
<!-- joint glow -->
<circle cx="488" cy="415" r="140" fill="url(#jGl)"/>
<!-- SCAPULA body -->
<path d="M 365 248 C 408 240 460 248 494 265 L 568 625 L 345 622 Z" fill="#161210" stroke="#4a4030" stroke-width="1.5"/>
<!-- Scapula spine ridge -->
<path d="M 365 250 C 400 240 445 245 488 260" stroke="#c0b390" stroke-width="26" stroke-linecap="round" fill="none"/>
<path d="M 365 250 C 400 240 445 245 488 260" stroke="rgba(255,255,255,0.16)" stroke-width="10" stroke-linecap="round" fill="none"/>
<!-- Scapula medial border -->
<path d="M 350 265 L 345 618" stroke="#2e2818" stroke-width="3"/>
<!-- CLAVICLE -->
<path d="M 68 318 C 155 298 275 290 398 282" stroke="#cfc3a0" stroke-width="32" stroke-linecap="round" fill="none"/>
<path d="M 68 318 C 155 298 275 290 398 282" stroke="rgba(255,255,255,0.22)" stroke-width="12" stroke-linecap="round" fill="none"/>
<ellipse cx="70" cy="318" rx="20" ry="16" fill="#b0a280" stroke="#c8bb98" stroke-width="1"/>
<!-- ACROMION -->
<path d="M 395 282 L 445 300 L 450 335" stroke="#cfc3a0" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<path d="M 395 282 L 445 300 L 450 335" stroke="rgba(255,255,255,0.18)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<!-- Acromion underside ledge -->
<path d="M 450 335 L 475 346" stroke="#9a8e6e" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.65"/>
<!-- CORACOID PROCESS -->
<path d="M 424 275 Q 403 312 382 355" stroke="#b8aa88" stroke-width="20" stroke-linecap="round" fill="none"/>
<path d="M 424 275 Q 403 312 382 355" stroke="rgba(255,255,255,0.12)" stroke-width="8" stroke-linecap="round" fill="none"/>
<!-- AC JOINT highlight -->
<ellipse cx="415" cy="288" rx="18" ry="11" fill="rgba(220,38,38,0.48)"/>
<ellipse cx="415" cy="288" rx="22" ry="15" fill="none" stroke="#DC2626" stroke-width="1.5" opacity="0.7"/>
<!-- SUBACROMIAL SPACE -->
<path d="M 452 340 Q 480 325 502 338" fill="rgba(220,38,38,0.10)" stroke="rgba(220,38,38,0.28)" stroke-width="14" stroke-linecap="round"/>
<!-- ROTATOR CUFF — Supraspinatus (top) -->
<path d="M 368 252 C 408 235 452 234 492 252 L 490 296 C 455 280 418 280 386 298 Z" fill="rgba(220,38,38,0.30)" stroke="#DC2626" stroke-width="1.5" opacity="0.92"/>
<!-- ROTATOR CUFF — Infraspinatus (posterior) -->
<path d="M 376 300 C 410 288 448 287 472 302 L 470 360 C 444 346 406 348 370 362 Z" fill="rgba(220,38,38,0.19)" stroke="rgba(220,38,38,0.62)" stroke-width="1.5"/>
<!-- ROTATOR CUFF — Subscapularis (anterior) -->
<path d="M 440 356 C 457 344 478 348 492 366 L 488 425 C 472 408 452 408 435 420 Z" fill="rgba(220,38,38,0.21)" stroke="rgba(220,38,38,0.58)" stroke-width="1.5"/>
<!-- HUMERAL HEAD — shadow -->
<circle cx="502" cy="422" r="97" fill="rgba(0,0,0,0.42)"/>
<!-- HUMERAL HEAD — main -->
<circle cx="494" cy="415" r="92" fill="url(#headGr)" stroke="#c0b090" stroke-width="2"/>
<!-- articular surface sheen -->
<ellipse cx="460" cy="420" rx="28" ry="44" fill="rgba(220,240,200,0.10)" transform="rotate(-8,460,420)"/>
<!-- anatomical neck -->
<ellipse cx="496" cy="500" rx="54" ry="14" fill="#9a8e6e" opacity="0.5"/>
<!-- GREATER TUBEROSITY -->
<path d="M 562 382 C 585 388 590 420 582 448 C 572 460 552 455 545 438 C 537 418 540 395 555 385 Z" fill="#cfc3a0" stroke="#b0a080" stroke-width="1.5"/>
<!-- LESSER TUBEROSITY -->
<path d="M 458 465 C 470 458 482 465 482 480 C 482 494 470 500 458 496 C 445 490 444 472 458 465 Z" fill="#c8bc9a" stroke="#a89878" stroke-width="1.2"/>
<!-- BICIPITAL GROOVE -->
<path d="M 498 468 L 493 538" stroke="#302820" stroke-width="10" stroke-linecap="round" opacity="0.85"/>
<!-- GLENOID outline (socket) -->
<ellipse cx="455" cy="422" rx="36" ry="53" fill="none" stroke="#DC2626" stroke-width="2.5" opacity="0.72"/>
<!-- LABRUM (fibrocartilage ring) -->
<ellipse cx="455" cy="422" rx="46" ry="64" fill="none" stroke="rgba(220,38,38,0.34)" stroke-width="4" stroke-dasharray="6,4"/>
<!-- JOINT CAPSULE -->
<ellipse cx="494" cy="424" r="120" fill="none" stroke="rgba(220,38,38,0.17)" stroke-width="2" stroke-dasharray="10,7"/>
<!-- HUMERUS SHAFT -->
<path d="M 448 498 C 452 510 552 525 558 545 L 550 790 C 536 796 504 793 490 790 L 484 552 C 466 536 444 522 448 498 Z" fill="url(#bonGr)" stroke="#b0a080" stroke-width="1.5"/>
<path d="M 494 520 L 490 780" stroke="rgba(255,255,255,0.12)" stroke-width="12" stroke-linecap="round"/>
<!-- deltoid tuberosity -->
<path d="M 534 605 C 554 596 566 618 556 642 C 546 656 526 652 521 634 C 516 618 522 608 534 605 Z" fill="#cfc3a0" stroke="#a89878" stroke-width="1.2"/>

<!-- ══ LABELS ══ -->
<!-- CLAVÍCULA -->
<circle cx="230" cy="300" r="5" fill="#DC2626"/>
<polyline points="230,295 230,222 98,222" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="1.5"/>
<text x="92" y="210" fill="#ffffff" font-family="Outfit,sans-serif" font-size="21" font-weight="900" text-anchor="end">CLAVÍCULA</text>
<text x="92" y="230" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">15–17 cm · S-curve</text>
<!-- ACROMION -->
<circle cx="440" cy="312" r="5" fill="#DC2626"/>
<polyline points="445,307 508,242 660,242" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="1.5"/>
<text x="666" y="238" fill="#ffffff" font-family="Outfit,sans-serif" font-size="21" font-weight="900">ACROMION</text>
<text x="666" y="258" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13">Proceso lateral · escápula</text>
<!-- MANGUITO ROTADOR -->
<circle cx="432" cy="258" r="5" fill="#DC2626"/>
<polyline points="437,253 437,174 660,174" fill="none" stroke="rgba(220,38,38,0.60)" stroke-width="1.5"/>
<text x="666" y="170" fill="#DC2626" font-family="Outfit,sans-serif" font-size="21" font-weight="900">MANGUITO ROTADOR</text>
<text x="666" y="190" fill="rgba(220,38,38,0.60)" font-family="Outfit,sans-serif" font-size="13">Supraespinoso · Infraespinoso</text>
<text x="666" y="208" fill="rgba(220,38,38,0.55)" font-family="Outfit,sans-serif" font-size="13">Subescapular · Redondo menor</text>
<!-- CORACOIDES -->
<circle cx="390" cy="342" r="5" fill="#DC2626"/>
<polyline points="385,346 272,402 130,402" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="124" y="398" fill="rgba(255,255,255,0.82)" font-family="Outfit,sans-serif" font-size="20" font-weight="700" text-anchor="end">CORACOIDES</text>
<text x="124" y="416" fill="rgba(255,255,255,0.34)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Proceso anterior</text>
<!-- CABEZA HÚMERO -->
<circle cx="578" cy="402" r="5" fill="#DC2626"/>
<polyline points="583,398 668,362 820,362" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="826" y="358" fill="#ffffff" font-family="Outfit,sans-serif" font-size="21" font-weight="900">CAB. HÚMERO</text>
<text x="826" y="378" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13">Articulación esférica · 3 ejes</text>
<!-- ARTICULACIÓN GLENOHUMERAL -->
<circle cx="454" cy="468" r="5" fill="#DC2626"/>
<polyline points="449,472 330,528 145,528" fill="none" stroke="rgba(220,38,38,0.55)" stroke-width="1.5" stroke-dasharray="5,3"/>
<text x="139" y="522" fill="rgba(220,38,38,0.95)" font-family="Outfit,sans-serif" font-size="19" font-weight="700" text-anchor="end">ART. GLENOHUMERAL</text>
<text x="139" y="540" fill="rgba(220,38,38,0.50)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Flexión 180° · Abducción 180°</text>
<text x="139" y="557" fill="rgba(220,38,38,0.45)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">3 grados de libertad</text>
<!-- ESCÁPULA -->
<circle cx="460" cy="560" r="5" fill="#DC2626"/>
<polyline points="455,564 338,608 148,608" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="142" y="604" fill="rgba(255,255,255,0.78)" font-family="Outfit,sans-serif" font-size="20" font-weight="700" text-anchor="end">ESCÁPULA</text>
<text x="142" y="622" fill="rgba(255,255,255,0.34)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Omóplato · hueso triangular</text>
<!-- DIÁFISIS HUMERAL -->
<circle cx="545" cy="645" r="5" fill="#DC2626"/>
<polyline points="550,645 688,645 820,645" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="826" y="641" fill="rgba(255,255,255,0.70)" font-family="Outfit,sans-serif" font-size="20" font-weight="700">DIÁFISIS HUMERAL</text>
<text x="826" y="659" fill="rgba(255,255,255,0.34)" font-family="Outfit,sans-serif" font-size="13">Tubérculo deltoides</text>
<!-- AC JOINT label small -->
<circle cx="415" cy="288" r="6" fill="none" stroke="#DC2626" stroke-width="2"/>
<polyline points="421,282 464,252 618,252" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
<text x="624" y="248" fill="rgba(255,255,255,0.52)" font-family="Outfit,sans-serif" font-size="16" font-weight="600">ARTICULACIÓN AC</text>
</svg>`
}

function kneeSVG(): string {
    return `<svg viewBox="0 0 960 900" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-width:940px;max-height:870px;">
<defs>
  <radialGradient id="kBon" cx="30%" cy="25%" r="70%">
    <stop offset="0%" stop-color="#f5edda"/>
    <stop offset="55%" stop-color="#d8ccaa"/>
    <stop offset="100%" stop-color="#b0a285"/>
  </radialGradient>
  <radialGradient id="kGl" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="rgba(220,38,38,0.28)"/>
    <stop offset="100%" stop-color="rgba(220,38,38,0)"/>
  </radialGradient>
</defs>
<!-- Joint glow -->
<circle cx="480" cy="490" r="160" fill="url(#kGl)"/>
<!-- FEMUR shaft -->
<rect x="452" y="60" width="58" height="400" rx="28" fill="url(#kBon)" stroke="#b0a080" stroke-width="1.5"/>
<path d="M 462 80 L 458 440" stroke="rgba(255,255,255,0.12)" stroke-width="12" stroke-linecap="round"/>
<!-- FEMUR condyles -->
<ellipse cx="432" cy="482" rx="68" ry="56" fill="url(#kBon)" stroke="#c0b090" stroke-width="2"/>
<ellipse cx="528" cy="482" rx="68" ry="56" fill="url(#kBon)" stroke="#c0b090" stroke-width="2"/>
<!-- Intercondylar notch -->
<path d="M 462 458 Q 480 445 498 458 L 498 510 Q 480 498 462 510 Z" fill="#0a0a0a"/>
<!-- PATELLA -->
<ellipse cx="480" cy="432" rx="46" ry="58" fill="url(#kBon)" stroke="#c8bb98" stroke-width="2"/>
<ellipse cx="472" cy="422" rx="18" ry="22" fill="rgba(255,255,255,0.08)"/>
<!-- Patellar tendon -->
<path d="M 468 488 L 464 570" stroke="#c0b090" stroke-width="16" stroke-linecap="round"/>
<path d="M 492 488 L 488 570" stroke="#c0b090" stroke-width="10" stroke-linecap="round" opacity="0.5"/>
<!-- TIBIAL PLATEAU -->
<path d="M 348 540 L 612 540 L 612 558 Q 480 572 348 558 Z" fill="url(#kBon)" stroke="#b8aa88" stroke-width="1.5"/>
<!-- Tibial spine / eminence -->
<path d="M 462 524 L 470 508 L 478 524 L 490 508 L 498 524" stroke="#d0c4a0" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
<!-- MEDIAL MENISCUS (C-shape left) -->
<path d="M 350 546 C 342 555 342 572 352 582 C 362 591 380 592 392 582 C 380 578 366 574 358 565 C 350 556 348 548 350 546 Z" fill="rgba(220,38,38,0.38)" stroke="rgba(220,38,38,0.75)" stroke-width="2"/>
<!-- LATERAL MENISCUS (C-shape right) -->
<path d="M 612 546 C 620 555 620 572 610 582 C 600 591 582 592 568 582 C 580 578 596 574 604 565 C 612 556 614 548 612 546 Z" fill="rgba(220,38,38,0.38)" stroke="rgba(220,38,38,0.75)" stroke-width="2"/>
<!-- ACL (anterior cruciate) — red diagonal -->
<path d="M 456 540 L 498 468" stroke="rgba(220,38,38,0.85)" stroke-width="10" stroke-linecap="round"/>
<path d="M 456 540 L 498 468" stroke="rgba(220,38,38,0.30)" stroke-width="18" stroke-linecap="round"/>
<!-- PCL (posterior cruciate) — lighter diagonal -->
<path d="M 504 540 L 462 462" stroke="rgba(255,160,60,0.75)" stroke-width="10" stroke-linecap="round"/>
<path d="M 504 540 L 462 462" stroke="rgba(255,160,60,0.22)" stroke-width="18" stroke-linecap="round"/>
<!-- MCL (medial collateral) — left side line -->
<path d="M 366 458 L 354 580" stroke="rgba(120,190,255,0.75)" stroke-width="10" stroke-linecap="round"/>
<path d="M 366 458 L 354 580" stroke="rgba(120,190,255,0.22)" stroke-width="18" stroke-linecap="round"/>
<!-- LCL (lateral collateral) — right side line -->
<path d="M 594 458 L 606 580" stroke="rgba(120,190,255,0.65)" stroke-width="10" stroke-linecap="round"/>
<!-- FIBULA -->
<rect x="594" y="565" width="30" height="270" rx="14" fill="url(#kBon)" stroke="#b0a080" stroke-width="1.2"/>
<!-- TIBIA shaft -->
<rect x="440" y="558" width="80" height="280" rx="30" fill="url(#kBon)" stroke="#b8aa88" stroke-width="1.5"/>
<path d="M 460 580 L 456 820" stroke="rgba(255,255,255,0.11)" stroke-width="12" stroke-linecap="round"/>
<!-- Tibial tuberosity (bump front) -->
<ellipse cx="482" cy="588" rx="18" ry="24" fill="#d0c4a0" stroke="#b0a080" stroke-width="1.2"/>

<!-- ══ LABELS ══ -->
<!-- FÉMUR -->
<circle cx="512" cy="180" r="5" fill="#DC2626"/>
<polyline points="517,180 620,180 760,180" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="1.5"/>
<text x="766" y="176" fill="#ffffff" font-family="Outfit,sans-serif" font-size="21" font-weight="900">FÉMUR</text>
<text x="766" y="196" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13">Hueso más largo del cuerpo</text>
<!-- RÓTULA -->
<circle cx="432" cy="432" r="5" fill="#DC2626"/>
<polyline points="427,430 330,390 180,390" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="174" y="386" fill="#ffffff" font-family="Outfit,sans-serif" font-size="21" font-weight="900" text-anchor="end">RÓTULA</text>
<text x="174" y="406" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Patela · protege la rodilla</text>
<!-- LCA -->
<circle cx="480" cy="504" r="5" fill="#DC2626"/>
<polyline points="475,504 370,546 190,546" fill="none" stroke="rgba(220,38,38,0.60)" stroke-width="1.5" stroke-dasharray="5,3"/>
<text x="184" y="540" fill="#DC2626" font-family="Outfit,sans-serif" font-size="20" font-weight="700" text-anchor="end">LIG. CRUZADO ANT.</text>
<text x="184" y="558" fill="rgba(220,38,38,0.55)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">ACL · lesión más común</text>
<!-- LCP -->
<circle cx="484" cy="500" r="4" fill="#DC2626"/>
<polyline points="524,500 660,500 760,500" fill="none" stroke="rgba(255,160,60,0.60)" stroke-width="1.5"/>
<text x="766" y="496" fill="rgba(255,160,60,0.90)" font-family="Outfit,sans-serif" font-size="20" font-weight="700">LIG. CRUZADO POST.</text>
<text x="766" y="514" fill="rgba(255,160,60,0.50)" font-family="Outfit,sans-serif" font-size="13">PCL · estabilidad posterior</text>
<!-- LLI (MCL) -->
<circle cx="358" cy="518" r="5" fill="#DC2626"/>
<polyline points="353,518 195,518 130,518" fill="none" stroke="rgba(120,190,255,0.55)" stroke-width="1.5"/>
<text x="124" y="514" fill="rgba(120,190,255,0.90)" font-family="Outfit,sans-serif" font-size="19" font-weight="700" text-anchor="end">LIG. LAT. INTERNO</text>
<text x="124" y="532" fill="rgba(120,190,255,0.45)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">MCL · estabilidad varo/valgo</text>
<!-- MENISCOS -->
<circle cx="370" cy="568" r="5" fill="#DC2626"/>
<polyline points="365,572 238,618 130,618" fill="none" stroke="rgba(220,38,38,0.50)" stroke-width="1.5"/>
<text x="124" y="614" fill="rgba(220,38,38,0.90)" font-family="Outfit,sans-serif" font-size="19" font-weight="700" text-anchor="end">MENISCOS</text>
<text x="124" y="632" fill="rgba(220,38,38,0.48)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Medial · lateral · fibrocartílago</text>
<!-- TIBIA -->
<circle cx="518" cy="700" r="5" fill="#DC2626"/>
<polyline points="523,700 660,700 760,700" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="766" y="696" fill="rgba(255,255,255,0.78)" font-family="Outfit,sans-serif" font-size="21" font-weight="900">TIBIA</text>
<text x="766" y="716" fill="rgba(255,255,255,0.35)" font-family="Outfit,sans-serif" font-size="13">Soporte de carga principal</text>
<!-- PERONÉ -->
<circle cx="610" cy="680" r="5" fill="#DC2626"/>
<polyline points="615,680 720,680 786,680" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
<text x="792" y="740" fill="rgba(255,255,255,0.50)" font-family="Outfit,sans-serif" font-size="17" font-weight="600">PERONÉ</text>
</svg>`
}

function spineSVG(): string {
    return `<svg viewBox="0 0 960 900" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-width:940px;max-height:870px;">
<defs>
  <linearGradient id="spBon" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#f0e8d0"/>
    <stop offset="100%" stop-color="#b8aa88"/>
  </linearGradient>
  <linearGradient id="discGr" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="rgba(220,38,38,0.60)"/>
    <stop offset="100%" stop-color="rgba(150,20,20,0.40)"/>
  </linearGradient>
  <radialGradient id="sGl" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="rgba(220,38,38,0.12)"/>
    <stop offset="100%" stop-color="rgba(220,38,38,0)"/>
  </radialGradient>
</defs>
<!-- bg glow -->
<rect x="380" y="80" width="200" height="750" rx="100" fill="url(#sGl)"/>

<!-- Helper: draw vertebra block + disc at given y -->
<!-- L1 vertebra -->
<rect x="388" y="88" width="184" height="96" rx="12" fill="url(#spBon)" stroke="#b0a080" stroke-width="2"/>
<path d="M 390 96 L 490 92 L 572 96" stroke="rgba(255,255,255,0.14)" stroke-width="10" stroke-linecap="round"/>
<!-- L1 spinous process -->
<path d="M 572 100 C 620 106 650 128 644 150 C 638 170 608 176 572 168" stroke="#c8bc9a" stroke-width="18" stroke-linecap="round" fill="none"/>
<!-- L1 pedicles/transverse process left -->
<path d="M 390 136 C 342 130 310 146 305 162 C 300 178 320 185 358 180" stroke="#c0b490" stroke-width="14" stroke-linecap="round" fill="none"/>
<!-- Nerve root L1 left -->
<path d="M 305 162 C 255 168 205 185 165 200" stroke="rgba(220,38,38,0.65)" stroke-width="7" stroke-linecap="round" fill="none"/>
<!-- L1-L2 disc -->
<rect x="392" y="184" width="176" height="30" rx="14" fill="url(#discGr)" stroke="rgba(220,38,38,0.50)" stroke-width="1.5"/>

<!-- L2 vertebra -->
<rect x="388" y="214" width="184" height="96" rx="12" fill="url(#spBon)" stroke="#b0a080" stroke-width="2"/>
<path d="M 390 222 L 490 218 L 572 222" stroke="rgba(255,255,255,0.14)" stroke-width="10" stroke-linecap="round"/>
<!-- L2 spinous process -->
<path d="M 572 226 C 622 232 652 255 646 278 C 640 298 610 302 572 294" stroke="#c8bc9a" stroke-width="18" stroke-linecap="round" fill="none"/>
<!-- L2 pedicle -->
<path d="M 390 262 C 340 256 308 272 302 288 C 296 304 318 312 356 306" stroke="#c0b490" stroke-width="14" stroke-linecap="round" fill="none"/>
<!-- Nerve root L2 -->
<path d="M 302 288 C 248 296 196 316 154 334" stroke="rgba(220,38,38,0.60)" stroke-width="7" stroke-linecap="round" fill="none"/>
<!-- L2-L3 disc -->
<rect x="392" y="310" width="176" height="30" rx="14" fill="url(#discGr)" stroke="rgba(220,38,38,0.50)" stroke-width="1.5"/>

<!-- L3 vertebra -->
<rect x="388" y="340" width="184" height="96" rx="12" fill="url(#spBon)" stroke="#b0a080" stroke-width="2"/>
<path d="M 390 348 L 490 344 L 572 348" stroke="rgba(255,255,255,0.14)" stroke-width="10" stroke-linecap="round"/>
<path d="M 572 352 C 622 358 654 382 648 406 C 642 426 612 428 572 420" stroke="#c8bc9a" stroke-width="18" stroke-linecap="round" fill="none"/>
<path d="M 390 388 C 338 382 306 398 300 416 C 294 432 316 440 354 434" stroke="#c0b490" stroke-width="14" stroke-linecap="round" fill="none"/>
<path d="M 300 416 C 244 426 190 448 148 468" stroke="rgba(220,38,38,0.55)" stroke-width="7" stroke-linecap="round" fill="none"/>
<!-- L3-L4 disc (herniated — special highlight) -->
<rect x="390" y="436" width="176" height="32" rx="14" fill="url(#discGr)" stroke="#DC2626" stroke-width="2.5"/>
<!-- herniation bulge -->
<path d="M 390 452 C 360 444 345 464 360 476 C 370 482 390 480 390 468" fill="rgba(220,38,38,0.55)" stroke="#DC2626" stroke-width="1.5"/>

<!-- L4 vertebra -->
<rect x="388" y="468" width="184" height="96" rx="12" fill="url(#spBon)" stroke="#b0a080" stroke-width="2"/>
<path d="M 390 476 L 490 472 L 572 476" stroke="rgba(255,255,255,0.14)" stroke-width="10" stroke-linecap="round"/>
<path d="M 572 480 C 624 486 656 510 650 534 C 644 554 614 556 572 548" stroke="#c8bc9a" stroke-width="18" stroke-linecap="round" fill="none"/>
<path d="M 390 516 C 336 510 304 526 298 544 C 292 560 314 568 352 562" stroke="#c0b490" stroke-width="14" stroke-linecap="round" fill="none"/>
<path d="M 298 544 C 240 556 184 580 140 604" stroke="rgba(220,38,38,0.55)" stroke-width="7" stroke-linecap="round" fill="none"/>
<!-- L4-L5 disc -->
<rect x="392" y="564" width="176" height="30" rx="14" fill="url(#discGr)" stroke="rgba(220,38,38,0.48)" stroke-width="1.5"/>

<!-- L5 vertebra -->
<rect x="388" y="594" width="184" height="100" rx="12" fill="url(#spBon)" stroke="#b0a080" stroke-width="2"/>
<path d="M 390 602 L 490 598 L 572 602" stroke="rgba(255,255,255,0.14)" stroke-width="10" stroke-linecap="round"/>
<path d="M 572 608 C 626 614 660 640 654 666 C 648 686 616 688 572 678" stroke="#c8bc9a" stroke-width="18" stroke-linecap="round" fill="none"/>
<path d="M 390 644 C 334 638 300 656 294 674 C 288 690 312 698 350 692" stroke="#c0b490" stroke-width="14" stroke-linecap="round" fill="none"/>
<path d="M 294 674 C 234 688 176 714 132 740" stroke="rgba(220,38,38,0.50)" stroke-width="7" stroke-linecap="round" fill="none"/>
<!-- L5-S1 disc -->
<rect x="394" y="694" width="172" height="28" rx="12" fill="url(#discGr)" stroke="rgba(220,38,38,0.42)" stroke-width="1.5"/>
<!-- SACRUM (simplified) -->
<path d="M 390 722 C 390 760 420 790 480 800 C 540 790 570 760 570 722 Z" fill="url(#spBon)" stroke="#b0a080" stroke-width="2" opacity="0.85"/>
<!-- Spinal canal (center channel) -->
<rect x="456" y="88" width="48" height="640" rx="6" fill="rgba(0,0,0,0.55)" stroke="rgba(220,38,38,0.22)" stroke-width="1.5" stroke-dasharray="8,5"/>

<!-- ══ LABELS ══ -->
<!-- L1-L5 numbers on vertebrae -->
<text x="480" y="144" fill="rgba(255,255,255,0.35)" font-family="Outfit,sans-serif" font-size="24" font-weight="900" text-anchor="middle">L1</text>
<text x="480" y="272" fill="rgba(255,255,255,0.35)" font-family="Outfit,sans-serif" font-size="24" font-weight="900" text-anchor="middle">L2</text>
<text x="480" y="398" fill="rgba(255,255,255,0.35)" font-family="Outfit,sans-serif" font-size="24" font-weight="900" text-anchor="middle">L3</text>
<text x="480" y="526" fill="rgba(255,255,255,0.35)" font-family="Outfit,sans-serif" font-size="24" font-weight="900" text-anchor="middle">L4</text>
<text x="480" y="652" fill="rgba(255,255,255,0.35)" font-family="Outfit,sans-serif" font-size="24" font-weight="900" text-anchor="middle">L5</text>
<text x="480" y="762" fill="rgba(255,255,255,0.28)" font-family="Outfit,sans-serif" font-size="20" font-weight="700" text-anchor="middle">SACRO</text>
<!-- CUERPO VERTEBRAL -->
<circle cx="574" cy="136" r="5" fill="#DC2626"/>
<polyline points="579,136 730,136 820,136" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="1.5"/>
<text x="826" y="132" fill="#ffffff" font-family="Outfit,sans-serif" font-size="20" font-weight="900">CUERPO VERTEBRAL</text>
<text x="826" y="150" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13">Soporte de carga</text>
<!-- APÓFISIS ESPINOSA -->
<circle cx="640" cy="156" r="5" fill="#DC2626"/>
<polyline points="645,156 780,156 820,200" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="826" y="198" fill="rgba(255,255,255,0.75)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">APÓFISIS ESPINOSA</text>
<!-- DISCO INTERVERTEBRAL -->
<circle cx="568" cy="199" r="5" fill="#DC2626"/>
<polyline points="573,199 720,199 820,240" fill="none" stroke="rgba(220,38,38,0.60)" stroke-width="1.5"/>
<text x="826" y="238" fill="#DC2626" font-family="Outfit,sans-serif" font-size="20" font-weight="900">DISCO INTERVERTEBRAL</text>
<text x="826" y="256" fill="rgba(220,38,38,0.55)" font-family="Outfit,sans-serif" font-size="13">Núcleo pulposo · anillo fibroso</text>
<!-- CANAL ESPINAL -->
<circle cx="480" cy="300" r="5" fill="#DC2626"/>
<polyline points="485,300 680,300 820,300" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="5,3"/>
<text x="826" y="296" fill="rgba(255,255,255,0.60)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">CANAL MEDULAR</text>
<text x="826" y="314" fill="rgba(255,255,255,0.32)" font-family="Outfit,sans-serif" font-size="13">Médula espinal</text>
<!-- DISCO HERNIADO L3-L4 -->
<circle cx="360" cy="452" r="5" fill="#DC2626"/>
<polyline points="355,456 240,480 130,480" fill="none" stroke="rgba(220,38,38,0.75)" stroke-width="1.5"/>
<text x="124" y="474" fill="#DC2626" font-family="Outfit,sans-serif" font-size="20" font-weight="900" text-anchor="end">HERNIA DISCAL</text>
<text x="124" y="492" fill="rgba(220,38,38,0.55)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">L3-L4 · presión en nervio</text>
<!-- RAÍCES NERVIOSAS -->
<circle cx="298" cy="416" r="5" fill="#DC2626"/>
<polyline points="293,416 180,416 130,416" fill="none" stroke="rgba(220,38,38,0.52)" stroke-width="1.5" stroke-dasharray="5,3"/>
<text x="124" y="412" fill="rgba(220,38,38,0.85)" font-family="Outfit,sans-serif" font-size="18" font-weight="700" text-anchor="end">RAÍCES NERVIOSAS</text>
<text x="124" y="430" fill="rgba(220,38,38,0.45)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Plexo lumbar · ciática</text>
</svg>`
}

function hipSVG(): string {
    return `<svg viewBox="0 0 960 900" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-width:940px;max-height:870px;">
<defs>
  <radialGradient id="hBon" cx="30%" cy="28%" r="70%">
    <stop offset="0%" stop-color="#f5edda"/>
    <stop offset="55%" stop-color="#d8ccaa"/>
    <stop offset="100%" stop-color="#b0a285"/>
  </radialGradient>
  <radialGradient id="hGl" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="rgba(220,38,38,0.30)"/>
    <stop offset="100%" stop-color="rgba(220,38,38,0)"/>
  </radialGradient>
</defs>
<!-- joint glow -->
<circle cx="480" cy="480" r="160" fill="url(#hGl)"/>
<!-- ILIUM (large wing) -->
<path d="M 190 80 C 260 60 380 70 480 120 C 580 70 700 60 770 80 C 800 200 790 320 750 380 C 700 440 640 460 600 470 L 480 490 L 360 470 C 320 460 260 440 210 380 C 170 320 160 200 190 80 Z" fill="#161210" stroke="#4a4030" stroke-width="1.5"/>
<!-- Ilium inner surface -->
<path d="M 220 100 C 290 80 390 88 480 130 C 570 88 670 80 740 100" stroke="#2a2416" stroke-width="30" stroke-linecap="round" fill="none"/>
<!-- Iliac crest (top ridge) -->
<path d="M 190 80 C 260 58 380 68 480 118 C 580 68 700 58 770 80" stroke="#c8bc9a" stroke-width="18" stroke-linecap="round" fill="none"/>
<path d="M 190 80 C 260 58 380 68 480 118 C 580 68 700 58 770 80" stroke="rgba(255,255,255,0.14)" stroke-width="7" stroke-linecap="round" fill="none"/>
<!-- PUBIS / ISCHIUM (lower arch) -->
<path d="M 360 468 C 350 520 340 560 380 600 C 420 640 440 660 480 665 C 520 660 540 640 580 600 C 620 560 610 520 600 468" fill="#181410" stroke="#4a4030" stroke-width="1.5"/>
<!-- Symphysis pubis (center joint) -->
<rect x="450" y="655" width="60" height="28" rx="12" fill="rgba(220,38,38,0.28)" stroke="rgba(220,38,38,0.55)" stroke-width="1.5"/>
<!-- ACETABULUM (socket) left side -->
<circle cx="370" cy="476" r="75" fill="#0d0b09" stroke="#c0b090" stroke-width="2.5"/>
<circle cx="370" cy="476" r="58" fill="#090807" stroke="rgba(220,38,38,0.45)" stroke-width="2"/>
<!-- Acetabular labrum -->
<circle cx="370" cy="476" r="80" fill="none" stroke="rgba(220,38,38,0.30)" stroke-width="5" stroke-dasharray="8,5"/>
<!-- FEMORAL HEAD (ball) left -->
<circle cx="374" cy="472" r="60" fill="url(#hBon)" stroke="#c0b090" stroke-width="2.5"/>
<ellipse cx="354" cy="456" rx="22" ry="16" fill="rgba(255,255,255,0.08)"/>
<!-- Femoral NECK -->
<path d="M 400 522 C 420 540 445 570 445 610 L 480 620 L 490 610 C 490 570 515 540 535 522" stroke="url(#hBon)" stroke-width="52" stroke-linecap="round" fill="none"/>
<!-- Femoral shaft (left) -->
<rect x="456" y="620" width="48" height="240" rx="22" fill="url(#hBon)" stroke="#b8aa88" stroke-width="1.5"/>
<path d="M 466 640 L 462 840" stroke="rgba(255,255,255,0.11)" stroke-width="11" stroke-linecap="round"/>
<!-- GREATER TROCHANTER -->
<ellipse cx="420" cy="568" rx="36" ry="52" fill="url(#hBon)" stroke="#c8bb98" stroke-width="1.5" transform="rotate(-15,420,568)"/>
<!-- LESSER TROCHANTER -->
<ellipse cx="504" cy="608" rx="22" ry="30" fill="#d0c4a0" stroke="#b0a080" stroke-width="1.2" transform="rotate(20,504,608)"/>
<!-- HEAD OF FEMUR fovea (attachment point) -->
<circle cx="362" cy="462" r="10" fill="rgba(220,38,38,0.50)" stroke="rgba(220,38,38,0.80)" stroke-width="1.5"/>
<!-- Ligamentum teres (capitis femoris) -->
<path d="M 362 462 L 370 476" stroke="rgba(220,38,38,0.70)" stroke-width="5" stroke-linecap="round"/>

<!-- ══ LABELS ══ -->
<!-- CRESTA ILÍACA -->
<circle cx="340" cy="72" r="5" fill="#DC2626"/>
<polyline points="335,70 220,55 130,55" fill="none" stroke="rgba(255,255,255,0.30)" stroke-width="1.5"/>
<text x="124" y="51" fill="#ffffff" font-family="Outfit,sans-serif" font-size="21" font-weight="900" text-anchor="end">CRESTA ILÍACA</text>
<text x="124" y="70" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Referencia palpable</text>
<!-- ÍLEON -->
<circle cx="250" cy="200" r="5" fill="#DC2626"/>
<polyline points="245,200 148,200 100,200" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="94" y="196" fill="rgba(255,255,255,0.82)" font-family="Outfit,sans-serif" font-size="20" font-weight="700" text-anchor="end">ÍLEON</text>
<text x="94" y="214" fill="rgba(255,255,255,0.34)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Hueso ilíaco</text>
<!-- ACETÁBULO -->
<circle cx="312" cy="476" r="5" fill="#DC2626"/>
<polyline points="307,476 185,476 100,476" fill="none" stroke="rgba(220,38,38,0.60)" stroke-width="1.5" stroke-dasharray="5,3"/>
<text x="94" y="470" fill="#DC2626" font-family="Outfit,sans-serif" font-size="20" font-weight="700" text-anchor="end">ACETÁBULO</text>
<text x="94" y="488" fill="rgba(220,38,38,0.55)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Socket · cótilo</text>
<!-- LABRUM -->
<circle cx="300" cy="440" r="5" fill="#DC2626"/>
<polyline points="295,438 175,400 100,400" fill="none" stroke="rgba(220,38,38,0.50)" stroke-width="1.5"/>
<text x="94" y="396" fill="rgba(220,38,38,0.85)" font-family="Outfit,sans-serif" font-size="18" font-weight="700" text-anchor="end">LABRUM</text>
<text x="94" y="414" fill="rgba(220,38,38,0.45)" font-family="Outfit,sans-serif" font-size="12" text-anchor="end">Fibrocartílago acetabular</text>
<!-- CABEZA FEMORAL -->
<circle cx="426" cy="450" r="5" fill="#DC2626"/>
<polyline points="431,448 560,410 700,410" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="706" y="406" fill="#ffffff" font-family="Outfit,sans-serif" font-size="21" font-weight="900">CABEZA FEMORAL</text>
<text x="706" y="425" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13">Articulación esférica · 3 ejes</text>
<!-- TROCÁNTER MAYOR -->
<circle cx="390" cy="556" r="5" fill="#DC2626"/>
<polyline points="385,558 240,600 140,600" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="134" y="596" fill="rgba(255,255,255,0.78)" font-family="Outfit,sans-serif" font-size="19" font-weight="700" text-anchor="end">TROCÁNTER MAYOR</text>
<text x="134" y="614" fill="rgba(255,255,255,0.34)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Inserción de glúteos</text>
<!-- CUELLO FEMORAL -->
<circle cx="466" cy="572" r="5" fill="#DC2626"/>
<polyline points="471,570 620,556 720,556" fill="none" stroke="rgba(255,255,255,0.26)" stroke-width="1.5"/>
<text x="726" y="552" fill="rgba(255,255,255,0.72)" font-family="Outfit,sans-serif" font-size="19" font-weight="700">CUELLO FEMORAL</text>
<text x="726" y="570" fill="rgba(255,255,255,0.32)" font-family="Outfit,sans-serif" font-size="13">Ángulo cervicodiafisario ~130°</text>
<!-- SÍNFISIS DEL PUBIS -->
<circle cx="480" cy="665" r="5" fill="#DC2626"/>
<polyline points="485,665 620,680 720,680" fill="none" stroke="rgba(220,38,38,0.45)" stroke-width="1.5"/>
<text x="726" y="676" fill="rgba(220,38,38,0.80)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">SÍNFISIS DEL PUBIS</text>
</svg>`
}

function genericMuscleSVG(): string {
    return `<svg viewBox="0 0 960 900" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;max-width:940px;max-height:870px;">
<defs>
  <radialGradient id="gMuscle" cx="40%" cy="35%" r="65%">
    <stop offset="0%" stop-color="rgba(220,38,38,0.55)"/>
    <stop offset="100%" stop-color="rgba(150,20,20,0.20)"/>
  </radialGradient>
  <radialGradient id="gBone" cx="30%" cy="25%" r="70%">
    <stop offset="0%" stop-color="#f0e8d0"/>
    <stop offset="100%" stop-color="#b0a285"/>
  </radialGradient>
</defs>
<!-- Stylized muscular cross-section -->
<!-- Outer boundary (muscle belly) -->
<ellipse cx="480" cy="450" rx="300" ry="360" fill="#130f0d" stroke="#2a2015" stroke-width="2"/>
<!-- Layer 1 — deep fascia -->
<ellipse cx="480" cy="450" rx="268" ry="325" fill="rgba(220,38,38,0.06)" stroke="rgba(220,38,38,0.20)" stroke-width="1.5" stroke-dasharray="10,6"/>
<!-- Major muscle groups -->
<ellipse cx="380" cy="360" rx="95" ry="130" fill="url(#gMuscle)" stroke="rgba(220,38,38,0.55)" stroke-width="2" opacity="0.9"/>
<ellipse cx="580" cy="360" rx="95" ry="130" fill="url(#gMuscle)" stroke="rgba(220,38,38,0.55)" stroke-width="2" opacity="0.85"/>
<ellipse cx="480" cy="540" rx="110" ry="120" fill="url(#gMuscle)" stroke="rgba(220,38,38,0.50)" stroke-width="2" opacity="0.80"/>
<ellipse cx="350" cy="520" rx="65" ry="85" fill="rgba(220,38,38,0.22)" stroke="rgba(220,38,38,0.42)" stroke-width="1.5"/>
<ellipse cx="610" cy="520" rx="65" ry="85" fill="rgba(220,38,38,0.22)" stroke="rgba(220,38,38,0.42)" stroke-width="1.5"/>
<!-- Central bone (cross-section) -->
<ellipse cx="480" cy="440" rx="60" ry="72" fill="url(#gBone)" stroke="#c0b090" stroke-width="2"/>
<ellipse cx="472" cy="430" rx="22" ry="26" fill="rgba(255,255,255,0.10)"/>
<!-- Periosteum -->
<ellipse cx="480" cy="440" rx="68" ry="80" fill="none" stroke="rgba(200,185,145,0.40)" stroke-width="2" stroke-dasharray="6,4"/>
<!-- Muscle fiber lines -->
<path d="M 320 290 L 340 430" stroke="rgba(220,38,38,0.20)" stroke-width="3" stroke-linecap="round"/>
<path d="M 340 288 L 360 428" stroke="rgba(220,38,38,0.20)" stroke-width="3" stroke-linecap="round"/>
<path d="M 360 285 L 380 425" stroke="rgba(220,38,38,0.20)" stroke-width="3" stroke-linecap="round"/>
<path d="M 600 290 L 580 430" stroke="rgba(220,38,38,0.18)" stroke-width="3" stroke-linecap="round"/>
<path d="M 620 288 L 600 428" stroke="rgba(220,38,38,0.18)" stroke-width="3" stroke-linecap="round"/>
<!-- Blood vessels -->
<path d="M 480 330 L 480 560" stroke="rgba(220,38,38,0.50)" stroke-width="4" stroke-linecap="round"/>
<path d="M 450 350 C 430 380 430 420 450 450" stroke="rgba(220,38,38,0.30)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
<path d="M 510 350 C 530 380 530 420 510 450" stroke="rgba(220,38,38,0.30)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
<!-- Nerve -->
<path d="M 400 310 C 390 380 392 460 408 528" stroke="rgba(255,220,100,0.45)" stroke-width="4" stroke-linecap="round" fill="none"/>
<!-- Labels -->
<circle cx="378" cy="320" r="5" fill="#DC2626"/>
<polyline points="373,318 228,270 130,270" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="124" y="266" fill="#ffffff" font-family="Outfit,sans-serif" font-size="20" font-weight="900" text-anchor="end">MÚSCULO AGONISTA</text>
<text x="124" y="284" fill="rgba(255,255,255,0.36)" font-family="Outfit,sans-serif" font-size="13" text-anchor="end">Fibras tipo I y II</text>
<circle cx="582" cy="320" r="5" fill="#DC2626"/>
<polyline points="587,318 720,270 820,270" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>
<text x="826" y="266" fill="rgba(255,255,255,0.82)" font-family="Outfit,sans-serif" font-size="20" font-weight="900">MÚSCULO SINERGISTA</text>
<circle cx="480" cy="370" r="5" fill="#DC2626"/>
<polyline points="485,368 660,340 820,340" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="5,3"/>
<text x="826" y="336" fill="rgba(255,255,255,0.60)" font-family="Outfit,sans-serif" font-size="18" font-weight="700">HUESO / DIÁFISIS</text>
<circle cx="405" cy="412" r="5" fill="#DC2626"/>
<polyline points="400,414 240,460 130,460" fill="none" stroke="rgba(255,220,100,0.50)" stroke-width="1.5" stroke-dasharray="5,3"/>
<text x="124" y="456" fill="rgba(255,220,100,0.82)" font-family="Outfit,sans-serif" font-size="18" font-weight="700" text-anchor="end">NERVIO MOTOR</text>
<circle cx="480" cy="548" r="5" fill="#DC2626"/>
<polyline points="485,548 660,580 820,580" fill="none" stroke="rgba(220,38,38,0.50)" stroke-width="1.5"/>
<text x="826" y="576" fill="rgba(220,38,38,0.88)" font-family="Outfit,sans-serif" font-size="20" font-weight="900">FASCIA PROFUNDA</text>
<text x="826" y="594" fill="rgba(220,38,38,0.45)" font-family="Outfit,sans-serif" font-size="13">Tejido conectivo denso</text>
</svg>`
}

function slideStatement(s: any, i: number, num: number, numPad: string, totalPad: string, slug: string): string {
    const hl = (s.headline || '').toUpperCase()
    const words = hl.split(' ')
    const mid = Math.ceil(words.length / 2)
    const fs = hl.length > 20 ? 80 : hl.length > 12 ? 104 : 124
    const inner = `
<div style="position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,0.02)1px,transparent 1px);background-size:28px 28px;"></div>
<div style="position:absolute;bottom:-100px;left:-100px;width:700px;height:700px;background:radial-gradient(circle,rgba(220,38,38,0.14)0%,transparent 65%);"></div>
<div style="position:relative;z-index:10;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;height:100%;padding:0 90px 140px;">
  ${sectionTitle(s.section || s.pre || '')}
  <div style="width:48px;height:3px;background:#DC2626;margin-bottom:40px;"></div>
  <div style="font-size:${fs}px;font-weight:900;line-height:0.88;color:#fff;text-transform:uppercase;letter-spacing:-4px;">${words.slice(0, mid).join(' ')}</div>
  ${words.length > 1 ? `<div style="font-size:${fs}px;font-weight:900;line-height:0.88;color:#DC2626;text-transform:uppercase;letter-spacing:-4px;">${words.slice(mid).join(' ')}</div>` : ''}
  <div style="margin-top:48px;font-size:20px;font-weight:400;color:rgba(255,255,255,0.4);line-height:1.7;max-width:820px;">${s.body || ''}</div>
</div>`
    return slideWrap(num, 'Contenido', slug, numPad, canvasWrap(num, i % 2 === 0 ? '#050505' : '#0d0d0d', inner, logoRow(numPad, totalPad)))
}

// ─── CONTENT QUEUE (Canal Oficial bridge) ─────────────────────────────────────

export async function saveContentDraft(data: {
    title: string
    caption: string
    post_type: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { error } = await supabase.from('social_posts').insert({
        user_id: user.id,
        title: data.title,
        caption: data.caption,
        post_type: data.post_type,
        platform: 'instagram',
        status: 'draft',
    })
    if (error) throw error
    revalidatePath('/dashboard/admin/official-posts')
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
