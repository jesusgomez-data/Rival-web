'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Plus, Search, X, Check, Users, ChevronRight, Loader2,
    Mail, Phone, Calendar, Target, Monitor, Users as UsersIcon,
    Smartphone, Dumbbell, Star, MoreHorizontal, Trash2, Edit,
    ArrowLeft, MessageSquare, Activity, Clock
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getCenterMembers, approveTrialRequest, rejectBookingRequest } from '../../member-actions'

const GOALS = [
    { key: 'fat_loss',    label: 'Pérdida de grasa',    icon: '🔥' },
    { key: 'muscle',      label: 'Ganar masa muscular',  icon: '💪' },
    { key: 'strength',    label: 'Aumentar fuerza',      icon: '🏋️' },
    { key: 'endurance',   label: 'Resistencia / Cardio', icon: '🏃' },
    { key: 'flexibility', label: 'Flexibilidad',         icon: '🧘' },
    { key: 'sport_perf',  label: 'Rendimiento deportivo',icon: '🏆' },
    { key: 'rehab',       label: 'Rehabilitación',       icon: '🩺' },
    { key: 'wellness',    label: 'Bienestar general',    icon: '🌿' },
]

const MODALITIES = [
    { key: 'presential', label: 'Presencial', icon: '📍' },
    { key: 'online',     label: 'Online',     icon: '💻' },
    { key: 'mixed',      label: 'Mixto',      icon: '🔄' },
]

interface Props {
    centerId:       string
    initialMembers: any[]
    plans:          any[]
    orgDetails:     any
}

