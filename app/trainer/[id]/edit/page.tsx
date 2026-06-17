'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
    Save, Loader2, Camera, Check, X, ArrowLeft, MapPin, Phone,
    Globe, Instagram, Mail, Navigation, Star, Award, Clock,
    Smartphone, Monitor, Users, ChevronDown, Smile, Zap
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

const SPECIALTIES = [
    { key: 'strength',     label: 'Fuerza',           icon: '🏋️' },
    { key: 'cardio',       label: 'Cardio / Running',  icon: '🏃' },
    { key: 'hiit',         label: 'HIIT',              icon: '⚡' },
    { key: 'crossfit',     label: 'CrossFit',          icon: '🔥' },
    { key: 'yoga',         label: 'Yoga / Pilates',    icon: '🧘' },
    { key: 'boxing',       label: 'Boxeo / MMA',       icon: '🥊' },
    { key: 'nutrition',    label: 'Nutrición',         icon: '🥗' },
    { key: 'rehab',        label: 'Rehabilitación',    icon: '🩺' },
    { key: 'swimming',     label: 'Natación',          icon: '🏊' },
    { key: 'cycling',      label: 'Ciclismo',          icon: '🚴' },
    { key: 'functional',   label: 'Funcional',         icon: '💪' },
    { key: 'wellness',     label: 'Wellness / Mindset',icon: '🌿' },
]

const MODALITIES = [
    { key: 'presential', label: 'Presencial',   icon: <Users className="w-4 h-4" /> },
    { key: 'online',     label: 'Online',        icon: <Monitor className="w-4 h-4" /> },
    { key: 'mixed',      label: 'Mixto',         icon: <Smartphone className="w-4 h-4" /> },
]

const LANGUAGES = ['Español', 'English', 'Català', 'Français', 'Português', 'Deutsch', 'Italiano']

