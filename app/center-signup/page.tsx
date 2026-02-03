'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Check, Mail, Building2, MapPin, Lock, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const centerTypes = [
  { id: 'crossfit', label: 'CrossFit Box', emoji: '🏋️' },
  { id: 'gym', label: 'Gym Convencional', emoji: '💪' },
  { id: 'running', label: 'Club de Running', emoji: '🏃' },
  { id: 'yoga', label: 'Estudio Yoga/Pilates', emoji: '🧘' },
  { id: 'padel', label: 'Pista Pádel/Tenis', emoji: '🎾' },
  { id: 'dance', label: 'Estudio de Danza', emoji: '💃' },
  { id: 'other', label: 'Otro', emoji: '🎯' },
]

const plans = [
  { id: 'free', name: 'FREE', price: '€0', description: 'Ideal para empezar' },
  { id: 'starter', name: 'STARTER', price: '€9.99', description: 'Lanzamiento: Primeros 50 centros.' },
  { id: 'pro', name: 'PRO', price: '€29.99', description: 'Lanzamiento: Primeros 50 centros.' },
]

export default function CenterSignup() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    centerName: '',
    centerType: '',
    country: '',
    city: '',
    plan: 'starter',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingUser, setExistingUser] = useState<any>(null)

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()

      // Handle plan from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const planFromUrl = urlParams.get('plan');

      if (session?.user) {
        setExistingUser(session.user)
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          plan: planFromUrl || prev.plan
        }))
        setStep(2) // Skip Step 1 (Auth)
      } else if (planFromUrl) {
        setFormData(prev => ({ ...prev, plan: planFromUrl }))
      }
    }
    checkSession()
  }, [])

  const handlePlanSelect = async (planId: string) => {
    setLoading(true)
    setError('')

    try {
      // Allow Server Action to validate auth (it receives cookies)
      // client-side getSession() can sometimes be delayed or flaky immediately after signup

      // Profile creation handled above to avoid duplicates for existing users

      let userIdToUse = existingUser?.id;

      // If we just signed up/logged in, we might not have updated `existingUser` state yet.
      // But we need the ID.
      // If `existingUser` is null, we try to get it from a verify call or assume Step 1 worked.

      if (!userIdToUse) {
        // Try to get session one last time
        const { data } = await supabase.auth.getUser()
        userIdToUse = data.user?.id
      }

      if (!userIdToUse) {
        throw new Error('No se pudo identificar el usuario. Por favor recarga.')
      }

      // 3. Create Center via standard API Route
      // The updated API route now automatically handles auth via cookies
      const response = await fetch('/api/centers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          centerName: formData.centerName,
          centerType: formData.centerType,
          country: formData.country,
          city: formData.city,
          plan: planId,
          fullName: formData.fullName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el centro')
      }

      alert(`¡Cuenta y Centro creados exitosamente!`)
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

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <Link href="/" className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="max-w-md w-full">
          <div className="mb-10">
            <Image src="/logo.svg" alt="Rival" width={40} height={40} className="mb-6 w-10 h-10" />
            <h1 className="text-4xl font-heading font-bold text-white mb-2">Crea tu Centro</h1>
            <p className="text-gray-400">Únete a la red de fitness más grande.</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s < step ? 'bg-brand-red text-white' : s === step ? 'bg-blue-500 text-white' : 'bg-slate-800 text-gray-400'}`}>
                    {s < step ? <Check size={16} /> : s}
                  </div>
                  {s < 4 && <div className={`h-1 w-8 ml-3 transition-all ${s < step ? 'bg-brand-red' : 'bg-slate-800'}`} />}
                </div>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl text-sm mb-6 text-center font-bold">{error}</div>}

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
                  setError('');

                  // Attempt auth here if needed, or just validate
                  // Logic is actually inside the wizard step handling in a real app, 
                  // but here we just moved the state update.
                  // Wait, the auth happens in handlePlanSelect in the previous code? 
                  // NO! The previous code had the auth logic inside "handlePlanSelect" (wrongly) or "setStep" (also wrongly)?
                  // Actually, looking at the code, Step 1 just sets Step 2. 
                  // The actual Auth call happens in `handlePlanSelect` at the END.

                  // FIX: We must Authenticate IMMEDIATELY at Step 1 to set cookies 
                  // so they are ready by Step 4.

                  try {
                    setLoading(true)
                    // 1. Sign Up / Login
                    const { data: authData, error: authError } = await supabase.auth.signUp({
                      email: formData.email,
                      password: formData.password,
                      options: {
                        data: { full_name: formData.fullName }
                      }
                    })

                    if (authError) {
                      // Try login
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

                    // Auth successful, refresh router updates cookies
                    router.refresh();
                    setStep(2);
                    setLoading(false)

                  } catch (e: any) {
                    setError(e.message)
                    setLoading(false)
                  }

                } else {
                  setError('Por favor completa todos los campos correctamente');
                }
              }} className="w-full bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-red/20 flex items-center justify-center gap-2 group">
                {loading ? 'Procesando...' : <>Crear Cuenta y Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
              </button>
              <div className="mt-8 text-center border-t border-white/5 pt-6">
                <p className="text-gray-500">¿Ya tienes cuenta? <Link href="/center-owner/login" className="text-brand-red font-bold hover:underline">Inicia sesión</Link></p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  {centerTypes.map((type) => (
                    <button key={type.id} onClick={() => { setFormData({ ...formData, centerType: type.id }); setError(''); setStep(3); }} className="p-4 border border-white/10 rounded-xl text-center hover:border-brand-red/50 hover:bg-brand-red/10 transition-all">
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

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre</label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                  <input type="text" value={formData.centerName} onChange={(e) => setFormData({ ...formData, centerName: e.target.value })} className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600" placeholder="Rival Box Madrid" />
                </div>
              </div>

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

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Atrás
                </button>
                <button onClick={() => { if (formData.centerName && formData.country && formData.city) { setError(''); setStep(4); } else { setError('Completa todos'); } }} className="flex-1 bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group">
                  Continuar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Plan</label>
                <p className="text-sm text-gray-400 mb-4">Todos incluyen 30 días gratis.</p>
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <button key={plan.id} onClick={() => handlePlanSelect(plan.id)} disabled={loading} className={`w-full p-4 rounded-xl border transition-all text-left ${formData.plan === plan.id ? 'border-brand-red bg-brand-red/10' : 'border-white/10 hover:border-white/20'} disabled:opacity-50`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white">{plan.name}</div>
                          <div className="text-xs text-gray-400">{plan.description}</div>
                        </div>
                        <div className="text-2xl font-bold text-brand-red">{plan.price}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setStep(3)} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Atrás
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
