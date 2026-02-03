'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Upload, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

const centerTypes = [
  { id: 'crossfit', label: 'CrossFit Box', emoji: '🏋️' },
  { id: 'gym', label: 'Gym Convencional', emoji: '💪' },
  { id: 'running', label: 'Club de Running', emoji: '🏃' },
  { id: 'yoga', label: 'Estudio Yoga/Pilates', emoji: '🧘' },
  { id: 'padel', label: 'Pista Pádel/Tenis', emoji: '🎾' },
  { id: 'dance', label: 'Estudio de Danza', emoji: '💃' },
  { id: 'swim', label: 'Piscina/Natación', emoji: '🏊' },
  { id: 'boxing', label: 'Boxeo/MMA', emoji: '🥊' },
  { id: 'other', label: 'Otro', emoji: '🎯' },
]

const plans = [
  { id: 'free', name: 'FREE', price: '€0', description: 'Prueba gratis' },
  { id: 'starter', name: 'STARTER', price: '€49.99', description: '/mes (primeros 3 meses: €29.99)' },
  { id: 'pro', name: 'PRO', price: '€149.99', description: '/mes (primeros 3 meses: €99.99)' },
]

export default function NewOwnerCenter() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'España',
    zipCode: '',
    description: '',
    website: '',
    instagram: '',
    centerType: '',
    plan: 'starter',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        router.push('/center-owner/login')
      } else {
        setUser(data.session.user)
      }
    }
    checkAuth()
  }, [router, supabase.auth])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const filename = `${Date.now()}_${file.name}`
      const { error } = await supabase.storage
        .from('center-logos')
        .upload(filename, file)

      if (error) {
        alert('Error al subir el archivo')
      } else {
        const { data } = supabase.storage
          .from('center-logos')
          .getPublicUrl(filename)
        setLogoUrl(data.publicUrl)
      }
    } catch (err) {
      console.error('Error uploading file:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!user) return

      // Safety: Ensure profile exists for FK constraint
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: user.email?.split('@')[0] || `user_${Date.now()}`,
          full_name: formData.name.split(' ')[0] // Guest name from box name
        }, { onConflict: 'id' })

      if (profileError) console.error('Profile sync warning:', profileError)

      const { data, error } = await supabase
        .from('organizations') // Changed from 'centers'
        .insert({
          owner_id: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          zip_code: formData.zipCode,
          bio: formData.description, // organizations uses bio
          website: formData.website,
          instagram: formData.instagram,
          center_type: formData.centerType,
          plan: formData.plan,
          logo_url: logoUrl,
          verified: false,
          is_public: true
        })
        .select()

      if (error) {
        alert('Error al crear el centro: ' + error.message)
      } else {
        if (data && data[0]) {
          router.push(`/dashboard/gyms/${data[0].id}`)
        } else {
          router.push('/center-owner/centers')
        }
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al crear el centro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/10 bg-black px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/center-owner/centers" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
            <ArrowLeft size={18} /> Volver
          </Link>
          <h1 className="text-4xl font-heading font-bold text-white">Crear Nuevo Centro</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        <form onSubmit={handleCreateCenter} className="space-y-12">
          {/* Logo Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Logo del Centro</h2>
            <div className="rounded-xl border-2 border-dashed border-white/20 p-8 text-center hover:border-brand-red/50 transition-all">
              {logoUrl ? (
                <div className="mb-4">
                  <Image src={logoUrl} alt="Logo" width={96} height={96} className="w-24 h-24 mx-auto rounded-lg object-cover" />
                </div>
              ) : (
                <div className="text-5xl mb-4">🏢</div>
              )}
              <p className="text-gray-400 mb-4">Arrastra tu logo aquí o haz clic para seleccionar</p>
              <label className="inline-flex items-center gap-2 rounded-lg bg-brand-red/20 hover:bg-brand-red/30 px-4 py-2 text-brand-red font-bold cursor-pointer transition-all">
                <Upload size={18} /> Subir Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {uploading && <p className="text-gray-400 mt-2 text-sm">Subiendo...</p>}
            </div>
          </div>

          {/* Basic Information */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Información del Centro</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Nombre del Centro *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Teléfono</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Tipo de Centro *</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {centerTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, centerType: type.id }))}
                      className={`p-3 rounded-lg text-center transition-all ${formData.centerType === type.id
                        ? 'border-2 border-brand-red bg-brand-red/20'
                        : 'border-2 border-white/10 hover:border-white/30 bg-white/5'
                        }`}
                      title={type.label}
                    >
                      <div className="text-2xl mb-1">{type.emoji}</div>
                      <div className="text-xs font-bold text-white">{type.label.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all resize-none"
                  placeholder="Describe tu centro..."
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Ubicación</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Dirección *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Ciudad *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">País</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Código Postal</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social & Web */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Web y Redes</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Sitio Web</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://www.tucentro.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  placeholder="@tucentro"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Plan *</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, plan: plan.id }))}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${formData.plan === plan.id
                    ? 'border-brand-red bg-brand-red/10'
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                    }`}
                >
                  <div className="font-bold text-white mb-1">{plan.name}</div>
                  <div className="text-2xl font-bold text-brand-red mb-2">{plan.price}</div>
                  <div className="text-xs text-gray-400">{plan.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="border-t border-white/10 pt-8 flex gap-4">
            <button
              type="submit"
              disabled={loading || !formData.centerType}
              className="flex-1 rounded-lg bg-brand-red hover:bg-brand-accent px-6 py-3 text-sm font-bold text-white transition-all shadow-lg hover:shadow-brand-red/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Centro'
              )}
            </button>
            <Link
              href="/center-owner/centers"
              className="flex-1 rounded-lg bg-white/5 hover:bg-white/10 px-6 py-3 text-sm font-bold text-white transition-all text-center"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
