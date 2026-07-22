'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
    Save, Loader2, Link as LinkIcon, Instagram, MapPin, Globe, Mail, Phone,
    Building2, Users, Star, Trophy, Camera, Move, Check, X, LayoutDashboard,
    Youtube, Facebook, Twitter, Clock, Zap, ChevronDown, Plus, Trash2,
    Navigation, ExternalLink, Image as ImageIcon, Hash, Smile
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { EmojiClickData } from 'emoji-picker-react'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAYS_SHORT = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']

const AMENITIES_LIST = [
    { key: 'parking',      label: 'Parking',          icon: '🅿️' },
    { key: 'lockers',      label: 'Taquillas',         icon: '🔐' },
    { key: 'showers',      label: 'Duchas',            icon: '🚿' },
    { key: 'water',        label: 'Agua gratuita',     icon: '💧' },
    { key: 'wifi',         label: 'WiFi',              icon: '📶' },
    { key: 'cafeteria',    label: 'Cafetería',         icon: '☕' },
    { key: 'ac',           label: 'Aire Acondicionado',icon: '❄️' },
    { key: 'heating',      label: 'Calefacción',       icon: '🔥' },
    { key: 'music',        label: 'Sistema de Música', icon: '🎵' },
    { key: 'crossfit_box', label: 'Box CrossFit',      icon: '🏋️' },
    { key: 'cardio',       label: 'Cardio Máquinas',   icon: '🏃' },
    { key: 'free_weights', label: 'Pesas Libres',      icon: '🏋️' },
    { key: 'sauna',        label: 'Sauna',             icon: '🧖' },
    { key: 'pool',         label: 'Piscina',           icon: '🏊' },
    { key: 'physio',       label: 'Fisioterapia',      icon: '🩺' },
    { key: 'nutrition',    label: 'Asesoría Nutrición',icon: '🥗' },
]

const CENTER_TYPES = [
    { value: 'crossfit',         label: 'Box de CrossFit',   icon: '🏋️' },
    { value: 'gym',              label: 'Gimnasio',          icon: '💪' },
    { value: 'personal_trainer', label: 'Entrenador Personal',icon: '🎯' },
    { value: 'yoga',             label: 'Yoga / Pilates',    icon: '🧘' },
    { value: 'boxing',           label: 'Boxeo / MMA',       icon: '🥊' },
    { value: 'cycling',          label: 'Ciclismo Indoor',   icon: '🚴' },
    { value: 'functional',       label: 'Entrenamiento Funcional', icon: '⚡' },
    { value: 'wellness',         label: 'Wellness / Spa',    icon: '🌿' },
    { value: 'other',            label: 'Otro',              icon: '🏟️' },
]