export default function TrainerEditPage() {
    const router     = useRouter()
    const params     = useParams()
    const id         = params.id as string
    const supabase   = createClient()
    const logoRef    = useRef<HTMLInputElement>(null)
    const coverRef   = useRef<HTMLInputElement>(null)

    const [loading,       setLoading]       = useState(true)
    const [saving,        setSaving]        = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingCover,setUploadingCover]= useState(false)
    const [showEmoji,     setShowEmoji]     = useState(false)
    const [gpsLoading,    setGpsLoading]    = useState(false)
    const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null)
    const [coverPos,      setCoverPos]      = useState(50)
    const [isDragging,    setIsDragging]    = useState(false)
    const [startY,        setStartY]        = useState(0)
    const [startPos,      setStartPos]      = useState(50)

    const [form, setForm] = useState({
        name:           '',
        bio:            '',
        email:          '',
        phone:          '',
        website:        '',
        instagram:      '',
        city:           '',
        country:        '',
        address:        '',
        latitude:       '',
        longitude:      '',
        logoUrl:        '',
        coverUrl:       '',
        specialties:    [] as string[],
        modality:       'presential',
        languages:      [] as string[],
        yearsExp:       '',
        certifications: '',
    })

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok })
        setTimeout(() => setToast(null), 3000)
    }, [])

    const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }))

    useEffect(() => {
        async function load() {
            const { data } = await supabase.from('organizations').select('*').eq('id', id).single()
            if (!data) { setLoading(false); return }
            setForm({
                name:           data.name           || '',
                bio:            data.bio || data.description || '',
                email:          data.email          || '',
                phone:          data.phone          || '',
                website:        data.website        || '',
                instagram:      data.instagram      || '',
                city:           data.city           || '',
                country:        data.country        || '',
                address:        data.address        || '',
                latitude:       data.latitude       ? String(data.latitude)  : '',
                longitude:      data.longitude      ? String(data.longitude) : '',
                logoUrl:        data.logo_url       || '',
                coverUrl:       data.cover_photo_url || '',
                specialties:    data.specialties    || [],
                modality:       data.modality       || 'presential',
                languages:      data.languages      || [],
                yearsExp:       data.years_experience ? String(data.years_experience) : '',
                certifications: data.certifications || '',
            })
            setCoverPos(data.cover_position || 50)
            setLoading(false)
        }
        load()
    }, [id])

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return
        setUploadingLogo(true)
        const ext  = file.name.split('.').pop()
        const name = `${id}_logo_${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('center-logos').upload(name, file, { upsert: true })
        if (!error) {
            const { data } = supabase.storage.from('center-logos').getPublicUrl(name)
            set('logoUrl', data.publicUrl)
            await supabase.from('organizations').update({ logo_url: data.publicUrl }).eq('id', id)
            showToast('Foto de perfil actualizada ✓')
        } else { showToast('Error al subir imagen', false) }
        setUploadingLogo(false)
    }

    async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]; if (!file) return
        setUploadingCover(true)
        const ext  = file.name.split('.').pop()
        const name = `${id}_cover_${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('center-logos').upload(name, file, { upsert: true })
        if (!error) {
            const { data } = supabase.storage.from('center-logos').getPublicUrl(name)
            set('coverUrl', data.publicUrl)
            await supabase.from('organizations').update({ cover_photo_url: data.publicUrl }).eq('id', id)
            showToast('Foto de portada actualizada ✓')
        } else { showToast('Error al subir imagen', false) }
        setUploadingCover(false)
    }

    function handleCoverMouseDown(e: React.MouseEvent) {
        setIsDragging(true); setStartY(e.clientY); setStartPos(coverPos)
    }
    function handleCoverMouseMove(e: React.MouseEvent) {
        if (!isDragging) return
        const delta = ((e.clientY - startY) / 200) * 100
        setCoverPos(Math.max(0, Math.min(100, startPos + delta)))
    }
    async function handleCoverMouseUp() {
        if (!isDragging) return
        setIsDragging(false)
        await supabase.from('organizations').update({ cover_position: coverPos }).eq('id', id)
    }

    function handleGPS() {
        if (!navigator.geolocation) return
        setGpsLoading(true)
        navigator.geolocation.getCurrentPosition(async pos => {
            const { latitude, longitude } = pos.coords
            try {
                const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`)
                const data = await res.json()
                const city    = data.address?.city || data.address?.town || data.address?.village || form.city
                const country = data.address?.country || form.country
                const road    = data.address?.road || ''
                const num     = data.address?.house_number || ''
                const address = [road, num].filter(Boolean).join(' ') || data.display_name || ''
                setForm(p => ({ ...p, city, country, address, latitude: String(latitude), longitude: String(longitude) }))
                showToast('Ubicación detectada ✓')
            } catch { /* ignore */ }
            setGpsLoading(false)
        }, () => { setGpsLoading(false); showToast('No se pudo obtener la ubicación', false) })
    }

    function toggleSpecialty(key: string) {
        setForm(p => ({
            ...p,
            specialties: p.specialties.includes(key)
                ? p.specialties.filter(s => s !== key)
                : [...p.specialties, key]
        }))
    }

    function toggleLanguage(lang: string) {
        setForm(p => ({
            ...p,
            languages: p.languages.includes(lang)
                ? p.languages.filter(l => l !== lang)
                : [...p.languages, lang]
        }))
    }

    async function handleSave() {
        setSaving(true)
        const { error } = await supabase.from('organizations').update({
            name:              form.name,
            bio:               form.bio,
            email:             form.email,
            phone:             form.phone,
            website:           form.website,
            instagram:         form.instagram,
            city:              form.city,
            country:           form.country,
            address:           form.address,
            latitude:          form.latitude  ? parseFloat(form.latitude)  : null,
            longitude:         form.longitude ? parseFloat(form.longitude) : null,
            specialties:       form.specialties,
            modality:          form.modality,
            languages:         form.languages,
            years_experience:  form.yearsExp  ? parseInt(form.yearsExp) : null,
            certifications:    form.certifications,
            updated_at:        new Date().toISOString(),
        }).eq('id', id)

        setSaving(false)
        if (error) { showToast('Error al guardar: ' + error.message, false) }
        else { showToast('Perfil guardado ✓'); router.push(`/dashboard/gyms/${id}`) }
    }

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 ${toast.ok ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    {toast.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/8 px-6 py-4 flex items-center justify-between" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-3">
                    <Link href={`/dashboard/gyms/${id}`} className="p-2 rounded-xl hover:bg-white/8 transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="font-black text-white uppercase tracking-wider text-sm">Editar Perfil Profesional</h1>
                        <p className="text-gray-500 text-xs">{form.name}</p>
                    </div>
                </div>
                        <Link href={`/trainer/${id}`} target="_blank" rel="noopener noreferrer"
                            className="bg-white/8 border border-white/10 text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-white/15 transition-colors flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Ver perfil público
                        </Link>
                <button onClick={handleSave} disabled={saving}
                    className="bg-brand-red text-white px-5 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-60">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Save className="w-4 h-4" /> Guardar</>}
                </button>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

                {/* ── COVER + AVATAR ─────────────────────────────────── */}
                <section>
                    {/* Cover */}
                    <div
                        className="relative h-48 rounded-2xl overflow-hidden bg-slate-900 border border-white/8 cursor-ns-resize select-none mb-0"
                        onMouseMove={handleCoverMouseMove}
                        onMouseUp={handleCoverMouseUp}
                        onMouseLeave={handleCoverMouseUp}
                    >
                        {form.coverUrl
                            ? <img src={form.coverUrl} className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: `50% ${coverPos}%` }} alt="" />
                            : <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                <p className="text-gray-600 text-sm">Sin foto de portada</p>
                              </div>
                        }
                        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                            <button onClick={() => coverRef.current?.click()}
                                className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-100">
                                {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                {uploadingCover ? 'Subiendo…' : 'Cambiar portada'}
                            </button>
                            {form.coverUrl && <p className="text-white/60 text-xs">Arrastra para reposicionar</p>}
                        </div>
                        {form.coverUrl && (
                            <button onMouseDown={handleCoverMouseDown}
                                className="absolute bottom-2 right-2 bg-black/60 text-white p-1.5 rounded-lg text-xs">
                                ↕ Reposicionar
                            </button>
                        )}
                        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    </div>

                    {/* Avatar overlapping cover */}
                    <div className="relative -mt-10 ml-6 flex items-end gap-4">
                        <div className="relative group">
                            {form.logoUrl
                                ? <img src={form.logoUrl} className="w-20 h-20 rounded-2xl border-4 border-black object-cover" alt={form.name} />
                                : <div className="w-20 h-20 rounded-2xl border-4 border-black bg-brand-red/20 flex items-center justify-center text-brand-red text-2xl font-black">
                                    {(form.name || 'T')[0].toUpperCase()}
                                  </div>
                            }
                            <button onClick={() => logoRef.current?.click()}
                                className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                {uploadingLogo ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                            </button>
                            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </div>
                        <div className="pb-2">
                            <p className="text-white font-black text-lg">{form.name || 'Tu nombre'}</p>
                            <p className="text-gray-500 text-xs">{[form.city, form.country].filter(Boolean).join(', ') || 'Sin ubicación'}</p>
                        </div>
                    </div>
                </section>

                {/* ── IDENTIDAD ─────────────────────────────────────── */}
                <Section title="Identidad" icon={<Zap className="w-4 h-4" />}>
                    <Field label="Nombre Profesional / Marca">
                        <input value={form.name} onChange={e => set('name', e.target.value)}
                            className={INPUT} placeholder="ej. Coach David Elite" />
                    </Field>

                    <Field label="Bio / Presentación">
                        <div className="relative">
                            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={4}
                                className={`${INPUT} resize-none pr-10`}
                                placeholder="Cuéntale a tus potenciales alumnos quién eres, tu filosofía de entrenamiento y qué te hace único…" />
                            <button onClick={() => setShowEmoji(v => !v)}
                                className="absolute right-3 top-3 text-gray-500 hover:text-white transition-colors">
                                <Smile className="w-4 h-4" />
                            </button>
                            {showEmoji && (
                                <div className="absolute right-0 top-12 z-50">
                                    <EmojiPicker
                                        onEmojiClick={d => { set('bio', form.bio + d.emoji); setShowEmoji(false) }}
                                        theme={'dark' as any} height={380}
                                    />
                                </div>
                            )}
                        </div>
                        <p className="text-gray-600 text-xs mt-1">{form.bio.length}/500 caracteres</p>
                    </Field>
                </Section>

                {/* ── ESPECIALIDADES ────────────────────────────────── */}
                <Section title="Especialidades" icon={<Star className="w-4 h-4" />}>
                    <p className="text-gray-500 text-xs mb-3">Selecciona las áreas en las que entrenas (puedes elegir varias)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SPECIALTIES.map(s => {
                            const active = form.specialties.includes(s.key)
                            return (
                                <button key={s.key} type="button" onClick={() => toggleSpecialty(s.key)}
                                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                                        active
                                            ? 'border-brand-red bg-brand-red/10 text-white'
                                            : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/20 hover:text-white'
                                    }`}>
                                    <span className="text-base">{s.icon}</span>
                                    <span>{s.label}</span>
                                    {active && <Check className="w-3.5 h-3.5 text-brand-red ml-auto" />}
                                </button>
                            )
                        })}
                    </div>
                </Section>

                {/* ── MODALIDAD ─────────────────────────────────────── */}
                <Section title="Modalidad de Entrenamiento" icon={<Monitor className="w-4 h-4" />}>
                    <div className="grid grid-cols-3 gap-3">
                        {MODALITIES.map(m => {
                            const active = form.modality === m.key
                            return (
                                <button key={m.key} type="button" onClick={() => set('modality', m.key)}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-bold transition-all ${
                                        active
                                            ? 'border-brand-red bg-brand-red/10 text-white'
                                            : 'border-white/8 bg-white/3 text-gray-400 hover:border-white/20'
                                    }`}>
                                    {m.icon}
                                    {m.label}
                                </button>
                            )
                        })}
                    </div>
                </Section>

                {/* ── EXPERIENCIA ───────────────────────────────────── */}
                <Section title="Experiencia y Certificaciones" icon={<Award className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Años de experiencia">
                            <input type="number" min="0" max="50" value={form.yearsExp} onChange={e => set('yearsExp', e.target.value)}
                                className={INPUT} placeholder="5" />
                        </Field>
                        <Field label="Idiomas">
                            <div className="flex flex-wrap gap-2">
                                {LANGUAGES.map(l => {
                                    const active = form.languages.includes(l)
                                    return (
                                        <button key={l} type="button" onClick={() => toggleLanguage(l)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                                                active ? 'border-brand-red bg-brand-red/10 text-white' : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-white'
                                            }`}>
                                            {l}
                                        </button>
                                    )
                                })}
                            </div>
                        </Field>
                    </div>
                    <Field label="Certificaciones y Titulaciones">
                        <textarea value={form.certifications} onChange={e => set('certifications', e.target.value)} rows={3}
                            className={`${INPUT} resize-none`}
                            placeholder="ej. NSCA-CSCS, Máster en Alto Rendimiento, Técnico Superior en Actividad Física…" />
                    </Field>
                </Section>

                {/* ── UBICACIÓN ─────────────────────────────────────── */}
                <Section title="Ubicación" icon={<MapPin className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Ciudad">
                            <input value={form.city} onChange={e => set('city', e.target.value)}
                                className={INPUT} placeholder="Madrid" />
                        </Field>
                        <Field label="País">
                            <input value={form.country} onChange={e => set('country', e.target.value)}
                                className={INPUT} placeholder="España" />
                        </Field>
                    </div>
                    <Field label="Dirección / Zona de trabajo">
                        <div className="relative">
                            <input value={form.address} onChange={e => set('address', e.target.value)}
                                className={`${INPUT} pr-12`}
                                placeholder="Calle de Serrano 12, Madrid (o 'Online y presencial en gimnasios de Madrid')" />
                            <button type="button" onClick={handleGPS}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-red transition-colors" title="Usar GPS">
                                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                            </button>
                        </div>
                    </Field>
                </Section>

                {/* ── CONTACTO ──────────────────────────────────────── */}
                <Section title="Contacto y Redes" icon={<Phone className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Email de contacto">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                                    className={`${INPUT} pl-10`} placeholder="coach@email.com" />
                            </div>
                        </Field>
                        <Field label="Teléfono / WhatsApp">
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input value={form.phone} onChange={e => set('phone', e.target.value)}
                                    className={`${INPUT} pl-10`} placeholder="+34 600 000 000" />
                            </div>
                        </Field>
                        <Field label="Instagram">
                            <div className="relative">
                                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input value={form.instagram} onChange={e => set('instagram', e.target.value)}
                                    className={`${INPUT} pl-10`} placeholder="@coach_david" />
                            </div>
                        </Field>
                        <Field label="Sitio web / Linktree">
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input value={form.website} onChange={e => set('website', e.target.value)}
                                    className={`${INPUT} pl-10`} placeholder="www.coach-david.com" />
                            </div>
                        </Field>
                    </div>
                </Section>

                <div className="pb-8">
                    <button onClick={handleSave} disabled={saving}
                        className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-base uppercase tracking-wider hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                        {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando…</> : <><Save className="w-5 h-5" /> Guardar Perfil</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const INPUT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/30 transition-all placeholder:text-gray-600'

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-300">
                <span className="text-brand-red">{icon}</span>
                {title}
            </h2>
            {children}
        </section>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</label>
            {children}
        </div>
    )
}
