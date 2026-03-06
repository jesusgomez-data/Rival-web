'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentWorkspace from './AgentWorkspace';
import { getAITeamKPIs } from './actions';
import {
  TrendingUp,
  Megaphone,
  Code2,
  Settings2,
  DollarSign,
  Brain,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// AGENTES C-LEVEL
// ============================================================

export interface Agent {
  id: string;
  role: string;
  name: string;
  emoji: string;
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
  domain: string;
  status: 'active' | 'idle' | 'thinking';
  kpis: { label: string; value: string; change: string; positive: boolean }[];
  tasks: { id: string; title: string; priority: 'high' | 'medium' | 'low'; progress: number }[];
  terminalLines: string[];
  recommendations: string[];
}

const AGENTS: Agent[] = [
  {
    id: 'ceo',
    role: 'CEO',
    name: 'Jessica Rodriguez',
    emoji: '👑',
    color: 'from-yellow-500 to-orange-500',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    icon: <TrendingUp className="w-4 h-4" />,
    domain: 'Estrategia & Visión',
    status: 'active',
    kpis: [
      { label: 'MRR', value: '€12,450', change: '+18%', positive: true },
      { label: 'Gyms Activos', value: '47', change: '+3', positive: true },
      { label: 'Churn Rate', value: '2.1%', change: '-0.4%', positive: true },
      { label: 'NPS Score', value: '72', change: '+5', positive: true },
    ],
    tasks: [
      { id: 't1', title: 'Definir roadmap Q2 2025', priority: 'high', progress: 65 },
      { id: 't2', title: 'Análisis competencia SportLife / Triib', priority: 'high', progress: 40 },
      { id: 't3', title: 'Preparar pitch seed round €500K', priority: 'medium', progress: 20 },
      { id: 't4', title: 'Partnerships con federaciones CrossFit', priority: 'medium', progress: 10 },
    ],
    terminalLines: [
      '> Iniciando análisis estratégico RivalFit Q2...',
      '> Procesando métricas de crecimiento...',
      '> [OK] MRR creciendo 18% MoM — Supera benchmark SaaS B2B (8-12%)',
      '> Analizando competidores en mercado hispanohablante...',
      '> [ALERT] SportLife lanzó feature de WOD tracking en España',
      '> Evaluando respuesta estratégica...',
      '> Recomendación: Acelerar lanzamiento de Global Pass antes Q2',
      '> [OK] Pipeline de gyms en LATAM: 12 leads calificados',
      '> Proyección conservadora: 80 gyms activos en 90 días',
      '> Preparando brief para reunión de inversores...',
      '> [THINKING] Estructurando pitch deck con métricas actuales...',
    ],
    recommendations: [
      'Priorizar expansión a México y Colombia — alto potencial CrossFit',
      'Global Pass puede ser el diferenciador clave vs competencia',
      'Lanzar programa de referidos B2B para reducir CAC a la mitad',
    ],
  },
  {
    id: 'cmo',
    role: 'CMO',
    name: 'Alex Torres',
    emoji: '📣',
    color: 'from-pink-500 to-rose-500',
    borderColor: 'border-pink-500/30',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-400',
    icon: <Megaphone className="w-4 h-4" />,
    domain: 'Marketing & Crecimiento',
    status: 'thinking',
    kpis: [
      { label: 'CAC', value: '€34', change: '-12%', positive: true },
      { label: 'Nuevos usuarios', value: '312', change: '+28%', positive: true },
      { label: 'Conversion Rate', value: '4.2%', change: '+0.8%', positive: true },
      { label: 'Engagement Feed', value: '7.4%', change: '+1.1%', positive: true },
    ],
    tasks: [
      { id: 't1', title: 'Campaña lanzamiento VideoFeed', priority: 'high', progress: 80 },
      { id: 't2', title: 'Influencer outreach CrossFit Spain', priority: 'high', progress: 55 },
      { id: 't3', title: 'Email sequence onboarding gyms', priority: 'medium', progress: 30 },
      { id: 't4', title: 'Contenido blog SEO "WOD del día"', priority: 'low', progress: 15 },
    ],
    terminalLines: [
      '> Analizando rendimiento de campañas activas...',
      '> [OK] VideoFeed: +45% tiempo en app vs semana anterior',
      '> [OK] WOD Generator: 89% de posts generados con AI',
      '> Calculando impacto en métricas de adquisición...',
      '> CAC reducido en 12% gracias a contenido viral WODs',
      '> [ALERT] Oportunidad: TikTok/Reels con WODs — alto potencial orgánico',
      '> Diseñando estrategia de contenido para influencers CrossFit...',
      '> Top creadores identificados: @CrossFitMadrid (45K), @WODLifeES (32K)',
      '> Estimando ROI campaña influencer: x4.2 en CAC reduction',
      '> [THINKING] Generando brief de campaña para Q2...',
    ],
    recommendations: [
      'Crear challenge viral "30-Day WOD" en TikTok con hashtag #RivalFitWOD',
      'Asociar con 3 boxes CrossFit top en España para contenido auténtico',
      'Implementar referral program: "Invita un amigo, entrena gratis 1 mes"',
    ],
  },
  {
    id: 'cto',
    role: 'CTO',
    name: 'Sam Chen',
    emoji: '⚙️',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    icon: <Code2 className="w-4 h-4" />,
    domain: 'Tecnología & Ingeniería',
    status: 'active',
    kpis: [
      { label: 'Uptime', value: '99.98%', change: '+0.01%', positive: true },
      { label: 'API Latency', value: '142ms', change: '-18ms', positive: true },
      { label: 'Build Time', value: '1m 24s', change: '-22s', positive: true },
      { label: 'Errores/día', value: '3', change: '-87%', positive: true },
    ],
    tasks: [
      { id: 't1', title: 'Migrar wod_completions a Supabase', priority: 'high', progress: 70 },
      { id: 't2', title: 'Optimizar queries del feed principal', priority: 'high', progress: 45 },
      { id: 't3', title: 'Implementar CDN para videos', priority: 'medium', progress: 25 },
      { id: 't4', title: 'Rate limiting API endpoints', priority: 'medium', progress: 60 },
    ],
    terminalLines: [
      '> Iniciando scan de infraestructura...',
      '> [OK] Supabase: 3 réplicas activas, latencia 42ms',
      '> [OK] Vercel Edge: 12 regiones desplegadas',
      '> Analizando performance del feed...',
      '> [WARN] Query posts feed: 342ms — Necesita índice en (user_id, created_at)',
      '> Generando migración SQL para optimización...',
      '> [OK] wod_completions table schema verificado',
      '> [ALERT] Tabla wod_completions: RLS policies pendientes de deploy',
      '> Recomendando ejecutar migración: add_wod_completions_leaderboard.sql',
      '> Análisis de bundle size Next.js 15...',
      '> [OK] First Load JS: 94KB — Dentro del objetivo <100KB',
      '> [THINKING] Evaluando migración a Turbopack para dev...',
    ],
    recommendations: [
      'URGENTE: Ejecutar migración SQL en Supabase para activar leaderboards',
      'Añadir índice compuesto en posts(user_id, created_at) — reducirá latencia 60%',
      'Implementar Cloudflare R2 para storage de videos — ahorro €200/mes',
    ],
  },
  {
    id: 'coo',
    role: 'COO',
    name: 'Maya Patel',
    emoji: '🔧',
    color: 'from-green-500 to-emerald-500',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    icon: <Settings2 className="w-4 h-4" />,
    domain: 'Operaciones & Experiencia',
    status: 'active',
    kpis: [
      { label: 'Support Tickets', value: '8', change: '-60%', positive: true },
      { label: 'Resolución avg', value: '2.3h', change: '-45min', positive: true },
      { label: 'Onboarding Rate', value: '87%', change: '+12%', positive: true },
      { label: 'Usuarios activos', value: '1,847', change: '+234', positive: true },
    ],
    tasks: [
      { id: 't1', title: 'SOP onboarding nuevos gyms', priority: 'high', progress: 55 },
      { id: 't2', title: 'Automatizar alertas churn risk', priority: 'high', progress: 35 },
      { id: 't3', title: 'Encuesta NPS Q1 usuarios', priority: 'medium', progress: 90 },
      { id: 't4', title: 'Manual coach: WOD Generator', priority: 'low', progress: 20 },
    ],
    terminalLines: [
      '> Revisando operaciones del día...',
      '> [OK] 47 gyms activos — Todos reportando correctamente',
      '> [OK] Support inbox: 8 tickets abiertos (SLA: <4h)',
      '> Analizando usuarios con riesgo de abandono...',
      '> [ALERT] 3 usuarios inactivos +14 días con suscripción activa',
      '> Preparando campaña re-engagement automatizada...',
      '> [OK] Onboarding flow completado al 87% por nuevos gyms',
      '> Identificando fricción en step 3: "Configurar horario de clases"',
      '> Recomendando simplificar UX del ScheduleManager...',
      '> Analizando feedback NPS (score: 72)...',
      '> [THINKING] Top feedback: "Necesito más opciones de programación WOD"',
    ],
    recommendations: [
      'Simplificar onboarding de gyms — reducir de 7 a 4 pasos',
      'Automatizar email re-engagement a usuarios inactivos +7 días',
      'Crear video tutorials de 2 min para cada feature principal',
    ],
  },
  {
    id: 'cfo',
    role: 'CFO',
    name: 'David Kim',
    emoji: '💰',
    color: 'from-purple-500 to-violet-500',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    icon: <DollarSign className="w-4 h-4" />,
    domain: 'Finanzas & Revenue',
    status: 'idle',
    kpis: [
      { label: 'ARR', value: '€149,400', change: '+18%', positive: true },
      { label: 'Runway', value: '14 meses', change: '+2m', positive: true },
      { label: 'Burn Rate', value: '€8,200/m', change: '-5%', positive: true },
      { label: 'LTV/CAC', value: '8.4x', change: '+1.2x', positive: true },
    ],
    tasks: [
      { id: 't1', title: 'Modelo financiero seed round', priority: 'high', progress: 50 },
      { id: 't2', title: 'Pricing Global Pass €29/mes', priority: 'high', progress: 75 },
      { id: 't3', title: 'Due diligence documentación', priority: 'medium', progress: 30 },
      { id: 't4', title: 'Optimizar costes Supabase + Vercel', priority: 'low', progress: 40 },
    ],
    terminalLines: [
      '> Generando reporte financiero semanal...',
      '> [OK] MRR: €12,450 (+18% vs mes anterior)',
      '> [OK] ARR proyectado: €149,400',
      '> Calculando unit economics...',
      '> LTV promedio por gym: €1,890 (18 meses x €105/mes)',
      '> CAC actual: €34 — LTV/CAC ratio: 55.6x (excelente)',
      '> [OK] Burn rate mensual: €8,200 — Runway: 14 meses',
      '> Evaluando pricing para Global Pass...',
      '> Benchmark competencia: Trainerize €29/mes, Wodify €49/mes',
      '> Recomendación: €29/mes con trial 14 días gratuitos',
      '> [THINKING] Modelando escenarios fundraising €500K...',
    ],
    recommendations: [
      'Global Pass a €29/mes — Posicionamiento premium accesible',
      'Reducir costes infra 40% migrando a Cloudflare R2 + Workers',
      'Preparar data room para seed: métricas actuales son excelentes',
    ],
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AITeamDashboard() {
  const [activeAgent, setActiveAgent] = useState<string>('ceo');
  const [agents, setAgents] = useState<Agent[]>(AGENTS);

  useEffect(() => {
    getAITeamKPIs()
      .then((kpis) => {
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            kpis: (kpis as Record<string, Agent['kpis']>)[agent.id] ?? agent.kpis,
          }))
        );
      })
      .catch(() => {/* keep static fallback */});
  }, []);

  const selectedAgent = agents.find((a) => a.id === activeAgent)!;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-red/10 border border-brand-red/20">
                <Brain className="w-5 h-5 text-brand-red" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-[0.2em] italic text-white">
                  AI C-Level Team_
                </h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  RivalFit • Mission Control
                </p>
              </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                {agents.filter((a) => a.status === 'active').length} Agentes Activos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Tabs */}
      <div className="border-b border-white/5 bg-black/60">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2 custom-scrollbar">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setActiveAgent(agent.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition-all whitespace-nowrap flex-shrink-0',
                  activeAgent === agent.id
                    ? `${agent.bgColor} ${agent.borderColor} border`
                    : 'hover:bg-white/5 border border-transparent'
                )}
              >
                {/* Avatar & Status */}
                <div className="relative">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black',
                      activeAgent === agent.id ? agent.bgColor : 'bg-white/5'
                    )}
                  >
                    {agent.emoji}
                  </div>
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black',
                      agent.status === 'active'
                        ? 'bg-green-400'
                        : agent.status === 'thinking'
                          ? 'bg-yellow-400 animate-pulse'
                          : 'bg-gray-600'
                    )}
                  />
                </div>

                <div>
                  <div
                    className={cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      activeAgent === agent.id ? agent.textColor : 'text-gray-500'
                    )}
                  >
                    {agent.role}
                  </div>
                  <div
                    className={cn(
                      'text-xs font-bold',
                      activeAgent === agent.id ? 'text-white' : 'text-gray-600'
                    )}
                  >
                    {agent.name.split(' ')[0]}
                  </div>
                </div>

                {/* Thinking indicator */}
                {agent.status === 'thinking' && activeAgent !== agent.id && (
                  <span className="text-[8px] font-black uppercase text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
                    Thinking
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Workspace */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAgent}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <AgentWorkspace agent={selectedAgent} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
