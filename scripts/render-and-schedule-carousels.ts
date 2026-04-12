/**
 * RivalFit — Render, Upload y Programar Carruseles
 *
 * 1. Renderiza cada slide de los HTML con Puppeteer → PNG
 * 2. Sube cada PNG a Supabase Storage
 * 3. Actualiza los registros de social_posts con las media_urls
 *
 * Ejecutar: npx tsx scripts/render-and-schedule-carousels.ts
 */

import dotenv from 'dotenv'
import path from 'path'
import puppeteer from 'puppeteer'
import * as fs from 'fs'
import { createAdminClient } from '@/utils/supabase/admin'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const CAROUSELS_DIR = path.join(
  process.cwd(),
  '..',
  'marketing',
  'instagram'
)

// Mapeo: archivo HTML → título del post en social_posts
const CAROUSEL_MAP = [
  {
    html: 'carrusel-06-biceps.html',
    postTitle: 'Bíceps Completo - Anatomía, Biomecánica y Ejercicios',
    slides: ['s1','s2','s3','s4','s5','s6','s7'],
    prefix: 'biceps',
  },
  {
    html: 'carrusel-07-pullups-biomecanica.html',
    postTitle: 'Pull-ups - Biomecánica Perfecta',
    slides: ['s1','s2','s3','s4','s5','s6'],
    prefix: 'pullups',
  },
  {
    html: 'carrusel-08-app-promo.html',
    postTitle: 'RivalFit App - Por qué registrarte hoy',
    slides: ['s1','s2','s3','s4','s5'],
    prefix: 'app-promo',
  },
]

async function renderSlides(
  htmlFile: string,
  slideIds: string[],
  prefix: string
): Promise<string[]> {
  console.log(`\n📸 Renderizando ${htmlFile}...`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--allow-file-access-from-files'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 1350, deviceScaleFactor: 2 })

  const htmlPath = path.join(CAROUSELS_DIR, htmlFile)
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`

  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 })
  await page.evaluateHandle('document.fonts.ready')
  // Esperar a que las imágenes IA carguen
  await new Promise(r => setTimeout(r, 2000))

  const pngPaths: string[] = []

  for (const slideId of slideIds) {
    const element = await page.$(`#${slideId}`)
    if (!element) {
      console.warn(`  ⚠️  Slide #${slideId} no encontrado`)
      continue
    }

    const tmpPath = path.join(process.cwd(), 'tmp', `${prefix}-${slideId}.png`)
    fs.mkdirSync(path.dirname(tmpPath), { recursive: true })

    await element.screenshot({
      path: tmpPath,
      type: 'png',
    })

    console.log(`  ✅ Slide ${slideId} → ${path.basename(tmpPath)}`)
    pngPaths.push(tmpPath)
  }

  await browser.close()
  return pngPaths
}

async function uploadToSupabase(
  supabase: ReturnType<typeof createAdminClient>,
  filePath: string,
  prefix: string
): Promise<string | null> {
  const fileName = `social/${prefix}/${Date.now()}-${path.basename(filePath)}`
  const fileBuffer = fs.readFileSync(filePath)

  // Intentar bucket 'posts' primero, luego 'media'
  for (const bucket of ['posts', 'media']) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
      console.log(`  ☁️  Subido a ${bucket}: ${path.basename(filePath)}`)
      return data.publicUrl
    }
  }

  console.error(`  ❌ Error subiendo ${path.basename(filePath)}`)
  return null
}

async function updateSocialPost(
  supabase: ReturnType<typeof createAdminClient>,
  title: string,
  mediaUrls: string[]
) {
  const { data, error } = await supabase
    .from('social_posts')
    .update({
      media_urls: mediaUrls,
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    })
    .ilike('title', `%${title.slice(0, 30)}%`)
    .select('id, title, scheduled_for')

  if (error) {
    console.error(`  ❌ Error actualizando post "${title}":`, error.message)
    return
  }

  if (!data || data.length === 0) {
    console.warn(`  ⚠️  No se encontró el post: "${title}"`)
    console.warn('     Asegúrate de haber ejecutado seed-semana-14-20-abril.ts primero')
    return
  }

  const post = data[0]
  const date = new Date(post.scheduled_for).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
  console.log(`  📅 Post actualizado: "${post.title}"`)
  console.log(`     Fecha: ${date}`)
  console.log(`     Slides: ${mediaUrls.length} imágenes`)
}

async function main() {
  console.log('\n🔴 RivalFit — Render + Upload + Schedule\n')
  console.log('═'.repeat(50))

  const supabase = createAdminClient()

  for (const carousel of CAROUSEL_MAP) {
    console.log(`\n[${carousel.prefix.toUpperCase()}]`)

    // 1. Renderizar slides con Puppeteer
    const pngPaths = await renderSlides(carousel.html, carousel.slides, carousel.prefix)

    if (pngPaths.length === 0) {
      console.error('  ❌ No se generaron slides, saltando...')
      continue
    }

    // 2. Subir cada PNG a Supabase Storage
    const mediaUrls: string[] = []
    for (const pngPath of pngPaths) {
      const url = await uploadToSupabase(supabase, pngPath, carousel.prefix)
      if (url) mediaUrls.push(url)
    }

    if (mediaUrls.length === 0) {
      console.error('  ❌ No se pudieron subir las imágenes, saltando...')
      continue
    }

    // 3. Actualizar social_posts con las URLs
    await updateSocialPost(supabase, carousel.postTitle, mediaUrls)

    // Limpiar archivos temporales
    for (const p of pngPaths) {
      try { fs.unlinkSync(p) } catch {}
    }
  }

  // Limpiar carpeta tmp
  try { fs.rmdirSync(path.join(process.cwd(), 'tmp')) } catch {}

  console.log('\n' + '═'.repeat(50))
  console.log('✅ Todo listo. El cron publicará automáticamente en las fechas programadas.')
  console.log('📊 Ver posts: https://rivalfit.app/dashboard/admin/social-media')
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
