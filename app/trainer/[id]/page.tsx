'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    MapPin, Globe, Instagram, Phone, Star, Award, Monitor,
    Users, Check, ArrowLeft, Calendar, MessageSquare,
    Loader2, UserPlus, UserCheck, Zap, Flame, Lock, Trophy,
    Clock, List, LayoutGrid, Grid, X
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { PUBLIC_ORG_COLUMNS } from '@/lib/org-columns'
import { getCenterPosts } from '@/app/dashboard/gyms/feed-actions'
import GymPostCard from '@/app/dashboard/gyms/GymPostCard'
import {
    getClassesForDate, getClassesRange, enrollInClass,
    unenrollFromClass, getClassAttendees, requestMemberPayment,
    bookTrainerSlot, cancelPendingBooking
} from '@/app/dashboard/gyms/management-actions'
import {
    getPublicProfessionalServices, createServiceBooking,
    getProfessionalAvailability, getProfessionalReviews
} from '@/app/dashboard/gyms/professional-service-actions'
import { requestMemberLeave } from '@/app/dashboard/gyms/member-actions'
import { isProfessional, getTypeLabel, getTypeIcon, SERVICE_MODALITIES } from '@/lib/professional-types'
import PublicBookingCalendar from './PublicBookingCalendar'

const SPECIALTY_LABELS: Record<string, { label: string; icon: string }> = {
    strength:     { label: 'Fuerza',             icon: '🏋️' },
    cardio:       { label: 'Cardio / Running',    icon: '🏃' },
    hiit:         { label: 'HIIT',               icon: '⚡' },
    crossfit:     { label: 'CrossFit',            icon: '🔥' },
    yoga:         { label: 'Yoga / Pilates',      icon: '🧘' },
    boxing:       { label: 'Boxeo / MMA',         icon: '🥊' },
    nutrition:    { label: 'Nutrición',           icon: '🥗' },
    rehab:        { label: 'Rehabilitación / Fisioterapia', icon: '🩺' },
    swimming:     { label: 'Natación',            icon: '🏊' },
    cycling:      { label: 'Ciclismo',            icon: '🚴' },
    functional:   { label: 'Funcional',           icon: '💪' },
    wellness:     { label: 'Wellness / Mindset',  icon: '🌿' },
    physiotherapy:{ label: 'Fisioterapia',        icon: '💆' },
    nutritionist: { label: 'Nutrición Deportiva',  icon: '🥑' },
    psychology:   { label: 'Psicología Deportiva', icon: '🧠' },
}

const MODALITY_LABELS: Record<string, string> = {
    presential: '📍 Presencial',
    online:     '💻 Online',
    mixed:      '🔄 Presencial & Online',
}

