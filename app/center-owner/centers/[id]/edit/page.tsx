'use client'

import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Save, Upload, Loader2, Link as LinkIcon, Instagram, MapPin, Globe, Mail, Phone, Building2, Users, Receipt, Star, Shield, Trophy, Target, Dumbbell, Zap, Edit2, Camera, Move, Check, X, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';

export default function EditCenter({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const supabase = createClient()

  // Refs for file inputs
  const fileInputLogoRef = useRef<HTMLInputElement>(null);
  const fileInputCoverRef = useRef<HTMLInputElement>(null);

  const [centerId, setCenterId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // UI State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startPos, setStartPos] = useState(50);

  // Data State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    description: '',
    website: '',
    instagram: '',
    logoUrl: '',
    coverUrl: '',
    coverPosition: 50,
    headCoachId: '',
  })
  const [team, setTeam] = useState<any[]>([])

  // --- Data Fetching ---
  useEffect(() => {
    const unwrapParams = async () => {
      const { id } = await params
      setCenterId(id)
      fetchCenter(id)
    }
    unwrapParams()
  }, [])

  const fetchCenter = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error;

      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        country: data.country || '',
        zipCode: data.zip_code || '',
        description: data.description || data.bio || '',
        website: data.website || '',
        instagram: data.instagram || '',
        logoUrl: data.logo_url || '',
        coverUrl: data.cover_photo_url || '',
        coverPosition: data.cover_position || 50,
        headCoachId: data.head_coach_id || '',
      })

      const { data: teamData } = await supabase
        .from('center_roles')
        .select(`
            user_id,
            role,
            profiles:user_id (id, full_name, username)
          `)
        .eq('organization_id', id)

      if (teamData) {
        setTeam(teamData.map((t: any) => ({
          id: t.profiles.id,
          name: t.profiles.full_name || `@${t.profiles.username}`,
          role: t.role
        })))
      }

    } catch (err) {
      console.error('Error fetching center:', err)
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setFormData(prev => ({ ...prev, description: prev.description + emojiData.emoji }));
  };

  // Image Upload Handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !centerId) return

    setUploadingLogo(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filename = `${centerId}_logo_${Date.now()}.${fileExt}`

      const { error } = await supabase.storage.from('center-logos').upload(filename, file)
      if (error) throw error

      const { data } = supabase.storage.from('center-logos').getPublicUrl(filename)

      // Update DB immediately for better UX or just state? 
      // Let's update state, user must click Save to persist everything, OR persist image immediately.
      // Profile page persists immediately. Let's do that for consistency.
      await supabase.from('organizations').update({ logo_url: data.publicUrl }).eq('id', centerId)

      setFormData(prev => ({ ...prev, logoUrl: data.publicUrl }))
      router.refresh()
    } catch (err: any) {
      console.error('Error uploading logo:', err)
      alert('Error al subir el logo: ' + err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !centerId) return

    setUploadingCover(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filename = `${centerId}_cover_${Date.now()}.${fileExt}`

      const { error } = await supabase.storage.from('center-logos').upload(filename, file)
      if (error) throw error

      const { data } = supabase.storage.from('center-logos').getPublicUrl(filename)

      await supabase.from('organizations').update({ cover_photo_url: data.publicUrl, cover_position: 50 }).eq('id', centerId)

      setFormData(prev => ({ ...prev, coverUrl: data.publicUrl, coverPosition: 50 }))
      router.refresh()
    } catch (err: any) {
      console.error('Error uploading cover:', err)
      alert('Error al subir la portada: ' + err.message)
    } finally {
      setUploadingCover(false)
    }
  }

  // Cover Repositioning
  const startRepositioning = () => {
    setIsRepositioning(true);
    setStartPos(formData.coverPosition);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isRepositioning) return;
    setIsDragging(true);
    setStartY(e.clientY);
    setStartPos(formData.coverPosition);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    const newPos = Math.max(0, Math.min(100, startPos - (deltaY / 2)));
    setFormData(prev => ({ ...prev, coverPosition: newPos }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const savePosition = async () => {
    if (!centerId) return;
    setSaving(true);
    try {
      await supabase.from('organizations').update({ cover_position: formData.coverPosition }).eq('id', centerId);
      setIsRepositioning(false);
    } catch (error) {
      console.error("Error saving position:", error);
    } finally {
      setSaving(false);
    }
  };

  // Main Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!centerId) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          zip_code: formData.zipCode,
          description: formData.description, // mapped to bio in DB logic if needed, but fetch used description/bio
          bio: formData.description,       // updating both to be safe or whichever schema uses
          website: formData.website,
          instagram: formData.instagram,
          head_coach_id: formData.headCoachId || null,
        })
        .eq('id', centerId)

      if (error) throw error

      // alert('Perfil actualizado correctamente') 
      router.refresh()
    } catch (err: any) {
      console.error('Error saving:', err)
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 animate-fade-in font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8 space-y-6 sm:space-y-8">

        {/* --- HEADER / COVER SECTION --- */}
        <div className={`relative group rounded-2xl md:rounded-[40px] overflow-hidden border border-white/5 shadow-2xl dark-section ${isRepositioning ? 'cursor-ns-resize' : ''}`}>
          <div
            className="h-80 bg-gradient-to-r from-brand-red via-gray-900 to-black relative group/cover select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {formData.coverUrl ? (
              <>
                <Image
                  src={formData.coverUrl}
                  alt="Cover"
                  fill
                  className="object-cover pointer-events-none"
                  style={{ objectPosition: `center ${formData.coverPosition}%` }}
                />
                {/* Overlays */}
                <div className="absolute inset-0 bg-brand-red/10 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              </>
            ) : (
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-30 mix-blend-overlay"></div>
            )}

            {/* Cover Actions - Refined aesthetic */}
            {!isRepositioning ? (
              <div className="absolute top-4 right-4 z-20">
                <div className="bg-black/30 backdrop-blur-md border border-white/5 p-1 rounded-xl flex gap-1">
                  <Link
                    href={`/dashboard/gyms/${centerId}`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-all group/btn"
                    title="Volver al Dashboard"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                  </Link>

                  {formData.coverUrl && (
                    <button
                      onClick={startRepositioning}
                      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-all"
                      title="Reposicionar portada"
                    >
                      <Move className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => fileInputCoverRef.current?.click()}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-brand-red text-white transition-all"
                    disabled={uploadingCover}
                    title="Cambiar portada"
                  >
                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                <div className="bg-black/80 p-3 rounded-2xl flex gap-3 border border-white/10 shadow-2xl">
                  <button
                    onClick={savePosition}
                    className="bg-brand-red hover:bg-red-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                  >
                    <Check className="w-4 h-4" /> Guardar Posición
                  </button>
                  <button
                    onClick={() => { setIsRepositioning(false); setFormData(prev => ({ ...prev, coverPosition: startPos })); }}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                </div>
                <p className="absolute bottom-8 text-xs text-white font-bold uppercase tracking-widest bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">Arrastra verticalmente para ajustar la portada</p>
              </div>
            )}

            <input type="file" ref={fileInputCoverRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />

            {/* MAIN INFO HEADER */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 lg:p-12 flex flex-col md:flex-row items-end gap-4 md:gap-8 z-10">
              {/* Avatar / Logo */}
              <div className="relative group/avatar shrink-0">
                <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-black bg-gray-900 overflow-hidden relative shadow-2xl transition-transform group-hover/avatar:scale-[1.02] -mb-2 md:mb-0">
                  {formData.logoUrl ? (
                    <Image src={formData.logoUrl} alt="Logo" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Building2 className="w-10 h-10 md:w-16 md:h-16 text-gray-700" />
                    </div>
                  )}

                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputLogoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 p-2 md:p-3 bg-brand-red text-white rounded-lg md:rounded-xl shadow-xl hover:bg-red-700 transition-all border-2 md:border-4 border-black group-hover/avatar:scale-110"
                  disabled={uploadingLogo}
                >
                  <Camera className="w-3 h-3 md:w-5 md:h-5" />
                </button>
                <input type="file" ref={fileInputLogoRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              </div>

              {/* Text Info */}
              <div className="pb-1 md:pb-2 flex flex-col md:flex-row md:items-end justify-between flex-1 gap-4 w-full">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-4xl lg:text-5xl font-heading font-black text-white italic uppercase tracking-tighter drop-shadow-2xl truncate leading-none mb-2 keep-white">
                    {formData.name || 'Nombre del Centro'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <p className="text-brand-red font-black tracking-widest text-[10px] md:text-sm uppercase flex items-center gap-1.5 md:gap-2 bg-black/40 px-2 md:px-3 py-1 rounded-lg border border-white/5 backdrop-blur-sm truncate max-w-full">
                      <MapPin className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{formData.city || 'Ubicación'}, {formData.country || 'País'}</span>
                    </p>
                    <Link href={`/gym/${centerId}`} className="text-gray-400 hover:text-white text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors whitespace-nowrap">
                      Ver Perfil Público <LinkIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/gyms/${centerId}`}
                    className="w-full md:w-auto bg-brand-red hover:bg-red-600 text-white px-6 py-2.5 md:px-8 md:py-3 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-lg shadow-brand-red/20 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="w-3 h-3 md:w-4 md:h-4" /> Panel de Control
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: VISUAL SUMMARY & MEDIA */}
          <div className="lg:col-span-4 space-y-6">

            {/* Status Card */}
            <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-red" /> Estado del Centro
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3 sm:gap-4 bg-black/40 p-3 sm:p-4 rounded-2xl border border-white/5 group hover:border-brand-red/30 transition-colors">
                  <div className="w-12 h-12 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Staff Oficial</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{team.length} Miembros Activos</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 bg-black/40 p-3 sm:p-4 rounded-2xl border border-white/5 group hover:border-yellow-500/30 transition-colors">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Nivel Premium</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Plan Pro Activo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-4 sm:p-6 backdrop-blur-sm">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Información Rápida</h3>
              <div className="space-y-1">
                {formData.phone && <DetailItem icon={<Phone className="w-4 h-4" />} label="Teléfono" value={formData.phone} />}
                {formData.email && <DetailItem icon={<Mail className="w-4 h-4" />} label="Email" value={formData.email} />}
                {formData.website && <DetailItem icon={<Globe className="w-4 h-4" />} label="Web" value={formData.website} />}
                {formData.instagram && <DetailItem icon={<Instagram className="w-4 h-4" />} label="Instagram" value={formData.instagram} />}
              </div>
            </div>

            {/* Placeholder for Media Gallery (To be implemented) */}
            <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-4 sm:p-6 backdrop-blur-sm opacity-60">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Galería de Instalaciones</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="aspect-square bg-black/40 rounded-xl border border-white/5 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-600" />
                </div>
                <div className="aspect-square bg-black/40 rounded-xl border border-white/5 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-600" />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-4 text-center uppercase tracking-widest">Próximamente</p>
            </div>

          </div>


          {/* RIGHT COLUMN: EDIT FORM */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-brand-gray/30 border border-white/5 rounded-3xl md:rounded-[40px] p-5 md:p-10 backdrop-blur-xl relative overflow-hidden">

              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-2 h-12 bg-brand-red rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>
                <h2 className="text-3xl font-heading font-black italic text-white uppercase tracking-tighter">Editar Perfil</h2>
              </div>

              <form onSubmit={handleSave} className="space-y-8 relative z-10">

                {/* Section: Identity */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Identidad de Marca</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormInput
                      label="Nombre del Centro"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ej. Rival Fitness Madrid"
                      icon={<Building2 className="w-4 h-4" />}
                    />
                    <FormInput
                      label="Sitio Web"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="www.tugimnasio.com"
                      icon={<Globe className="w-4 h-4" />}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Descripción / Bio</label>
                    <div className="relative">
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={5}
                        placeholder="Describe tu centro, filosofía y lo que te hace único..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:outline-none focus:border-brand-red transition-all resize-none placeholder:text-gray-700 pr-10 leading-relaxed custom-scrollbar"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="absolute right-3 bottom-3 text-gray-400 hover:text-yellow-400 transition-colors bg-black/50 p-1.5 rounded-lg"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute right-0 top-full mt-2 z-50">
                          <EmojiPicker
                            theme={Theme.DARK}
                            onEmojiClick={onEmojiClick}
                            width={300}
                            height={400}
                          />
                          <div className="fixed inset-0 z-[-1]" onClick={() => setShowEmojiPicker(false)}></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: Contact & Location */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2 pt-4">Contacto y Ubicación</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormInput
                      label="Email de Contacto"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      icon={<Mail className="w-4 h-4" />}
                    />
                    <FormInput
                      label="Teléfono"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      icon={<Phone className="w-4 h-4" />}
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-3">
                      <FormInput
                        label="Dirección Completa"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        icon={<MapPin className="w-4 h-4" />}
                      />
                    </div>
                    <FormInput
                      label="Ciudad"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                    <FormInput
                      label="País"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                    />
                    <FormInput
                      label="Código Postal"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Section: Staff & Social */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2 pt-4">Equipo y Redes</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Head Coach Principal</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <select
                          name="headCoachId"
                          value={formData.headCoachId}
                          onChange={(e) => setFormData(prev => ({ ...prev, headCoachId: e.target.value }))}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pl-12 text-white focus:outline-none focus:border-brand-red transition-all appearance-none cursor-pointer hover:bg-black/60"
                        >
                          <option value="" className="bg-gray-900">Seleccionar Head Coach</option>
                          {team.map(member => (
                            <option key={member.id} value={member.id} className="bg-gray-900">
                              {member.name} ({member.role.replace('_', ' ')})
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                          <Move className="w-3 h-3 rotate-90" />
                        </div>
                      </div>
                    </div>

                    <FormInput
                      label="Instagram"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleInputChange}
                      placeholder="@usuario"
                      icon={<Instagram className="w-4 h-4" />}
                    />
                  </div>
                </div>


                <div className="pt-8 flex justify-end gap-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/gyms/${centerId}`)}
                    className="px-8 py-4 rounded-xl font-bold bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all uppercase text-xs tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-white text-black px-10 py-4 rounded-xl font-bold flex items-center gap-3 hover:bg-brand-red hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl disabled:opacity-50 disabled:transform-none uppercase text-xs tracking-widest"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    GUARDAR CAMBIOS
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Helper Components ---

function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 shrink-0 mb-1 sm:mb-0">
        <div className="text-brand-red opacity-60 bg-brand-red/10 p-1.5 rounded-lg">{icon}</div>
        <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">{label}</span>
      </div>
      <span className="text-xs font-bold text-white break-all text-left pl-9 sm:pl-0 sm:text-right">{value}</span>
    </div>
  );
}

function FormInput({ label, icon, ...props }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">{label}</label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-red transition-colors">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-brand-red transition-all placeholder:text-gray-700 ${icon ? 'pl-12' : ''}`}
        />
      </div>
    </div>
  );
}

function Smile(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" x2="9.01" y1="9" y2="9" />
      <line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
  )
}
