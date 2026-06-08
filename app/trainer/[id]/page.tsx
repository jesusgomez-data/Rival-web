'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    MapPin, Globe, Instagram, Phone, Star, Award, Monitor,
    Users, Smartphone, Check, ArrowLeft, Calendar, MessageSquare,
    ChevronRight, Loader2, UserPlus, UserCheck, Zap
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

const SPECIALTY_LABELS: Record<string, { label: string; icon: string }> = {
    strength:     { label: 'Fuerza',             icon: '🏋️' },
    cardio:       { label: 'Cardio / Running',    icon: '🏃' },
    hiit:         { label: 'HIIT',               icon: '⚡' },
    crossfit:     { label: 'CrossFit',            icon: '🔥' },
    yoga:         { label: 'Yoga / Pilates',      icon: '🧘' },
    boxing:       { label: 'Boxeo / MMA',         icon: '🥊' },
    nutrition:    { label: 'Nutrición',           icon: '🥗' },
    rehab:        { label: 'Rehabilitación',      icon: '🩺' },
    swimming:     { label: 'Natación',            icon: '🏊' },
    cycling:      { label: 'Ciclismo',            icon: '🚴' },
    functional:   { label: 'Funcional',           icon: '💪' },
    wellness:     { label: 'Wellness / Mindset',  icon: '🌿' },
}

const MODALITY_LABELS: Record<string, string> = {
    presential: '📍 Presencial',
    online:     '💻 Online',
    mixed:      '🔄 Presencial & Online',
}

