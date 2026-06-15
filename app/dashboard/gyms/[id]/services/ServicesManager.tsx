'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Clock, Euro, CheckCircle2, X, Briefcase, CalendarDays, Save, ChevronDown, ChevronUp } from 'lucide-react'
import {
    createProfessionalService, updateProfessionalService,
    deleteProfessionalService, saveProfessionalAvailability,
} from '../../professional-service-actions'
import { SERVICE_MODALITIES, getTypeLabel } from '@/lib/professional-types'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const EMPTY_FORM = {
    name: '', description: '', price: '', duration_minutes: '60', modalities: ['presential'] as string[]
}

interface Props {
    organizationId: string
    initialServices: any[]
    initialAvailability: any[]
    centerType: string
}

export default function ServicesManager({ organizationId, initialServices, initialAvailability, centerType }: Props) {
    const [services, setServices]       = useState(initialServices)
    const [availability, setAvail]      = useState(initialAvailability)
    const [tab, setTab]                 = useState<'services' | 'availability'>('services')
    const [showModal, setShowModal]     = useState(false)
    const [editingId, setEditingId]     = useState<string | null>(null)
    const [form, setForm]               = useState(EMPTY_FORM)
    const [saving, setSaving]           = useState(false)
    const [toast, setToast]             = useState<string | null>(null)
    const [deletingId, setDeletingId]   = useState<string | null>(null)
    const [availSaving, setAvailSaving] = useState(false)

    // Availability local state: day_of_week → { start_time, end_time, enabled }
    const [availSlots, setAvailSlots] = useState<Record<number, { start: string; end: string; enabled: boolean }>>(() => {
        const map: Record<number, { start: string; end: string; enabled: boolean }> = {}
        for (let d = 0; d <= 6; d++) {
            const existing = initialAvailability.find(a => a.day_of_week === d)
            map[d] = existing
                ? { start: existing.start_time.slice(0, 5), end: existing.end_time.slice(0, 5), enabled: true }
                : { start: '09:00', end: '18:00', enabled: false }
        }
        return map
    })

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

    function openCreate() { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true) }
    function openEdit(s: any) {
        setForm({ name: s.name, description: s.description || '', price: String(s.price), duration_minutes: String(s.duration_minutes), modalities: s.modalities || ['presential'] })
        setEditingId(s.id)
        setShowModal(true)
    }

    function toggleModality(key: string) {
        setForm(f => ({
            ...f,
            modalities: f.modalities.includes(key) ? f.modalities.filter(m => m !== key) : [...f.modalities, key]
        }))
    }

    async function handleSaveService() {
        if (!form.name.trim() || !form.price) return
        setSaving(true)
        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            price: parseFloat(form.price),
            duration_minutes: parseInt(form.duration_minutes),
            modalities: form.modalities.length > 0 ? form.modalities : ['presential'],
        }

        if (editingId) {
            const res = await updateProfessionalService(editingId, organizationId, payload)
            if (res.error) { showToast(res.error) } else {
                setServices(svs => svs.map(s => s.id === editingId ? { ...s, ...payload } : s))
                showToast('Servicio actualizado ✓')
            }
        } else {
            const res = await createProfessionalService(organizationId, payload)
            if (res.error) { showToast(res.error) } else {
                setServices(svs => [{ id: Date.now(), ...payload, is_active: true, created_at: new Date().toISOString() }, ...svs])
                showToast('Servicio creado ✓')
            }
        }
        setSaving(false)
        setShowModal(false)
    }

    async function handleDelete(id: string) {
        setDeletingId(id)
        const res = await deleteProfessionalService(id, organizationId)
        if (res.error) showToast(res.error)
        else { setServices(svs => svs.filter(s => s.id !== id)); showToast('Servicio eliminado') }
        setDeletingId(null)
    }

    async function handleSaveAvailability() {
        setAvailSaving(true)
        const slots = Object.entries(availSlots)
            .filter(([, v]) => v.enabled)
            .map(([day, v]) => ({ day_of_week: parseInt(day), start_time: v.start, end_time: v.end }))
        const res = await saveProfessionalAvailability(organizationId, slots)
        if (res.error) showToast(res.error)
        else showToast('Disponibilidad guardada ✓')
        setAvailSaving(false)
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl animate-fade-in">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                        Mis Servicios
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5">{getTypeLabel(centerType)} · {services.length} servicio{services.length !== 1 ? 's' : ''}</p>
                </div>
                {tab === 'services' && (
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-red text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors">
                        <Plus className="w-4 h-4" /> Añadir servicio
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/5 pb-px">
                {(['services', 'availability'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 px-2 -mb-px flex items-center gap-2 ${
                            tab === t ? 'text-white border-brand-red' : 'text-gray-500 border-transparent hover:text-gray-300'
                        }`}>
                        {t === 'services' ? <><Briefcase className="w-3.5 h-3.5" /> Servicios</> : <><CalendarDays className="w-3.5 h-3.5" /> Disponibilidad</>}
                    </button>
                ))}
            </div>

            {/* ── SERVICES TAB ── */}
            {tab === 'services' && (
                <div className="space-y-3">
                    {services.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-white/10 rounded-3xl">
                            <Briefcase className="w-12 h-12 text-gray-700" />
                            <p className="text-gray-500 font-bold">Sin servicios creados todavía</p>
                            <button onClick={openCreate} className="text-brand-red text-sm font-bold hover:underline flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Crear primer servicio
                            </button>
                        </div>
                    ) : services.map(s => (
                        <div key={s.id} className="flex items-start justify-between gap-4 p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-brand-red/20 transition-all">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-white font-bold">{s.name}</h3>
                                    {!s.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 font-bold">Inactivo</span>}
                                </div>
                                {s.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{s.description}</p>}
                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                    <span className="text-brand-red font-black text-lg">€{Number(s.price).toFixed(2)}</span>
                                    <span className="flex items-center gap-1 text-gray-500 text-xs"><Clock className="w-3 h-3" /> {s.duration_minutes} min</span>
                                    <div className="flex gap-1">
                                        {(s.modalities || []).map((m: string) => {
                                            const mod = SERVICE_MODALITIES.find(x => x.key === m)
                                            return <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-bold">{mod?.icon} {mod?.label}</span>
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-white/8 text-gray-500 hover:text-white transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── AVAILABILITY TAB ── */}
            {tab === 'availability' && (
                <div className="space-y-3">
                    <p className="text-gray-500 text-sm">Define tus franjas horarias disponibles cada semana. Los clientes verán este horario al reservar.</p>
                    {DAYS.map((day, i) => {
                        const slot = availSlots[i]
                        return (
                            <div key={i} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl border transition-all ${
                                slot.enabled ? 'bg-brand-red/5 border-brand-red/20' : 'bg-white/2 border-white/5'
                            }`}>
                                <div className="flex items-center gap-3 min-w-[120px]">
                                    <button onClick={() => setAvailSlots(a => ({ ...a, [i]: { ...a[i], enabled: !a[i].enabled } }))}
                                        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${slot.enabled ? 'bg-brand-red' : 'bg-white/10'}`}>
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${slot.enabled ? 'left-5' : 'left-0.5'}`} />
                                    </button>
                                    <span className={`text-sm font-bold ${slot.enabled ? 'text-white' : 'text-gray-600'}`}>{day}</span>
                                </div>
                                {slot.enabled && (
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 text-xs font-bold">De</span>
                                            <input type="time" value={slot.start}
                                                onChange={e => setAvailSlots(a => ({ ...a, [i]: { ...a[i], start: e.target.value } }))}
                                                className="bg-black/40 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-brand-red/50" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 text-xs font-bold">a</span>
                                            <input type="time" value={slot.end}
                                                onChange={e => setAvailSlots(a => ({ ...a, [i]: { ...a[i], end: e.target.value } }))}
                                                className="bg-black/40 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-brand-red/50" />
                                        </div>
                                    </div>
                                )}
                                {!slot.enabled && <span className="text-gray-600 text-xs italic">No disponible</span>}
                            </div>
                        )
                    })}
                    <button onClick={handleSaveAvailability} disabled={availSaving}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-brand-red text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-60">
                        <Save className="w-4 h-4" />
                        {availSaving ? 'Guardando...' : 'Guardar disponibilidad'}
                    </button>
                </div>
            )}

            {/* ── MODAL CREAR / EDITAR ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-black text-lg">{editingId ? 'Editar servicio' : 'Nuevo servicio'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/8 text-gray-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nombre del servicio *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Ej: Sesión de fisioterapia, Consulta nutricional..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/50 placeholder-gray-600" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Descripción</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Describe el servicio, qué incluye, para quién es..."
                                    rows={3}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/50 placeholder-gray-600 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Precio (€) *</label>
                                    <div className="relative">
                                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input type="number" min="0" step="0.01" value={form.price}
                                            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                            placeholder="0.00"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/50" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Duración (min)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input type="number" min="15" step="15" value={form.duration_minutes}
                                            onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/50" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Modalidad</label>
                                <div className="flex gap-2 flex-wrap">
                                    {SERVICE_MODALITIES.map(m => (
                                        <button key={m.key} type="button" onClick={() => toggleModality(m.key)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                form.modalities.includes(m.key)
                                                    ? 'bg-brand-red/10 border-brand-red/40 text-white'
                                                    : 'bg-white/3 border-white/10 text-gray-500 hover:border-white/20'
                                            }`}>
                                            {form.modalities.includes(m.key) && <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />}
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/5 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSaveService} disabled={saving || !form.name.trim() || !form.price}
                                className="flex-1 py-2.5 rounded-xl bg-brand-red text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear servicio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
