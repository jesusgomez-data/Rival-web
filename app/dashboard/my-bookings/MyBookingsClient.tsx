'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Euro, MessageSquare, Star, Check, Loader2, CreditCard } from 'lucide-react'
import { confirmServiceCompletedByClient, createServiceReview, verifyBookingPayment } from '@/app/dashboard/gyms/professional-service-actions'
import { BOOKING_STATUS_LABELS, SERVICE_MODALITIES } from '@/lib/professional-types'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Props { initialBookings: any[] }

export default function MyBookingsClient({ initialBookings }: Props) {
    const [bookings, setBookings] = useState(initialBookings)
    const [activeTab, setActiveTab] = useState('all')
    const [processing, setProcessing] = useState<string | null>(null)
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    const [reviewModal, setReviewModal] = useState<any | null>(null)
    const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' })
    const searchParams = useSearchParams()

    useEffect(() => {
        const payment = searchParams.get('payment')
        const bookingId = searchParams.get('booking')
        if (payment === 'success') {
            showToast('Pago completado — tu reserva está confirmada', 'success')
            if (bookingId) {
                // Auto-heal: verify payment on load in case webhook didn't fire (especially locally)
                verifyBookingPayment(bookingId).then((res) => {
                    if (res.success && res.status === 'paid') {
                        setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status: 'paid' } : b))
                    }
                })
            }
        }
        if (payment === 'cancelled') showToast('Pago cancelado', 'error')
    }, [searchParams])

    function showToast(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const TABS = [
        { key: 'all',       label: 'Todas' },
        { key: 'pending',   label: 'Pendientes' },
        { key: 'accepted',  label: 'Por pagar' },
        { key: 'paid',      label: 'Pagadas' },
        { key: 'completed', label: 'Completadas' },
    ]

    const filtered = bookings.filter(b => {
        if (activeTab === 'all') return true
        if (activeTab === 'completed') return ['completed', 'paid_out'].includes(b.status)
        return b.status === activeTab
    })

    const toPayCount = bookings.filter(b => b.status === 'accepted').length

    async function handlePay(booking: any) {
        setProcessing(booking.id)
        try {
            const res = await fetch('/api/stripe/service-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId: booking.id }),
            })
            const data = await res.json()
            if (data.error) {
                showToast(data.error, 'error')
            } else if (data.url) {
                window.location.href = data.url
            }
        } catch {
            showToast('Error al procesar el pago', 'error')
        }
        setProcessing(null)
    }

    async function handleConfirmCompleted(booking: any) {
        setProcessing(booking.id)
        const res = await confirmServiceCompletedByClient(booking.id)
        if (res.error) showToast(res.error, 'error')
        else {
            setBookings(bs => bs.map(b => b.id === booking.id ? { ...b, status: res.newStatus } : b))
            showToast('Servicio confirmado — gracias!')
            // Open review modal if newly completed
            if (res.newStatus === 'completed') {
                setReviewModal(booking)
                setReviewForm({ rating: 5, text: '' })
            }
        }
        setProcessing(null)
    }

    async function handleReview() {
        if (!reviewModal) return
        const res = await createServiceReview(reviewModal.id, reviewForm.rating, reviewForm.text)
        if (res.error) showToast(res.error, 'error')
        else {
            showToast('Reseña publicada — gracias!')
            setReviewModal(null)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl animate-fade-in ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Mis Reservas</h2>
                <p className="text-gray-500 text-xs mt-0.5">{bookings.length} reserva{bookings.length !== 1 ? 's' : ''} en total</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-white/5 overflow-x-auto no-scrollbar">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 px-3 -mb-px flex-shrink-0 flex items-center gap-1.5 ${
                            activeTab === t.key ? 'text-white border-brand-red' : 'text-gray-500 border-transparent hover:text-gray-300'
                        }`}>
                        {t.label}
                        {t.key === 'accepted' && toPayCount > 0 && (
                            <span className="bg-brand-red text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">{toPayCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-white/8 rounded-3xl">
                    <Calendar className="w-12 h-12 text-gray-700" />
                    <p className="text-gray-500 font-bold">Sin reservas aquí</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(booking => {
                        const pro = booking.professional || {}
                        const statusInfo = BOOKING_STATUS_LABELS[booking.status] || { label: booking.status, color: 'gray' }
                        const modality = SERVICE_MODALITIES.find(m => m.key === booking.modality)
                        const isProc = processing === booking.id

                        return (
                            <div key={booking.id} className="p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-white/15 transition-all space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {pro.logo_url
                                            ? <img src={pro.logo_url} className="w-10 h-10 rounded-xl object-cover" alt={pro.name} />
                                            : <div className="w-10 h-10 rounded-xl bg-brand-red/20 flex items-center justify-center text-brand-red font-black">
                                                {(pro.name || '?')[0]}
                                              </div>
                                        }
                                        <div>
                                            <Link href={`/trainer/${pro.id}`} className="text-white font-bold text-sm hover:text-brand-red transition-colors">
                                                {pro.name || 'Profesional'}
                                            </Link>
                                            <p className="text-gray-500 text-xs">{booking.service_name}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0 ${
                                        statusInfo.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-400' :
                                        statusInfo.color === 'green'  ? 'bg-green-500/10 text-green-400'  :
                                        statusInfo.color === 'red'    ? 'bg-red-500/10 text-red-400'      :
                                        statusInfo.color === 'blue'   ? 'bg-blue-500/10 text-blue-400'    :
                                        statusInfo.color === 'purple' ? 'bg-purple-500/10 text-purple-400':
                                        'bg-gray-500/10 text-gray-400'
                                    }`}>
                                        {statusInfo.label}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Euro className="w-3 h-3" /> €{Number(booking.service_price).toFixed(2)}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.duration_minutes} min</span>
                                    {modality && <span>{modality.icon} {modality.label}</span>}
                                    {booking.scheduled_at && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(booking.scheduled_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>

                                {booking.rejection_reason && (
                                    <p className="text-red-400 text-xs bg-red-500/5 rounded-xl px-3 py-2">Motivo: {booking.rejection_reason}</p>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-1 flex-wrap">
                                    {/* PAY — show when accepted */}
                                    {booking.status === 'accepted' && (
                                        <button onClick={() => handlePay(booking)} disabled={isProc}
                                            className="flex items-center gap-1.5 px-5 py-2 bg-brand-red/90 hover:bg-brand-red text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50">
                                            {isProc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                                            Pagar €{Number(booking.service_price).toFixed(2)}
                                        </button>
                                    )}

                                    {/* Chat */}
                                    {['paid', 'in_progress', 'completed_by_pro'].includes(booking.status) && (
                                        <Link href={`/dashboard/bookings/${booking.id}`}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-500/20 transition-colors">
                                            <MessageSquare className="w-3.5 h-3.5" /> Chat
                                        </Link>
                                    )}

                                    {/* Confirm completed — after pro marks it done */}
                                    {booking.status === 'completed_by_pro' && (
                                        <button onClick={() => handleConfirmCompleted(booking)} disabled={isProc}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                            {isProc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Confirmar servicio
                                        </button>
                                    )}

                                    {/* Leave review */}
                                    {booking.status === 'completed' && !booking.review_left && (
                                        <button onClick={() => { setReviewModal(booking); setReviewForm({ rating: 5, text: '' }) }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-xs font-bold hover:bg-yellow-500/20 transition-colors">
                                            <Star className="w-3.5 h-3.5" /> Dejar reseña
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Review Modal */}
            {reviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                        <h3 className="text-white font-black text-lg">¿Cómo fue el servicio?</h3>
                        <div className="flex gap-2 justify-center">
                            {[1,2,3,4,5].map(i => (
                                <button key={i} onClick={() => setReviewForm(f => ({ ...f, rating: i }))}
                                    className="transition-transform hover:scale-110">
                                    <Star className={`w-8 h-8 ${reviewForm.rating >= i ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                                </button>
                            ))}
                        </div>
                        <textarea value={reviewForm.text} onChange={e => setReviewForm(f => ({ ...f, text: e.target.value }))}
                            placeholder="Comparte tu experiencia (opcional)..."
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/50 resize-none" />
                        <div className="flex gap-3">
                            <button onClick={() => setReviewModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/5 transition-colors">
                                Omitir
                            </button>
                            <button onClick={handleReview}
                                className="flex-1 py-2.5 rounded-xl bg-brand-red text-white font-bold text-sm hover:bg-red-700 transition-colors">
                                Publicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