export default function TrainerPublicProfile() {
    const params   = useParams()
    const router   = useRouter()
    const searchParams = useSearchParams()
    const paymentStatus = searchParams?.get('status')
    const id       = params.id as string
    const supabase = createClient()

    const [trainer,   setTrainer]   = useState<any>(null)
    const [plans,     setPlans]     = useState<any[]>([])
    const [reviews,   setReviews]   = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [following,   setFollowing]   = useState(false)
    const [isMember,    setIsMember]    = useState(false)
    const [memberId,    setMemberId]    = useState<string | null>(null)
    const [memberStatus, setMemberStatus] = useState<string | null>(null)
    const [isClient,    setIsClient]    = useState(false)
    const [showLeaveModal, setShowLeaveModal] = useState(false)
    const [leaveReason, setLeaveReason] = useState("")
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)
    const [leaveRequested, setLeaveRequested] = useState(false)
    const [loading,     setLoading]     = useState(true)
    const [tab,         setTab]         = useState<'about' | 'services' | 'reviews' | 'feed' | 'schedule'>('about')
    const [preSelectedServiceId, setPreSelectedServiceId] = useState<string | null>(null)
    const [ownerUsername, setOwnerUsername] = useState<string | null>(null)
    const [posts,       setPosts]       = useState<any[]>([])

    // Professional Services & Booking
    const [profServices,    setProfServices]    = useState<any[]>([])
    const [availability,    setAvailability]    = useState<any[]>([])
    const [selectedService, setSelectedService] = useState<any | null>(null)
    const [bookingForm,     setBookingForm]     = useState({
        modality: 'presential', scheduledAt: '', address: '', notes: ''
    })
    const [bookingSubmitting, setBookingSubmitting] = useState(false)
    const [bookingSuccess,    setBookingSuccess]    = useState(false)
    const [serviceReviews,    setServiceReviews]    = useState<any[]>([])

    // Schedule Tab State
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0])
    const [scheduleViewMode, setScheduleViewMode] = useState<'day' | 'week'>('day')
    const [scheduleClasses, setScheduleClasses] = useState<any[]>([])
    const [weeklyClasses, setWeeklyClasses] = useState<Record<string, any[]>>({})
    const [bookingClassId, setBookingClassId] = useState<string | null>(null)
    const [hoveredClassId, setHoveredClassId] = useState<string | null>(null)
    const [attendeesList, setAttendeesList] = useState<any[] | null>(null)
    const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)
    const [bookingLoading, setBookingLoading] = useState(false)

    // User Booking Requests
    const [userRequests, setUserRequests] = useState<any[]>([])
    const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null)

    useEffect(() => { loadProfile() }, [id])

    async function loadProfile() {
        const [{ data: org }, { data: { user } }] = await Promise.all([
            // columnas publicas (anon no puede leer '*' tras el hardening RLS)
            supabase.from('organizations').select(PUBLIC_ORG_COLUMNS).eq('id', id).single(),
            supabase.auth.getUser(),
        ])
        if (!org) { router.push('/dashboard/gyms'); return }
        
        // Redirigir a perfil de centro si no es un profesional individual
        if (!isProfessional(org.center_type)) {
            const query = window.location.search;
            router.replace(`/gym/${id}${query}`);
            return;
        }

        setTrainer(org)
        setCurrentUser(user)

        // Fetch owner username
        const { data: ownerProf } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', org.owner_id)
            .single()
        
        setOwnerUsername(ownerProf?.username || null)

        const [plansRes, reviewsRes, followRes, memberRes, postsRes, requestsRes, servicesRes, availRes, svcReviewsRes, clientRes] = await Promise.all([
            supabase.from('membership_plans').select('*').eq('organization_id', id).eq('is_active', true).order('price'),
            supabase.from('center_reviews').select('id, rating, review_text, created_at, profiles:user_id(full_name, username, avatar_url)').eq('organization_id', id).order('created_at', { ascending: false }).limit(10),
            user ? supabase.from('center_followers').select('id').eq('organization_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
            user ? supabase.from('members').select('id, status').eq('center_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
            getCenterPosts(id),
            user ? supabase.from('trial_requests').select('*').eq('organization_id', id).eq('user_id', user.id) : Promise.resolve({ data: null }),
            getPublicProfessionalServices(id),
            getProfessionalAvailability(id),
            getProfessionalReviews(id),
            user ? supabase.from('service_bookings').select('id').eq('professional_id', id).eq('client_id', user.id).not('status', 'in', '(rejected,cancelled)').limit(1).maybeSingle() : Promise.resolve({ data: null }),
        ])

        setPlans(plansRes.data || [])
        setReviews(reviewsRes.data || [])
        setFollowing(!!followRes.data)
        setIsMember((memberRes.data as any)?.status === 'active')
        setMemberId((memberRes.data as any)?.id || null)
        setMemberStatus((memberRes.data as any)?.status || null)
        setIsClient(!!clientRes.data)
        setPosts(postsRes || [])
        setUserRequests(requestsRes?.data || [])
        setProfServices(servicesRes)
        setAvailability(availRes)
        setServiceReviews(svcReviewsRes)
        setLoading(false)
    }

    // Load schedule when tab changes or date changes
    const loadSchedule = async (date: string) => {
        setBookingLoading(true)
        try {
            const promises: Promise<any>[] = []
            if (scheduleViewMode === 'week') {
                const start = new Date(date)
                const end = new Date(date)
                end.setDate(end.getDate() + 6)
                promises.push(getClassesRange(id, start.toISOString(), end.toISOString()))
            } else {
                promises.push(getClassesForDate(id, date))
            }

            if (currentUser) {
                promises.push(supabase.from('trial_requests').select('*').eq('organization_id', id).eq('user_id', currentUser.id))
            }

            const [classesRes, requestsRes] = await Promise.all(promises)

            if (scheduleViewMode === 'week') {
                const grouped: Record<string, any[]> = {}
                // @ts-ignore
                classesRes.forEach((cls: any) => {
                    const dateKey = cls.scheduled_time.split('T')[0]
                    if (!grouped[dateKey]) grouped[dateKey] = []
                    grouped[dateKey].push(cls)
                });
                setWeeklyClasses(grouped)
            } else {
                setScheduleClasses(classesRes || [])
            }

            if (requestsRes) {
                setUserRequests(requestsRes.data || [])
            }
        } catch (e) {
            console.error("Error loading schedule:", e)
        }
        setBookingLoading(false)
    }

    useEffect(() => {
        if (tab === 'schedule') {
            loadSchedule(scheduleDate)
        }
    }, [tab, scheduleDate, scheduleViewMode])

    // Subscription Flow
    async function handleContratar(plan: any) {
        if (!currentUser) {
            router.push('/auth')
            return
        }
        if (isMember) {
            alert("Ya eres miembro de este profesional.")
            return
        }
        setSubscribingPlanId(plan.id)
        const res = await requestMemberPayment(id, plan.id, currentUser.id, {
            email: currentUser.email,
            fullName: currentUser.user_metadata?.full_name || currentUser.email,
            phone: "",
            birth_date: "",
            notes: "Suscripción desde perfil público"
        })
        setSubscribingPlanId(null)
        if (res.error) {
            alert(res.error)
        } else if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl
        } else {
            alert("Solicitud procesada con éxito.")
        }
    }

    // Booking Flow
    async function handleBook(classId: string, userReq: any, clsIsEnrolled = false) {
        if (!currentUser) {
            router.push('/auth')
            return
        }

        if (userReq) {
            if (userReq.status === 'pending') {
                if (!confirm("¿Seguro que deseas cancelar tu solicitud de reserva?")) return
                setBookingClassId(classId)
                const res = await cancelPendingBooking(userReq.id)
                setBookingClassId(null)
                if (res.error) {
                    alert(res.error)
                } else {
                    alert("¡Solicitud de reserva cancelada!")
                    loadSchedule(scheduleDate)
                }
            } else if (userReq.status === 'approved') {
                if (!confirm("¿Seguro que deseas cancelar tu reserva confirmada?")) return
                setBookingClassId(classId)
                const res = await unenrollFromClass(id, classId)
                setBookingClassId(null)
                if (res.error) {
                    alert(res.error)
                } else {
                    alert("¡Reserva cancelada con éxito!")
                    loadSchedule(scheduleDate)
                }
            }
            return
        }

        if (clsIsEnrolled) {
            if (!confirm("¿Seguro que deseas cancelar tu reserva?")) return
            setBookingClassId(classId)
            const res = await unenrollFromClass(id, classId)
            setBookingClassId(null)
            if (res.error) {
                alert(res.error)
            } else {
                alert("¡Reserva cancelada con éxito!")
                loadSchedule(scheduleDate)
            }
            return
        }

        setBookingClassId(classId)
        const res = await bookTrainerSlot(classId, id)
        setBookingClassId(null)

        if (res.error) {
            alert(res.error)
        } else {
            alert("¡Cita solicitada con éxito! El profesional recibirá una notificación para confirmarla.")
            loadSchedule(scheduleDate)
        }
    }

    async function handleViewAttendees(classId: string) {
        if (!isMember) return
        setIsLoadingAttendees(true)
        const list = await getClassAttendees(classId)
        setAttendeesList(list)
        setIsLoadingAttendees(false)
    }

    async function handleServiceBooking() {
        if (!currentUser) { router.push('/auth'); return }
        if (!selectedService) return
        setBookingSubmitting(true)
        const res = await createServiceBooking({
            professionalId: id,
            serviceId: selectedService.id,
            modality: bookingForm.modality,
            scheduledAt: bookingForm.scheduledAt || undefined,
            address: bookingForm.address || undefined,
            notes: bookingForm.notes || undefined,
        })
        setBookingSubmitting(false)
        if (res.error) {
            alert(res.error)
        } else {
            setBookingSuccess(true)
            setSelectedService(null)
            setBookingForm({ modality: 'presential', scheduledAt: '', address: '', notes: '' })
        }
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

    async function handleRequestLeave() {
        if (!memberId) return
        setIsSubmittingLeave(true)
        const res = await requestMemberLeave(id, memberId, leaveReason || undefined)
        setIsSubmittingLeave(false)
        if ((res as any).error) {
            alert((res as any).error)
        } else {
            setLeaveRequested(true)
            setShowLeaveModal(false)
        }
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
    const isOwner = trainer.owner_id === currentUser?.id

    return (
        <div className="min-h-screen bg-black text-white pb-10 flex flex-col items-center px-0 sm:px-4">
            {paymentStatus === 'success_payment' && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 text-center text-sm font-bold rounded-2xl mb-4 mt-4 max-w-4xl w-[92%] shadow-lg">
                    🎉 ¡Pago completado con éxito! Tu suscripción se ha procesado. El profesional se pondrá en contacto contigo pronto.
                </div>
            )}
            {paymentStatus === 'canceled_payment' && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 text-center text-sm font-bold rounded-2xl mb-4 mt-4 max-w-4xl w-[92%] shadow-lg">
                    ⚠️ El proceso de pago ha sido cancelado o ha fallado. Puedes intentarlo de nuevo cuando quieras.
                </div>
            )}
            
            <div className="w-full max-w-4xl border-x border-white/5 bg-zinc-950/40 min-h-screen">
                {/* Back */}
                <div className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-white/5 px-4 flex items-center gap-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 12 }}>
                <button
                    onClick={() => {
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
            <div className="px-4 sm:px-8 py-4 flex flex-wrap gap-3 items-center">
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
                {ownerUsername && (
                    <Link href={`/dashboard/profile/${ownerUsername}`}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white/8 border border-white/10 text-white hover:bg-white/15 hover:border-brand-red/30 transition-colors">
                        <Flame className="w-4 h-4 text-brand-red fill-current" />
                        <span className="hidden sm:inline">Rival Perfil</span>
                    </Link>
                )}
                {memberId && !isOwner && (memberStatus === 'active' || memberStatus === 'trial') && (
                    <button
                        onClick={() => setShowLeaveModal(true)}
                        disabled={leaveRequested}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-colors ${leaveRequested ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' : 'border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5'}`}
                    >
                        {leaveRequested ? 'Baja Solicitada' : 'Solicitar Baja'}
                    </button>
                )}
            </div>

            {/* ── TABS ─────────────────────────────────────────────────── */}
            <div className="px-4 sm:px-8 flex gap-1 border-b border-white/8 overflow-x-auto no-scrollbar">
                {(['about', 'services', 'schedule', 'feed', 'reviews'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex-shrink-0 ${
                            tab === t ? 'border-brand-red text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}>
                        {t === 'about' ? 'Sobre mí' : t === 'services' ? `Servicios (${profServices.length})` : t === 'schedule' ? 'Agenda' : t === 'feed' ? 'Vídeos' : 'Reseñas'}
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

                {/* ── SCHEDULE TAB (AGENDA / BOOKING CALENDAR) ─────── */}
                {tab === 'schedule' && (
                    <div className="space-y-6">
                        <PublicBookingCalendar
                            key={preSelectedServiceId ?? 'default'}
                            professionalId={id}
                            services={profServices}
                            availability={availability}
                            currentUser={currentUser}
                            defaultServiceId={preSelectedServiceId ?? undefined}
                        />
                    </div>
                )}

                {/* ── SCHEDULE TAB OLD (CLASES GIMNASIO) — LEGACY ─── */}
                {false && tab === 'schedule' && (
                    <div className="space-y-6">
                        {/* Header with View Toggle and Date Selection */}
                        <div className="bg-white/5 p-4 md:p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="p-2 rounded-xl bg-white/5">
                                        <Calendar className="w-5 h-5 text-brand-red" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                            {scheduleViewMode === 'day' ? 'Fecha Seleccionada' : 'Desde el día'}
                                        </span>
                                        <input
                                            type="date"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            className="bg-transparent text-white font-black outline-none uppercase tracking-widest text-xs sm:text-sm cursor-pointer w-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <div className="flex p-1 rounded-xl border bg-black/40 border-white/10">
                                        <button
                                            onClick={() => setScheduleViewMode('day')}
                                            className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${scheduleViewMode === 'day' ? 'bg-brand-red text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <List className="w-3.5 h-3.5" /> Día
                                        </button>
                                        <button
                                            onClick={() => setScheduleViewMode('week')}
                                            className={`px-3 sm:px-4 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${scheduleViewMode === 'week' ? 'bg-brand-red text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5" /> Semana
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Day Selector */}
                            {scheduleViewMode === 'day' && (
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {Array.from({ length: 7 }).map((_, i) => {
                                        const d = new Date()
                                        d.setDate(d.getDate() + i)
                                        const active = d.toISOString().split('T')[0] === scheduleDate
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setScheduleDate(d.toISOString().split('T')[0])}
                                                className={`flex-shrink-0 w-12 sm:w-14 h-16 sm:h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${active
                                                    ? 'bg-brand-red border-brand-red text-white shadow-lg scale-105'
                                                    : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                                                </span>
                                                <span className="text-xl font-black italic">{d.getDate()}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {bookingLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Cargando Horarios...</p>
                            </div>
                        ) : scheduleViewMode === 'day' ? (
                            <div className="space-y-4">
                                {scheduleClasses.length === 0 ? (
                                    <div className="text-center py-20 rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
                                        <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                                        <p className="text-sm font-medium text-gray-500 font-bold uppercase tracking-widest">No hay citas ni sesiones programadas para hoy.</p>
                                    </div>
                                ) : (
                                    scheduleClasses.map((cls: any) => {
                                        const userReq = userRequests.find((r: any) => r.class_id === cls.id && r.status !== 'rejected');
                                        const rejectedReq = userRequests.find((r: any) => r.class_id === cls.id && r.status === 'rejected');
                                        const isPending = userReq?.status === 'pending';
                                        const isApproved = userReq?.status === 'approved' || cls.is_enrolled;
                                        const isOccupied = cls.enrolled_count >= cls.max_capacity && !isPending && !isApproved;

                                        return (
                                            <div key={cls.id} className="bg-white/3 p-4 md:p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-brand-red/30 transition-all shadow-xl">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="bg-brand-red/10 text-brand-red text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full flex items-center gap-2">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(cls.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{cls.duration_minutes} min</span>
                                                    </div>
                                                    <h4 className="text-lg font-black italic uppercase tracking-tighter text-white">{cls.name}</h4>
                                                    {rejectedReq && (
                                                        <p className="text-xs text-red-400 font-bold mt-1 max-w-md">
                                                            ❌ Reserva rechazada: "{rejectedReq.feedback_text || 'No se especificó motivo'}"
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-6 justify-between sm:justify-end">
                                                    <div className="text-center shrink-0">
                                                        <span className={`block font-black text-xl italic ${isOccupied ? 'text-red-500' : 'text-green-500'}`}>
                                                            {cls.enrolled_count}/{cls.max_capacity}
                                                        </span>
                                                        <span className="text-[8px] uppercase font-black tracking-widest text-gray-500">Reservados</span>
                                                    </div>

                                                    <button
                                                        onClick={() => handleBook(cls.id, userReq, cls.is_enrolled)}
                                                        onMouseEnter={() => setHoveredClassId(cls.id)}
                                                        onMouseLeave={() => setHoveredClassId(null)}
                                                        disabled={bookingClassId === cls.id || (isOccupied && !isApproved && !isPending)}
                                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            isPending
                                                                ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30'
                                                                : isApproved
                                                                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30'
                                                                    : isOccupied
                                                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                                                                        : 'bg-brand-red text-white hover:bg-red-600 shadow-xl'
                                                            }`}
                                                    >
                                                        {bookingClassId === cls.id ? '...' :
                                                            isPending
                                                                ? (hoveredClassId === cls.id ? 'Cancelar' : 'Pendiente ⏳')
                                                                : isApproved
                                                                    ? (hoveredClassId === cls.id ? 'Cancelar' : 'Reservado ✓')
                                                                    : isOccupied ? 'Completo' : 'Reservar Cita'}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        ) : (
                            /* WEEK VIEW */
                            <div className="space-y-8">
                                {Object.entries(weeklyClasses).map(([date, classes]) => {
                                    const d = new Date(date + 'T12:00:00')
                                    return (
                                        <div key={date} className="relative">
                                            <div className="mb-4 flex items-center gap-4">
                                                <div className="bg-brand-red text-white w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-lg">
                                                    <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                                    <span className="text-lg font-black italic">{d.getDate()}</span>
                                                </div>
                                                <div className="flex-1 h-px bg-white/10" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
                                                    {d.toLocaleDateString('es-ES', { month: 'short' })}
                                                </span>
                                            </div>

                                            <div className="space-y-3 pl-4 border-l border-white/5 ml-6">
                                                {classes.length === 0 ? (
                                                    <p className="text-xs italic text-gray-600 py-2">No hay citas agendadas.</p>
                                                ) : (
                                                    classes.map((cls: any) => (
                                                        <div key={cls.id} className="bg-white/3 p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-brand-red/30 transition-all">
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <span className="text-brand-red text-[11px] font-black tracking-widest">
                                                                        {new Date(cls.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{cls.duration_minutes} MIN</span>
                                                                </div>
                                                                <h5 className="text-md font-black italic uppercase text-white">{cls.name}</h5>
                                                            </div>

                                                            <div className="flex items-center gap-4 justify-between sm:justify-end">
                                                                <div className="text-right">
                                                                    <span className={`block font-black text-sm ${cls.enrolled_count >= cls.max_capacity ? 'text-red-500' : 'text-green-500'}`}>
                                                                        {cls.enrolled_count}/{cls.max_capacity}
                                                                    </span>
                                                                </div>

                                                                <button
                                                                    onClick={() => {
                                                                        setScheduleDate(date)
                                                                        setScheduleViewMode('day')
                                                                    }}
                                                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all text-white"
                                                                >
                                                                    Ver Día
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ── FEED TAB (VIDEOS) ───────────────────────────────── */}
                {tab === 'feed' && (
                    <div className="space-y-6">
                        {isClient || isOwner ? (
                            <div className="space-y-6 max-w-2xl">
                                {posts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                                            <Grid className="w-7 h-7 text-white/20" />
                                        </div>
                                        <p className="font-black text-sm uppercase tracking-widest text-gray-500">Sin publicaciones todavía</p>
                                    </div>
                                ) : (
                                    posts.map((post: any) => (
                                        <GymPostCard
                                            key={post.id}
                                            post={post}
                                            centerId={id}
                                            isAdmin={isOwner}
                                            currentUserId={currentUser?.id}
                                            isMember={isClient || isOwner}
                                        />
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="bg-white/[0.02] border border-white/5 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4 max-w-xl mx-auto mt-6">
                                <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center mb-2 shadow-glow border border-brand-red/20">
                                    <Lock className="w-6 h-6 text-brand-red" />
                                </div>
                                <h3 className="font-heading font-black italic uppercase text-xl text-white">Contenido exclusivo para clientes</h3>
                                <p className="text-xs text-gray-400 font-medium max-w-sm mt-1 leading-relaxed">
                                    Este profesional comparte vídeos, rutinas y consejos exclusivos solo con sus clientes y pacientes con reservas activas.
                                </p>
                                <button
                                    onClick={() => setTab('schedule')}
                                    className="mt-4 px-8 py-3 bg-brand-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg flex items-center gap-2"
                                >
                                    Reservar cita
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── SERVICES TAB ───────────────────────────────────── */}
                {tab === 'services' && (
                    <div className="space-y-6">
                        {bookingSuccess && (
                            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-2xl text-sm font-bold text-center">
                                🎉 ¡Solicitud enviada! El profesional la revisará y recibirás una notificación.
                            </div>
                        )}

                        {/* Availability summary */}
                        {availability.length > 0 && (
                            <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Disponibilidad semanal</h4>
                                <div className="flex flex-wrap gap-2">
                                    {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d, i) => {
                                        const slot = availability.find((a: any) => a.day_of_week === i)
                                        return slot ? (
                                            <div key={i} className="flex flex-col items-center px-3 py-2 bg-brand-red/8 border border-brand-red/20 rounded-xl">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-brand-red">{d}</span>
                                                <span className="text-white text-xs font-bold mt-0.5">{slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)}</span>
                                            </div>
                                        ) : (
                                            <div key={i} className="flex flex-col items-center px-3 py-2 bg-white/2 border border-white/5 rounded-xl opacity-30">
                                                <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">{d}</span>
                                                <span className="text-gray-600 text-xs font-bold mt-0.5">—</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Services list */}
                        {profServices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-white/8 rounded-3xl">
                                <Zap className="w-10 h-10 text-gray-700" />
                                <p className="text-gray-500 text-sm">Sin servicios publicados aún</p>
                            </div>
                        ) : profServices.map((s: any) => (
                            <div key={s.id} className="bg-white/3 border border-white/8 hover:border-brand-red/30 rounded-2xl p-5 transition-all">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-black text-lg">{s.name}</h4>
                                        {s.description && <p className="text-gray-400 text-sm mt-0.5">{s.description}</p>}
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" /> {s.duration_minutes} min</span>
                                            {(s.modalities || []).map((m: string) => {
                                                const mod = SERVICE_MODALITIES.find(x => x.key === m)
                                                return <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-bold">{mod?.icon} {mod?.label}</span>
                                            })}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-brand-red font-black text-2xl">€{Number(s.price).toFixed(2)}</p>
                                        <p className="text-gray-600 text-xs">por sesión</p>
                                    </div>
                                </div>

                                <button onClick={() => {
                                    if (!currentUser) { router.push('/auth'); return }
                                    setPreSelectedServiceId(s.id)
                                    setTab('schedule')
                                }}
                                    className="w-full bg-brand-red text-white py-2.5 rounded-xl font-black text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                                    <Calendar className="w-4 h-4" /> Ver disponibilidad y reservar
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── REVIEWS TAB ────────────────────────────────────── */}
                {tab === 'reviews' && (() => {
                    const allReviews = [
                        ...serviceReviews.map((r: any) => ({
                            id: r.id, rating: r.rating, review_text: r.review_text,
                            created_at: r.created_at, profiles: r.client,
                            source: 'service'
                        })),
                        ...reviews.map((r: any) => ({ ...r, source: 'center' }))
                    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                    const avgAll = allReviews.length > 0
                        ? (allReviews.reduce((s, r) => s + (r.rating || 0), 0) / allReviews.length).toFixed(1)
                        : null

                    return (
                        <div className="space-y-4">
                            {avgAll && (
                                <div className="flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-2xl">
                                    <div className="text-center">
                                        <p className="text-5xl font-black text-white">{avgAll}</p>
                                        <div className="flex gap-0.5 mt-1 justify-center">
                                            {[1,2,3,4,5].map(i => (
                                                <Star key={i} className={`w-4 h-4 ${Number(avgAll) >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                                            ))}
                                        </div>
                                        <p className="text-gray-500 text-xs mt-1">{allReviews.length} reseña{allReviews.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            )}
                            {allReviews.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Star className="w-10 h-10 text-gray-700" />
                                    <p className="text-gray-500 text-sm">Sin reseñas aún</p>
                                </div>
                            ) : allReviews.map((r: any) => (
                                <div key={r.id} className="bg-white/3 border border-white/8 rounded-2xl p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        {r.profiles?.avatar_url
                                            ? <img src={r.profiles.avatar_url} className="w-8 h-8 rounded-full object-cover" alt={r.profiles.full_name} />
                                            : <div className="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red font-black text-xs">{(r.profiles?.full_name || '?')[0]}</div>
                                        }
                                        <div className="flex-1">
                                            <p className="text-white font-bold text-sm">{r.profiles?.full_name || 'Usuario'}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-0.5">
                                                    {[1,2,3,4,5].map(i => (
                                                        <Star key={i} className={`w-3 h-3 ${r.rating >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                                                    ))}
                                                </div>
                                                {r.source === 'service' && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-red/10 text-brand-red font-bold">Servicio verificado</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-xs">{new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                    {r.review_text && <p className="text-gray-300 text-sm">{r.review_text}</p>}
                                </div>
                            ))}
                        </div>
                    )
                })()}
            </div>

            {/* Leave Request Modal */}
            {showLeaveModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111] border border-white/10 text-white rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
                        <button onClick={() => setShowLeaveModal(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="mb-6">
                            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
                                <ArrowLeft className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-xl font-black italic uppercase tracking-tight mb-1">Solicitar Baja</h3>
                            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                                Tu solicitud será enviada a <strong>{trainer.name}</strong>. Te notificará con la decisión. Hasta que sea aprobada, tu relación permanece activa.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-1 block">Motivo (opcional)</label>
                                <textarea
                                    value={leaveReason}
                                    onChange={(e) => setLeaveReason(e.target.value)}
                                    placeholder="Cuéntanos el motivo de tu baja..."
                                    rows={3}
                                    className="w-full rounded-2xl p-4 text-sm resize-none border outline-none focus:border-red-400/50 bg-black/40 border-white/10 text-white placeholder:text-gray-600"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setShowLeaveModal(false)} className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRequestLeave}
                                    disabled={isSubmittingLeave}
                                    className="flex-[2] py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmittingLeave ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Solicitud de Baja'}
                                </button>
                            </div>
                        </div>
                    </div>
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
