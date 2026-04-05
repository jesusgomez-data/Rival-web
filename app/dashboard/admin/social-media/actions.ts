'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import Groq from 'groq-sdk'

function getGroq() {
    return new Groq({ apiKey: process.env.GROQ_API_KEY })
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
    const message = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
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

    const content = message.choices[0]?.message?.content
    if (!content) throw new Error('Invalid response')

    let parsed
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch?.[0] || content)
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

export async function generateCarouselHTML(topic: string, slideCount: number): Promise<{ html: string; slides: any[]; caption: string; title: string }> {
    const message = await getGroq().chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 3500,
        messages: [{
            role: 'user',
            content: `Eres el director de contenido de RivalFit, red social fitness de élite con enfoque técnico y científico. Crea un carrusel de Instagram PROFESIONAL y DETALLADO en español sobre: "${topic}".
Total: ${slideCount} slides. La primera es portada. La última es CTA. Las del medio son contenido rico y específico.

Usa estos tipos de slide según el tema:
- "cover": portada impactante
- "data_grid": grid de 4 estadísticas/datos numéricos (ángulos, porcentajes, rangos, tiempos, etc.)
- "list": lista numerada de 3-4 ítems técnicos (músculos, ejercicios, pasos, beneficios)
- "errors": lista de 3 errores comunes con su riesgo/consecuencia
- "tips": 3-4 consejos prácticos con icono emoji
- "statement": slide tipográfico con frase impactante + dato o explicación
- "cta": llamada a la acción final

Responde SOLO con JSON válido con esta estructura EXACTA (adapta los tipos al tema):
{
  "title": "Título del carrusel",
  "slides": [
    {
      "type": "cover",
      "eyebrow": "Rival Biomecánica · 01",
      "headline": "HEADLINE IMPACTANTE EN MAYÚSCULAS",
      "subheadline": "segunda línea en rojo (opcional)",
      "body": "subtítulo descriptivo breve"
    },
    {
      "type": "data_grid",
      "section": "Categoría · Subcategoría",
      "headline": "TÍTULO DE LA SLIDE",
      "items": [
        { "value": "180°", "label": "Flexión", "note": "descripción técnica breve" },
        { "value": "60°", "label": "Extensión", "note": "descripción técnica breve" },
        { "value": "90°", "label": "Abducción", "note": "descripción técnica breve" },
        { "value": "30°", "label": "Rotación", "note": "descripción técnica breve" }
      ]
    },
    {
      "type": "list",
      "section": "Categoría · Subcategoría",
      "headline": "TÍTULO DE LA SLIDE",
      "items": [
        { "num": "01", "title": "Nombre técnico", "desc": "Descripción específica y técnica del elemento", "detail": "→ dato clave o consecuencia" },
        { "num": "02", "title": "Nombre técnico", "desc": "Descripción específica y técnica del elemento", "detail": "→ dato clave o consecuencia" },
        { "num": "03", "title": "Nombre técnico", "desc": "Descripción específica y técnica del elemento", "detail": "→ dato clave o consecuencia" }
      ]
    },
    {
      "type": "errors",
      "section": "Categoría · Errores",
      "headline": "ERRORES QUE LESIONAN",
      "items": [
        { "num": "01", "title": "Nombre del error", "desc": "Qué ocurre biomecánicamente", "risk": "Riesgo: consecuencia específica" },
        { "num": "02", "title": "Nombre del error", "desc": "Qué ocurre biomecánicamente", "risk": "Riesgo: consecuencia específica" },
        { "num": "03", "title": "Nombre del error", "desc": "Qué ocurre biomecánicamente", "risk": "Riesgo: consecuencia específica" }
      ]
    },
    {
      "type": "cta",
      "headline": "¿LISTO PARA COMPETIR?",
      "sub": "Frase motivacional breve"
    }
  ],
  "caption": "Caption completo para Instagram con emojis, texto educativo y hashtags relevantes"
}
IMPORTANTE: El contenido debe ser TÉCNICO, ESPECÍFICO y EDUCATIVO. Datos reales. Nombres correctos. Genera exactamente ${slideCount} slides.`
        }]
    })

    const raw = message.choices[0]?.message?.content
    if (!raw) throw new Error('Invalid response')

    let data: any
    try {
        const match = raw.match(/\{[\s\S]*\}/)
        data = JSON.parse(match?.[0] || raw)
    } catch {
        throw new Error('Error parsing AI response')
    }

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
