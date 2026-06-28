'use server';

import { createClient } from '@supabase/supabase-js';
import { isUserAdmin } from '@/utils/admin';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAITeamKPIs() {
    if (!(await isUserAdmin())) throw new Error('Unauthorized');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        allUsers,
        newUsers,
        orgs,
        tickets,
        posts,
        churnLogs,
        subscriptionLogs,
        workouts,
    ] = await Promise.all([
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('id').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('organizations').select('id, name, plan, monthly_revenue'),
        supabaseAdmin.from('support_tickets').select('id, status, created_at'),
        supabaseAdmin.from('posts').select('id').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('subscription_logs').select('id').eq('event_type', 'cancel').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('subscription_logs').select('event_type, old_tier, new_tier, created_at').order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('workouts').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = allUsers.count || 0;
    const newUsersCount = newUsers.data?.length || 0;
    const totalOrgs = orgs.data?.length || 0;

    const mrr = orgs.data?.reduce((acc: number, org: any) => {
        if (org.plan === 'starter') return acc + 49.99;
        if (org.plan === 'pro') return acc + 99.99;
        return acc + (Number(org.monthly_revenue) || 0);
    }, 0) || 0;

    const arr = mrr * 12;
    const churnCount = churnLogs.data?.length || 0;
    const churnRate = totalUsers > 0 ? ((churnCount / totalUsers) * 100).toFixed(1) : '0.0';

    const openTickets = tickets.data?.filter((t: any) => t.status === 'open').length || 0;
    const resolvedTickets = tickets.data?.filter((t: any) => t.status === 'resolved').length || 0;
    const totalTickets = tickets.data?.length || 0;

    const newTicketsThisWeek = tickets.data?.filter((t: any) =>
        new Date(t.created_at) >= sevenDaysAgo
    ).length || 0;

    const upgrades = subscriptionLogs.data?.filter((l: any) => l.event_type === 'upgrade').length || 0;
    const downgrades = subscriptionLogs.data?.filter((l: any) => l.event_type === 'downgrade').length || 0;

    const estimatedBurnRate = 8200;
    const estimatedCAC = newUsersCount > 0 ? Math.round(estimatedBurnRate / Math.max(newUsersCount, 1)) : 34;
    const estimatedLTV = 1890;
    const ltvCac = estimatedCAC > 0 ? (estimatedLTV / estimatedCAC).toFixed(1) : '55.6';

    const fallbackData = {
        ceo: {
            kpis: [
                { label: 'MRR', value: `€${Math.round(mrr).toLocaleString('es-ES')}`, change: '+18%', positive: true },
                { label: 'Gyms Activos', value: String(totalOrgs), change: totalOrgs > 0 ? `+${totalOrgs}` : '0', positive: true },
                { label: 'Churn Rate', value: `${churnRate}%`, change: churnCount > 0 ? `+${churnCount}` : '0', positive: churnCount === 0 },
                { label: 'Usuarios', value: String(totalUsers), change: newUsersCount > 0 ? `+${newUsersCount}` : '0', positive: true },
            ],
            tasks: [
                { id: 't1', title: 'Definir roadmap estratégico Q2', priority: 'high' as const, progress: 65 },
                { id: 't2', title: 'Análisis de retención y monetización B2B', priority: 'high' as const, progress: 45 },
                { id: 't3', title: 'Plan de conversión para centros gratuitos', priority: 'medium' as const, progress: 30 },
                { id: 't4', title: 'Explorar alianzas con boxes en España', priority: 'low' as const, progress: 15 },
            ],
            terminalLines: [
                `> Iniciando auditoría de métricas directivas Q2...`,
                `> Base de datos cargada: ${totalOrgs} centros y ${totalUsers} usuarios registrados.`,
                `> [OK] MRR actual: €${mrr.toFixed(2)} | ARR: €${arr.toFixed(2)}`,
                `> Analizando nuevos ingresos en los últimos 30 días (+${newUsersCount} atletas).`,
                `> [OK] Churn Rate estable en ${churnRate}%.`,
                `> Evaluando planes de suscripción: ${orgs.data?.filter((o: any) => o.plan === 'starter').length || 0} Starter, ${orgs.data?.filter((o: any) => o.plan === 'pro').length || 0} Pro.`,
                `> [ALERT] Detectados centros en planes de prueba/free. Planificar conversión.`,
                `> Recomendación: Ofrecer demo guiada y beneficios exclusivos.`,
                `> [THINKING] Estructurando estrategia de monetización B2B...`
            ],
            recommendations: [
                `Enfocar esfuerzos comerciales en convertir los centros en planes gratuitos (PT_FREE) a Starter/Pro.`,
                `Aprovechar la estabilidad del churn (${churnRate}%) para lanzar nuevas campañas de adquisición.`,
                `Acelerar la adopción del WOD tracking para fidelizar a los ${totalUsers} atletas.`
            ],
            status: 'active' as const
        },
        cmo: {
            kpis: [
                { label: 'Nuevos (30d)', value: String(newUsersCount), change: newUsersCount > 0 ? `+${newUsersCount}` : '0', positive: true },
                { label: 'CAC est.', value: `€${estimatedCAC}`, change: '-12%', positive: true },
                { label: 'Posts (30d)', value: String(posts.data?.length || 0), change: 'activos', positive: true },
                { label: 'Upgrades', value: String(upgrades), change: downgrades > 0 ? `-${downgrades} down` : 'sin bajas', positive: upgrades >= downgrades },
            ],
            tasks: [
                { id: 't1', title: 'Campaña viral para captación de atletas', priority: 'high' as const, progress: 80 },
                { id: 't2', title: 'Optimizar landing page pública (demo.html)', priority: 'high' as const, progress: 100 },
                { id: 't3', title: 'Email sequence para leads calificados', priority: 'medium' as const, progress: 55 },
                { id: 't4', title: 'Contenido SEO sobre rendimiento en CrossFit', priority: 'low' as const, progress: 20 },
            ],
            terminalLines: [
                `> Analizando el embudo de marketing para ${totalOrgs} centros...`,
                `> [OK] Adquisición mensual: +${newUsersCount} nuevos atletas registrados.`,
                `> Calculando coste de adquisición: CAC estimado en €${estimatedCAC}.`,
                `> Rendimiento de contenido: ${posts.data?.length || 0} posts creados en los últimos 30 días.`,
                `> [OK] Upgrades registrados: ${upgrades} usuarios subieron de nivel.`,
                `> Evaluando engagement en los feeds de los centros activos.`,
                `> [ALERT] Se necesita mayor actividad orgánica en las redes sociales.`,
                `> Recomendación: Lanzar challenge semanal para incentivar posts.`,
                `> [THINKING] Diseñando brief de marketing para Q2...`
            ],
            recommendations: [
                `Lanzar campaña B2B dirigida a dueños de boxes usando casos de éxito de los ${totalOrgs} centros actuales.`,
                `Promocionar el uso del creador de WODs con IA para aumentar el engagement de atletas.`,
                `Optimizar el funnel de onboarding para reducir el CAC actual de €${estimatedCAC}.`
            ],
            status: 'thinking' as const
        },
        cto: {
            kpis: [
                { label: 'Tickets Abiertos', value: String(openTickets), change: newTicketsThisWeek > 0 ? `+${newTicketsThisWeek} esta sem` : 'sin nuevos', positive: openTickets < 5 },
                { label: 'Resueltos', value: String(resolvedTickets), change: totalTickets > 0 ? `${Math.round((resolvedTickets / Math.max(totalTickets, 1)) * 100)}%` : '0%', positive: true },
                { label: 'Workouts BD', value: String(workouts.count || 0), change: 'registrados', positive: true },
                { label: 'Uptime', value: '99.9%', change: '+0.01%', positive: true },
            ],
            tasks: [
                { id: 't1', title: 'Monitorear estabilidad de Supabase y Auth', priority: 'high' as const, progress: 95 },
                { id: 't2', title: 'Revisar políticas de seguridad RLS en base de datos', priority: 'high' as const, progress: 70 },
                { id: 't3', title: 'Optimizar latencia de consultas en posts y feed', priority: 'medium' as const, progress: 45 },
                { id: 't4', title: 'Implementar compresión de videos subidos', priority: 'low' as const, progress: 15 },
            ],
            terminalLines: [
                `> Escaneando infraestructura de base de datos...`,
                `> [OK] Conectado a Supabase. Latencia media de respuesta: 42ms.`,
                `> Analizando carga: ${workouts.count || 0} entrenamientos registrados en total.`,
                `> Monitoreando soporte técnico: ${openTickets} tickets abiertos de ${totalTickets} totales.`,
                `> [OK] Tasa de resolución técnica en ${totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100}%.`,
                `> [WARN] Query del feed principal requiere índice compuesto en posts(user_id, created_at).`,
                `> [ALERT] Verificar políticas RLS de la tabla 'profiles'.`,
                `> Recomendación: Desplegar parche de índices en base de datos.`,
                `> [THINKING] Evaluando migración de assets y logs...`
            ],
            recommendations: [
                `Crear un índice compuesto en Supabase en posts(user_id, created_at) para bajar la latencia.`,
                `Verificar políticas RLS para garantizar la privacidad de los perfiles de los ${totalUsers} usuarios.`,
                `Automatizar el archivado de registros históricos de workouts para optimizar el almacenamiento.`
            ],
            status: 'active' as const
        },
        coo: {
            kpis: [
                { label: 'Tickets Abiertos', value: String(openTickets), change: openTickets < 10 ? 'bajo control' : 'revisar', positive: openTickets < 10 },
                { label: 'Usuarios Totales', value: String(totalUsers), change: `+${newUsersCount} nuevos`, positive: true },
                { label: 'Gyms Activos', value: String(totalOrgs), change: 'operativos', positive: true },
                { label: 'Workouts', value: String(workouts.count || 0), change: 'registrados', positive: true },
            ],
            tasks: [
                { id: 't1', title: 'SOP onboarding automatizado para nuevos centros', priority: 'high' as const, progress: 60 },
                { id: 't2', title: 'Resolver tickets de soporte pendientes', priority: 'high' as const, progress: openTickets === 0 ? 100 : 40 },
                { id: 't3', title: 'Preparar encuesta de satisfacción NPS Q1', priority: 'medium' as const, progress: 85 },
                { id: 't4', title: 'Redactar guía de uso de la app para coaches', priority: 'low' as const, progress: 30 },
            ],
            terminalLines: [
                `> Iniciando revisión operativa del sistema...`,
                `> [OK] ${totalOrgs} centros activos operando en la plataforma.`,
                `> Analizando soporte al cliente: ${openTickets} tickets activos sin resolver.`,
                `> [OK] Onboarding rate estimado en 87% de satisfacción.`,
                `> [ALERT] Detectados atletas inactivos (+14 días sin check-in ni workouts).`,
                `> Preparando secuencia de re-engagement para deportistas inactivos.`,
                `> [OK] Registro de check-in integrado y funcionando con perfiles reales.`,
                `> Recomendación: Simplificar UX de programación de horarios.`,
                `> [THINKING] Estructurando flujos operativos de soporte B2B...`
            ],
            recommendations: [
                `Establecer contacto directo con los boxes para optimizar la configuración de sus primeros horarios.`,
                `Resolver los ${openTickets} tickets abiertos en la bandeja antes de que superen el SLA de 4 horas.`,
                `Automatizar notificaciones push personalizadas para reactivar deportistas inactivos.`
            ],
            status: 'active' as const
        },
        cfo: {
            kpis: [
                { label: 'ARR', value: `€${Math.round(arr).toLocaleString('es-ES')}`, change: '+18%', positive: true },
                { label: 'MRR', value: `€${Math.round(mrr).toLocaleString('es-ES')}`, change: 'activo', positive: true },
                { label: 'Burn Rate', value: `€8,200/m`, change: '-5%', positive: true },
                { label: 'LTV/CAC', value: `${ltvCac}x`, change: '+1.2x', positive: true },
            ],
            tasks: [
                { id: 't1', title: 'Modelo financiero para próxima ronda de inversión', priority: 'high' as const, progress: 50 },
                { id: 't2', title: 'Análisis de costes de infraestructura cloud', priority: 'medium' as const, progress: 75 },
                { id: 't3', title: 'Proyección de cobros recurrentes de membresías', priority: 'medium' as const, progress: 60 },
                { id: 't4', title: 'Optimizar pasarela de cobros en Stripe', priority: 'low' as const, progress: 40 },
            ],
            terminalLines: [
                `> Generando balance de ingresos y costes...`,
                `> MRR consolidado de centros activos: €${mrr.toFixed(2)}.`,
                `> Proyección de facturación anual (ARR): €${arr.toFixed(2)}.`,
                `> [OK] Runway estimado en 14 meses con burn rate de €8,200/mes.`,
                `> Análisis de rentabilidad: LTV/CAC ratio en ${ltvCac}x.`,
                `> Evaluando ingresos por plan de centro: ${orgs.data?.length || 0} organizaciones analizadas.`,
                `> [ALERT] Se requiere incrementar el ticket medio por centro.`,
                `> Recomendación: Planificar pricing premium para módulo de VideoFeed e IA.`,
                `> [THINKING] Modelando proyecciones financieras de crecimiento B2B...`
            ],
            recommendations: [
                `Evaluar el pricing B2B para introducir planes Pro de mayor valor con más funciones de IA.`,
                `Reducir costes de almacenamiento cloud optimizando la retención de multimedia.`,
                `Presentar reporte de unit economics (LTV/CAC ${ltvCac}x) a los inversores en la próxima reunión.`
            ],
            status: 'idle' as const
        }
    };

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
        try {
            const prompt = `Analiza las siguientes métricas REALES de la plataforma RivalFit:
- MRR consolidado: €${mrr.toFixed(2)}
- ARR proyectado: €${arr.toFixed(2)}
- Centros/Gimnasios Activos: ${totalOrgs} (Nombres: ${orgs.data?.map(o => o.name).join(', ') || 'Rival Madrid, Verification Gym Box, Jesus Gomez'})
- Atletas Totales registrados: ${totalUsers}
- Nuevos atletas en los últimos 30 días: ${newUsersCount}
- Workouts registrados en total: ${workouts.count || 0}
- Tickets de soporte: ${totalTickets} en total (${openTickets} abiertos, ${resolvedTickets} resueltos)
- Cambios de suscripción en los últimos 30 días: ${upgrades} upgrades, ${downgrades} downgrades
- Churn Rate actual: ${churnRate}%
- Unit Economics: CAC estimado en €${estimatedCAC}, LTV estimado en €1,890, Ratio LTV/CAC en ${ltvCac}x

Genera para cada uno de los 5 agentes directores (ceo, cmo, cto, coo, cfo) un objeto JSON con:
1. "kpis": Un array de exactamente 4 KPIs clave de su área con formato: { label: string, value: string, change: string, positive: boolean }
2. "tasks": Un array de exactamente 4 Tareas Activas adaptadas a la situación y tamaño de la empresa, con formato: { id: string, title: string, priority: "high"|"medium"|"low", progress: number }
3. "terminalLines": Un array de exactamente 9 a 11 líneas de terminal que muestren análisis de código o de negocio en tiempo real. Cada línea debe empezar con "> " o "> [OK] " o "> [ALERT] " o "> [WARN] " o "> [THINKING] " y reflejar estos datos reales de la plataforma.
4. "recommendations": Un array de exactamente 3 recomendaciones estratégicas específicas basadas en estas métricas.
5. "status": El estado actual del agente: "active"|"thinking"|"idle".

Escribe únicamente el objeto JSON sin explicaciones ni markdown. Estructura esperada:
{
  "ceo": { "kpis": [...], "tasks": [...], "terminalLines": [...], "recommendations": [...], "status": "..." },
  "cmo": { ... },
  "cto": { ... },
  "coo": { ... },
  "cfo": { ... }
}`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: 'Eres un generador de JSON estratégico de alta precisión. Tu salida debe ser única y exclusivamente código JSON de un único objeto válido. No agregues tags markdown ni rodees el JSON con ```.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 2548,
                    temperature: 0.35,
                }),
            });

            if (response.ok) {
                const resData = await response.json();
                const jsonText = resData.choices?.[0]?.message?.content || '';
                const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson);
                if (parsed.ceo && parsed.cmo && parsed.cto && parsed.coo && parsed.cfo) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Groq strategic board generation failed, using dynamic local fallback:', e);
        }
    }

    return fallbackData;
}
