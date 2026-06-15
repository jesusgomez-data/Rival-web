'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createServiceBooking } from '@/app/dashboard/gyms/professional-service-actions'
import { SERVICE_MODALITIES } from '@/lib/professional-types'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Loader2, AlertCircle, Lock, Euro } from 'lucide-react'
import Link from 'next/link'

// ── helpers ──────────────────────────────────────────────────────────────
const SLOT_MIN = 60

function jsToSpanishDow(d: number) { return d === 0 ? 6 : d - 1 }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function tToMin(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }
function minToT(m: number) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function dateAtTime(d: Date, t: string) {
    const [h, m] = t.split(':').map(Number); const r = new Date(d); r.setHours(h, m, 0, 0); return r.toISOString()
}

interface Service { id: string; name: string; price: number; duration_minutes: number; modalities: string[]; description?: string }
interface AvailRow { day_of_week: number; start_time: string; end_time: string }
interface Props { professionalId: string; services: Service[]; availability: AvailRow[]; currentUser: any; defaultServiceId?: string }

type SlotStatus = 'available' | 'unavailable' | 'past'

export default function PublicBookingCalendar({ professionalId, services, availability, currentUser, defaultServiceId }: Props) {
    const supabase  = createClient()
    const today     = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

    // Show 2 weeks starting today
    const [weekOffset, setWeekOffset] = useState(0)
    const days = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => addDays(today, weekOffset * 7 + i)),
    [today, weekOffset])

    const [selectedDay, setSelectedDay]     = useState<Date>(today)
    const [existingBookings, setBookings]   = useState<any[]>([])
    const [blockedSlots,     setBlocked]    = useState<any[]>([])
    const [loadingSlots,     setLoadingSlots] = useState(false)

    // Booking form
    const [selectedSlot,    setSelectedSlot]    = useState<string | null>(null)
    const [selectedService, setSelectedService] = useState<Service | null>(
        defaultServiceId
            ? (services.find(s => s.id === defaultServiceId) ?? null)
            : services.length === 1 ? services[0] : null
    )
    const [modality,        setModality]        = useState(services[0]?.modalities?.[0] ?? 'presential')
    const [notes,           setNotes]           = useState('')
    const [address,         setAddress]         = useState('')
    const [submitting,      setSubmitting]      = useState(false)
    const [success,         setSuccess]         = useState(false)
    const [error,           setError]           = useState<string | null>(null)

    useEffect(() => {
        loadDayData(selectedDay)
        setSelectedSlot(null); setSuccess(false); setError(null)
    }, [selectedDay])

    useEffect(() => {
        if (selectedService) {
            setModality(selectedService.modalities?.[0] ?? 'presential')
        }
    }, [selectedService])

    async function loadDayData(day: Date) {
        setLoadingSlots(true)
        const s = new Date(day); s.setHours(0,0,0,0)
        const e = new Date(day); e.setHours(23,59,59,999)
        const [bk, bl] = await Promise.all([
            supabase.from('service_bookings').select('scheduled_at, duration_minutes')
                .eq('professional_id', professionalId).not('status', 'in', '(rejected,cancelled)')
                .gte('scheduled_at', s.toISOString()).lte('scheduled_at', e.toISOString()),
            supabase.from('professional_blocked_slots').select('*')
                .eq('organization_id', professionalId).eq('date', toDateStr(day)),
        ])
        setBookings(bk.data ?? [])
        setBlocked(bl.data ?? [])
        setLoadingSlots(false)
    }

    // Compute slots for selected day
    const slots = useMemo(() => {
        const dow = jsToSpanishDow(selectedDay.getDay())
        const windows = availability.filter(a => a.day_of_week === dow)
        if (!windows.length) return []

        const minDur = selectedService
            ? selectedService.duration_minutes
            : services.length > 0 ? Math.max(SLOT_MIN, Math.min(...services.map(s => s.duration_minutes))) : 60

        const result: { time: string; status: SlotStatus }[] = []

        for (const w of windows) {
            let cur = tToMin(w.start_time)
            const wEnd = tToMin(w.end_time)

            while (cur + minDur <= wEnd) {
                const t  = minToT(cur)
                const sd = new Date(selectedDay); sd.setHours(Math.floor(cur/60), cur%60, 0, 0)

                const isPast     = sd.getTime() < Date.now()
                const isBlocked  = blockedSlots.some(b => cur >= tToMin(b.start_time) && cur < tToMin(b.end_time))
                const isBooked   = existingBookings.some(b => {
                    const bs = new Date(b.scheduled_at).getTime()
                    const be = bs + (b.duration_minutes || 60) * 60000
                    const ss = sd.getTime(); const se = ss + minDur * 60000
                    return ss < be && se > bs
                })

                result.push({ time: t, status: isPast || isBlocked || isBooked ? 'unavailable' : 'available' })
                cur += minDur
            }
        }
        return result
    }, [selectedDay, existingBookings, blockedSlots, availability, selectedService, services])

    const availableCount = slots.filter(s => s.status === 'available').length
    const hasAvailability = availability.length > 0

    async function handleBook() {
        if (!currentUser || !selectedSlot || !selectedService) return
        setSubmitting(true); setError(null)
        const res = await createServiceBooking({
            professionalId,
            serviceId: selectedService.id,
            modality,
            scheduledAt: dateAtTime(selectedDay, selectedSlot),
            address: modality !== 'online' ? address || undefined : undefined,
            notes: notes || undefined,
        })
        if (res.error) setError(res.error)
        else { setSuccess(true); setSelectedSlot(null); loadDayData(selectedDay) }
        setSubmitting(false)
    }

    if (!hasAvailability) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <Clock className="w-8 h-8 text-gray-700" />
            </div>
            <p className="text-white font-semibold">Sin horario publicado</p>
            <p className="text-gray-500 text-sm">Este profesional aún no ha configurado su disponibilidad.</p>
        </div>
    )

    return (
        <div className="space-y-0">

            {/* ── SERVICE SELECTOR (if multiple) ─────────────────────── */}
            {services.length > 1 && (
                <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-3">Selecciona el servicio</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {services.map(s => (
                            <button key={s.id} onClick={() => setSelectedService(s)}
                                className={`text-left p-4 rounded-2xl border transition-all
                                    ${selectedService?.id === s.id
                                        ? 'bg-white/8 border-white/20 ring-1 ring-white/20'
                                        : 'bg-white/3 border-white/8 hover:border-white/15'}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className={`font-semibold text-sm ${selectedService?.id === s.id ? 'text-white' : 'text-gray-200'}`}>{s.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{s.duration_minutes} min</p>
                                    </div>
                                    <span className="font-bold text-emerald-400 text-sm shrink-0">€{Number(s.price).toFixed(0)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MAIN LAYOUT ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

                {/* ── LEFT: DATE PICKER ─────────────────────────────── */}
                <div className="space-y-4">
                    {/* Week nav */}
                    <div className="flex items-center justify-between">
                        <button onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}
                            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-30">
                            <ChevronLeft className="w-4 h-4 text-gray-400" />
                        </button>
                        <span className="text-sm font-semibold text-gray-300 capitalize">
                            {days[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setWeekOffset(w => Math.min(3, w + 1))} disabled={weekOffset === 3}
                            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center hover:bg-white/5 transition-colors disabled:opacity-30">
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {['L','M','X','J','V','S','D'].map(d => (
                            <div key={d} className="text-center text-[10px] font-semibold text-gray-600 py-1">{d}</div>
                        ))}
                        {days.map((day, i) => {
                            const isToday    = isSameDay(day, today)
                            const isSelected = isSameDay(day, selectedDay)
                            const dow        = jsToSpanishDow(day.getDay())
                            const hasSlots   = availability.some(a => a.day_of_week === dow)
                            const isPast     = day < today

                            return (
                                <button key={i} disabled={!hasSlots || isPast}
                                    onClick={() => setSelectedDay(day)}
                                    className={`aspect-square rounded-xl text-sm font-semibold transition-all flex flex-col items-center justify-center gap-0.5
                                        ${isSelected
                                            ? 'bg-brand-red text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                                            : isToday
                                                ? 'border border-brand-red/40 text-brand-red hover:bg-brand-red/10'
                                                : hasSlots && !isPast
                                                    ? 'text-white hover:bg-white/8'
                                                    : 'text-gray-700 cursor-not-allowed'}`}>
                                    <span>{day.getDate()}</span>
                                    {hasSlots && !isPast && !isSelected && (
                                        <span className={`w-1 h-1 rounded-full ${isToday ? 'bg-brand-red/60' : 'bg-white/30'}`} />
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Selected service summary (visible on desktop) */}
                    {selectedService && (
                        <div className="hidden lg:block p-4 rounded-2xl bg-white/3 border border-white/8 space-y-3">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Servicio seleccionado</p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white font-semibold text-sm">{selectedService.name}</p>
                                    <p className="text-gray-500 text-xs">{selectedService.duration_minutes} min</p>
                                </div>
                                <span className="text-emerald-400 font-bold">€{Number(selectedService.price).toFixed(0)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: TIMES + BOOKING ────────────────────────── */}
                <div className="space-y-4">
                    {/* Day title */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-bold text-base capitalize">
                                {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            {!loadingSlots && (
                                <p className={`text-xs font-medium mt-0.5 ${availableCount > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                                    {availableCount > 0 ? `${availableCount} horario${availableCount !== 1 ? 's' : ''} disponible${availableCount !== 1 ? 's' : ''}` : 'Sin disponibilidad'}
                                </p>
                            )}
                        </div>
                    </div>

                    {loadingSlots ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-5 h-5 text-brand-red animate-spin" />
                        </div>
                    ) : slots.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center border border-dashed border-white/8 rounded-2xl">
                            <Clock className="w-8 h-8 text-gray-700" />
                            <p className="text-gray-500 text-sm">Sin horario disponible este día</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {slots.map(({ time, status }) => {
                                const isSelected  = selectedSlot === time
                                const isAvailable = status === 'available'
                                const [h, m] = time.split(':')
                                const endMin  = parseInt(h) * 60 + parseInt(m) + SLOT_MIN
                                const endTime = minToT(endMin)
                                return (
                                    <button key={time}
                                        disabled={!isAvailable || !currentUser}
                                        onClick={() => { setSelectedSlot(isSelected ? null : time); setSuccess(false); setError(null) }}
                                        className={`group flex flex-col items-center justify-center gap-1 aspect-square rounded-2xl border transition-all
                                            ${isSelected
                                                ? 'bg-brand-red border-brand-red shadow-[0_0_20px_rgba(220,38,38,0.3)] scale-[1.04]'
                                                : isAvailable
                                                    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] cursor-pointer'
                                                    : 'bg-transparent border-white/5 cursor-not-allowed opacity-40'}`}>
                                        {isAvailable || isSelected ? (
                                            <>
                                                <span className={`text-xl font-bold tabular-nums leading-none ${isSelected ? 'text-white' : 'text-white'}`}>
                                                    {time}
                                                </span>
                                                <span className={`text-[10px] font-medium leading-none ${isSelected ? 'text-white/70' : 'text-gray-600'}`}>
                                                    hasta {endTime}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-4 h-4 text-gray-700" />
                                                <span className="text-[11px] font-medium text-gray-700 tabular-nums">{time}</span>
                                            </>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Not logged in hint */}
                    {!currentUser && availableCount > 0 && (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/3 border border-white/8">
                            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                            <p className="text-sm text-gray-400">Inicia sesión para reservar</p>
                            <Link href="/login" className="ml-auto text-xs font-semibold text-brand-red hover:underline shrink-0">Entrar</Link>
                        </div>
                    )}

                    {/* ── BOOKING FORM ────────────────────────────────── */}
                    {selectedSlot && currentUser && !success && (
                        <div className="border border-white/10 rounded-2xl overflow-hidden animate-fade-in">
                            {/* Header */}
                            <div className="px-5 py-4 bg-white/3 border-b border-white/8 flex items-center justify-between">
                                <div>
                                    <p className="text-white font-semibold">Confirmar reserva</p>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        {selectedDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {selectedSlot}h
                                        {selectedService && ` · ${selectedService.duration_minutes} min`}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedSlot(null)} className="text-gray-600 hover:text-white text-xl leading-none">×</button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Service (if only one, just show it) */}
                                {services.length === 1 && selectedService && (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/8">
                                        <div>
                                            <p className="text-white text-sm font-semibold">{selectedService.name}</p>
                                            <p className="text-gray-500 text-xs">{selectedService.duration_minutes} min</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                                            <Euro className="w-3.5 h-3.5" />
                                            {Number(selectedService.price).toFixed(0)}
                                        </div>
                                    </div>
                                )}

                                {/* Modality */}
                                {selectedService && selectedService.modalities.length > 1 && (
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Modalidad</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {selectedService.modalities.map(m => {
                                                const mod = SERVICE_MODALITIES.find((sm: any) => sm.key === m)
                                                return mod ? (
                                                    <button key={m} onClick={() => setModality(m)}
                                                        className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all
                                                            ${modality === m ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/8 text-gray-400 hover:border-white/15'}`}>
                                                        {mod.icon} {mod.label}
                                                    </button>
                                                ) : null
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Address */}
                                {selectedService && modality !== 'online' && (
                                    <input value={address} onChange={e => setAddress(e.target.value)}
                                        placeholder="Dirección (opcional)"
                                        className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/25 transition-colors placeholder:text-gray-600" />
                                )}

                                {/* Notes */}
                                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="¿Algo que el profesional deba saber? (opcional)"
                                    rows={3}
                                    className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-white/25 transition-colors placeholder:text-gray-600 resize-none" />

                                {error && (
                                    <p className="text-rose-400 text-xs font-medium flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                                    </p>
                                )}

                                <button onClick={handleBook} disabled={!selectedService || submitting}
                                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-brand-red text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-40 transition-all shadow-[0_4px_20px_rgba(220,38,38,0.2)]">
                                    {submitting
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                        : 'Solicitar cita'
                                    }
                                </button>

                                <p className="text-center text-[11px] text-gray-600">
                                    El profesional confirmará tu solicitud. El pago se realiza al aceptar.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── SUCCESS ─────────────────────────────────────── */}
                    {success && (
                        <div className="flex flex-col items-center gap-4 py-12 px-6 text-center border border-emerald-500/20 bg-emerald-500/5 rounded-2xl animate-fade-in">
                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                            <div>
                                <p className="text-white font-bold text-base">¡Solicitud enviada!</p>
                                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                                    El profesional revisará tu petición y te notificaremos cuando la confirme.
                                </p>
                            </div>
                            <Link href="/dashboard/my-bookings"
                                className="px-6 py-2.5 rounded-xl bg-white/8 border border-white/12 text-white text-sm font-semibold hover:bg-white/12 transition-colors">
                                Ver mis reservas →
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
