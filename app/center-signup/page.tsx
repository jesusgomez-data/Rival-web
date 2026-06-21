'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, Check, Mail, Building2, MapPin, Lock, User, Camera, Loader2, Navigation, Phone, Globe, FileText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const centerTypes = [
  { id: 'cross_training', label: 'Cross Training Box', emoji: '🏋️' },
  { id: 'gym', label: 'Gym Convencional', emoji: '💪' },
  { id: 'running', label: 'Club de Running', emoji: '🏃' },
  { id: 'yoga', label: 'Estudio Yoga/Pilates', emoji: '🧘' },
  { id: 'padel', label: 'Pista Pádel/Tenis', emoji: '🎾' },
  { id: 'dance', label: 'Estudio de Danza', emoji: '💃' },
  { id: 'other', label: 'Otro', emoji: '🎯' },
]

const plans = [
  { id: 'free', name: 'FREE', price: '€0', description: 'Ideal para empezar' },
  { id: 'starter', name: 'STARTER', price: '€49.99', description: 'Lanzamiento: Primeros 50 centros.' },
  { id: 'pro', name: 'PRO', price: '€99.99', description: 'Lanzamiento: Primeros 50 centros.' },
]

export default function CenterSignup() {
  const router = useRouter()
  const supabase = createClient()
  const fileLogoRef = useRef<HTMLInputElement>(null)
  const fileCoverRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    centerName: '',
    centerType: '',
    country: '',
    city: '',
    address: '',
    plan: 'starter',
    logoUrl: '',
    coverUrl: '',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    bio: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingUser, setExistingUser] = useState<any>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      const urlParams = new URLSearchParams(window.location.search)
      const planFromUrl = urlParams.get('plan')
      if (session?.user) {
        setExistingUser(session.user)
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          plan: planFromUrl || prev.plan
        }))
        setStep(2)
      } else if (planFromUrl) {
        setFormData(prev => ({ ...prev, plan: planFromUrl }))
      }
    }
    checkSession()
  }, [])

  // Address autocomplete with Nominatim (OpenStreetMap)
  useEffect(() => {
    if (formData.address.length < 3) { setAddressSuggestions([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.address)}&format=json&addressdetails=1&limit=5&accept-language=es`,
          { headers: { 'Accept-Language': 'es' } }
        )
        const data = await res.json()
        setAddressSuggestions(data)
        setShowSuggestions(true)
      } catch { /* ignore network errors */ }
    }, 450)
    return () => clearTimeout(timer)
  }, [formData.address])

  const handleGPS = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`
          )
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || formData.city
          const country = data.address?.country || formData.country
          const road = data.address?.road || ''
          const houseNumber = data.address?.house_number || ''
          const address = [road, houseNumber].filter(Boolean).join(' ') || data.display_name || ''
          setFormData(prev => ({ ...prev, address, city, country, latitude: String(latitude), longitude: String(longitude) }))
          setShowSuggestions(false)
        } catch { /* ignore */ } finally { setGpsLoading(false) }
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const { data: userData } = await supabase.auth.getUser()
    const filename = `signup_${userData.user?.id}_logo_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('center-logos').upload(filename, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('center-logos').getPublicUrl(filename)
      setFormData(prev => ({ ...prev, logoUrl: data.publicUrl }))
    }
    setUploadingLogo(false)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    const ext = file.name.split('.').pop()
    const { data: userData } = await supabase.auth.getUser()
    const filename = `signup_${userData.user?.id}_cover_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('center-logos').upload(filename, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('center-logos').getPublicUrl(filename)
      setFormData(prev => ({ ...prev, coverUrl: data.publicUrl }))
    }
    setUploadingCover(false)
  }

  const handlePlanSelect = async (planId: string) => {
    setLoading(true)
    setError('')
    try {
      let userIdToUse = existingUser?.id
      if (!userIdToUse) {
        const { data } = await supabase.auth.getUser()
        userIdToUse = data.user?.id
      }
      if (!userIdToUse) throw new Error('No se pudo identificar el usuario. Por favor recarga.')

      const response = await fetch('/api/centers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          centerName: formData.centerName,
          centerType: formData.centerType,
          country: formData.country,
          city: formData.city,
          address: formData.address,
          logoUrl: formData.logoUrl,
          coverUrl: formData.coverUrl,
          latitude: formData.latitude,
          longitude: formData.longitude,
          plan: planId,
          fullName: formData.fullName,
          phone: formData.phone,
          website: formData.website,
          bio: formData.bio,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al crear el centro')

      router.push(`/dashboard/gyms/${data.organization.id}`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error al procesar el registro')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex font-sans selection:bg-brand-red selection:text-white">
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <Image src="/assets/hero-cinematic.png" alt="Fitness center" fill className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black pointer-events-none" />
        <div className="absolute bottom-12 left-12 z-10">
          <h2 className="text-5xl font-heading font-bold text-white mb-4">Build Your <br /><span className="text-brand-red">Fitness Empire.</span></h2>
          <p className="text-gray-400 max-w-md text-lg">Join 5,000+ fitness centers. Manage classes, members, and payments.</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-start justify-center p-8 relative overflow-y-auto">
        <div className="max-w-md w-full pt-4 pb-12">
          <Link href="/" className="mb-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors w-fit group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Inicio
          </Link>

          <div className="mb-8">
            <Image src="/logo.svg" alt="Rival" width={40} height={40} className="mb-6 w-10 h-10 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
            <h1 className="text-4xl font-heading font-bold text-white mb-2 tracking-tight">Crea tu Centro</h1>
            <p className="text-gray-400">Únete a la red de fitness más grande.</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s < step ? 'bg-brand-red text-white' : s === step ? 'bg-blue-500 text-white' : 'bg-slate-800 text-gray-400'}`}>
                    {s < step ? <Check size={16} /> : s}
                  </div>
                  {s < 5 && <div className={`h-1 w-8 ml-3 transition-all ${s < step ? 'bg-brand-red' : 'bg-slate-800'}`} />}
                </div>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-sm mb-6 text-center font-bold">{error}</div>}

          {/* STEP 1 — Account */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10 mb-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Lock size={16} className="text-brand-red" /> Crea tu Cuenta de Administrador</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre Completo</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                      <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" placeholder="Tu Nombre" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                      <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" placeholder="admin@tucentro.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Contraseña</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                      <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" placeholder="Mínimo 6 caracteres" />
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={async () => {
                if (formData.email && formData.password.length >= 6 && formData.fullName) {
                  setError('')
                  try {
                    setLoading(true)
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                      email: formData.email,
                      password: formData.password,
                      options: { data: { full_name: formData.fullName } }
                    })
                    if (authError) {
                      if (authError.message.includes('registered') || authError.status === 400) {
                        const { error: signinError } = await supabase.auth.signInWithPassword({
                          email: formData.email,
                          password: formData.password,
                        })
                        if (signinError) throw new Error('Correo ya registrado. Contraseña incorrecta.')
                      } else {
                        throw new Error(authError.message)
                      }
                    }
                    router.refresh()
                    setStep(2)
                    setLoading(false)
                  } catch (e: any) {
                    setError(e.message)
                    setLoading(false)
                  }
                } else {
                  setError('Por favor completa todos los campos correctamente')
                }
              }} className="w-full bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-red/20 flex items-center justify-center gap-2 group">
                {loading ? 'Procesando...' : <>Crear Cuenta y Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
              </button>
              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <p className="text-gray-500">¿Ya tienes cuenta? <Link href="/center-owner/login" className="text-brand-red font-bold hover:underline">Inicia sesión</Link></p>
              </div>
            </div>
          )}

          {/* STEP 2 — Center Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  {centerTypes.map((type) => (
                    <button key={type.id} onClick={() => { setFormData({ ...formData, centerType: type.id }); setError(''); setStep(3) }} className="p-4 border border-white/10 rounded-xl text-center hover:border-brand-red/50 hover:bg-brand-red/10 transition-all">
                      <div className="text-2xl mb-2">{type.emoji}</div>
                      <div className="text-sm font-bold text-white">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setStep(1)} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Atrás
              </button>
            </div>
          )}

          {/* STEP 3 — Brand Details & Contact */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10 mb-6 space-y-4">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Building2 size={16} className="text-brand-red" /> Detalles de tu Marca
                </h3>
                
                {/* Center Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre del Centro</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                    <input 
                      type="text" 
                      value={formData.centerName} 
                      onChange={(e) => setFormData({ ...formData, centerName: e.target.value })} 
                      className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" 
                      placeholder="Rival Box Madrid" 
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Teléfono de Contacto *</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                      className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" 
                      placeholder="+34 600 000 000" 
                    />
                  </div>
                </div>

                {/* Website / Instagram */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Sitio Web / Instagram (Opcional)</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                    <input 
                      type="text" 
                      value={formData.website} 
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                      className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" 
                      placeholder="https://rivalfit.app o @rivalfit" 
                    />
                  </div>
                </div>

                {/* Description / Bio */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Descripción o Bio (Opcional)</label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                    <textarea 
                      value={formData.bio} 
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                      rows={3}
                      className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600 resize-none" 
                      placeholder="Cuéntanos un poco sobre tu centro..." 
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Atrás
                </button>
                <button
                  onClick={() => {
                    if (formData.centerName && formData.phone) {
                      setError('')
                      setStep(4)
                    } else {
                      setError('Por favor, completa el nombre del centro y el teléfono de contacto')
                    }
                  }}
                  className="flex-1 bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
                >
                  Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — Address & Photos */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Country + City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">País</label>
                  <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all">
                    <option value="">Selecciona</option>
                    <option value="España">España</option>
                    <option value="Argentina">Argentina</option>
                    <option value="México">México</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ciudad</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                    <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" placeholder="Madrid" />
                  </div>
                </div>
              </div>

              {/* Address with GPS + autocomplete */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Dirección</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors z-10" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => { setFormData({ ...formData, address: e.target.value }); setShowSuggestions(true) }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600"
                    placeholder="Calle de Alcalá 12..."
                  />
                  <button
                    type="button"
                    onClick={handleGPS}
                    disabled={gpsLoading}
                    title="Usar ubicación GPS"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-brand-red hover:bg-brand-red/10 transition-all disabled:opacity-50"
                  >
                    {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  </button>
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 bg-slate-900 border border-white/10 rounded-xl mt-1 overflow-hidden shadow-xl">
                      {addressSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={() => {
                            const city = s.address?.city || s.address?.town || s.address?.village || formData.city
                            const country = s.address?.country || formData.country
                            const road = s.address?.road || ''
                            const houseNumber = s.address?.house_number || ''
                            const address = [road, houseNumber].filter(Boolean).join(' ') || s.display_name
                            setFormData(prev => ({ ...prev, address, city, country, latitude: s.lat, longitude: s.lon }))
                            setShowSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors"
                        >
                          <span className="text-gray-500 mr-2">📍</span>
                          {s.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> Escribe para buscar o pulsa el icono GPS para autodetectar
                </p>
              </div>

              {/* Logo + Cover photos */}
              <div className="grid grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Foto de perfil</label>
                  <input ref={fileLogoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileLogoRef.current?.click()}
                    disabled={uploadingLogo}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-white/10 hover:border-brand-red/50 hover:bg-brand-red/5 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden relative"
                  >
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="absolute inset-0 w-full h-full object-cover" />
                    ) : uploadingLogo ? (
                      <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-gray-500" />
                        <span className="text-xs text-gray-500">Logo</span>
                      </>
                    )}
                    {formData.logoUrl && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>
                </div>

                {/* Cover */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Foto de portada</label>
                  <input ref={fileCoverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileCoverRef.current?.click()}
                    disabled={uploadingCover}
                    className="w-full h-24 rounded-xl border-2 border-dashed border-white/10 hover:border-brand-red/50 hover:bg-brand-red/5 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden relative"
                  >
                    {formData.coverUrl ? (
                      <img src={formData.coverUrl} alt="Portada" className="absolute inset-0 w-full h-full object-cover" />
                    ) : uploadingCover ? (
                      <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-gray-500" />
                        <span className="text-xs text-gray-500">Portada</span>
                      </>
                    )}
                    {formData.coverUrl && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(3)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Atrás
                </button>
                <button
                  onClick={() => {
                    if (formData.country && formData.city) {
                      setError('')
                      setStep(5)
                    } else {
                      setError('Completa el país y la ciudad')
                    }
                  }}
                  className="flex-1 bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group"
                >
                  Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 — Plan */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Plan</label>
                <p className="text-[10px] text-brand-red font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-brand-red animate-pulse" />
                  Los cobros se realizarán automáticamente los días 1 de cada mes
                </p>
                <p className="text-sm text-gray-400 mb-4">Todos incluyen 30 días gratis.</p>
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setFormData({ ...formData, plan: plan.id })}
                      disabled={loading}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${formData.plan === plan.id ? 'border-brand-red bg-brand-red/10' : 'border-white/10 hover:border-white/20'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${formData.plan === plan.id ? 'border-brand-red bg-brand-red' : 'border-white/30'}`}>
                            {formData.plan === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="font-bold text-white">{plan.name}</div>
                            <div className="text-xs text-gray-400">{plan.description}</div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-brand-red">{plan.price}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handlePlanSelect(formData.plan)}
                disabled={loading}
                className="w-full bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-red/20 flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Creando centro...</>
                  : <>Confirmar y Crear Centro <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                }
              </button>

              <button onClick={() => setStep(4)} disabled={loading} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <ArrowLeft className="w-5 h-5" /> Atrás
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
