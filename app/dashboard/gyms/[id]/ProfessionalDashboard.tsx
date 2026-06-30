'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import {
    Calendar, Clock, Euro, MessageSquare, Star, Check, X,
    Briefcase, ChevronRight, ArrowUpRight, Edit, BanknoteIcon,
    AlertCircle, CheckCircle2, Loader2, TrendingUp, Users
} from 'lucide-react'
import { acceptServiceBooking, rejectServiceBooking } from '@/app/dashboard/gyms/professional-service-actions'
import { getProfessionalBalance, requestPayout } from '@/app/dashboard/gyms/payout-actions'
import { getTypeLabel, getTypeIcon, SERVICE_MODALITIES, BOOKING_STATUS_LABELS } from '@/lib/professional-types'

interface Props {
    id: string
    centerDetails: any
    userRole: string | null
}

export default function ProfessionalDashboard({ id, centerDetails, userRole }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [pending, setPending] = useState<any[]>([])
    const [todayBookings, setTodayBookings] = useState<any[]>([])
    const [services, setServices] = useState<any[]>([])
    const [avgRating, setAvgRating] = useState<number | null>(null)
    const [reviewCount, setReviewCount] = useState(0)
    const [monthRevenue, setMonthRevenue] = useState(0)
    const [activeChats, setActiveChats] = useState<any[]>([])
    const [stripeReady, setStripeReady] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [rejectModal, setRejectModal] = useState<any | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [toast, setToast] = useState<string | null>(null)
    const [stripeBalance, setStripeBalance] = useState<{available: number, pending: number} | null>(null)
    const [showPayoutModal, setShowPayoutModal] = useState(false)
    const [payoutAmount, setPayoutAmount] = useState<string>('')
    const [payoutLoading, setPayoutLoading] = useState(false)

    const typeLabel = getTypeLabel(centerDetails?.center_type)
    const typeIcon  = getTypeIcon(centerDetails?.center_type)
    const isOwner   = userRole === 'owner' || userRole === 'head_coach'

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

    useEffect(() => { loadAll() }, [id])

    async function loadAll() {
        setLoading(true)
        const todayStart = new Date(); todayStart.setHours(0,0,0,0)
        const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)

        const [
            pendingRes, todayRes, servicesRes,
            reviewsRes, revenueRes, chatsRes, orgRes
        ] = await Promise.all([
            // Pending requests
            supabase.from('service_bookings')
                .select('*, client:client_id(full_name, avatar_url, username)')
                .eq('professional_id', id).eq('status', 'pending')
                .order('created_at', { ascending: false }).limit(10),

            // Today's bookings (accepted/paid)
            supabase.from('service_bookings')
                .select('*, client:client_id(full_name, avatar_url)')
                .eq('professional_id', id)
                .in('status', ['accepted', 'paid', 'in_progress'])
                .gte('scheduled_at', todayStart.toISOString())
                .lte('scheduled_at', todayEnd.toISOString())
                .order('scheduled_at', { ascending: true }),

            // My services
            supabase.from('professional_services')
                .select('*').eq('organization_id', id)
                .eq('is_active', true).order('created_at'),

            // Reviews
            supabase.from('service_reviews')
                .select('rating').eq('professional_id', id),

            // Revenue this month
            supabase.from('service_bookings')
                .select('professional_payout_amount')
                .eq('professional_id', id)
                .in('status', ['completed', 'paid_out'])
                .gte('completed_at', monthStart.toISOString()),

            // Active chats
            supabase.from('service_conversations')
                .select('*, booking:booking_id(service_name, client_id, status, client:client_id(full_name, avatar_url))')
                .eq('professional_id', id)
                .order('last_message_at', { ascending: false }).limit(5),

            // Stripe status
            supabase.from('organizations')
                .select('stripe_onboarding_complete').eq('id', id).single(),
        ])

        setPending(pendingRes.data ?? [])
        setTodayBookings(todayRes.data ?? [])
        setServices(servicesRes.data ?? [])

        const reviews = reviewsRes.data ?? []
        setReviewCount(reviews.length)
        setAvgRating(reviews.length > 0
            ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
            : null)

        const rev = (revenueRes.data ?? []).reduce((s: number, b: any) => s + Number(b.professional_payout_amount || 0), 0)
        setMonthRevenue(rev)

        setActiveChats(chatsRes.data ?? [])
        setStripeReady(orgRes.data?.stripe_onboarding_complete ?? false)

        if (orgRes.data?.stripe_onboarding_complete) {
            const balanceRes = await getProfessionalBalance(id)
            if (!balanceRes.error) {
                setStripeBalance(balanceRes as any)
            }
        }

        setLoading(false)
    }

    async function handleAccept(booking: any) {
        setProcessing(booking.id)
        const res = await acceptServiceBooking(booking.id, id)
        if (res.error) showToast(res.error)
        else {
            setPending(p => p.filter(b => b.id !== booking.id))
            showToast('Reserva aceptada ✓')
        }
        setProcessing(null)
    }

    async function handleReject() {
        if (!rejectModal || !rejectReason.trim()) return
        setProcessing(rejectModal.id)
        const res = await rejectServiceBooking(rejectModal.id, id, rejectReason.trim())
        if (res.error) showToast(res.error)
        else {
            setPending(p => p.filter(b => b.id !== rejectModal.id))
            showToast('Solicitud rechazada')
            setRejectModal(null); setRejectReason('')
        }
        setProcessing(null)
    }

    async function handlePayout() {
        const amt = parseFloat(payoutAmount)
        if (isNaN(amt) || amt <= 0 || !stripeBalance || amt > stripeBalance.available) {
            return showToast('Cantidad inválida')
        }
        setPayoutLoading(true)
        const res = await requestPayout(id, amt)
        if (res.error) {
            showToast(res.error)
        } else {
            showToast('Retiro solicitado con éxito')
            setShowPayoutModal(false)
            setPayoutAmount('')
            loadAll() // refresh balance
        }
        setPayoutLoading(false)
    }

    function fmtTime(iso: string) {
        try { return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
    }
    function fmtDate(iso: string) {
        try { return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) } catch { return '' }
    }

    const kpis = [
        { label: 'Solicitudes',  value: loading ? '…' : pending.length,    sub: 'requieren acción', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: AlertCircle, warn: pending.length > 0 },
        { label: 'Agenda hoy',   value: loading ? '…' : todayBookings.length, sub: 'sesiones confirmadas', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Calendar },
        { label: 'Saldo', value: loading ? '…' : `€${(stripeBalance?.available || 0).toFixed(2)}`, sub: stripeBalance?.pending ? `€${stripeBalance.pending.toFixed(2)} en proceso` : 'disponible para retirar', color: 'text-green-400', bg: 'bg-green-500/10', icon: Euro },
        { label: 'Valoración',   value: loading ? '…' : (avgRating ? avgRating.toFixed(1) : '—'), sub: `${reviewCount} reseña${reviewCount !== 1 ? 's' : ''}`, color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Star },
    ]

    return (
        <div className="px-4 py-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl animate-fade-in">
                    {toast}
                </div>
            )}

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden border border-border min-h-[130px]">
                {centerDetails.cover_photo_url
                    ? <img src={centerDetails.cover_photo_url} className="absolute inset-0 w-full h-full object-cover opacity-20" alt="" />
                    : <div className="absolute inset-0 bg-gradient-to-br from-brand-red/10 via-background to-muted" />
                }
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

                <div className="relative z-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {centerDetails.logo_url
                            ? <img src={centerDetails.logo_url} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 shadow-xl shrink-0" alt={centerDetails.name} />
                            : <div className="w-16 h-16 rounded-2xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red text-3xl shrink-0">
                                {typeIcon}
                              </div>
                        }
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-red/10 text-brand-red border border-brand-red/20">
                                    {typeIcon} {typeLabel}
                                </span>
                                {stripeReady
                                    ? <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">✓ Cobros activos</span>
                                    : <Link href={`/dashboard/gyms/${id}/settings/billing`} className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                                        ⚠ Activa cobros
                                    </Link>
                                }
                            </div>
                            <h1 className="text-2xl md:text-3xl font-heading font-black italic uppercase text-white leading-tight">{centerDetails.name}</h1>
                            {(centerDetails.city || centerDetails.country) && (
                                <p className="text-gray-400 text-sm mt-0.5">📍 {[centerDetails.city, centerDetails.country].filter(Boolean).join(', ')}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/trainer/${id}`}
                            className="bg-white/10 border border-white/15 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-white/15 transition-all flex items-center gap-2">
                            <ArrowUpRight className="w-4 h-4" /> Ver perfil
                        </Link>
                        {isOwner && (
                            <Link href={`/trainer/${id}/edit`}
                                className="bg-white/10 border border-white/15 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-white/15 transition-all flex items-center gap-2">
                                <Edit className="w-4 h-4" /> Editar
                            </Link>
                        )}
                        <Link href={`/dashboard/gyms/${id}/bookings`}
                            className="bg-brand-red text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                            <Calendar className="w-4 h-4" /> Ver reservas
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── KPIs ──────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(({ label, value, sub, color, bg, icon: Icon, warn }) => (
                    <div key={label} className={`bg-card border rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between ${warn ? 'border-yellow-500/30' : 'border-border'}`}>
                        {warn && <div className="absolute top-0 right-0 w-12 h-12 bg-yellow-500/10 rounded-bl-full" />}
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            {label === 'Saldo' && stripeBalance && stripeBalance.available > 0 && (
                                <button onClick={() => setShowPayoutModal(true)} className="text-[10px] uppercase font-bold tracking-widest bg-brand-red text-white px-2 py-1 rounded hover:bg-red-600 transition">
                                    Retirar
                                </button>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
                            <p className="text-2xl font-black mt-0.5 text-white">{value}</p>
                            <p className={`text-xs mt-0.5 ${warn ? 'text-yellow-400 font-bold' : 'text-gray-600'}`}>{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── LEFT (2/3) ──────────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* SOLICITUDES PENDIENTES */}
                    <Section
                        title={`Solicitudes pendientes${pending.length > 0 ? ` (${pending.length})` : ''}`}
                        icon={AlertCircle}
                        action={{ label: 'Ver todas', href: `/dashboard/gyms/${id}/bookings` }}
                        urgent={pending.length > 0}
                    >
                        {loading ? <Spinner /> : pending.length === 0
                            ? <EmptyState icon={Check} text="Sin solicitudes pendientes — todo al día" />
                            : <div className="space-y-2">
                                {pending.slice(0, 5).map(booking => {
                                    const client = booking.client || {}
                                    const isProc = processing === booking.id
                                    const modality = SERVICE_MODALITIES.find(m => m.key === booking.modality)
                                    return (
                                        <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-yellow-500/5 border border-yellow-500/15 rounded-2xl">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {client.avatar_url
                                                    ? <img src={client.avatar_url} className="w-9 h-9 rounded-xl object-cover shrink-0" alt={client.full_name} />
                                                    : <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm shrink-0">{(client.full_name || '?')[0]}</div>
                                                }
                                                <div className="min-w-0">
                                                    <p className="text-white font-bold text-sm truncate">{client.full_name || client.username || 'Cliente'}</p>
                                                    <p className="text-gray-500 text-xs truncate">
                                                        {booking.service_name} · €{Number(booking.service_price).toFixed(2)}
                                                        {modality && <> · {modality.icon} {modality.label}</>}
                                                        {booking.scheduled_at && <> · {fmtDate(booking.scheduled_at)} {fmtTime(booking.scheduled_at)}</>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <button onClick={() => handleAccept(booking)} disabled={!!isProc}
                                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                                    {isProc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                    Aceptar
                                                </button>
                                                <button onClick={() => { setRejectModal(booking); setRejectReason('') }}
                                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        }
                    </Section>

                    {/* AGENDA HOY */}
                    <Section title="Agenda de hoy" icon={Calendar} action={{ label: 'Ver reservas', href: `/dashboard/gyms/${id}/bookings` }}>
                        {loading ? <Spinner /> : todayBookings.length === 0
                            ? <EmptyState icon={Calendar} text="Sin sesiones confirmadas hoy" />
                            : <div className="space-y-2">
                                {todayBookings.map(booking => {
                                    const client = booking.client || {}
                                    const status = BOOKING_STATUS_LABELS[booking.status]
                                    const modality = SERVICE_MODALITIES.find(m => m.key === booking.modality)
                                    return (
                                        <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}
                                            className="flex items-center gap-3 p-3.5 bg-white/3 border border-white/8 rounded-2xl hover:border-white/20 transition-all group">
                                            <div className="w-14 shrink-0 text-center">
                                                <p className="text-brand-red font-black text-base leading-none">{fmtTime(booking.scheduled_at)}</p>
                                                <p className="text-gray-600 text-[10px]">{booking.duration_minutes}min</p>
                                            </div>
                                            <div className="w-px h-8 bg-white/10" />
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                {client.avatar_url
                                                    ? <img src={client.avatar_url} className="w-8 h-8 rounded-lg object-cover shrink-0" alt={client.full_name} />
                                                    : <div className="w-8 h-8 rounded-lg bg-brand-red/20 flex items-center justify-center text-brand-red font-black text-xs shrink-0">{(client.full_name || '?')[0]}</div>
                                                }
                                                <div className="min-w-0">
                                                    <p className="text-white font-bold text-sm truncate">{client.full_name || 'Cliente'}</p>
                                                    <p className="text-gray-500 text-xs truncate">{booking.service_name} {modality && `· ${modality.icon}`}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${status?.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                                                {status?.label}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white shrink-0" />
                                        </Link>
                                    )
                                })}
                            </div>
                        }
                    </Section>

                    {/* CONVERSACIONES ACTIVAS */}
                    <Section title="Chats activos" icon={MessageSquare} action={{ label: 'Ver todos', href: `/dashboard/gyms/${id}/bookings` }}>
                        {loading ? <Spinner /> : activeChats.length === 0
                            ? <EmptyState icon={MessageSquare} text="Sin conversaciones activas" />
                            : <div className="space-y-1.5">
                                {activeChats.map((conv: any) => {
                                    const booking = conv.booking || {}
                                    const client  = booking.client || {}
                                    return (
                                        <Link key={conv.id} href={`/dashboard/bookings/${conv.booking_id}`}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                            {client.avatar_url
                                                ? <img src={client.avatar_url} className="w-9 h-9 rounded-xl object-cover shrink-0" alt={client.full_name} />
                                                : <div className="w-9 h-9 rounded-xl bg-brand-red/15 flex items-center justify-center text-brand-red font-black text-sm shrink-0">{(client.full_name || '?')[0]}</div>
                                            }
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{client.full_name || 'Cliente'}</p>
                                                <p className="text-gray-500 text-xs truncate">{booking.service_name}</p>
                                            </div>
                                            {conv.last_message_at && (
                                                <p className="text-gray-600 text-[10px] shrink-0">{fmtDate(conv.last_message_at)}</p>
                                            )}
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-white shrink-0" />
                                        </Link>
                                    )
                                })}
                            </div>
                        }
                    </Section>
                </div>

                {/* ── RIGHT (1/3) ─────────────────────────────────────────── */}
                <div className="space-y-5">

                    {/* Stripe Connect banner */}
                    {!stripeReady && (
                        <div className="p-5 rounded-2xl bg-yellow-500/8 border border-yellow-500/25 space-y-3">
                            <div className="flex items-center gap-2">
                                <BanknoteIcon className="w-5 h-5 text-yellow-400" />
                                <p className="text-yellow-400 font-black text-sm uppercase tracking-wider">Activa los cobros</p>
                            </div>
                            <p className="text-gray-400 text-xs leading-relaxed">Conecta tu cuenta bancaria con Stripe para recibir el 90% de cada servicio directamente.</p>
                            <Link href={`/dashboard/gyms/${id}/settings/billing`}
                                className="w-full bg-yellow-500 text-black py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors">
                                <BanknoteIcon className="w-4 h-4" /> Configurar pagos
                            </Link>
                        </div>
                    )}

                    {stripeReady && (
                        <div className="p-5 rounded-2xl bg-green-500/8 border border-green-500/20 flex items-center gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
                            <div>
                                <p className="text-green-400 font-bold text-sm">Cobros activos</p>
                                <p className="text-gray-500 text-xs">Recibes el 90% de cada servicio</p>
                            </div>
                            <Link href={`/dashboard/gyms/${id}/settings/billing`} className="ml-auto">
                                <ArrowUpRight className="w-4 h-4 text-gray-600 hover:text-white transition-colors" />
                            </Link>
                        </div>
                    )}

                    {/* Mis servicios */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-brand-red" />
                                <h3 className="text-sm font-black uppercase tracking-wider text-white">Mis Servicios</h3>
                            </div>
                            <Link href={`/dashboard/gyms/${id}/services`} className="text-xs font-bold text-brand-red hover:underline flex items-center gap-1">
                                Gestionar <ChevronRight className="w-3 h-3" />
                            </Link>
                        </div>
                        <div className="p-3 space-y-1.5">
                            {loading ? <Spinner /> : services.length === 0
                                ? <div className="py-6 text-center">
                                    <p className="text-gray-500 text-xs mb-3">Aún no tienes servicios publicados</p>
                                    <Link href={`/dashboard/gyms/${id}/services`}
                                        className="text-xs font-bold text-brand-red hover:underline">
                                        + Crear primer servicio
                                    </Link>
                                  </div>
                                : services.slice(0, 5).map((s: any) => (
                                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-white text-sm font-bold truncate">{s.name}</p>
                                            <p className="text-gray-500 text-xs">{s.duration_minutes} min</p>
                                        </div>
                                        <span className="text-white font-black text-sm ml-4 shrink-0">€{Number(s.price).toFixed(0)}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Disponibilidad */}
                    <Link href={`/dashboard/gyms/${id}/services`}
                        className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-brand-red/30 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-brand-red" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm">Disponibilidad</p>
                            <p className="text-gray-500 text-xs">Configura tus horarios de atención</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-red" />
                    </Link>

                    {/* Quick links */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-5 py-3 border-b border-border">Accesos</p>
                        <div className="p-2 space-y-0.5">
                            {[
                                { label: 'Reservas',       href: `/dashboard/gyms/${id}/bookings`,        icon: Calendar },
                                { label: 'Mis Servicios',  href: `/dashboard/gyms/${id}/services`,        icon: Briefcase },
                                { label: 'Clientes',       href: `/dashboard/gyms/${id}/members`,         icon: Users },
                                { label: 'Perfil público', href: `/trainer/${id}`,                        icon: ArrowUpRight },
                                { label: 'Facturación',    href: `/dashboard/gyms/${id}/settings/billing`,icon: BanknoteIcon },
                            ].map(({ label, href, icon: Icon }) => (
                                <Link key={href} href={href}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                                    <Icon className="w-4 h-4 text-gray-500 group-hover:text-brand-red transition-colors shrink-0" />
                                    <span className="text-white font-medium text-sm">{label}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-white ml-auto" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Rating summary */}
                    {reviewCount > 0 && (
                        <div className="p-4 bg-card border border-border rounded-2xl space-y-2">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400" />
                                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Valoraciones</p>
                            </div>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-black text-white">{avgRating?.toFixed(1)}</span>
                                <div>
                                    <div className="flex gap-0.5 mb-0.5">
                                        {[1,2,3,4,5].map(i => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${(avgRating || 0) >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} />
                                        ))}
                                    </div>
                                    <p className="text-gray-500 text-xs">{reviewCount} reseña{reviewCount !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                        <h3 className="text-white font-black text-lg">Rechazar solicitud</h3>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/50 resize-none" />
                        <div className="flex gap-3">
                            <button onClick={() => setRejectModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/5 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleReject} disabled={!rejectReason.trim() || !!processing}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50">
                                {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Rechazar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Section({ title, icon: Icon, children, action, urgent }: any) {
    return (
        <div className={`bg-card border rounded-2xl overflow-hidden ${urgent ? 'border-yellow-500/30' : 'border-border'}`}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${urgent ? 'text-yellow-400' : 'text-brand-red'}`} />
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">{title}</h3>
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

function EmptyState({ icon: Icon, text }: any) {
    return (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <Icon className="w-7 h-7 text-gray-700" />
            <p className="text-gray-500 text-sm">{text}</p>
        </div>
    )
}
