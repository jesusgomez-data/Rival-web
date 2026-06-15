'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { blockTimeSlot, unblockTimeSlot } from '@/app/dashboard/gyms/professional-service-actions'
import { ChevronLeft, ChevronRight, Lock, Unlock, MessageSquare, Loader2, X, Ban } from 'lucide-react'
import Link from 'next/link'

// ── helpers ────────────────────────────────────────────────────────────────
const SLOT_MIN    = 60
const HOUR_PX     = 64   // height of 1 hour in px
const SLOT_PX     = HOUR_PX / (60 / SLOT_MIN)
const START_HOUR  = 7    // 7:00
const END_HOUR    = 21   // 21:00
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN

function jsToSpanishDow(d: number) { return d === 0 ? 6 : d - 1 }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function startOfWeek(d: Date) {
    const r = new Date(d); const day = r.getDay()
    r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); r.setHours(0, 0, 0, 0); return r
}
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function tToMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function minToT(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
// offset in px from top of grid for a given time in minutes
function minToY(totalMin: number) { return ((totalMin - START_HOUR * 60) / SLOT_MIN) * SLOT_PX }
function durationToH(min: number) { return (min / SLOT_MIN) * SLOT_PX }

// ── types ──────────────────────────────────────────────────────────────────
interface AvailWindow  { start: number; end: number }
interface BookedBlock  { id: string; startMin: number; durationMin: number; clientName: string; service: string; bookingId: string; avatar?: string }
interface BlockedBlock { id: string; startMin: number; endMin: number }

export default function ProfessionalAgenda({ professionalId }: { professionalId: string }) {
    const supabase = createClient()
    const today    = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

    const [weekStart,    setWeekStart]    = useState(() => startOfWeek(new Date()))
    const [availability, setAvailability] = useState<any[]>([])
    const [bookings,     setBookings]     = useState<any[]>([])
    const [blocked,      setBlocked]      = useState<any[]>([])
    const [loading,      setLoading]      = useState(true)
    const [selectedDay,  setSelectedDay]  = useState<Date>(today)
    const [viewMode,     setViewMode]     = useState<'week' | 'day'>('week')

    // Action panel
    const [panel,      setPanel]      = useState<null | { type: 'free' | 'blocked' | 'booked'; day: Date; startMin: number; endMin: number; blockedId?: string; bookingId?: string; clientName?: string; service?: string; avatar?: string }>(null)
    const [processing, setProcessing] = useState(false)
    const [toast,      setToast]      = useState<string | null>(null)

    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
    const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

    useEffect(() => { loadAll() }, [weekStart, professionalId])

    // Auto-switch to day view on narrow screens
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 640px)')
        if (mq.matches) setViewMode('day')
        const fn = (e: MediaQueryListEvent) => setViewMode(e.matches ? 'day' : 'week')
        mq.addEventListener('change', fn); return () => mq.removeEventListener('change', fn)
    }, [])

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

    async function loadAll() {
        setLoading(true)
        const [avRes, bkRes, blRes] = await Promise.all([
            supabase.from('professional_availability').select('*').eq('organization_id', professionalId).eq('is_active', true).order('day_of_week'),
            supabase.from('service_bookings').select('id, scheduled_at, duration_minutes, service_name, status, client:client_id(full_name, avatar_url)')
                .eq('professional_id', professionalId).not('status', 'in', '(rejected,cancelled)')
                .gte('scheduled_at', weekStart.toISOString()).lt('scheduled_at', weekEnd.toISOString()),
            supabase.from('professional_blocked_slots').select('*').eq('organization_id', professionalId)
                .gte('date', toDateStr(weekStart)).lte('date', toDateStr(addDays(weekStart, 6))),
        ])
        setAvailability(avRes.data ?? [])
        setBookings(bkRes.data ?? [])
        setBlocked(blRes.data ?? [])
        setLoading(false)
    }

    // For a given day, compute availability windows, booked blocks, blocked blocks
    function getDayData(day: Date) {
        const dow     = jsToSpanishDow(day.getDay())
        const dayStr  = toDateStr(day)

        const avWindows: AvailWindow[] = (availability.filter(a => a.day_of_week === dow))
            .map(a => ({ start: tToMin(a.start_time), end: tToMin(a.end_time) }))

        const bookedBlocks: BookedBlock[] = bookings
            .filter(b => isSameDay(new Date(b.scheduled_at), day))
            .map(b => {
                const d = new Date(b.scheduled_at)
                return {
                    id: b.id, bookingId: b.id,
                    startMin: d.getHours() * 60 + d.getMinutes(),
                    durationMin: b.duration_minutes || 60,
                    clientName: b.client?.full_name || 'Cliente',
                    service: b.service_name || '',
                    avatar: b.client?.avatar_url,
                }
            })

        const blockedBlocks: BlockedBlock[] = blocked
            .filter(b => b.date === dayStr)
            .map(b => ({ id: b.id, startMin: tToMin(b.start_time), endMin: tToMin(b.end_time) }))

        return { avWindows, bookedBlocks, blockedBlocks }
    }

    // Handle clicking on the grid
    function handleGridClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        const yPx  = e.clientY - rect.top
        const rawMin = Math.floor(yPx / SLOT_PX) * SLOT_MIN + START_HOUR * 60
        const startMin = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - SLOT_MIN, rawMin))
        const endMin   = startMin + SLOT_MIN

        const { avWindows, bookedBlocks, blockedBlocks } = getDayData(day)

        const isPast  = (() => { const d = new Date(day); d.setHours(Math.floor(startMin/60), startMin%60,0,0); return d.getTime() < Date.now() })()
        const inWin   = avWindows.some(w => w.start <= startMin && endMin <= w.end)
        if (!inWin || isPast) return

        const booking = bookedBlocks.find(b => startMin < b.startMin + b.durationMin && endMin > b.startMin)
        if (booking) {
            setPanel({ type: 'booked', day, startMin: booking.startMin, endMin: booking.startMin + booking.durationMin, bookingId: booking.bookingId, clientName: booking.clientName, service: booking.service, avatar: booking.avatar })
            return
        }

        const block = blockedBlocks.find(b => startMin >= b.startMin && startMin < b.endMin)
        if (block) {
            setPanel({ type: 'blocked', day, startMin: block.startMin, endMin: block.endMin, blockedId: block.id })
            return
        }

        setPanel({ type: 'free', day, startMin, endMin })
    }

    async function doBlock() {
        if (!panel || panel.type !== 'free') return
        setProcessing(true)
        const res = await blockTimeSlot(professionalId, toDateStr(panel.day), `${minToT(panel.startMin)}:00`, `${minToT(panel.endMin)}:00`)
        if (res.error) showToast(res.error)
        else { showToast('Hora bloqueada'); setPanel(null); await loadAll() }
        setProcessing(false)
    }

    async function doUnblock() {
        if (!panel?.blockedId) return
        setProcessing(true)
        const res = await unblockTimeSlot(panel.blockedId, professionalId)
        if (res.error) showToast(res.error)
        else { showToast('Hora disponible de nuevo'); setPanel(null); await loadAll() }
        setProcessing(false)
    }

    const displayDays = viewMode === 'day' ? [selectedDay] : days

    const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

    return (
        <div className="flex flex-col h-full bg-background select-none">

            {/* Toast */}
            {toast && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-white/10 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-2xl">
                    {toast}
                </div>
            )}

            {/* ── TOOLBAR ──────────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border">
                {/* Week nav */}
                <div className="flex items-center gap-1">
                    <button onClick={() => { setWeekStart(d => addDays(d, -7)); setPanel(null) }}
                        className="w-8 h-8 rounded-lg border border-border hover:bg-white/5 flex items-center justify-center transition-colors">
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <button onClick={() => { setWeekStart(startOfWeek(new Date())); setSelectedDay(today); setPanel(null) }}
                        className="h-8 px-3 text-xs font-semibold border border-border rounded-lg hover:bg-white/5 text-gray-300 transition-colors">
                        Hoy
                    </button>
                    <button onClick={() => { setWeekStart(d => addDays(d, 7)); setPanel(null) }}
                        className="w-8 h-8 rounded-lg border border-border hover:bg-white/5 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <span className="text-white font-semibold text-sm capitalize ml-1 hidden sm:inline">
                    {weekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>

                <div className="ml-auto flex items-center gap-4">
                    {/* Legend */}
                    <div className="hidden sm:flex items-center gap-4 text-[11px] text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />Disponible</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/50" />Bloqueado</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-500/50" />Reservado</span>
                    </div>

                    {/* View toggle */}
                    <div className="flex border border-border rounded-lg overflow-hidden text-xs font-semibold">
                        <button onClick={() => setViewMode('day')}
                            className={`px-3 py-1.5 transition-colors ${viewMode === 'day' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                            Día
                        </button>
                        <button onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 transition-colors ${viewMode === 'week' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                            Semana
                        </button>
                    </div>
                </div>
            </div>

            {/* Day strip (mobile day selector + week header) */}
            <div className="shrink-0 flex border-b border-border bg-background">
                {/* Time column spacer */}
                <div className="w-14 shrink-0" />
                {days.map((day, i) => {
                    const isToday    = isSameDay(day, today)
                    const isSelected = isSameDay(day, selectedDay)
                    const dow        = jsToSpanishDow(day.getDay())
                    const hasAvail   = availability.some(a => a.day_of_week === dow)
                    return (
                        <button key={i}
                            onClick={() => { setSelectedDay(day); if (viewMode === 'week') {} }}
                            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-colors border-l border-border first:border-l-0
                                ${viewMode === 'week' ? '' : (isSelected ? 'bg-white/5' : 'hover:bg-white/3')}
                                ${viewMode === 'day' && !isSelected ? 'opacity-50' : ''}
                            `}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-brand-red' : 'text-gray-500'}`}>
                                {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                            </span>
                            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors
                                ${isToday ? 'bg-brand-red text-white' : isSelected && viewMode === 'day' ? 'bg-white/15 text-white' : 'text-white'}`}>
                                {day.getDate()}
                            </span>
                            {hasAvail && (
                                <span className="w-1 h-1 rounded-full bg-emerald-500/70" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* ── GRID ─────────────────────────────────────────────────── */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                </div>
            ) : (
                <div className="flex-1 overflow-auto relative">
                    <div className="flex" style={{ height: `${TOTAL_SLOTS * SLOT_PX}px`, minHeight: '600px' }}>

                        {/* Time column */}
                        <div className="w-14 shrink-0 relative">
                            {HOURS.map(h => (
                                <div key={h} style={{ top: `${(h - START_HOUR) * HOUR_PX}px` }}
                                    className="absolute left-0 right-0 flex items-start justify-end pr-3 pt-1">
                                    <span className="text-[10px] text-gray-600 font-medium tabular-nums">{h}:00</span>
                                </div>
                            ))}
                        </div>

                        {/* Day columns */}
                        {displayDays.map((day, di) => {
                            const { avWindows, bookedBlocks, blockedBlocks } = getDayData(day)
                            const isToday = isSameDay(day, today)

                            return (
                                <div key={di}
                                    className={`flex-1 relative border-l border-border/40 cursor-crosshair ${isToday ? 'bg-brand-red/[0.02]' : ''}`}
                                    onClick={e => handleGridClick(e, day)}>

                                    {/* Hour lines */}
                                    {HOURS.map(h => (
                                        <div key={h} style={{ top: `${(h - START_HOUR) * HOUR_PX}px` }}
                                            className="absolute left-0 right-0 border-t border-border/30 pointer-events-none" />
                                    ))}
                                    {/* Half-hour lines */}
                                    {HOURS.map(h => (
                                        <div key={`h${h}`} style={{ top: `${(h - START_HOUR) * HOUR_PX + HOUR_PX / 2}px` }}
                                            className="absolute left-0 right-0 border-t border-border/15 pointer-events-none" />
                                    ))}

                                    {/* Availability windows (green background band) */}
                                    {avWindows.map((w, wi) => {
                                        const top = minToY(Math.max(w.start, START_HOUR * 60))
                                        const bot = minToY(Math.min(w.end,   END_HOUR   * 60))
                                        return (
                                            <div key={wi}
                                                className="absolute left-0 right-0 bg-emerald-500/[0.07] border-l-2 border-emerald-500/40 pointer-events-none"
                                                style={{ top: `${top}px`, height: `${bot - top}px` }}
                                            />
                                        )
                                    })}

                                    {/* Blocked slots (amber striped overlay) */}
                                    {blockedBlocks.map(b => {
                                        const top = minToY(b.startMin)
                                        const h   = durationToH(b.endMin - b.startMin)
                                        return (
                                            <div key={b.id}
                                                className="absolute left-1 right-1 rounded-md overflow-hidden pointer-events-none z-10"
                                                style={{ top: `${top}px`, height: `${Math.max(h, 20)}px` }}>
                                                {/* Stripe pattern */}
                                                <div className="absolute inset-0 bg-amber-500/20 border border-amber-500/40"
                                                    style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(245,158,11,0.12) 4px, rgba(245,158,11,0.12) 8px)' }}
                                                />
                                                <div className="relative flex items-center px-2 h-full gap-1">
                                                    <Ban className="w-3 h-3 text-amber-400/70 shrink-0" />
                                                    {h >= 24 && <span className="text-[10px] text-amber-300/70 font-semibold truncate">Bloqueado</span>}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* Booked appointments */}
                                    {bookedBlocks.map(b => {
                                        const top = minToY(b.startMin)
                                        const h   = durationToH(b.durationMin)
                                        return (
                                            <div key={b.id}
                                                className="absolute left-1 right-1 rounded-md bg-rose-500/20 border border-rose-500/40 overflow-hidden z-20 pointer-events-none"
                                                style={{ top: `${top}px`, height: `${Math.max(h, 22)}px` }}>
                                                <div className="px-2 py-1 flex items-start gap-1.5 h-full">
                                                    {b.avatar
                                                        ? <img src={b.avatar} className="w-4 h-4 rounded-full object-cover shrink-0 mt-0.5" alt="" />
                                                        : <div className="w-4 h-4 rounded-full bg-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                                            <span className="text-[8px] text-rose-300 font-bold">{b.clientName[0]}</span>
                                                          </div>
                                                    }
                                                    <div className="min-w-0">
                                                        {h >= 22 && <p className="text-[10px] text-rose-200 font-semibold leading-tight truncate">{b.clientName.split(' ')[0]}</p>}
                                                        {h >= 36 && <p className="text-[9px] text-rose-300/60 truncate">{b.service}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* Current time line */}
                                    {isToday && (() => {
                                        const now = new Date()
                                        const min = now.getHours() * 60 + now.getMinutes()
                                        if (min < START_HOUR * 60 || min > END_HOUR * 60) return null
                                        return (
                                            <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                                                style={{ top: `${minToY(min)}px` }}>
                                                <span className="w-2 h-2 rounded-full bg-brand-red ml-0 shrink-0" />
                                                <div className="flex-1 h-px bg-brand-red/70" />
                                            </div>
                                        )
                                    })()}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── ACTION PANEL ─────────────────────────────────────────── */}
            {panel && (
                <>
                    {/* Backdrop (mobile) */}
                    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setPanel(null)} />

                    {/* Panel */}
                    <div className="fixed z-50 bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-72 bg-zinc-900 border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl p-5 animate-fade-in">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                    {panel.day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                                </p>
                                <p className="text-white font-bold text-lg leading-tight">
                                    {minToT(panel.startMin)} – {minToT(panel.endMin)}
                                </p>
                            </div>
                            <button onClick={() => setPanel(null)}
                                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {panel.type === 'free' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                    Hora disponible para reservas
                                </div>
                                <button onClick={doBlock} disabled={processing}
                                    className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 font-semibold text-sm hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    Bloquear este intervalo
                                </button>
                            </div>
                        )}

                        {panel.type === 'blocked' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-amber-400">
                                    <Ban className="w-4 h-4" />
                                    Bloqueado manualmente
                                </div>
                                <button onClick={doUnblock} disabled={processing}
                                    className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-semibold text-sm hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                                    Hacer disponible
                                </button>
                            </div>
                        )}

                        {panel.type === 'booked' && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    {panel.avatar
                                        ? <img src={panel.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                        : <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300 font-bold text-sm">
                                            {(panel.clientName || '?')[0]}
                                          </div>
                                    }
                                    <div>
                                        <p className="text-white font-semibold text-sm">{panel.clientName}</p>
                                        <p className="text-gray-500 text-xs">{panel.service}</p>
                                    </div>
                                </div>
                                <Link href={`/dashboard/bookings/${panel.bookingId}`}
                                    className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-brand-red text-white font-semibold text-sm hover:bg-red-600 transition-colors">
                                    <MessageSquare className="w-4 h-4" /> Abrir chat
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
