/**
 * RIVALFIT - Real AI Agent Chat API
 * Agentes con Gemini AI + datos reales de Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// CONTEXTO DE DATOS POR AGENTE
// ============================================================

async function getCEOContext() {
  const [users, centers, posts, visits, subscriptionLogs] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, created_at, subscription_tier').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('organizations').select('id, name, plan, city, country, created_at').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('posts').select('id, post_type, created_at').order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('site_visits').select('page_path, created_at').order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('subscription_logs').select('event_type, old_tier, new_tier, created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalUsers = users.data?.length || 0;
  const newUsersLast30 = users.data?.filter(u => new Date(u.created_at) > thirtyDaysAgo).length || 0;
  const newUsersLast7 = users.data?.filter(u => new Date(u.created_at) > sevenDaysAgo).length || 0;

  const totalCenters = centers.data?.length || 0;
  const centersByPlan = {
    free: centers.data?.filter(c => !c.plan || c.plan === 'free').length || 0,
    starter: centers.data?.filter(c => c.plan === 'starter').length || 0,
    pro: centers.data?.filter(c => c.plan === 'pro').length || 0,
  };
  const mrr = (centersByPlan.starter * 49.99) + (centersByPlan.pro * 99.99);

  const churnEvents = subscriptionLogs.data?.filter(l => l.event_type === 'downgrade').length || 0;
  const upgradeEvents = subscriptionLogs.data?.filter(l => l.event_type === 'upgrade').length || 0;

  return {
    totalUsers,
    newUsersLast30,
    newUsersLast7,
    totalCenters,
    centersByPlan,
    mrr: mrr.toFixed(2),
    arr: (mrr * 12).toFixed(2),
    churnEventsLast30: churnEvents,
    upgradeEventsLast30: upgradeEvents,
    totalPosts: posts.data?.length || 0,
    wodPosts: posts.data?.filter(p => p.post_type === 'wod').length || 0,
    visitsLast7: visits.data?.filter(v => new Date(v.created_at) > sevenDaysAgo).length || 0,
    topCountries: [...new Set(centers.data?.map(c => c.country).filter(Boolean))].slice(0, 5),
  };
}

async function getCMOContext() {
  const [posts, users, ads] = await Promise.all([
    supabaseAdmin.from('posts').select('id, post_type, created_at, likes_count, comments_count').order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('profiles').select('id, created_at, subscription_tier').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('ads').select('id, title, placement, is_active, views_count, clicks_count').limit(20),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentPosts = posts.data?.filter(p => new Date(p.created_at) > sevenDaysAgo) || [];

  const totalLikes = posts.data?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
  const totalComments = posts.data?.reduce((sum, p) => sum + (p.comments_count || 0), 0) || 0;
  const avgEngagement = posts.data?.length ? ((totalLikes + totalComments) / posts.data.length).toFixed(1) : '0';

  const activeAds = ads.data?.filter(a => a.is_active) || [];
  const totalAdViews = ads.data?.reduce((sum, a) => sum + (a.views_count || 0), 0) || 0;
  const totalAdClicks = ads.data?.reduce((sum, a) => sum + (a.clicks_count || 0), 0) || 0;
  const ctr = totalAdViews > 0 ? ((totalAdClicks / totalAdViews) * 100).toFixed(2) : '0';

  return {
    totalPosts: posts.data?.length || 0,
    postsLast7Days: recentPosts.length,
    wodPosts: posts.data?.filter(p => p.post_type === 'wod').length || 0,
    videoPosts: posts.data?.filter(p => p.post_type === 'video').length || 0,
    avgEngagementPerPost: avgEngagement,
    totalLikes,
    totalComments,
    activeAds: activeAds.length,
    totalAds: ads.data?.length || 0,
    adCTR: `${ctr}%`,
    totalAdViews,
    totalAdClicks,
    newUsersLast7: users.data?.filter(u => new Date(u.created_at) > sevenDaysAgo).length || 0,
    premiumUsers: users.data?.filter(u => u.subscription_tier && u.subscription_tier !== 'free').length || 0,
  };
}

async function getCTOContext() {
  const [posts, users, centers, tickets] = await Promise.all([
    supabaseAdmin.from('posts').select('id, post_type, created_at').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('profiles').select('id, created_at').limit(50),
    supabaseAdmin.from('organizations').select('id, plan').limit(50),
    supabaseAdmin.from('support_tickets').select('id, status, created_at').limit(50),
  ]);

  let wodCompletionsCount = 0;
  try {
    const res = await supabaseAdmin.from('wod_completions').select('id', { count: 'exact', head: true }).limit(100);
    wodCompletionsCount = res.count || 0;
  } catch {
    // Table may not exist yet
  }

  return {
    totalPosts: posts.data?.length || 0,
    totalUsers: users.data?.length || 0,
    totalCenters: centers.data?.length || 0,
    openTickets: tickets.data?.filter((t: { status: string }) => t.status === 'open').length || 0,
    resolvedTickets: tickets.data?.filter((t: { status: string }) => t.status === 'resolved').length || 0,
    wodCompletionsRegistered: wodCompletionsCount,
    systemNote: 'Migración wod_completions pendiente de verificar en Supabase Dashboard',
    techStack: 'Next.js 15, React 19, Supabase, Tailwind CSS 4, Gemini AI, Framer Motion',
    pendingMigrations: ['add_wod_completions_leaderboard.sql — verificar si fue ejecutada'],
  };
}

async function getCOOContext() {
  const [tickets, users, centers] = await Promise.all([
    supabaseAdmin.from('support_tickets').select('id, status, subject, created_at, resolved_at').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('profiles').select('id, created_at, last_seen_at, subscription_tier').limit(200),
    supabaseAdmin.from('organizations').select('id, name, plan, created_at').limit(100),
  ]);

  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const openTickets = tickets.data?.filter(t => t.status === 'open') || [];
  const resolvedTickets = tickets.data?.filter(t => t.status === 'resolved') || [];

  const avgResolutionHours = resolvedTickets.length > 0
    ? resolvedTickets.reduce((sum, t) => {
        if (!t.resolved_at) return sum;
        const hours = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
        return sum + hours;
      }, 0) / resolvedTickets.length
    : null;

  const inactiveUsers = users.data?.filter(u => {
    if (!u.last_seen_at) return false;
    return new Date(u.last_seen_at) < fourteenDaysAgo;
  }).length || 0;

  return {
    openTickets: openTickets.length,
    resolvedTickets: resolvedTickets.length,
    avgResolutionHours: avgResolutionHours ? avgResolutionHours.toFixed(1) : 'N/A',
    inactiveUsersLast14Days: inactiveUsers,
    newCentersLast7Days: centers.data?.filter(c => new Date(c.created_at) > sevenDaysAgo).length || 0,
    totalActiveOrgs: centers.data?.length || 0,
    ticketsByStatus: {
      open: openTickets.length,
      resolved: resolvedTickets.length,
      other: (tickets.data?.length || 0) - openTickets.length - resolvedTickets.length,
    },
  };
}

async function getCFOContext() {
  const [centers, users, subscriptionLogs] = await Promise.all([
    supabaseAdmin.from('organizations').select('id, plan, created_at, monthly_revenue').order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('profiles').select('id, subscription_tier, created_at').limit(500),
    supabaseAdmin.from('subscription_logs').select('event_type, old_tier, new_tier, created_at').order('created_at', { ascending: false }).limit(100),
  ]);

  const centersByPlan = {
    free: centers.data?.filter(c => !c.plan || c.plan === 'free').length || 0,
    starter: centers.data?.filter(c => c.plan === 'starter').length || 0,
    pro: centers.data?.filter(c => c.plan === 'pro').length || 0,
  };

  const mrr = (centersByPlan.starter * 49.99) + (centersByPlan.pro * 99.99);
  const arr = mrr * 12;

  const usersByTier = {
    free: users.data?.filter(u => !u.subscription_tier || u.subscription_tier === 'free').length || 0,
    premium: users.data?.filter(u => u.subscription_tier === 'premium').length || 0,
    elite: users.data?.filter(u => u.subscription_tier === 'elite').length || 0,
  };

  const upgrades = subscriptionLogs.data?.filter(l => l.event_type === 'upgrade').length || 0;
  const downgrades = subscriptionLogs.data?.filter(l => l.event_type === 'downgrade').length || 0;

  return {
    mrr: mrr.toFixed(2),
    arr: arr.toFixed(2),
    centersByPlan,
    usersByTier,
    totalPayingCenters: centersByPlan.starter + centersByPlan.pro,
    upgradesThisMonth: upgrades,
    downgradesThisMonth: downgrades,
    netExpansion: upgrades - downgrades,
    estimatedCAC: 34,
    estimatedLTV: 1890,
    ltv_cac_ratio: (1890 / 34).toFixed(1),
    plans: {
      starter: { price: 49.99, count: centersByPlan.starter, revenue: (centersByPlan.starter * 49.99).toFixed(2) },
      pro: { price: 99.99, count: centersByPlan.pro, revenue: (centersByPlan.pro * 99.99).toFixed(2) },
    },
  };
}

// ============================================================
// SYSTEM PROMPTS POR AGENTE
// ============================================================

const AGENT_PROMPTS: Record<string, string> = {
  ceo: `Eres Jessica Rodriguez, CEO de RivalFit, una startup SaaS de gestión y comunidad para gyms de CrossFit y fitness funcional.

Tu personalidad: visionaria, estratégica, directa, apasionada por el fitness y los negocios. Hablas con confianza pero escuchas activamente.

Tu expertise: estrategia empresarial, product-market fit, fundraising, expansión de mercado, partnerships.

RivalFit es una plataforma social + SaaS para gyms: VideoFeed estilo Instagram, WOD Generator con IA, leaderboards, gestión de membresías, programación de clases.

REGLAS:
- Analiza los datos REALES que recibes del contexto
- Da recomendaciones concretas y accionables basadas en esos datos
- Identifica oportunidades y riesgos específicos
- Habla en español, tono ejecutivo pero accesible
- Máximo 3-4 párrafos por respuesta, directo al punto
- Siempre termina con una acción concreta recomendada`,

  cmo: `Eres Alex Torres, CMO de RivalFit. Experto en growth marketing, adquisición de usuarios, engagement y brand building en el sector fitness.

Tu personalidad: creativo, data-driven, siempre pensando en el usuario final, apasionado por las redes sociales y el contenido.

Tu expertise: growth hacking, content marketing, campañas de influencer, métricas de engagement, funnel de conversión.

REGLAS:
- Analiza métricas de engagement, adquisición y contenido reales del contexto
- Propón campañas concretas con canales, mensaje y KPIs esperados
- Identifica oportunidades de contenido viral basadas en los datos
- Habla en español, tono energético y orientado a resultados
- Máximo 3-4 párrafos, accionable y específico`,

  cto: `Eres Sam Chen, CTO de RivalFit. Arquitecto de sistemas con expertise en Next.js, Supabase, IA y plataformas SaaS escalables.

Tu personalidad: meticuloso, pragmático, siempre pensando en escalabilidad y rendimiento. Identifies problemas antes de que ocurran.

Tu expertise: arquitectura de sistemas, bases de datos, APIs, performance, seguridad, DevOps, integración de IA.

Stack actual: Next.js 15, React 19, Supabase (PostgreSQL + Auth + Storage), Tailwind CSS 4, Gemini AI, Vercel, Framer Motion.

REGLAS:
- Analiza el estado técnico real del sistema con los datos del contexto
- Identifica bottlenecks, deudas técnicas y riesgos de seguridad
- Propón soluciones técnicas específicas con código o queries cuando sea útil
- Prioriza por impacto en el usuario y estabilidad del sistema
- Habla en español, tono técnico pero comprensible`,

  coo: `Eres Maya Patel, COO de RivalFit. Especialista en operaciones, experiencia del usuario y retención de clientes en plataformas SaaS.

Tu personalidad: empática, organizada, obsesionada con la experiencia del cliente, siempre buscando mejorar los procesos.

Tu expertise: onboarding, customer success, reducción de churn, optimización de operaciones, gestión de equipos.

REGLAS:
- Analiza métricas operacionales reales: tickets, usuarios activos, onboarding
- Identifica usuarios en riesgo de churn y propón acciones específicas
- Mejora procesos con SOPs y automatizaciones concretas
- Habla en español, tono cálido pero profesional`,

  cfo: `Eres David Kim, CFO de RivalFit. Experto en finanzas de startups SaaS, unit economics, fundraising y estrategia financiera.

Tu personalidad: analítico, conservador pero ambicioso, siempre pensando en runway y crecimiento sostenible.

Tu expertise: MRR/ARR, unit economics (CAC, LTV), fundraising, pricing, análisis de cohorts, modelos financieros.

REGLAS:
- Analiza las métricas financieras reales del contexto con precisión
- Calcula ratios importantes (LTV/CAC, MRR growth, etc.)
- Identifica oportunidades de optimización de costes e ingresos
- Propón estrategias de pricing o fundraising basadas en los datos
- Habla en español, tono analítico y preciso con números concretos`,
};

// ============================================================
// API HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const adminEmails = ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com', 'rubenblcs@gmail.com'];
    if (!adminEmails.includes(user.email?.toLowerCase().trim() || '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // 2. Parse body
    const { agentId, message, conversationHistory = [] } = await request.json();

    if (!agentId || !message) {
      return NextResponse.json({ error: 'agentId y message son requeridos' }, { status: 400 });
    }

    // 3. Obtener contexto de datos reales según el agente
    let contextData: Record<string, any> = {};

    try {
      switch (agentId) {
        case 'ceo': contextData = await getCEOContext(); break;
        case 'cmo': contextData = await getCMOContext(); break;
        case 'cto': contextData = await getCTOContext(); break;
        case 'coo': contextData = await getCOOContext(); break;
        case 'cfo': contextData = await getCFOContext(); break;
        default:
          return NextResponse.json({ error: 'Agente no válido' }, { status: 400 });
      }
    } catch (dataError) {
      console.error('Error fetching context data:', dataError);
      // Continuar con contexto vacío si falla
    }

    // 4. Construir prompt con datos reales
    const systemPrompt = AGENT_PROMPTS[agentId];
    const contextJson = JSON.stringify(contextData, null, 2);

    const fullSystemPrompt = `${systemPrompt}

=== DATOS REALES DE RIVALFIT (actualizado ahora mismo) ===
${contextJson}
=== FIN DE DATOS ===

Usa estos datos reales para responder. Si el usuario pregunta algo que no está en los datos, indícalo claramente.`;

    // 5. Llamar a Groq (Llama 3.1)
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: 'Falta GROQ_API_KEY en .env.local. Obtenla gratis en console.groq.com.' },
        { status: 503 }
      );
    }

    const groqMessages = [
      { role: 'system', content: fullSystemPrompt },
      ...conversationHistory.map((msg: { role: string; text: string }) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text,
      })),
      { role: 'user', content: message },
    ];

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!groqRes.ok) {
      const groqErr = await groqRes.text();
      throw new Error(`Groq error: ${groqErr}`);
    }

    const groqData = await groqRes.json();
    const response = groqData.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      response,
      agentId,
      contextSnapshot: {
        dataPoints: Object.keys(contextData).length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Error in AI agent chat:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
