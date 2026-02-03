'use client'

import { useEffect, useState } from 'react'
import { Plus, LogOut, Trash2, Edit2, Eye } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

interface Center {
  id: string
  name: string
  city: string
  center_type: string
  verified: boolean
  plan: string
  logo_url?: string
  members_count?: number
  revenue_month?: number
}

export default function OwnerCenters() {
  const router = useRouter()
  const supabase = createClient()

  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchCenters = async (ownerId: string) => {
      try {
        const { data, error } = await supabase
          .from('organizations') // Changed from 'centers'
          .select('*')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching centers:', error)
        } else {
          setCenters(data || [])
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push('/center-owner/login')
        return
      }

      setUser(data.session.user)
      fetchCenters(data.session.user.id)
    }

    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/center-owner/login')
  }

  const handleDeleteCenter = async (centerId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este centro?')) {
      const { error } = await supabase
        .from('organizations') // Changed from 'centers'
        .delete()
        .eq('id', centerId)

      if (error) {
        alert('Error al eliminar el centro')
      } else {
        setCenters(centers.filter(c => c.id !== centerId))
      }
    }
  }

  return (
    <div className="min-h-screen bg-black pb-24 lg:pb-0">
      {/* Header */}
      <div className="border-b border-white/10 bg-black px-4 md:px-8 py-6 md:py-8 sticky top-0 z-10 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-1">Mis Centros</h1>
              <p className="text-sm md:text-base text-gray-400">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/center-owner/centers/new"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl bg-brand-red hover:bg-brand-accent px-4 py-3 text-sm font-bold text-white transition-all shadow-lg hover:shadow-brand-red/20 active:scale-95"
              >
                <Plus size={18} /> <span className="md:inline">Nuevo Centro</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex-none flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-4 py-3 text-sm font-bold text-white transition-all active:scale-95"
                title="Cerrar Sessión"
              >
                <LogOut size={18} /> <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-center text-gray-400">Cargando centros...</div>
          </div>
        ) : centers.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white/5 border border-white/5">
            <div className="text-5xl mb-4">🏢</div>
            <h2 className="text-2xl font-bold text-white mb-2">No tienes centros</h2>
            <p className="text-gray-400 mb-6">Crea tu primer centro para empezar a gestionar</p>
            <Link
              href="/center-owner/centers/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-red hover:bg-brand-accent px-6 py-3 text-sm font-bold text-white transition-all"
            >
              <Plus size={18} /> Crear Centro
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {centers.map((center) => (
              <div key={center.id} className="rounded-2xl border border-white/5 bg-[#111] overflow-hidden hover:border-brand-red/30 transition-all group shadow-xl">
                {/* Header */}
                <div className="bg-gradient-to-br from-brand-red/10 via-white/5 to-transparent p-4 h-28 flex items-end relative">
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Link
                      href={`/dashboard/gyms/${center.id}`}
                      className="p-2 rounded-xl bg-black/40 hover:bg-brand-red text-white backdrop-blur-md transition-all border border-white/5"
                      title="Ver dashboard"
                    >
                      <Eye size={16} />
                    </Link>
                    <Link
                      href={`/center-owner/centers/${center.id}/edit`}
                      className="p-2 rounded-xl bg-black/40 hover:bg-white/20 text-white backdrop-blur-md transition-all border border-white/5"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </Link>
                    <button
                      onClick={() => handleDeleteCenter(center.id)}
                      className="p-2 rounded-xl bg-black/40 hover:bg-red-500/20 text-red-400 hover:text-red-500 backdrop-blur-md transition-all border border-white/5"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="text-4xl shadow-xl transform group-hover:scale-110 transition-transform duration-300">{center.logo_url ? <img src={center.logo_url} className="w-10 h-10 object-cover rounded-full" /> : '🏋️'}</div>
                </div>

                {/* Body */}
                <div className="p-5 md:p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-heading font-black italic text-white leading-tight uppercase truncate">{center.name}</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1 truncate">
                      {center.city} • {center.center_type}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Plan</span>
                      <span className="text-brand-red text-xs font-black uppercase">
                        {center.plan}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Estado</span>
                      <span className={`text-xs font-black uppercase ${center.verified
                        ? 'text-blue-400'
                        : 'text-green-400'}`}>
                        {center.verified ? 'Verificado' : 'Activo'}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/gyms/${center.id}`}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-brand-red text-white font-bold text-sm uppercase tracking-wider transition-all text-center block border border-white/5 hover:border-brand-red"
                  >
                    Gestionar Centro
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
