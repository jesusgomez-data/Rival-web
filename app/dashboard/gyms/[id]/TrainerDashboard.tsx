'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    Users, Calendar, DollarSign, Zap, ChevronRight, Plus, Brain,
    CreditCard, Target, BarChart3, MessageSquare, Lock, Clock,
    TrendingUp, TrendingDown, Smartphone, Star, Activity,
    CheckCircle2, AlertCircle, ArrowUpRight, Dumbbell, FileText,
    UserPlus, Settings, Edit, Shield, Sparkles
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

// ── Plan feature matrix ───────────────────────────────────────────────────────
const PLANS = {
    pt_free:  { label: 'Basic',  color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',  maxStudents: 3,        ai: false, payments: false, chat: false, analytics: false, pwa: false, price: '0€'     },
    pt_pro:   { label: 'Pro',    color: 'text-brand-red',   bg: 'bg-brand-red/10',   border: 'border-brand-red/20',   maxStudents: Infinity, ai: true,  payments: true,  chat: true,  analytics: false, pwa: false, price: '29.99€' },
    pt_elite: { label: 'Elite',  color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  maxStudents: Infinity, ai: true,  payments: true,  chat: true,  analytics: true,  pwa: true,  price: '59.99€' },
} as const

type PlanKey = keyof typeof PLANS

interface Props {
    id: string
    centerDetails: any
    metrics: any
    analytics: any[]
    userRole: string | null
}

export default function TrainerDashboard({ id, centerDetails, metrics, analytics, userRole }: Props) {
    const supabase = createClient()
    const planKey  = (centerDetails?.plan as PlanKey) in PLANS ? (centerDetails?.plan as PlanKey) : 'pt_free'
    const plan     = PLANS[planKey]

    const [students,        setStudents]        = useState<any[]>([])
    const [todaySessions,   setTodaySessions]   = useState<any[]>([])
    const [recentPayments,  setRecentPayments]  = useState<any[]>([])
    const [loadingData,     setLoadingData]     = useState(true)

    const lastMonth = analytics.at(-1)  ?? { members: 0, revenue: 0 }
    const prevMonth = analytics.at(-2)  ?? { members: 0, revenue: 0 }
    const revGrowth = prevMonth.revenue > 0
        ? +((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(1)
        : 0
    const memGrowth = prevMonth.members > 0
        ? +((lastMonth.members - prevMonth.members) / prevMonth.members * 100).toFixed(1)
        : 0

    useEffect(() => { fetchData() }, [id])

    async function fetchData() {
        setLoadingData(true)
        const today     = new Date()
        const todayStr  = today.toISOString().split('T')[0]

        const [membersRes, classesRes, paymentsRes] = await Promise.all([
            supabase
                .from('members')
                .select('id, user_id, status, joined_at, profiles:user_id(full_name, username, avatar_url, level, xp_points)')
                .eq('organization_id', id)
                .eq('status', 'active')
                .order('joined_at', { ascending: false })
                .limit(plan.maxStudents === Infinity ? 8 : plan.maxStudents),

            supabase
                .from('classes')
                .select('id, title, start_time, end_time, capacity, enrolled_count, class_type')
                .eq('organization_id', id)
                .gte('start_time', `${todayStr}T00:00:00`)
                .lte('start_time', `${todayStr}T23:59:59`)
                .order('start_time', { ascending: true }),

            plan.payments
                ? supabase
                    .from('sales')
                    .select('id, amount, description, created_at, status, member_id')
                    .eq('organization_id', id)
                    .order('created_at', { ascending: false })
                    .limit(4)
                : Promise.resolve({ data: [] }),
        ])

        setStudents(membersRes.data  ?? [])
        setTodaySessions(classesRes.data ?? [])
        setRecentPayments((paymentsRes as any).data ?? [])
        setLoadingData(false)
    }

    const nextSession    = todaySessions.find(s => new Date(s.start_time) > new Date()) ?? todaySessions[0]
    const studentCount   = lastMonth.members
    const atLimit        = plan.maxStudents < Infinity && studentCount >= plan.maxStudents
    const isOwner        = userRole === 'owner' || userRole === 'head_coach'

    return (
        <div className="px-4 py-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

            {/* ═══ HERO HEADER ═══════════════════════════════════════════════ */}
            <div className="relative rounded-3xl overflow-hidden border border-border min-h-[140px]">
                {/* Background */}
                {centerDetails.cover_photo_url
                    ? <img src={centerDetails.cover_photo_url} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />
                    : <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted" />
                }
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

                <div className="relative z-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Identity */}
                    <div className="flex items-center gap-4">
                        {centerDetails.logo_url
                            ? <img src={centerDetails.logo_url} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 shadow-xl flex-shrink-0" alt={centerDetails.name} />
                            : <div className="w-16 h-16 rounded-2xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red text-2xl font-black flex-shrink-0">
                                {(centerDetails.name ?? 'T')[0].toUpperCase()}
                              </div>
                        }
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${plan.bg} ${plan.color} ${plan.border} border`}>
                                    ⚡ Trainer {plan.label}
                                </span>
                                {centerDetails.verified && (
                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                        ✓ Verificado
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-heading font-black italic uppercase text-foreground leading-tight">
                                {centerDetails.name}
                            </h1>
                            {(centerDetails.city || centerDetails.country) && (
                                <p className="text-muted-foreground text-sm mt-0.5">
                                    📍 {[centerDetails.city, centerDetails.country].filter(Boolean).join(', ')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/gyms/${id}/schedule`}
                            className="bg-brand-red text-white px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-red-600 transition-all flex items-center gap-2 shadow-glow">
                            <Plus className="w-4 h-4" /> Nueva Sesión
                        </Link>
                        {!atLimit && (
                            <Link href={`/dashboard/gyms/${id}/members?action=new`}
                                className="bg-muted border border-border text-foreground px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-muted/80 transition-all flex items-center gap-2">
                                <UserPlus className="w-4 h-4" /> Alumno
                            </Link>
                        )}
                        <Link href={`/trainer/${id}`}
                            className="bg-muted border border-border text-foreground px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-muted/80 transition-all flex items-center gap-2"
                            target="_blank" rel="noopener noreferrer">
                            <ArrowUpRight className="w-4 h-4" /> Ver perfil
                        </Link>
                        {isOwner && (
                            <Link href={`/trainer/${id}/edit`}
                                className="bg-muted border border-border text-foreground px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-muted/80 transition-all flex items-center gap-2">
                                <Edit className="w-4 h-4" /> Editar
                            </Link>
                        )}
                    </div>
                </div>

                {/* Stats strip */}
                <div className="relative z-10 px-6 pb-5 flex flex-wrap gap-x-8 gap-y-2 mt-1">
                    <StatPill icon={Users} value={String(studentCount)} label="alumnos" extra={plan.maxStudents < Infinity ? `/ ${plan.maxStudents} máx` : 'ilimitados'} />
                    <StatPill icon={Calendar} value={String(metrics?.weeklyAttendance ?? 0)} label="sesiones/sem" />
                    {plan.payments && <StatPill icon={DollarSign} value={`€${lastMonth.revenue}`} label="este mes" trend={revGrowth} />}
                </div>
            </div>

            {/* ═══ KPI CARDS ══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard icon={Users}      label="Alumnos"         value={loadingData ? '…' : studentCount}
                    sub={plan.maxStudents < Infinity ? `${studentCount}/${plan.maxStudents}` : 'ilimitados'}
                    trend={memGrowth} color="text-blue-400" bg="bg-blue-500/10"
                    warn={atLimit} warnMsg="Límite alcanzado" />

                <KpiCard icon={Calendar}   label="Sesiones Hoy"    value={loadingData ? '…' : todaySessions.length}
                    sub={nextSession ? `Próx: ${fmtTime(nextSession.start_time)}` : 'Sin sesiones hoy'}
                    color="text-brand-red" bg="bg-brand-red/10" />

                <KpiCard icon={DollarSign} label="Ingresos Mes"    value={plan.payments ? `€${lastMonth.revenue}` : '—'}
                    sub={plan.payments ? `${revGrowth > 0 ? '+' : ''}${revGrowth}% vs anterior` : 'Disponible en Pro'}
                    trend={plan.payments ? revGrowth : undefined}
                    color="text-green-400" bg="bg-green-500/10" locked={!plan.payments} lockedPlan="Pro" />

                <KpiCard icon={Target}     label="Programas"       value={loadingData ? '…' : (metrics?.newMembersMonth ?? 0)}
                    sub="planes activos"
                    color="text-purple-400" bg="bg-purple-500/10" />
            </div>

            {/* ═══ MAIN GRID ══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── LEFT COL (2/3) ───────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* AGENDA HOY */}
                    <Card title="Agenda de Hoy" icon={Calendar} action={{ label: 'Ver todo', href: `/dashboard/gyms/${id}/schedule` }}>
                        {loadingData ? <Spinner /> : todaySessions.length === 0
                            ? <EmptyState icon={Calendar} text="Sin sesiones programadas hoy">
                                <Link href={`/dashboard/gyms/${id}/schedule`} className="inline-flex items-center gap-1 text-brand-red text-sm font-bold hover:underline">
                                    <Plus className="w-3.5 h-3.5" /> Crear sesión
                                </Link>
                              </EmptyState>
                            : <div className="space-y-1.5">
                                {todaySessions.map(s => (
                                    <Link key={s.id} href={`/dashboard/gyms/${id}/schedule`}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                                        <div className="w-12 h-10 rounded-lg bg-brand-red/10 flex flex-col items-center justify-center text-brand-red flex-shrink-0">
                                            <span className="text-[10px] font-black leading-none">{fmtTime(s.start_time)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-foreground font-bold text-sm truncate">{s.title || 'Sesión personal'}</p>
                                            <p className="text-muted-foreground text-xs">{s.enrolled_count ?? 0} inscrito{(s.enrolled_count ?? 1) !== 1 ? 's' : ''} · hasta {fmtTime(s.end_time)}</p>
                                        </div>
                                        <SessionBadge type={s.class_type} />
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                                    </Link>
                                ))}
                              </div>
                        }
                    </Card>

                    {/* MIS ALUMNOS */}
                    <Card
                        title={`Mis Alumnos${plan.maxStudents < Infinity ? ` (${students.length}/${plan.maxStudents})` : ` (${students.length})`}`}
                        icon={Users}
                        action={{ label: 'Gestionar', href: `/dashboard/gyms/${id}/members` }}
                    >
                        {loadingData ? <Spinner /> : students.length === 0
                            ? <EmptyState icon={Users} text="Sin alumnos registrados aún">
                                <Link href={`/dashboard/gyms/${id}/members?action=new`} className="inline-flex items-center gap-1 text-brand-red text-sm font-bold hover:underline">
                                    <Plus className="w-3.5 h-3.5" /> Añadir primer alumno
                                </Link>
                              </EmptyState>
                            : <div className="space-y-1">
                                {students.map((m: any) => {
                                    const p = m.profiles
                                    return (
                                        <Link key={m.id} href={`/dashboard/gyms/${id}/members`}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group">
                                            {p?.avatar_url
                                                ? <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt={p.full_name} />
                                                : <div className="w-9 h-9 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red font-black text-sm flex-shrink-0">
                                                    {(p?.full_name ?? p?.username ?? '?')[0].toUpperCase()}
                                                  </div>
                                            }
                                            <div className="flex-1 min-w-0">
                                                <p className="text-foreground font-bold text-sm truncate">{p?.full_name || p?.username || 'Alumno'}</p>
                                                <p className="text-muted-foreground text-xs">Nv.{p?.level ?? 1} · {(p?.xp_points ?? 0).toLocaleString()} XP</p>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-bold">ACTIVO</span>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                                        </Link>
                                    )
                                })}

                                {/* Add more or upgrade */}
                                {!atLimit && plan.maxStudents < Infinity && (
                                    <Link href={`/dashboard/gyms/${id}/members?action=new`}
                                        className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-brand-red/40 hover:bg-brand-red/5 transition-colors text-muted-foreground hover:text-brand-red text-sm font-bold mt-2">
                                        <Plus className="w-4 h-4" /> Añadir alumno
                                    </Link>
                                )}
                                {atLimit && (
                                    <UpgradeBanner
                                        icon={Lock}
                                        title={`Límite de ${plan.maxStudents} alumnos alcanzado`}
                                        sub="Actualiza a Trainer Pro para alumnos ilimitados"
                                        cta="Actualizar a Pro →"
                                        href={`/dashboard/gyms/${id}/settings/billing`}
                                    />
                                )}
                              </div>
                        }
                    </Card>

                    {/* PROGRAMACIÓN */}
                    <Card title="Programación" icon={Dumbbell} action={{ label: 'Ver todo', href: `/dashboard/gyms/${id}/programming` }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Manual — always available */}
                            <Link href={`/dashboard/gyms/${id}/programming`}
                                className="p-4 rounded-xl bg-card border border-border hover:border-brand-red/30 hover:bg-brand-red/5 transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-brand-red/15 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-brand-red" />
                                    </div>
                                    <span className="font-bold text-sm text-foreground">Rutinas Manuales</span>
                                </div>
                                <p className="text-gray-500 text-xs">Crea y asigna rutinas personalizadas paso a paso</p>
                            </Link>

                            {/* AI — pro+ */}
                            {plan.ai
                                ? <Link href={`/dashboard/gyms/${id}/programming?mode=ai`}
                                      className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-500/10 transition-all group">
                                      <div className="flex items-center gap-3 mb-2">
                                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                              <Brain className="w-4 h-4 text-purple-400" />
                                          </div>
                                          <span className="font-bold text-sm text-white">Programación IA</span>
                                          <Sparkles className="w-3 h-3 text-purple-400 ml-auto" />
                                      </div>
                                      <p className="text-gray-500 text-xs">Genera planes adaptativos con inteligencia artificial</p>
                                  </Link>
                                : <LockedCard icon={Brain} title="Programación IA" description="Planes automáticos y adaptativos con IA" requiredPlan="Pro" color="purple" />
                            }

                            {/* Session history */}
                            <Link href={`/dashboard/gyms/${id}/schedule`}
                                className="p-4 rounded-xl bg-white/4 border border-white/8 hover:border-white/20 transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <span className="font-bold text-sm text-white">Historial de Sesiones</span>
                                </div>
                                <p className="text-gray-500 text-xs">Consulta todas las sesiones pasadas y futuras</p>
                            </Link>

                            {/* Membresías */}
                            <Link href={`/dashboard/gyms/${id}/memberships`}
                                className="p-4 rounded-xl bg-white/4 border border-white/8 hover:border-white/20 transition-all group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center">
                                        <Star className="w-4 h-4 text-yellow-400" />
                                    </div>
                                    <span className="font-bold text-sm text-white">Planes y Tarifas</span>
                                </div>
                                <p className="text-gray-500 text-xs">Gestiona los planes de suscripción de tus alumnos</p>
                            </Link>
                        </div>
                    </Card>

                    {/* ANALYTICS — elite only */}
                    {plan.analytics && (
                        <Card title="Retención y Analítica" icon={BarChart3} action={{ label: 'Ver analytics', href: `/dashboard/gyms/${id}/analytics` }}>
                            <div className="grid grid-cols-3 gap-4">
                                <MiniStat label="Retención" value={`${Math.max(0, 100 - (metrics?.cancelledMonth ?? 0) * 5)}%`} good />
                                <MiniStat label="Bajas Mes" value={metrics?.cancelledMonth ?? 0} good={false} />
                                <MiniStat label="Nuevos" value={metrics?.newMembersMonth ?? 0} good />
                            </div>
                            <Link href={`/dashboard/gyms/${id}/analytics`}
                                className="mt-4 flex items-center justify-between p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 hover:border-purple-400/40 transition-colors group">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-purple-400" />
                                    <span className="text-sm font-bold text-white">Ver informe completo</span>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </Link>
                        </Card>
                    )}
                </div>

                {/* ── RIGHT COL (1/3) ──────────────────────────────────────── */}
                <div className="space-y-5">

                    {/* PRÓXIMA SESIÓN */}
                    {nextSession && (
                        <div className="rounded-2xl bg-gradient-to-br from-brand-red/20 via-brand-red/10 to-transparent border border-brand-red/20 p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-4 h-4 text-brand-red" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-red">Próxima Sesión</span>
                            </div>
                            <h4 className="text-white font-black text-base mb-0.5 truncate">{nextSession.title || 'Sesión personal'}</h4>
                            <p className="text-4xl font-black text-brand-red leading-none mb-1">{fmtTime(nextSession.start_time)}</p>
                            <p className="text-gray-500 text-xs mb-4">hasta {fmtTime(nextSession.end_time)} · {nextSession.enrolled_count ?? 0} inscrito{(nextSession.enrolled_count ?? 1) !== 1 ? 's' : ''}</p>
                            <Link href={`/dashboard/gyms/${id}/schedule`}
                                className="w-full bg-brand-red text-white text-center block py-2.5 rounded-xl font-black text-sm hover:bg-red-600 transition-colors uppercase tracking-wider">
                                Ver detalles
                            </Link>
                        </div>
                    )}

                    {/* NUEVO ALUMNO CTA */}
                    {!atLimit && (
                        <div className="bg-card border border-border rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-1">
                                <UserPlus className="w-4 h-4 text-white" />
                                <h3 className="text-white font-black text-sm uppercase tracking-wider">Nuevo Alumno</h3>
                            </div>
                            <p className="text-gray-500 text-xs mb-4">Registra y asigna un plan desde el primer día</p>
                            {plan.maxStudents < Infinity && (
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">{students.length} / {plan.maxStudents} alumnos</span>
                                        <span className="text-gray-500">{plan.maxStudents - students.length} libres</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand-red rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (students.length / plan.maxStudents) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            <Link href={`/dashboard/gyms/${id}/members?action=new`}
                                className="w-full bg-white text-black text-center block py-2.5 rounded-xl font-black text-sm hover:bg-gray-100 transition-colors">
                                + Registrar Alumno
                            </Link>
                        </div>
                    )}

                    {/* COBROS — pro+ */}
                    {plan.payments
                        ? <Card title="Cobros Recientes" icon={CreditCard} action={{ label: 'Tienda', href: `/dashboard/gyms/${id}/store` }}>
                            {loadingData ? <Spinner /> : recentPayments.length === 0
                                ? <p className="text-gray-500 text-sm text-center py-4">Sin cobros registrados</p>
                                : <div className="space-y-2">
                                    {recentPayments.map((p: any) => (
                                        <div key={p.id} className="flex items-center justify-between py-1.5">
                                            <div className="min-w-0">
                                                <p className="text-white text-sm font-bold truncate">{p.description || 'Pago'}</p>
                                                <p className="text-gray-500 text-xs">{fmtDate(p.created_at)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${p.status === 'paid' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                    {p.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                                </span>
                                                <span className="font-black text-sm text-white">€{p.amount}</span>
                                            </div>
                                        </div>
                                    ))}
                                  </div>
                            }
                          </Card>
                        : <div className="bg-card border border-border rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <Lock className="w-4 h-4 text-gray-500" />
                                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Pagos Integrados</span>
                                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-brand-red/10 text-brand-red">PRO</span>
                            </div>
                            <p className="text-gray-400 text-xs mb-4">Cobra a tus alumnos con Stripe directo desde la app. Suscripciones, pago único y facturación automática.</p>
                            <Link href={`/dashboard/gyms/${id}/settings/billing`}
                                className="w-full bg-brand-red text-white text-center block py-2.5 rounded-xl font-black text-sm hover:bg-red-600 transition-colors">
                                Actualizar a Pro →
                            </Link>
                          </div>
                    }

                    {/* ACCESOS RÁPIDOS */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-5 py-3 border-b border-border">Accesos</p>
                        <div className="p-2 space-y-0.5">
                            {[
                                { label: 'Horario / Agenda',  href: `/dashboard/gyms/${id}/schedule`,         icon: Calendar },
                                { label: 'Mis Alumnos',       href: `/dashboard/gyms/${id}/members`,          icon: Users },
                                { label: 'Programación',      href: `/dashboard/gyms/${id}/programming`,      icon: Activity },
                                { label: 'Perfil Público',    href: `/trainer/${id}`,                         icon: CheckCircle2 },
                                { label: 'Facturación',       href: `/dashboard/gyms/${id}/settings/billing`, icon: CreditCard },
                            ].map(({ label, href, icon: Icon }) => (
                                <Link key={href} href={href}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                                    <Icon className="w-4 h-4 text-gray-500 group-hover:text-brand-red transition-colors flex-shrink-0" />
                                    <span className="text-white font-medium text-sm">{label}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-white ml-auto" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* CHAT — pro+ */}
                    {plan.chat
                        ? <Link href={`/dashboard/gyms/${id}/communications`}
                              className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-blue-500/30 transition-all group">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                  <MessageSquare className="w-5 h-5 text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="text-white font-bold text-sm">Chat con Alumnos</p>
                                  <p className="text-gray-500 text-xs">Mensajes directos y comunicados</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 flex-shrink-0" />
                          </Link>
                        : null
                    }

                    {/* ANALYTICS link — elite */}
                    {plan.analytics && !plan.pwa && (
                        <Link href={`/dashboard/gyms/${id}/analytics`}
                            className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-purple-500/30 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <BarChart3 className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm">Analítica Avanzada</p>
                                <p className="text-gray-500 text-xs">Retención, predicciones y tendencias</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 flex-shrink-0" />
                        </Link>
                    )}

                    {/* PWA — elite */}
                    {plan.pwa && (
                        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Smartphone className="w-4 h-4 text-purple-400" />
                                <span className="text-xs font-black uppercase tracking-widest text-purple-400">App Personalizada</span>
                                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">ACTIVA</span>
                            </div>
                            <p className="text-gray-400 text-xs">Tu PWA está activa. Comparte el enlace para que tus alumnos la instalen desde el navegador.</p>
                        </div>
                    )}

                    {/* UPGRADE banner for non-elite */}
                    {planKey !== 'pt_elite' && (
                        <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/8 rounded-2xl">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                                {planKey === 'pt_free' ? '🚀 Desbloquea más potencia' : '⚡ Hazte Elite'}
                            </p>
                            <ul className="space-y-1.5 mb-4">
                                {planKey === 'pt_free' && [
                                    'Alumnos ilimitados',
                                    'Programación con IA',
                                    'Pagos con Stripe',
                                    'Chat directo',
                                ].map(f => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-red flex-shrink-0" /> {f}
                                    </li>
                                ))}
                                {planKey === 'pt_pro' && [
                                    'Análisis de retención',
                                    'App PWA personalizada',
                                    'Soporte prioritario 24/7',
                                ].map(f => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" /> {f}
                                    </li>
                                ))}
                            </ul>
                            <Link href={`/dashboard/gyms/${id}/settings/billing`}
                                className={`w-full text-white text-center block py-2.5 rounded-xl font-black text-sm transition-colors uppercase tracking-wider ${planKey === 'pt_free' ? 'bg-brand-red hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'}`}>
                                {planKey === 'pt_free' ? 'Actualizar a Pro — 29.99€/mes' : 'Actualizar a Elite — 59.99€/mes'}
                            </Link>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso?: string | null) {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}
function fmtDate(iso?: string | null) {
    if (!iso) return '—'
    try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) } catch { return '—' }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label, extra, trend }: any) {
    return (
        <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-white font-black text-sm">{value}</span>
            <span className="text-gray-500 text-xs">{label}</span>
            {extra && <span className="text-gray-600 text-xs">{extra}</span>}
            {trend !== undefined && trend !== 0 && (
                <span className={`text-xs font-bold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend > 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
    )
}

function KpiCard({ icon: Icon, label, value, sub, trend, color, bg, locked, lockedPlan, warn, warnMsg }: any) {
    return (
        <div className={`bg-card border rounded-2xl p-4 relative overflow-hidden ${warn ? 'border-yellow-500/30' : 'border-border'}`}>
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                {locked ? <Lock className={`w-4 h-4 ${color}`} /> : <Icon className={`w-4 h-4 ${color}`} />}
            </div>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-black mt-0.5 ${locked ? 'text-gray-600 select-none' : 'text-white'}`}>
                {locked ? '••••' : value}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
                {trend !== undefined && !locked && trend !== 0 && (
                    trend > 0
                        ? <TrendingUp className="w-3 h-3 text-green-400" />
                        : <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <p className={`text-xs ${warn ? 'text-yellow-400 font-bold' : 'text-gray-600'}`}>{warn ? warnMsg : sub}</p>
            </div>
            {locked && lockedPlan && (
                <span className="absolute top-3 right-3 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-brand-red/10 text-brand-red uppercase">{lockedPlan}</span>
            )}
            {warn && (
                <AlertCircle className="absolute top-3 right-3 w-4 h-4 text-yellow-500" />
            )}
        </div>
    )
}

function Card({ title, icon: Icon, children, action }: any) {
    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-brand-red" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground">{title}</h3>
                </div>
                {action && (
                    <Link href={action.href} className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1">
                        {action.label} <ChevronRight className="w-3 h-3" />
                    </Link>
                )}
            </div>
            <div className="p-4">{children}</div>
        </div>
    )
}

function Spinner() {
    return (
        <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
        </div>
    )
}

function EmptyState({ icon: Icon, text, children }: any) {
    return (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <Icon className="w-8 h-8 text-gray-700" />
            <p className="text-gray-500 text-sm">{text}</p>
            {children}
        </div>
    )
}

function LockedCard({ icon: Icon, title, description, requiredPlan, color = 'red' }: any) {
    const colors: Record<string, string> = { red: 'text-brand-red bg-brand-red/10', purple: 'text-purple-400 bg-purple-500/10' }
    const planBg: Record<string, string> = { red: 'bg-brand-red/10 text-brand-red', purple: 'bg-purple-500/10 text-purple-400' }
    return (
        <div className="p-4 rounded-xl bg-white/2 border border-white/5 relative">
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
                    <Lock className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-gray-400">{title}</span>
                <span className={`ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full ${planBg[color]} uppercase`}>{requiredPlan}</span>
            </div>
            <p className="text-gray-600 text-xs">{description}</p>
        </div>
    )
}

function UpgradeBanner({ icon: Icon, title, sub, cta, href }: any) {
    return (
        <div className="mt-2 p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20 space-y-2">
            <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-yellow-400 text-xs font-bold">{title}</p>
                    <p className="text-yellow-600 text-xs">{sub}</p>
                </div>
            </div>
            <Link href={href} className="block w-full text-center bg-yellow-500 text-black py-2 rounded-lg font-black text-xs hover:bg-yellow-400 transition-colors">
                {cta}
            </Link>
        </div>
    )
}

function SessionBadge({ type }: { type?: string }) {
    if (!type) return null
    const map: Record<string, { label: string; cls: string }> = {
        personal:  { label: 'Personal',  cls: 'bg-brand-red/10 text-brand-red' },
        group:     { label: 'Grupal',    cls: 'bg-blue-500/10 text-blue-400' },
        online:    { label: 'Online',    cls: 'bg-green-500/10 text-green-400' },
        assessment:{ label: 'Evaluación',cls: 'bg-purple-500/10 text-purple-400' },
    }
    const badge = map[type]
    if (!badge) return null
    return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase flex-shrink-0 ${badge.cls}`}>{badge.label}</span>
}

function MiniStat({ label, value, good }: { label: string; value: string | number; good: boolean }) {
    return (
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-center">
            <p className={`text-xl font-black ${good ? 'text-green-400' : 'text-red-400'}`}>{value}</p>
            <p className="text-gray-500 text-[10px] mt-0.5">{label}</p>
        </div>
    )
}