export default function EditCenter({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const supabase = createClient()
    const fileInputLogoRef   = useRef<HTMLInputElement>(null)
    const fileInputCoverRef  = useRef<HTMLInputElement>(null)
    const fileInputGallRef   = useRef<HTMLInputElement>(null)

    const [centerId, setCenterId]           = useState<string | null>(null)
    const [loading, setLoading]             = useState(true)
    const [saving, setSaving]               = useState(false)
    const [uploadingLogo, setUploadingLogo] = useState(false)
    const [uploadingCover, setUploadingCover] = useState(false)
    const [uploadingGallery, setUploadingGallery] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [isRepositioning, setIsRepositioning] = useState(false)
    const [isDragging, setIsDragging]       = useState(false)
    const [startY, setStartY]               = useState(0)
    const [startPos, setStartPos]           = useState(50)
    const [gpsLoading, setGpsLoading]       = useState(false)
    const [toast, setToast]                 = useState<{ msg: string; ok: boolean } | null>(null)
    const [team, setTeam]                   = useState<any[]>([])

    const showToast = useCallback((msg: string, ok = true) => {
        setToast({ msg, ok })
        setTimeout(() => setToast(null), 3500)
    }, [])

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', address: '', city: '', country: '', zipCode: '',
        description: '', website: '', instagram: '', tiktok: '', youtube: '', facebook: '', twitter: '',
        logoUrl: '', coverUrl: '', coverPosition: 50,
        headCoachId: '', centerType: '',
        latitude: '', longitude: '',
        foundedYear: '', capacity: '',
        galleryUrls: [] as string[],
        amenities: {} as Record<string, boolean>,
        openingHours: {} as Record<string, { open: string; close: string; closed: boolean }>,
    })

    useEffect(() => {
        params.then(({ id }) => { setCenterId(id); fetchCenter(id) })
    }, [])

    const fetchCenter = async (id: string) => {
        const { data } = await supabase.from('organizations').select('*').eq('id', id).single()
        if (!data) { setLoading(false); return }

        const defaultHours: Record<string, { open: string; close: string; closed: boolean }> = {}
        DAYS_SHORT.forEach(d => { defaultHours[d] = { open: '07:00', close: '22:00', closed: false } })

        setFormData({
            name:          data.name || '',
            email:         data.email || '',
            phone:         data.phone || '',
            address:       data.address || '',
            city:          data.city || '',
            country:       data.country || '',
            zipCode:       data.zip_code || '',
            description:   data.description || data.bio || '',
            website:       data.website || '',
            instagram:     data.instagram || '',
            tiktok:        data.tiktok || '',
            youtube:       data.youtube || '',
            facebook:      data.facebook || '',
            twitter:       data.twitter || '',
            logoUrl:       data.logo_url || '',
            coverUrl:      data.cover_photo_url || '',
            coverPosition: data.cover_position || 50,
            headCoachId:   data.head_coach_id || '',
            centerType:    data.center_type || '',
            latitude:      data.latitude ? String(data.latitude) : '',
            longitude:     data.longitude ? String(data.longitude) : '',
            foundedYear:   data.founded_year ? String(data.founded_year) : '',
            capacity:      data.capacity ? String(data.capacity) : '',
            galleryUrls:   data.gallery_urls || [],
            amenities:     data.amenities || {},
            openingHours:  data.opening_hours && Object.keys(data.opening_hours).length > 0
                            ? data.opening_hours : defaultHours,
        })

        const { data: teamData } = await supabase
            .from('center_roles')
            .select('user_id, role, profiles:user_id(id, full_name, username)')
            .eq('organization_id', id)
        if (teamData) setTeam(teamData.map((t: any) => ({ id: t.profiles.id, name: t.profiles.full_name || `@${t.profiles.username}`, role: t.role })))
        setLoading(false)
    }

    const set = (key: string, value: any) => setFormData(p => ({ ...p, [key]: value }))
    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(e.target.name, e.target.value)

    // ── Logo upload ────────────────────────────────────────────────────────────
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || !centerId) return
        setUploadingLogo(true)
        const ext = file.name.split('.').pop()
        const filename = `${centerId}_logo_${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('center-logos').upload(filename, file, { upsert: true })
        if (error) { showToast('Error al subir el logo', false); setUploadingLogo(false); return }
        const { data } = supabase.storage.from('center-logos').getPublicUrl(filename)
        await supabase.from('organizations').update({ logo_url: data.publicUrl }).eq('id', centerId)
        set('logoUrl', data.publicUrl)
        router.refresh()
        setUploadingLogo(false)
        showToast('Logo actualizado ✓')
    }

    // ── Cover upload ───────────────────────────────────────────────────────────
    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file || !centerId) return
        setUploadingCover(true)
        const ext = file.name.split('.').pop()
        const filename = `${centerId}_cover_${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('center-logos').upload(filename, file, { upsert: true })
        if (error) { showToast('Error al subir portada', false); setUploadingCover(false); return }
        const { data } = supabase.storage.from('center-logos').getPublicUrl(filename)
        await supabase.from('organizations').update({ cover_photo_url: data.publicUrl, cover_position: 50 }).eq('id', centerId)
        setFormData(p => ({ ...p, coverUrl: data.publicUrl, coverPosition: 50 }))
        router.refresh()
        setUploadingCover(false)
        showToast('Portada actualizada ✓')
    }

    // ── Gallery upload ─────────────────────────────────────────────────────────
    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length || !centerId) return
        setUploadingGallery(true)
        const newUrls: string[] = []
        for (const file of files.slice(0, 8)) {
            const ext = file.name.split('.').pop()
            const filename = `${centerId}/gallery_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const { error } = await supabase.storage.from('center-gallery').upload(filename, file)
            if (!error) {
                const { data } = supabase.storage.from('center-gallery').getPublicUrl(filename)
                newUrls.push(data.publicUrl)
            }
        }
        const updated = [...formData.galleryUrls, ...newUrls].slice(0, 12)
        await supabase.from('organizations').update({ gallery_urls: updated }).eq('id', centerId)
        set('galleryUrls', updated)
        setUploadingGallery(false)
        showToast(`${newUrls.length} foto${newUrls.length !== 1 ? 's' : ''} añadida${newUrls.length !== 1 ? 's' : ''} ✓`)
        if (fileInputGallRef.current) fileInputGallRef.current.value = ''
    }

    const handleDeleteGalleryPhoto = async (url: string) => {
        if (!centerId) return
        const updated = formData.galleryUrls.filter(u => u !== url)
        await supabase.from('organizations').update({ gallery_urls: updated }).eq('id', centerId)
        set('galleryUrls', updated)
    }

    // ── GPS detection ──────────────────────────────────────────────────────────
    const detectGPS = () => {
        if (!navigator.geolocation) { showToast('Geolocalización no soportada', false); return }
        setGpsLoading(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setFormData(p => ({ ...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }))
                setGpsLoading(false)
                showToast('Ubicación detectada ✓')
            },
            () => { showToast('No se pudo obtener la ubicación', false); setGpsLoading(false) },
            { timeout: 10000 }
        )
    }

    // ── Cover repositioning ────────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => { if (!isRepositioning) return; setIsDragging(true); setStartY(e.clientY); setStartPos(formData.coverPosition) }
    const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setFormData(p => ({ ...p, coverPosition: Math.max(0, Math.min(100, startPos - (e.clientY - startY) / 2)) })) }
    const handleMouseUp = () => setIsDragging(false)
    const savePosition = async () => {
        if (!centerId) return
        setSaving(true)
        await supabase.from('organizations').update({ cover_position: formData.coverPosition }).eq('id', centerId)
        setIsRepositioning(false)
        setSaving(false)
    }

    // ── Main save ──────────────────────────────────────────────────────────────
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!centerId) return
        setSaving(true)
        const { error } = await supabase.from('organizations').update({
            name: formData.name, email: formData.email, phone: formData.phone,
            address: formData.address, city: formData.city, country: formData.country,
            zip_code: formData.zipCode, bio: formData.description,
            website: formData.website, instagram: formData.instagram,
            tiktok: formData.tiktok, youtube: formData.youtube, facebook: formData.facebook, twitter: formData.twitter,
            head_coach_id: formData.headCoachId || null,
            center_type: formData.centerType || null,
            latitude:  formData.latitude  ? parseFloat(formData.latitude)  : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            founded_year: formData.foundedYear ? parseInt(formData.foundedYear) : null,
            capacity:     formData.capacity    ? parseInt(formData.capacity)    : null,
            amenities:     formData.amenities,
            opening_hours: formData.openingHours,
        }).eq('id', centerId)

        setSaving(false)
        if (error) { showToast('Error al guardar: ' + error.message, false) }
        else { showToast('Perfil guardado correctamente ✓'); router.refresh() }
    }

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-black"><Loader2 className="w-8 h-8 text-brand-red animate-spin" /></div>

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 font-sans">

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-500'} text-white`}>
                    {toast.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-8 space-y-6">

                {/* ── Cover / Header ── */}
                <div className={`relative rounded-none sm:rounded-3xl overflow-hidden border-0 sm:border border-white/5 shadow-2xl ${isRepositioning ? 'cursor-ns-resize' : ''}`}>
                    <div className="h-72 sm:h-80 relative select-none"
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                        {formData.coverUrl ? (
                            <>
                                <Image src={formData.coverUrl} alt="Cover" fill className="object-cover pointer-events-none"
                                    style={{ objectPosition: `center ${formData.coverPosition}%` }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            </>
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #dc2626 0, #dc2626 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
                            </div>
                        )}

                        {/* Top-right actions */}
                        {!isRepositioning ? (
                            <div className="absolute top-4 right-4 z-20 flex gap-1 bg-black/30 backdrop-blur border border-white/10 p-1 rounded-xl">
                                <Link href={`/dashboard/gyms/${centerId}`} title="Dashboard"
                                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">
                                    <LayoutDashboard className="w-4 h-4" />
                                </Link>
                                {formData.coverUrl && (
                                    <button onClick={() => { setIsRepositioning(true); setStartPos(formData.coverPosition) }} title="Reposicionar"
                                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">
                                        <Move className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={() => fileInputCoverRef.current?.click()} disabled={uploadingCover} title="Cambiar portada"
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-red/20 hover:bg-brand-red text-brand-red hover:text-white transition-all">
                                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                </button>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                                <div className="flex gap-3 bg-black/80 p-3 rounded-2xl border border-white/10">
                                    <button onClick={savePosition} className="bg-brand-red text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2">
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
                                    </button>
                                    <button onClick={() => { setIsRepositioning(false); set('coverPosition', startPos) }}
                                        className="bg-white/10 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-2">
                                        <X className="w-4 h-4" /> Cancelar
                                    </button>
                                </div>
                                <p className="absolute bottom-6 text-[10px] text-white/60 bg-black/60 px-4 py-1.5 rounded-full">Arrastra verticalmente para ajustar</p>
                            </div>
                        )}

                        <input ref={fileInputCoverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

                        {/* Bottom info */}
                        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-6 flex flex-col sm:flex-row items-end gap-4 z-10">
                            {/* Logo */}
                            <div className="relative shrink-0 group/avatar">
                                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-black bg-zinc-900 overflow-hidden relative shadow-2xl">
                                    {formData.logoUrl
                                        ? <Image src={formData.logoUrl} alt="Logo" fill className="object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center"><Building2 className="w-10 h-10 text-zinc-700" /></div>}
                                    {uploadingLogo && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
                                </div>
                                <button onClick={() => fileInputLogoRef.current?.click()} disabled={uploadingLogo}
                                    className="absolute -bottom-2 -right-2 p-2.5 bg-brand-red text-white rounded-xl shadow-xl hover:bg-red-600 transition-all border-4 border-black group-hover/avatar:scale-110">
                                    <Camera className="w-4 h-4" />
                                </button>
                                <input ref={fileInputLogoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </div>

                            {/* Name & location */}
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
                                <div>
                                    <h1 className="text-3xl sm:text-5xl font-black italic uppercase text-white tracking-tighter leading-none drop-shadow-2xl">
                                        {formData.name || 'Nombre del Centro'}
                                    </h1>
                                    <div className="flex flex-wrap items-center gap-3 mt-2">
                                        <span className="text-brand-red font-black text-xs uppercase flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                            <MapPin className="w-3 h-3" /> {formData.city || 'Ciudad'}{formData.country && `, ${formData.country}`}
                                        </span>
                                        {formData.centerType && (
                                            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded-full">
                                                {CENTER_TYPES.find(t => t.value === formData.centerType)?.icon} {CENTER_TYPES.find(t => t.value === formData.centerType)?.label}
                                            </span>
                                        )}
                                        <Link href={`/gym/${centerId}`} className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                                            Ver público <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                                <Link href={`/dashboard/gyms/${centerId}`}
                                    className="bg-brand-red text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg flex items-center gap-2 hover:bg-red-600 hover:-translate-y-1 transition-all shrink-0">
                                    <LayoutDashboard className="w-4 h-4" /> Panel de Control
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Content Grid ── */}
                <div className="grid lg:grid-cols-12 gap-6 px-4 sm:px-0">

                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-4 space-y-5">

                        {/* Status */}
                        <Card title="Estado del Centro" icon={<Zap className="w-3.5 h-3.5 text-brand-red" />}>
                            <div className="space-y-3">
                                <InfoRow icon={<Users className="w-4 h-4" />} label="Staff" value={`${team.length} miembro${team.length !== 1 ? 's' : ''}`} color="red" />
                                {formData.foundedYear && <InfoRow icon={<Star className="w-4 h-4" />} label="Fundado" value={formData.foundedYear} color="yellow" />}
                                {formData.capacity && <InfoRow icon={<Hash className="w-4 h-4" />} label="Capacidad máx." value={`${formData.capacity} personas`} color="blue" />}
                            </div>
                        </Card>

                        {/* Quick Info */}
                        <Card title="Información" icon={<Mail className="w-3.5 h-3.5 text-brand-red" />}>
                            <div className="space-y-0.5">
                                {formData.phone    && <DetailRow icon={<Phone className="w-3.5 h-3.5" />}     label="Teléfono"  value={formData.phone} />}
                                {formData.email    && <DetailRow icon={<Mail className="w-3.5 h-3.5" />}      label="Email"     value={formData.email} />}
                                {formData.website  && <DetailRow icon={<Globe className="w-3.5 h-3.5" />}     label="Web"       value={formData.website} />}
                                {formData.instagram && <DetailRow icon={<Instagram className="w-3.5 h-3.5" />} label="Instagram" value={formData.instagram} />}
                                {formData.tiktok   && <DetailRow icon={<Hash className="w-3.5 h-3.5" />}      label="TikTok"    value={formData.tiktok} />}
                            </div>
                        </Card>

                        {/* Map Preview */}
                        {formData.latitude && formData.longitude && (
                            <Card title="Ubicación en el Mapa" icon={<MapPin className="w-3.5 h-3.5 text-brand-red" />}>
                                <div className="rounded-xl overflow-hidden border border-white/5 h-48 relative">
                                    <iframe
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formData.longitude)-0.01}%2C${parseFloat(formData.latitude)-0.008}%2C${parseFloat(formData.longitude)+0.01}%2C${parseFloat(formData.latitude)+0.008}&layer=mapnik&marker=${formData.latitude}%2C${formData.longitude}`}
                                        className="w-full h-full border-0"
                                        title="Mapa"
                                    />
                                </div>
                                <a href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`} target="_blank" rel="noopener noreferrer"
                                    className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-white/30 hover:text-brand-red transition-colors font-bold uppercase tracking-widest">
                                    <ExternalLink className="w-3 h-3" /> Ver en Google Maps
                                </a>
                            </Card>
                        )}

                        {/* Gallery */}
                        <Card title={`Galería de Instalaciones (${formData.galleryUrls.length}/12)`} icon={<ImageIcon className="w-3.5 h-3.5 text-brand-red" />}>
                            <input ref={fileInputGallRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                            <div className="grid grid-cols-3 gap-2">
                                {formData.galleryUrls.map((url, i) => (
                                    <div key={i} className="aspect-square rounded-xl overflow-hidden relative group border border-white/5">
                                        <Image src={url} alt="" fill className="object-cover" />
                                        <button onClick={() => handleDeleteGalleryPhoto(url)}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {formData.galleryUrls.length < 12 && (
                                    <button onClick={() => fileInputGallRef.current?.click()} disabled={uploadingGallery}
                                        className="aspect-square rounded-xl border-2 border-dashed border-white/10 hover:border-brand-red/40 flex flex-col items-center justify-center gap-1 text-white/20 hover:text-white/60 transition-all">
                                        {uploadingGallery ? <Loader2 className="w-5 h-5 animate-spin text-brand-red" /> : <><Plus className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">Añadir</span></>}
                                    </button>
                                )}
                            </div>
                            {formData.galleryUrls.length === 0 && !uploadingGallery && (
                                <p className="text-[10px] text-white/20 text-center mt-1 font-bold uppercase tracking-widest">Sube fotos de tus instalaciones</p>
                            )}
                        </Card>

                    </div>

                    {/* RIGHT COLUMN — Edit Form */}
                    <div className="lg:col-span-8">
                        <form onSubmit={handleSave} className="space-y-6">

                            {/* ── Identidad ── */}
                            <Section title="Identidad de Marca">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <FormInput label="Nombre del Centro" name="name" value={formData.name} onChange={handleInput} placeholder="Ej. Rival Fitness Madrid" icon={<Building2 className="w-4 h-4" />} />
                                    <FormInput label="Sitio Web" name="website" value={formData.website} onChange={handleInput} placeholder="www.tugimnasio.com" icon={<Globe className="w-4 h-4" />} />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Tipo de Centro</label>
                                        <div className="relative">
                                            <select name="centerType" value={formData.centerType} onChange={handleInput}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-brand-red transition-all appearance-none cursor-pointer">
                                                <option value="">Seleccionar tipo...</option>
                                                {CENTER_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput label="Año fundación" name="foundedYear" type="number" value={formData.foundedYear} onChange={handleInput} placeholder="2018" />
                                        <FormInput label="Capacidad máx." name="capacity" type="number" value={formData.capacity} onChange={handleInput} placeholder="150" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Descripción / Bio</label>
                                    <div className="relative">
                                        <textarea name="description" value={formData.description} onChange={handleInput} rows={4}
                                            placeholder="Describe tu centro, filosofía y lo que te hace único..."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-12 text-white text-sm focus:outline-none focus:border-brand-red transition-all resize-none placeholder:text-white/15 leading-relaxed custom-scrollbar" />
                                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="absolute right-3 bottom-3 p-1.5 text-white/25 hover:text-yellow-400 transition-colors bg-black/50 rounded-lg">
                                            <Smile className="w-4 h-4" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute right-0 top-full mt-2 z-50">
                                                <EmojiPicker theme={"dark" as any} onEmojiClick={(d: EmojiClickData) => set('description', formData.description + d.emoji)} width={300} height={380} />
                                                <div className="fixed inset-0 z-[-1]" onClick={() => setShowEmojiPicker(false)} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Section>

                            {/* ── Contacto y Ubicación ── */}
                            <Section title="Contacto y Ubicación">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <FormInput label="Email de Contacto" name="email" type="email" value={formData.email} onChange={handleInput} icon={<Mail className="w-4 h-4" />} />
                                    <FormInput label="Teléfono" name="phone" value={formData.phone} onChange={handleInput} icon={<Phone className="w-4 h-4" />} placeholder="+34 600 000 000" />
                                </div>
                                <FormInput label="Dirección Completa" name="address" value={formData.address} onChange={handleInput} icon={<MapPin className="w-4 h-4" />} placeholder="Calle Ejemplo 123" />
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="sm:col-span-2"><FormInput label="Ciudad" name="city" value={formData.city} onChange={handleInput} /></div>
                                    <FormInput label="País" name="country" value={formData.country} onChange={handleInput} />
                                    <FormInput label="C.P." name="zipCode" value={formData.zipCode} onChange={handleInput} />
                                </div>

                                {/* GPS */}
                                <div className="bg-black/30 border border-white/[0.06] rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                                            <Navigation className="w-3.5 h-3.5 text-brand-red" /> Coordenadas GPS
                                        </p>
                                        <button type="button" onClick={detectGPS} disabled={gpsLoading}
                                            className="flex items-center gap-2 bg-brand-red/10 border border-brand-red/20 text-brand-red hover:bg-brand-red hover:text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                            {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                                            {gpsLoading ? 'Detectando...' : 'Detectar mi ubicación'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput label="Latitud" name="latitude" value={formData.latitude} onChange={handleInput} placeholder="40.416775" />
                                        <FormInput label="Longitud" name="longitude" value={formData.longitude} onChange={handleInput} placeholder="-3.703790" />
                                    </div>
                                    {formData.latitude && formData.longitude && (
                                        <p className="text-[10px] text-green-400 font-bold flex items-center gap-1.5">
                                            <Check className="w-3 h-3" /> Ubicación configurada — se muestra en el mapa del perfil público
                                        </p>
                                    )}
                                </div>
                            </Section>

                            {/* ── Redes Sociales ── */}
                            <Section title="Redes Sociales">
                                <div className="grid sm:grid-cols-2 gap-5">
                                    <FormInput label="Instagram" name="instagram" value={formData.instagram} onChange={handleInput} placeholder="@rivalmadrid" icon={<Instagram className="w-4 h-4" />} />
                                    <FormInput label="TikTok" name="tiktok" value={formData.tiktok} onChange={handleInput} placeholder="@rivalmadrid" icon={<Hash className="w-4 h-4" />} />
                                    <FormInput label="YouTube" name="youtube" value={formData.youtube} onChange={handleInput} placeholder="@RivalMadrid" icon={<Youtube className="w-4 h-4" />} />
                                    <FormInput label="Facebook" name="facebook" value={formData.facebook} onChange={handleInput} placeholder="RivalMadrid" icon={<Facebook className="w-4 h-4" />} />
                                </div>
                            </Section>

                            {/* ── Horario ── */}
                            <Section title="Horario de Apertura">
                                <div className="space-y-2">
                                    {DAYS.map((day, i) => {
                                        const key = DAYS_SHORT[i]
                                        const h = formData.openingHours[key] || { open: '07:00', close: '22:00', closed: false }
                                        return (
                                            <div key={key} className="flex items-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 w-20 shrink-0">{day}</span>
                                                {h.closed ? (
                                                    <span className="flex-1 text-[10px] font-bold text-red-400/70 uppercase tracking-widest">Cerrado</span>
                                                ) : (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input type="time" value={h.open} onChange={e => setFormData(p => ({ ...p, openingHours: { ...p.openingHours, [key]: { ...h, open: e.target.value } } }))}
                                                            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-brand-red transition-all w-24" />
                                                        <span className="text-white/20 text-xs">—</span>
                                                        <input type="time" value={h.close} onChange={e => setFormData(p => ({ ...p, openingHours: { ...p.openingHours, [key]: { ...h, close: e.target.value } } }))}
                                                            className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-brand-red transition-all w-24" />
                                                    </div>
                                                )}
                                                <button type="button" onClick={() => setFormData(p => ({ ...p, openingHours: { ...p.openingHours, [key]: { ...h, closed: !h.closed } } }))}
                                                    className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all border shrink-0 ${h.closed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-white/30'}`}>
                                                    {h.closed ? 'Cerrado' : 'Abierto'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Section>

                            {/* ── Amenities ── */}
                            <Section title="Instalaciones y Servicios">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {AMENITIES_LIST.map(a => {
                                        const active = !!formData.amenities[a.key]
                                        return (
                                            <button key={a.key} type="button"
                                                onClick={() => setFormData(p => ({ ...p, amenities: { ...p.amenities, [a.key]: !active } }))}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${active ? 'bg-brand-red/10 border-brand-red/30 text-white' : 'bg-black/30 border-white/[0.06] text-white/35 hover:border-white/20 hover:text-white/60'}`}>
                                                <span className="text-base shrink-0">{a.icon}</span>
                                                <span className="text-[10px] font-bold uppercase leading-tight">{a.label}</span>
                                                {active && <Check className="w-3 h-3 text-brand-red ml-auto shrink-0" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </Section>

                            {/* ── Equipo ── */}
                            <Section title="Equipo">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Head Coach Principal</label>
                                    <div className="relative">
                                        <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                                        <select name="headCoachId" value={formData.headCoachId} onChange={handleInput}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3.5 pl-12 text-white text-sm focus:outline-none focus:border-brand-red transition-all appearance-none cursor-pointer">
                                            <option value="">Sin Head Coach asignado</option>
                                            {team.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role.replace('_', ' ')}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                                    </div>
                                </div>
                            </Section>

                            {/* ── Save ── */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => router.push(`/dashboard/gyms/${centerId}`)}
                                    className="px-7 py-3.5 rounded-2xl font-bold bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all text-xs uppercase tracking-widest">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={saving}
                                    className="bg-brand-red text-white px-10 py-3.5 rounded-2xl font-black flex items-center gap-2.5 hover:bg-red-600 transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar Cambios
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-3xl p-6 space-y-5">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.25em] border-b border-white/[0.05] pb-3 flex items-center gap-2">
                {title}
            </h3>
            {children}
        </div>
    )
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-zinc-900/60 border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <h3 className="text-[9px] font-black text-white/25 uppercase tracking-[0.25em] flex items-center gap-1.5">
                {icon} {title}
            </h3>
            {children}
        </div>
    )
}

function FormInput({ label, icon, ...props }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{label}</label>
            <div className="relative group">
                {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-red transition-colors">{icon}</div>}
                <input {...props}
                    className={`w-full bg-black/40 border border-white/[0.08] rounded-2xl py-3.5 px-4 text-white text-sm focus:outline-none focus:border-brand-red/50 transition-all placeholder:text-white/15 ${icon ? 'pl-12' : ''}`} />
            </div>
        </div>
    )
}

function InfoRow({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    const colors: Record<string, string> = {
        red: 'bg-brand-red/10 text-brand-red', yellow: 'bg-yellow-500/10 text-yellow-500', blue: 'bg-blue-500/10 text-blue-400'
    }
    return (
        <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl border border-white/[0.04]">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colors[color] || colors.red}`}>{icon}</div>
            <div>
                <p className="text-white font-bold text-sm leading-tight">{value}</p>
                <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest">{label}</p>
            </div>
        </div>
    )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
            <div className="flex items-center gap-2.5 text-white/30 shrink-0">
                {icon}
                <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xs font-bold text-white/60 truncate ml-3 max-w-[60%] text-right">{value}</span>
        </div>
    )
}
