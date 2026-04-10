/**
 * Programa los posts de la semana del 14-20 de Abril 2026 en social_posts
 * Ejecutar: npx tsx scripts/seed-semana-14-20-abril.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Obtener el user_id del admin (ajusta el email si es diferente)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rivalfit.app'

const posts = [
  // ─── LUNES 14 ABRIL ───────────────────────────────────────────────
  {
    title: 'Bíceps Completo - Anatomía, Biomecánica y Ejercicios',
    caption: `🔴 GUÍA COMPLETA DEL BÍCEPS 💪

Todo lo que necesitas saber sobre el músculo más entrenado del gym:

📌 Anatomía real (no solo el bíceps braquial)
📌 Biomecánica: cómo maximizar cada repetición
📌 Los 4 errores que frenan tu crecimiento
📌 Top 4 ejercicios con sets y reps exactos
📌 3 tips PRO para crecer más rápido

Guarda este post 🔖 — te lo agradecerás en tu próximo entreno.

👉 Trackea tu progreso en rivalfit.app

#biceps #biomecanica #fitness #gym #entrenamiento #musculos #crossfit #rivalfit #brazos #hipertrofia`,
    platform: 'instagram',
    post_type: 'carousel',
    status: 'scheduled',
    scheduled_for: '2026-04-14T07:00:00.000Z',
    tags: ['biceps', 'anatomia', 'educativo', 'carousel'],
  },
  {
    title: 'Story Lunes - Pregunta interactiva bíceps',
    caption: `¿Cuántas series de curl haces por semana? 💪
A) 6-9 series
B) 10-15 series
C) +16 series
D) Solo compound

👆 Responde en la encuesta`,
    platform: 'instagram',
    post_type: 'story',
    status: 'scheduled',
    scheduled_for: '2026-04-14T18:00:00.000Z',
    tags: ['story', 'interactivo', 'biceps'],
  },

  // ─── MARTES 15 ABRIL ──────────────────────────────────────────────
  {
    title: 'Story Martes - Motivación + App CTA',
    caption: `"La diferencia entre quien eres y quien quieres ser está en lo que haces hoy." 🔥

¿Ya llevas el registro de tus entrenamientos?

👉 rivalfit.app — GRATIS`,
    platform: 'instagram',
    post_type: 'story',
    status: 'scheduled',
    scheduled_for: '2026-04-15T18:00:00.000Z',
    tags: ['story', 'motivacion', 'cta'],
  },

  // ─── MIÉRCOLES 16 ABRIL ───────────────────────────────────────────
  {
    title: 'Pull-ups - Biomecánica Perfecta',
    caption: `🔴 PULL-UPS: LA GUÍA DEFINITIVA 🏋️

El ejercicio más mal ejecutado en cualquier box o gym.

En este carrusel aprenderás:

📌 Los 5 músculos que trabajan (y en qué porcentaje)
📌 Las 4 fases del movimiento perfecto
📌 5 puntos de técnica que nadie te enseña
📌 4 errores que destruyen tus hombros
📌 Por qué el excéntrico es donde está el crecimiento real

Si no sientes el dorsal haciendo pull-ups, estás haciendo curls en barra. Lee esto 👆

👉 Registra tus pull-ups en rivalfit.app

#pullups #biomecanica #crossfit #calistenia #dorsal #tecnica #gym #entrenamiento #rivalfit #fitness`,
    platform: 'instagram',
    post_type: 'carousel',
    status: 'scheduled',
    scheduled_for: '2026-04-16T07:00:00.000Z',
    tags: ['pullups', 'biomecanica', 'educativo', 'crossfit', 'carousel'],
  },
  {
    title: 'Story Miércoles - Tip del día',
    caption: `💡 TIP DEL DÍA

En pull-ups, antes de doblar los codos:
→ Baja los hombros
→ Aprieta los omóplatos
→ ENTONCES tira

El dorsal inicia el movimiento, no los brazos.

¿Lo sabías? 👇`,
    platform: 'instagram',
    post_type: 'story',
    status: 'scheduled',
    scheduled_for: '2026-04-16T18:00:00.000Z',
    tags: ['story', 'tip', 'educativo'],
  },

  // ─── JUEVES 17 ABRIL ──────────────────────────────────────────────
  {
    title: 'Story Jueves - Feature RivalFit',
    caption: `¿Sabías que en RivalFit puedes...

📊 Ver tu progreso semana a semana
🏆 Competir en rankings globales
🤖 Recibir WODs generados por IA
🏋️ Conectar con tu gym favorito

TODO GRATIS 👉 rivalfit.app`,
    platform: 'instagram',
    post_type: 'story',
    status: 'scheduled',
    scheduled_for: '2026-04-17T18:00:00.000Z',
    tags: ['story', 'features', 'app'],
  },

  // ─── VIERNES 18 ABRIL ─────────────────────────────────────────────
  {
    title: 'REEL - ¿Años entrenando sin resultados? (Motion Graphics)',
    caption: `¿Años entrenando y sigues igual? 🔴

El problema no eres tú.

Es que nadie te está ayudando a trackear, competir y progresar de forma inteligente.

RivalFit lo cambia todo:
✅ Feed fitness con atletas reales
✅ Rankings globales semanales
✅ Programación con IA
✅ Gestión de tu gym/box

100% GRATIS 👉 rivalfit.app

#fitness #crossfit #gym #entrenamiento #rivalfit #gymapp #workouttracker #fitnesscommunity #progresoreal`,
    platform: 'instagram',
    post_type: 'reel',
    status: 'scheduled',
    scheduled_for: '2026-04-18T07:00:00.000Z',
    tags: ['reel', 'app', 'motionGraphics', 'marketing'],
  },
  {
    title: 'Story Viernes - Hype fin de semana',
    caption: `Este fin de semana no hay excusas 💪

2 días. 2 entrenos. 1 objetivo.

¿Qué tienes programado? 👇

Comparte tu WOD del finde 🔥`,
    platform: 'instagram',
    post_type: 'story',
    status: 'scheduled',
    scheduled_for: '2026-04-18T18:00:00.000Z',
    tags: ['story', 'weekend', 'motivacion'],
  },

  // ─── SÁBADO 19 ABRIL ──────────────────────────────────────────────
  {
    title: 'RivalFit App - Por qué registrarte hoy',
    caption: `🔴 ¿POR QUÉ RIVALFIT?

No somos otra app de fitness.

Somos la primera plataforma que combina:
🏋️ Red social para atletas reales
🏆 Competición con rankings globales
🤖 Inteligencia artificial para tu programación
📊 Gestión completa de gyms y boxes

¿Entrenas en un box de CrossFit? → Tu coach puede gestionar todo desde aquí
¿Eres gym rat? → Compite, trackea y evoluciona
¿Tienes un centro deportivo? → Digitaliza tu negocio hoy

GRATIS. Sin excusas.

👉 rivalfit.app

#rivalfit #fitnessapp #crossfit #gym #entrenamiento #gymmanagement #fitnesscommunity #wodapp #workout`,
    platform: 'instagram',
    post_type: 'carousel',
    status: 'scheduled',
    scheduled_for: '2026-04-19T10:00:00.000Z',
    tags: ['app', 'promo', 'carousel', 'marketing'],
  },
  {
    title: 'Story Sábado - Comunidad',
    caption: `La comunidad más atlética de España está en RivalFit 🇪🇸🔥

Gyms · Boxes · Entrenadores personales

Únete hoy 👉 rivalfit.app`,
    platform: 'instagram',
    post_type: 'story',
    status: 'scheduled',
    scheduled_for: '2026-04-19T18:00:00.000Z',
    tags: ['story', 'comunidad', 'cta'],
  },

  // ─── DOMINGO 20 ABRIL ─────────────────────────────────────────────
  {
    title: 'Story Domingo - Motivación dominical',
    caption: `Domingo.

El día que los campeones trabajan mientras otros descansan.

¿Cuál es tu excusa? 🔴

#rivalfit #Sunday #neverstop`,
    platform: 'instagram',
    post_type: 'story',
    status: 'scheduled',
    scheduled_for: '2026-04-20T10:00:00.000Z',
    tags: ['story', 'motivacion', 'domingo'],
  },
]

async function seedPosts() {
  console.log('🔴 RivalFit — Programando semana 14-20 Abril 2026...\n')

  // Obtener el admin user
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('is_official', true)
    .limit(1)
    .maybeSingle()

  if (userError || !users) {
    console.error('❌ No se encontró el perfil oficial:', userError)
    console.log('💡 Asegúrate de que existe un perfil con is_official=true en la tabla profiles')
    process.exit(1)
  }

  const userId = users.id
  console.log(`✅ Usando perfil oficial: ${users.email || userId}\n`)

  let success = 0
  let failed = 0

  for (const post of posts) {
    const { error } = await supabase.from('social_posts').insert({
      ...post,
      user_id: userId,
    })

    if (error) {
      console.error(`❌ Error en "${post.title}":`, error.message)
      failed++
    } else {
      const date = new Date(post.scheduled_for).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
      const emoji = post.post_type === 'carousel' ? '📸' : post.post_type === 'reel' ? '🎬' : '📱'
      console.log(`${emoji} Programado: ${post.title}`)
      console.log(`   📅 ${date}\n`)
      success++
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ ${success} posts programados exitosamente`)
  if (failed > 0) console.log(`❌ ${failed} posts fallaron`)
  console.log(`\n🚀 El cron publicará automáticamente cada hora en punto`)
  console.log(`🌐 Dashboard: https://rivalfit.app/dashboard/admin/social-media`)
}

seedPosts().catch(console.error)