export default function PTMembersManager({ centerId, initialMembers, plans, orgDetails }: Props) {
    const supabase  = createClient()
    const plan      = orgDetails?.plan || 'pt_free'
    const maxStudents = plan === 'pt_free' ? 3 : Infinity

    const [members,       setMembers]       = useState<any[]>(initialMembers)
    const [search,        setSearch]        = useState('')
    const [showModal,     setShowModal]     = useState(false)
    const [viewingMember, setViewingMember] = useState<any>(null)
    const [saving,        setSaving]        = useState(false)
    const [toast,         setToast]         = useState<string | null>(null)
    const [modalError,    setModalError]    = useState<string | null>(null)

    // Booking requests states
    const [activeTab,     setActiveTab]     = useState<'members' | 'requests'>('members')
    const [rejectingRequest, setRejectingRequest] = useState<any | null>(null)
    const [rejectReason,  setRejectReason]  = useState('')
    const [rejecting,     setRejecting]     = useState(false)
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

    // Add form
    const [tab,          setTab]          = useState<'search' | 'manual'>('search')
    const [profileQuery, setProfileQuery] = useState('')
    const [results,      setResults]      = useState<any[]>([])
    const [searching,    setSearching]    = useState(false)
    const [selected,     setSelected]     = useState<any>(null)
    const [form,         setForm]         = useState({
        fullName:  '', email: '', phone: '',
        goalKey:   '',
        modality:  'presential',
        planId:    '',
        notes:     '',
        startDate: new Date().toISOString().split('T')[0],
    })

    const activeCount = members.filter(m => !m.is_request && m.status === 'active').length
    const atLimit     = maxStudents < Infinity && activeCount >= maxStudents

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }
    const setF = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

    // Profile search debounce
    useEffect(() => {
        if (profileQuery.length < 2) { setResults([]); return }
        const t = setTimeout(async () => {
            setSearching(true)
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url, level, xp_points')
                .or(`full_name.ilike.%${profileQuery}%,username.ilike.%${profileQuery}%`)
                .limit(8)
            setResults(data || [])
            setSearching(false)
        }, 350)
        return () => clearTimeout(t)
    }, [profileQuery])

    async function refreshMembers() {
        const data = await getCenterMembers(centerId)
        setMembers(data || [])
    }

    async function handleApproveRequest(req: any) {
        setProcessingRequestId(req.id)
        try {
            const res = await approveTrialRequest(
                centerId,
                req.id,
                req.user_id,
                req.user?.full_name || req.full_name || 'Athlete',
                req.user?.avatar_url || ''
            )
            if (res.error) {
                showToast(`Error: ${res.error}`)
            } else {
                showToast('Reserva aprobada ✓')
                await refreshMembers()
            }
        } catch (e: any) {
            showToast('No se pudo aprobar la reserva.')
        } finally {
            setProcessingRequestId(null)
        }
    }

    async function handleRejectRequestSubmit() {
        if (!rejectReason.trim() || !rejectingRequest) return
        setRejecting(true)
        try {
            const res = await rejectBookingRequest(centerId, rejectingRequest.id, rejectReason.trim())
            if (res.error) {
                showToast(`Error: ${res.error}`)
            } else {
                showToast('Reserva rechazada')
                setRejectingRequest(null)
                setRejectReason('')
                await refreshMembers()
            }
        } catch (e: any) {
            showToast('No se pudo rechazar la reserva.')
        } finally {
            setRejecting(false)
        }
    }

    async function handleAdd() {
        setModalError(null)

        if (tab === 'search' && !selected) {
            setModalError('Selecciona un alumno de los resultados antes de continuar.')
            return
        }
        if (tab === 'manual' && !form.fullName.trim()) {
            setModalError('El nombre completo es obligatorio.')
            return
        }
        if (tab === 'manual' && !form.email.trim()) {
            setModalError('El email es obligatorio para el alta manual.')
            return
        }

        setSaving(true)
        try {
            // Get plan name from plans list
            const planName = plans.find((p: any) => p.id === form.planId)?.name || form.planId || 'basic'

            // Extra info stored in notes if goal/modality columns not yet migrated
            const notesText = [
                form.notes,
                form.goalKey  ? `Objetivo: ${form.goalKey}`   : '',
                form.modality ? `Modalidad: ${form.modality}` : '',
            ].filter(Boolean).join(' | ') || null

            const payload: any = {
                center_id:              centerId,
                status:                 'active',
                membership_start_date:  form.startDate,
                plan:                   planName,
                notes:                  notesText,
            }

            if (tab === 'search' && selected) {
                payload.user_id   = selected.id
                payload.full_name = selected.full_name || selected.username || 'Alumno'
                payload.email     = selected.email || `user_${selected.id.substring(0, 8)}@rival.app`
                payload.phone     = form.phone.trim() || null
            } else {
                payload.full_name = form.fullName.trim()
                payload.email     = form.email.trim()
                payload.phone     = form.phone.trim() || null
            }

            // Try with goal/modality columns (need migration add_members_pt_columns.sql)
            let { error } = await supabase.from('members').insert({ ...payload, goal: form.goalKey || null, modality: form.modality || null })

            // Fallback: retry without extra columns if migration not run yet
            if (error && error.message?.includes('column')) {
                const retry = await supabase.from('members').insert(payload)
                error = retry.error
            }

            if (error) throw error

            await refreshMembers()
            setShowModal(false)
            resetForm()
            showToast('Alumno añadido ✓')
        } catch (e: any) {
            setModalError(e.message || 'No se pudo añadir el alumno.')
        }
        setSaving(false)
    }

    async function handleRemove(memberId: string) {
        if (!confirm('¿Dar de baja a este alumno?')) return
        await supabase.from('members').update({ status: 'inactive' }).eq('id', memberId).eq('center_id', centerId)
        await refreshMembers()
        setViewingMember(null)
        showToast('Alumno dado de baja')
    }

    function resetForm() {
        setTab('search'); setProfileQuery(''); setResults([]); setSelected(null); setModalError(null)
        setForm({ fullName: '', email: '', phone: '', goalKey: '', modality: 'presential', planId: '', notes: '', startDate: new Date().toISOString().split('T')[0] })
    }

    // Split into normal members and requests
    const activeMembers = members.filter(m => !m.is_request)
    const pendingRequests = members.filter(m => m.is_request)

    const filtered = activeMembers.filter(m => {
        const p = m.user || m.profiles
        const name = p?.full_name || p?.username || m.full_name || ''
        return name.toLowerCase().includes(search.toLowerCase())
    })

    const filteredRequests = pendingRequests.filter(req => {
        const p = req.user || req.profiles
        const name = p?.full_name || p?.username || req.full_name || ''
        return name.toLowerCase().includes(search.toLowerCase())
    })

    // ── DETAIL VIEW ─────────────────────────────────────────────────────────
    if (viewingMember) return (
        <DetailView
            member={viewingMember}
            centerId={centerId}
            plans={plans}
            supabase={supabase}
            onBack={() => setViewingMember(null)}
            onUpdated={async () => { await refreshMembers(); const updated = members.find(m => m.id === viewingMember.id); if (updated) setViewingMember(updated) }}
            onRemoved={async () => { await refreshMembers(); setViewingMember(null); showToast('Alumno dado de baja') }}
        />
    )

    // ── LIST VIEW ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl animate-fade-in">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar alumno…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50 transition-all placeholder:text-gray-600"
                    />
                </div>
                <button
                    onClick={() => { if (atLimit) { showToast(`Límite de ${maxStudents} alumnos alcanzado. Actualiza tu plan.`); return } setShowModal(true) }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${atLimit ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-brand-red text-white hover:bg-red-600'}`}
                >
                    <Plus className="w-4 h-4" /> Nuevo Alumno
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-px">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 px-2 -mb-px ${
                        activeTab === 'members'
                            ? 'text-white border-brand-red'
                            : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                >
                    Mis Alumnos ({activeMembers.length})
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 px-2 -mb-px flex items-center gap-2 ${
                        activeTab === 'requests'
                            ? 'text-white border-brand-red'
                            : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                >
                    Solicitudes de Reserva
                    {pendingRequests.length > 0 && (
                        <span className="bg-brand-red text-white text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                            {pendingRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'members' ? (
                <>
                    {/* Plan limit bar (free) */}
                    {maxStudents < Infinity && (
                        <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-gray-400 font-bold">{activeCount} de {maxStudents} alumnos activos</span>
                                {atLimit && <span className="text-yellow-400 font-bold">Límite alcanzado · Actualiza a Pro</span>}
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${atLimit ? 'bg-yellow-500' : 'bg-brand-red'}`}
                                    style={{ width: `${Math.min(100, (activeCount / maxStudents) * 100)}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Members list */}
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Users className="w-12 h-12 text-gray-700" />
                            <p className="text-gray-500 font-bold">Sin alumnos{search ? ' que coincidan' : ' registrados'}</p>
                            {!search && (
                                <button onClick={() => setShowModal(true)} className="text-brand-red text-sm font-bold hover:underline flex items-center gap-1">
                                    <Plus className="w-3.5 h-3.5" /> Añadir primer alumno
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(m => {
                                const p      = m.user || m.profiles
                                const name   = p?.full_name || p?.username || m.full_name || 'Alumno'
                                const goal   = GOALS.find(g => g.key === m.goal)
                                const modal  = MODALITIES.find(md => md.key === m.modality)
                                return (
                                    <button key={m.id} onClick={() => setViewingMember(m)}
                                        className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-brand-red/30 transition-all group text-left">
                                        {p?.avatar_url
                                            ? <img src={p.avatar_url} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt={name} />
                                            : <div className="w-11 h-11 rounded-xl bg-brand-red/20 flex items-center justify-center text-brand-red font-black flex-shrink-0">
                                                {name[0].toUpperCase()}
                                              </div>
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold truncate">{name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {goal && <span className="text-gray-500 text-xs">{goal.icon} {goal.label}</span>}
                                                {modal && <span className="text-gray-600 text-xs">{modal.icon} {modal.label}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${m.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                                {m.status === 'active' ? 'Activo' : 'Baja'}
                                            </span>
                                            {p && <span className="text-gray-600 text-xs font-bold">Nv.{p.level ?? 1}</span>}
                                            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-white transition-colors" />
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* Requests list */
                filteredRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Calendar className="w-12 h-12 text-gray-700" />
                        <p className="text-gray-500 font-bold">Sin solicitudes de reserva{search ? ' que coincidan' : ' pendientes'}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredRequests.map(req => {
                            const p = req.user || req.profiles
                            const name = p?.full_name || p?.username || req.full_name || 'Atleta'
                            const classObj = req.classes as any
                            const className = classObj?.name || 'Sesión de Entrenamiento'
                            const classTime = classObj?.scheduled_time
                                ? new Date(classObj.scheduled_time).toLocaleString('es-ES', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                  })
                                : ''
                            const formattedTime = classTime ? classTime.charAt(0).toUpperCase() + classTime.slice(1) : ''

                            return (
                                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card border border-border rounded-2xl hover:border-brand-red/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        {p?.avatar_url ? (
                                            <img src={p.avatar_url} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt={name} />
                                        ) : (
                                            <div className="w-11 h-11 rounded-xl bg-brand-red/20 flex items-center justify-center text-brand-red font-black flex-shrink-0">
                                                {name[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-white font-bold truncate">{name}</p>
                                            <p className="text-gray-400 text-xs mt-0.5 font-medium flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-brand-red" />
                                                <span>{className} · <span className="text-white/80">{formattedTime}</span></span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => handleApproveRequest(req)}
                                            disabled={processingRequestId !== null}
                                            className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            {processingRequestId === req.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Check className="w-3.5 h-3.5" />
                                            )}
                                            Aceptar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setRejectingRequest(req)
                                                setRejectReason('')
                                            }}
                                            disabled={processingRequestId !== null}
                                            className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            Rechazar
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            )}

            {/* ── REJECTION MODAL ────────────────────────────────────────────── */}
            {rejectingRequest && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-white/8 bg-slate-900">
                            <h3 className="text-white font-black uppercase tracking-wider text-sm">Rechazar Reserva</h3>
                            <button onClick={() => setRejectingRequest(null)}
                                className="p-1.5 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Explica al alumno el motivo por el cual no puedes aceptar la reserva. Le llegará una notificación con tu comentario.
                            </p>

                            <div>
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1.5 block">
                                    Motivo del rechazo
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    rows={4}
                                    placeholder="Ej: Tengo un compromiso a esa hora, por favor reserva en otra de mis horas libres..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50 resize-none placeholder:text-gray-600 focus:ring-1 focus:ring-brand-red/30"
                                />
                            </div>

                            <div className="flex gap-2.5 pt-2">
                                <button
                                    onClick={() => setRejectingRequest(null)}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-wider hover:bg-white/5 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRejectRequestSubmit}
                                    disabled={rejecting || !rejectReason.trim()}
                                    className="flex-[2] py-3 rounded-xl bg-brand-red disabled:bg-brand-red/40 text-white text-xs font-black uppercase tracking-wider hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                                >
                                    {rejecting ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Rechazando...
                                        </>
                                    ) : (
                                        'Confirmar Rechazo'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD MODAL ─────────────────────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-white/8 sticky top-0 bg-slate-900 z-10">
                            <h3 className="text-white font-black uppercase tracking-wider text-sm">Nuevo Alumno</h3>
                            <button onClick={() => { setShowModal(false); resetForm() }}
                                className="p-1.5 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Tab selector */}
                            <div className="flex gap-1 bg-black/30 p-1 rounded-xl">
                                {([['search', 'Buscar en Rival'], ['manual', 'Entrada manual']] as const).map(([k, l]) => (
                                    <button key={k} onClick={() => { setTab(k); setModalError(null) }}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === k ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>

                            {tab === 'search' ? (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-red animate-spin" />}
                                        <input value={profileQuery} onChange={e => { setProfileQuery(e.target.value); setSelected(null) }}
                                            placeholder="Nombre o @usuario de Rival…"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:outline-none focus:border-brand-red/50 placeholder:text-gray-600" />
                                    </div>
                                    {selected ? (
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-red/10 border border-brand-red/30">
                                            {selected.avatar_url
                                                ? <img src={selected.avatar_url} className="w-9 h-9 rounded-full object-cover" alt={selected.full_name} />
                                                : <div className="w-9 h-9 rounded-full bg-brand-red/30 flex items-center justify-center text-brand-red font-black text-sm">{selected.full_name?.[0]}</div>
                                            }
                                            <div className="flex-1">
                                                <p className="text-white font-bold text-sm">{selected.full_name}</p>
                                                <p className="text-gray-400 text-xs">@{selected.username}</p>
                                            </div>
                                            <button onClick={() => { setSelected(null); setProfileQuery('') }} className="text-gray-500 hover:text-white">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : results.length > 0 && (
                                        <div className="bg-black/60 border border-white/10 rounded-xl overflow-hidden">
                                            {results.map(r => (
                                                <button key={r.id} onClick={() => { setSelected(r); setProfileQuery(r.full_name || r.username) }}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left">
                                                    {r.avatar_url
                                                        ? <img src={r.avatar_url} className="w-8 h-8 rounded-full object-cover" alt={r.full_name} />
                                                        : <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red font-black text-xs">{r.full_name?.[0]}</div>
                                                    }
                                                    <div>
                                                        <p className="text-white font-bold text-sm">{r.full_name}</p>
                                                        <p className="text-gray-500 text-xs">@{r.username} · Nv.{r.level ?? 1}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <FormInput label="Nombre completo" value={form.fullName} onChange={v => setF('fullName', v)} placeholder="Juan García" required />
                                    <FormInput label="Email" type="email" value={form.email} onChange={v => setF('email', v)} placeholder="juan@email.com" />
                                    <FormInput label="Teléfono" value={form.phone} onChange={v => setF('phone', v)} placeholder="+34 600 000 000" />
                                </div>
                            )}

                            {/* Objective */}
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Objetivo principal</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {GOALS.map(g => (
                                        <button key={g.key} onClick={() => setF('goalKey', form.goalKey === g.key ? '' : g.key)}
                                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                                                form.goalKey === g.key
                                                    ? 'border-brand-red bg-brand-red/10 text-white'
                                                    : 'border-white/8 text-gray-500 hover:border-white/20 hover:text-white'
                                            }`}>
                                            <span>{g.icon}</span>{g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Modality */}
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Modalidad</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {MODALITIES.map(m => (
                                        <button key={m.key} onClick={() => setF('modality', m.key)}
                                            className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                                                form.modality === m.key
                                                    ? 'border-brand-red bg-brand-red/10 text-white'
                                                    : 'border-white/8 text-gray-500 hover:border-white/20 hover:text-white'
                                            }`}>
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Plan + Start date */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Plan asignado</p>
                                    <select value={form.planId} onChange={e => setF('planId', e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50">
                                        <option value="">Sin plan</option>
                                        {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Fecha inicio</p>
                                    <input type="date" value={form.startDate} onChange={e => setF('startDate', e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50" />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Notas internas</p>
                                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
                                    placeholder="Lesiones previas, disponibilidad, preferencias…"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50 resize-none placeholder:text-gray-600" />
                            </div>

                            {modalError && (
                                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                                    <span className="flex-shrink-0 mt-0.5">⚠️</span>
                                    <span>{modalError}</span>
                                </div>
                            )}

                            <button onClick={handleAdd} disabled={saving}
                                className="w-full bg-brand-red text-white py-3.5 rounded-xl font-black uppercase tracking-wider text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Añadiendo…</> : <><Plus className="w-4 h-4" />Añadir Alumno</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── DetailView component ────────────────────────────────────────────────────
function DetailView({ member, centerId, plans, supabase, onBack, onUpdated, onRemoved }: {
    member: any; centerId: string; plans: any[]; supabase: any
    onBack: () => void; onUpdated: () => void; onRemoved: () => void
}) {
    const p              = member.user || member.profiles
    const displayName    = p?.full_name || member.full_name || 'Alumno'
    const initial        = displayName[0]?.toUpperCase() ?? '?'
    const fakeEmail      = member.email?.includes('@rival.app')
    const goalLabel      = GOALS.find(g => g.key === member.goal)
    const modalityLabel  = MODALITIES.find(m => m.key === member.modality)

    // Strip auto-generated notes content that's already shown in fields
    const cleanNotes = member.notes
        ?.split('|').map((s: string) => s.trim())
        .filter((s: string) => !s.startsWith('Objetivo:') && !s.startsWith('Modalidad:') && s.length > 0)
        .join(' | ') || null

    const [panel,         setPanel]         = useState<'none' | 'sessions' | 'edit'>('none')
    const [sessions,      setSessions]      = useState<any[]>([])
    const [loadingSess,   setLoadingSess]   = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)
    const [savingEdit,    setSavingEdit]    = useState(false)
    const [editForm,      setEditForm]      = useState({
        goal:     member.goal     || '',
        modality: member.modality || 'presential',
        plan:     member.plan     || '',
        phone:    member.phone    || '',
        notes:    cleanNotes      || '',
    })

    async function loadSessions() {
        setLoadingSess(true)
        const { data } = await supabase
            .from('class_enrollments')
            .select('id, enrollment_date, attended, classes:class_id(id, title, start_time, end_time, class_type)')
            .eq('member_id', member.id)
            .order('enrollment_date', { ascending: false })
            .limit(20)
        setSessions(data || [])
        setLoadingSess(false)
    }

    async function handleSaveEdit() {
        setSavingEdit(true)
        const update: any = {
            phone:    editForm.phone    || null,
            notes:    editForm.notes    || null,
            plan:     editForm.plan     || member.plan,
            updated_at: new Date().toISOString(),
        }
        // Try with goal/modality columns (need migration)
        const { error } = await supabase.from('members').update({ ...update, goal: editForm.goal || null, modality: editForm.modality || null }).eq('id', member.id)
        if (error && error.message?.includes('column')) {
            await supabase.from('members').update(update).eq('id', member.id)
        }
        setSavingEdit(false)
        setPanel('none')
        onUpdated()
    }

    async function handleRemove() {
        await supabase.from('members').update({ status: 'inactive', updated_at: new Date().toISOString() }).eq('id', member.id).eq('center_id', centerId)
        onRemoved()
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-white/8 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-white font-black text-sm uppercase tracking-wider">Ficha del Alumno</h3>
                </div>
                <button onClick={() => setPanel(panel === 'edit' ? 'none' : 'edit')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${panel === 'edit' ? 'bg-brand-red text-white' : 'bg-white/8 text-gray-300 hover:bg-white/15'}`}>
                    <Edit className="w-3.5 h-3.5" /> Editar
                </button>
            </div>

            {/* Profile card */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-4 mb-5">
                    {p?.avatar_url
                        ? <img src={p.avatar_url} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" alt={displayName} />
                        : <div className="w-16 h-16 rounded-2xl bg-brand-red/20 flex items-center justify-center text-brand-red text-2xl font-black flex-shrink-0">{initial}</div>
                    }
                    <div>
                        <h2 className="text-white font-black text-xl leading-tight">{displayName}</h2>
                        {p?.username && <p className="text-gray-400 text-sm">@{p.username}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${member.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                {member.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                            {p && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold">Nv. {p.level ?? 1}</span>}
                            {member.plan && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-gray-400 font-bold">{member.plan}</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                    <InfoRow label="Alta" value={new Date(member.membership_start_date || member.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} />
                    {goalLabel && <InfoRow label="Objetivo" value={`${goalLabel.icon} ${goalLabel.label}`} />}
                    {modalityLabel && <InfoRow label="Modalidad" value={`${modalityLabel.icon} ${modalityLabel.label}`} />}
                    {!fakeEmail && member.email && <InfoRow label="Email" value={member.email} />}
                    {member.phone && <InfoRow label="Teléfono" value={member.phone} />}
                    {p && <InfoRow label="XP Total" value={`${(p.xp_points || 0).toLocaleString()} puntos`} />}
                </div>

                {cleanNotes && (
                    <div className="mt-4 p-3 rounded-xl bg-white/4 border border-white/8">
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Notas</p>
                        <p className="text-gray-300 text-sm whitespace-pre-line">{cleanNotes}</p>
                    </div>
                )}
            </div>

            {/* ── EDIT PANEL ─────────────────────────────────────────────── */}
            {panel === 'edit' && (
                <div className="bg-card border border-brand-red/20 rounded-2xl p-5 space-y-4">
                    <h4 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                        <Edit className="w-4 h-4 text-brand-red" /> Editar datos del alumno
                    </h4>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Objetivo</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {GOALS.map(g => (
                                <button key={g.key} onClick={() => setEditForm(f => ({ ...f, goal: f.goal === g.key ? '' : g.key }))}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${editForm.goal === g.key ? 'border-brand-red bg-brand-red/10 text-white' : 'border-white/8 text-gray-500 hover:border-white/20 hover:text-white'}`}>
                                    <span>{g.icon}</span>{g.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Modalidad</p>
                        <div className="grid grid-cols-3 gap-2">
                            {MODALITIES.map(m => (
                                <button key={m.key} onClick={() => setEditForm(f => ({ ...f, modality: m.key }))}
                                    className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${editForm.modality === m.key ? 'border-brand-red bg-brand-red/10 text-white' : 'border-white/8 text-gray-500 hover:border-white/20 hover:text-white'}`}>
                                    {m.icon} {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Plan</p>
                            <select value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50">
                                {plans.map((pl: any) => <option key={pl.id} value={pl.name}>{pl.name}</option>)}
                                <option value="basic">Basic</option>
                            </select>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Teléfono</p>
                            <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="+34 600 000 000"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50 placeholder:text-gray-600" />
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Notas internas</p>
                        <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                            placeholder="Lesiones, disponibilidad, preferencias…"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50 resize-none placeholder:text-gray-600" />
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setPanel('none')} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-bold hover:bg-white/5 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleSaveEdit} disabled={savingEdit}
                            className="flex-[2] py-2.5 rounded-xl bg-brand-red text-white text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                            {savingEdit ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</> : <><Check className="w-4 h-4" />Guardar cambios</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── ACTION BUTTONS ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => {
                        if (panel === 'sessions') { setPanel('none'); return }
                        setPanel('sessions')
                        if (sessions.length === 0) loadSessions()
                    }}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border font-bold text-sm transition-all ${panel === 'sessions' ? 'border-brand-red bg-brand-red/10 text-white' : 'bg-card border-border hover:border-brand-red/30 text-white'}`}>
                    <Calendar className="w-4 h-4 text-brand-red" /> Ver Sesiones
                </button>
                <Link href={`/dashboard/gyms/${centerId}/programming${member.user_id ? `?highlight=${member.user_id}` : ''}`}
                    className="flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl font-bold text-sm hover:border-brand-red/30 transition-all text-white">
                    <Dumbbell className="w-4 h-4 text-brand-red" /> Ver Programas
                </Link>
            </div>

            {/* ── SESSIONS PANEL ─────────────────────────────────────────── */}
            {panel === 'sessions' && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-red" />
                        <h4 className="text-white font-black text-sm uppercase tracking-wider">Historial de Sesiones</h4>
                    </div>
                    <div className="p-4">
                        {loadingSess ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-brand-red animate-spin" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-8">
                                <Calendar className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Sin sesiones registradas</p>
                                <Link href={`/dashboard/gyms/${centerId}/schedule`} className="text-brand-red text-xs font-bold hover:underline mt-1 inline-block">
                                    Crear primera sesión →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sessions.map((s: any) => {
                                    const cls = s.classes
                                    return (
                                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.attended ? 'bg-green-400' : 'bg-gray-600'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-bold truncate">{cls?.title || 'Sesión'}</p>
                                                <p className="text-gray-500 text-xs">
                                                    {cls?.start_time ? new Date(cls.start_time).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(s.enrollment_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                    {cls?.start_time && ` · ${new Date(cls.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
                                                </p>
                                            </div>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${s.attended ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-500'}`}>
                                                {s.attended ? 'Asistió' : 'Inscrito'}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── REMOVE ─────────────────────────────────────────────────── */}
            {member.status === 'active' && !confirmRemove && (
                <button onClick={() => setConfirmRemove(true)}
                    className="w-full p-3 rounded-xl border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" /> Dar de baja
                </button>
            )}
            {confirmRemove && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
                    <p className="text-red-400 text-sm font-bold text-center">¿Confirmas dar de baja a {displayName}?</p>
                    <p className="text-gray-500 text-xs text-center">El alumno pasará a estado Inactivo. Puedes reactivarlo después.</p>
                    <div className="flex gap-2">
                        <button onClick={() => setConfirmRemove(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-bold hover:bg-white/5 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleRemove} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                            Sí, dar de baja
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function FormInput({ label, value, onChange, placeholder, type = 'text', required }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; type?: string; required?: boolean
}) {
    return (
        <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1.5">{label}{required && <span className="text-brand-red ml-1">*</span>}</p>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50 placeholder:text-gray-600" />
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">{label}</p>
            <p className="text-white text-sm font-medium mt-0.5">{value}</p>
        </div>
    )
}