export default function TrainerPublicProfile() {
    const params   = useParams()
    const router   = useRouter()
    const id       = params.id as string
    const supabase = createClient()

    const [trainer,   setTrainer]   = useState<any>(null)
    const [plans,     setPlans]     = useState<any[]>([])
    const [reviews,   setReviews]   = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [following,   setFollowing]   = useState(false)
    const [isMember,    setIsMember]    = useState(false)
    const [loading,     setLoading]     = useState(true)
    const [tab,         setTab]         = useState<'about' | 'plans' | 'reviews'>('about')

    useEffect(() => { loadProfile() }, [id])

    async function loadProfile() {
        const [{ data: org }, { data: { user } }] = await Promise.all([
            supabase.from('organizations').select('*').eq('id', id).single(),
            supabase.auth.getUser(),
        ])
        if (!org) { router.push('/dashboard/gyms'); return }
        setTrainer(org)
        setCurrentUser(user)

        const [plansRes, reviewsRes, followRes, memberRes] = await Promise.all([
            supabase.from('membership_plans').select('*').eq('organization_id', id).eq('is_active', true).order('price'),
            supabase.from('center_reviews').select('id, rating, comment, created_at, profiles:user_id(full_name, username, avatar_url)').eq('organization_id', id).order('created_at', { ascending: false }).limit(10),
            user ? supabase.from('center_followers').select('id').eq('organization_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
            user ? supabase.from('members').select('id, status').eq('organization_id', id).eq('user_id', user.id).eq('status', 'active').maybeSingle() : Promise.resolve({ data: null }),
        ])

        setPlans(plansRes.data || [])
        setReviews(reviewsRes.data || [])
        setFollowing(!!followRes.data)
        setIsMember(!!memberRes.data)
        setLoading(false)
    }

    async function toggleFollow() {
        if (!currentUser) { router.push('/auth'); return }
        if (following) {
            await supabase.from('center_followers').delete().eq('organization_id', id).eq('user_id', currentUser.id)
            await supabase.from('organizations').update({ followers_count: Math.max(0, (trainer.followers_count || 1) - 1) }).eq('id', id)
        } else {
            await supabase.from('center_followers').insert({ organization_id: id, user_id: currentUser.id })
            await supabase.from('organizations').update({ followers_count: (trainer.followers_count || 0) + 1 }).eq('id', id)
        }
        setFollowing(!following)
        setTrainer((t: any) => ({ ...t, followers_count: following ? (t.followers_count || 1) - 1 : (t.followers_count || 0) + 1 }))
    }

    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : null

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
        </div>
    )
    if (!trainer) return null

    const specialties: string[] = trainer.specialties || []
    const languages:   string[] = trainer.languages   || []

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Back */}
            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => {
                        // Check if we have real history to go back to
                        if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.hostname)) {
                            window.history.back()
                        } else {
                            router.push('/dashboard/gyms')
                        }
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-white font-bold text-sm truncate">{trainer.name}</span>
            </div>

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="relative">
                <div className="h-48 sm:h-64 bg-slate-900 relative overflow-hidden">
                    {trainer.cover_photo_url
                        ? <img src={trainer.cover_photo_url} className="w-full h-full object-cover" style={{ objectPosition: `50% ${trainer.cover_position ?? 50}%` }} alt="" />
                        : <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black" />
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>

                <div className="px-4 sm:px-8 -mt-16 relative z-10 flex items-end gap-4 pb-4">
                    {trainer.logo_url
                        ? <img src={trainer.logo_url} className="w-24 h-24 rounded-2xl border-4 border-black object-cover shadow-xl flex-shrink-0" alt={trainer.name} />
                        : <div className="w-24 h-24 rounded-2xl border-4 border-black bg-brand-red/20 flex items-center justify-center text-brand-red text-3xl font-black flex-shrink-0">
                            {(trainer.name || 'T')[0].toUpperCase()}
                          </div>
                    }
                    <div className="pb-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            {trainer.verified && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400">✓ Verificado</span>
                            )}
                            {trainer.modality && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{MODALITY_LABELS[trainer.modality] || ''}</span>
                            )}
                        </div>
                        <h1 className="text-2xl font-heading font-black italic uppercase text-white leading-tight truncate">{trainer.name}</h1>
                        {(trainer.city || trainer.country) && (
                            <p className="text-gray-400 text-sm flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5" /> {[trainer.city, trainer.country].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── STATS ROW ────────────────────────────────────────────── */}
            <div className="px-4 sm:px-8 py-4 flex flex-wrap gap-6 border-b border-white/8">
                <div className="text-center">
                    <p className="text-white font-black text-xl">{trainer.member_count || 0}</p>
                    <p className="text-gray-500 text-xs">Alumnos</p>
                </div>
                <div className="text-center">
                    <p className="text-white font-black text-xl">{trainer.followers_count || 0}</p>
                    <p className="text-gray-500 text-xs">Seguidores</p>
                </div>
                {trainer.years_experience && (
                    <div className="text-center">
                        <p className="text-white font-black text-xl">{trainer.years_experience}</p>
                        <p className="text-gray-500 text-xs">Años exp.</p>
                    </div>
                )}
                {avgRating && (
                    <div className="text-center flex flex-col items-center">
                        <p className="text-white font-black text-xl flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />{avgRating}
                        </p>
                        <p className="text-gray-500 text-xs">{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                )}
            </div>

            {/* ── ACTION BUTTONS ───────────────────────────────────────── */}
            <div className="px-4 sm:px-8 py-4 flex gap-3">
                <button onClick={toggleFollow}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        following
                            ? 'bg-white/10 border border-white/10 text-white hover:bg-white/20'
                            : 'bg-brand-red text-white hover:bg-red-600'
                    }`}>
                    {following ? <><UserCheck className="w-4 h-4" /> Siguiendo</> : <><UserPlus className="w-4 h-4" /> Seguir</>}
                </button>
                {trainer.phone && (
                    <a href={`https://wa.me/${trainer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors">
                        <MessageSquare className="w-4 h-4" /> WhatsApp
                    </a>
                )}
                {trainer.website && (
                    <a href={trainer.website.startsWith('http') ? trainer.website : `https://${trainer.website}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white/8 border border-white/10 text-white hover:bg-white/15 transition-colors">
                        <Globe className="w-4 h-4" />
                    </a>
                )}
                {trainer.instagram && (
                    <a href={`https://instagram.com/${trainer.instagram.replace('@', '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white/8 border border-white/10 text-white hover:bg-white/15 transition-colors">
                        <Instagram className="w-4 h-4" />
                    </a>
                )}
            </div>

            {/* ── TABS ─────────────────────────────────────────────────── */}
            <div className="px-4 sm:px-8 flex gap-1 border-b border-white/8">
                {(['about', 'plans', 'reviews'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                            tab === t ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}>
                        {t === 'about' ? 'Sobre mí' : t === 'plans' ? 'Servicios' : 'Reseñas'}
                    </button>
                ))}
            </div>

            <div className="px-4 sm:px-8 py-6 max-w-3xl space-y-6">

                {/* ── ABOUT TAB ──────────────────────────────────────── */}
                {tab === 'about' && (
                    <div className="space-y-6">
                        {trainer.bio && (
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Sobre mí</h3>
                                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{trainer.bio}</p>
                            </div>
                        )}

                        {specialties.length > 0 && (
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Especialidades</h3>
                                <div className="flex flex-wrap gap-2">
                                    {specialties.map(s => {
                                        const info = SPECIALTY_LABELS[s]
                                        if (!info) return null
                                        return (
                                            <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white">
                                                <span>{info.icon}</span> {info.label}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {trainer.certifications && (
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Certificaciones</h3>
                                <p className="text-gray-300 text-sm">{trainer.certifications}</p>
                            </div>
                        )}

                        {languages.length > 0 && (
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Idiomas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {languages.map(l => (
                                        <span key={l} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-gray-300">{l}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(trainer.email || trainer.phone || trainer.address) && (
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Contacto</h3>
                                <div className="space-y-2">
                                    {trainer.email  && <ContactRow icon={<span>📧</span>} value={trainer.email} />}
                                    {trainer.phone  && <ContactRow icon={<span>📱</span>} value={trainer.phone} />}
                                    {trainer.address && <ContactRow icon={<MapPin className="w-4 h-4 text-gray-500" />} value={trainer.address} />}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── PLANS TAB ──────────────────────────────────────── */}
                {tab === 'plans' && (
                    <div className="space-y-4">
                        {plans.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Zap className="w-10 h-10 text-gray-700" />
                                <p className="text-gray-500 text-sm">Sin planes publicados aún</p>
                            </div>
                        ) : plans.map((p: any) => (
                            <div key={p.id} className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-brand-red/30 transition-all">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div>
                                        <h4 className="text-white font-black text-lg">{p.name}</h4>
                                        {p.description && <p className="text-gray-400 text-sm mt-0.5">{p.description}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-brand-red font-black text-2xl">€{p.price}</p>
                                        <p className="text-gray-600 text-xs">/{p.duration_type === 'monthly' ? 'mes' : p.duration_type === 'session' ? 'sesión' : p.duration_type || 'mes'}</p>
                                    </div>
                                </div>
                                {p.features && p.features.length > 0 && (
                                    <ul className="space-y-1 mb-4">
                                        {(Array.isArray(p.features) ? p.features : [p.features]).map((f: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                                                <Check className="w-3.5 h-3.5 text-brand-red flex-shrink-0" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <button className="w-full bg-brand-red text-white py-2.5 rounded-xl font-black text-sm hover:bg-red-600 transition-colors">
                                    Contratar
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── REVIEWS TAB ────────────────────────────────────── */}
                {tab === 'reviews' && (
                    <div className="space-y-4">
                        {avgRating && (
                            <div className="flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-2xl">
                                <div className="text-center">
                                    <p className="text-5xl font-black text-white">{avgRating}</p>
                                    <div className="flex gap-0.5 mt-1 justify-center">
                                        {[1,2,3,4,5].map(i => (
                                            <Star key={i} className={`w-4 h-4 ${Number(avgRating) >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                                        ))}
                                    </div>
                                    <p className="text-gray-500 text-xs mt-1">{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        )}
                        {reviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Star className="w-10 h-10 text-gray-700" />
                                <p className="text-gray-500 text-sm">Sin reseñas aún</p>
                            </div>
                        ) : reviews.map((r: any) => (
                            <div key={r.id} className="bg-white/3 border border-white/8 rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    {r.profiles?.avatar_url
                                        ? <img src={r.profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" alt={r.profiles.full_name} />
                                        : <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red font-black text-xs">{(r.profiles?.full_name || '?')[0]}</div>
                                    }
                                    <div className="flex-1">
                                        <p className="text-white font-bold text-sm">{r.profiles?.full_name || 'Usuario'}</p>
                                        <div className="flex gap-0.5">
                                            {[1,2,3,4,5].map(i => (
                                                <Star key={i} className={`w-3 h-3 ${r.rating >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 text-xs">{new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                                </div>
                                {r.comment && <p className="text-gray-300 text-sm">{r.comment}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
    return (
        <div className="flex items-center gap-3 text-sm text-gray-300">
            <span className="flex-shrink-0">{icon}</span>
            <span>{value}</span>
        </div>
    )
}
