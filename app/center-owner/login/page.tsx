'use client'

import { useState } from 'react'
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function CenterOwnerLogin() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) {
          setError(authError.message)
          return
        }

        if (data.user) {
          // Redirect to centers list
          router.push('/center-owner/centers')
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        })

        if (authError) {
          setError(authError.message)
          return
        }

        if (data.user) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              role: 'center_owner',
            })

          if (profileError) {
            console.error('Error creating profile:', profileError)
          }

          setError('Cuenta creada. Por favor verifica tu email para continuar.')
          setMode('login')
        }
      }
    } catch (err) {
      setError('Ocurrió un error. Intenta de nuevo.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex font-sans selection:bg-brand-red selection:text-white">
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center">
        <Image src="/assets/hero-cinematic.png" alt="Fitness center" fill className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black pointer-events-none" />
        <div className="absolute bottom-12 left-12 z-10">
          <h2 className="text-5xl font-heading font-bold text-white mb-4">Gestiona tu <br /><span className="text-brand-red">Centro Fitness</span></h2>
          <p className="text-gray-400 max-w-md text-lg">Panel de control para propietarios. Clases, miembros, ingresos y más.</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="max-w-md w-full">
          <div className="mb-10">
            <Image src="/logo.svg" alt="Rival" width={40} height={40} className="mb-6 w-10 h-10" />
            <h1 className="text-4xl font-heading font-bold text-white mb-2">
              {mode === 'login' ? 'Inicia Sesión' : 'Crea tu Cuenta'}
            </h1>
            <p className="text-gray-400">Acceso para propietarios de centros</p>
          </div>

          {error && (
            <div className={`flex gap-2 p-3 rounded-xl text-sm mb-6 ${error.includes('verificar')
                ? 'bg-blue-500/10 border border-blue-500/50 text-blue-400'
                : 'bg-red-500/10 border border-red-500/50 text-red-400'
              }`}>
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-gray border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-red/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {mode === 'login' ? 'Iniciando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-gray-500 mb-4">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </p>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError('')
              }}
              className="text-brand-red font-bold hover:text-brand-accent transition-colors"
            >
              {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión aquí'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
