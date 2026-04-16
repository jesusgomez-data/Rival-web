import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

const CRON_SECRET = process.env.CRON_SECRET
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID

/**
 * Cron endpoint: publica automáticamente los posts programados en social_posts
 * cuyo scheduled_for ya pasó y status = 'scheduled' o 'ready'
 *
 * Invocado por Vercel Cron cada hora (vercel.json)
 * Autenticado con Authorization: Bearer CRON_SECRET
 */
export async function GET(req: NextRequest) {
  // Vercel envía el header Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Buscar posts listos para publicar
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('*')
    .in('status', ['scheduled', 'ready'])
    .lte('scheduled_for', now)
    .in('platform', ['instagram', 'all'])

  if (error) {
    console.error('[cron] Error fetching posts:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ success: true, published: 0, message: 'No posts due for publishing' })
  }

  const results: { id: string; status: 'published' | 'failed'; error?: string }[] = []

  for (const post of posts) {
    try {
      await publishToInstagram(post)
      await supabase
        .from('social_posts')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', post.id)
      results.push({ id: post.id, status: 'published' })
    } catch (err: any) {
      console.error(`[cron] Failed to publish post ${post.id}:`, err.message)
      // Marcar como error para no reintentarlo indefinidamente
      await supabase
        .from('social_posts')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', post.id)
      results.push({ id: post.id, status: 'failed', error: err.message })
    }
  }

  const published = results.filter(r => r.status === 'published').length
  const failed = results.filter(r => r.status === 'failed').length

  console.log(`[cron] publish-posts: ${published} published, ${failed} failed`)
  return NextResponse.json({ success: true, published, failed, results })
}

// ─── INSTAGRAM GRAPH API ──────────────────────────────────────────────────────

async function publishToInstagram(post: {
  id: string
  caption?: string
  media_urls?: string[]
  post_type?: string
  thumbnail_url?: string
}) {
  if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
    throw new Error('Instagram credentials not configured (INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID)')
  }

  const mediaUrls: string[] = post.media_urls || (post.thumbnail_url ? [post.thumbnail_url] : [])

  if (mediaUrls.length === 0) {
    throw new Error('No media URLs found for post')
  }

  const caption = post.caption || ''
  const isCarousel = mediaUrls.length > 1 || post.post_type === 'carousel'
  const isVideo = post.post_type === 'reel' || post.post_type === 'video'

  if (isCarousel) {
    await publishCarousel(mediaUrls, caption)
  } else if (isVideo) {
    await publishVideo(mediaUrls[0], caption)
  } else {
    await publishImage(mediaUrls[0], caption)
  }
}

async function publishImage(imageUrl: string, caption: string) {
  // Paso 1: crear contenedor
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  )
  const container = await containerRes.json()
  if (!container.id) throw new Error(`Container creation failed: ${JSON.stringify(container)}`)

  // Paso 2: publicar
  await publishContainer(container.id)
}

async function publishVideo(videoUrl: string, caption: string) {
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  )
  const container = await containerRes.json()
  if (!container.id) throw new Error(`Video container creation failed: ${JSON.stringify(container)}`)

  // Los reels necesitan tiempo para procesarse — esperar hasta que esté listo
  await waitForContainer(container.id)
  await publishContainer(container.id)
}

async function publishCarousel(mediaUrls: string[], caption: string) {
  // Paso 1: crear un contenedor hijo por cada imagen
  const childIds: string[] = []
  for (const url of mediaUrls) {
    const childRes = await fetch(
      `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: url,
          is_carousel_item: true,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    )
    const child = await childRes.json()
    if (!child.id) throw new Error(`Carousel child creation failed: ${JSON.stringify(child)}`)
    childIds.push(child.id)
  }

  // Paso 2: crear contenedor carrusel
  const carouselRes = await fetch(
    `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  )
  const carousel = await carouselRes.json()
  if (!carousel.id) throw new Error(`Carousel container creation failed: ${JSON.stringify(carousel)}`)

  // Paso 3: publicar
  await publishContainer(carousel.id)
}

async function publishContainer(containerId: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${INSTAGRAM_USER_ID}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  )
  const result = await res.json()
  if (!result.id) throw new Error(`Publish failed: ${JSON.stringify(result)}`)
  return result.id
}

/** Espera hasta que el contenedor de video esté en estado FINISHED */
async function waitForContainer(containerId: string, maxWaitMs = 120_000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${INSTAGRAM_ACCESS_TOKEN}`
    )
    const data = await res.json()
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error(`Container processing failed: ${JSON.stringify(data)}`)
    await new Promise(r => setTimeout(r, 5000)) // esperar 5s entre checks
  }
  throw new Error('Timeout waiting for video container to process')
}
