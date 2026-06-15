'use client'

import { useState } from 'react'
import { Calendar, Check, X, Clock, Euro, MessageSquare, ChevronRight, User, Loader2 } from 'lucide-react'
import { acceptServiceBooking, rejectServiceBooking, confirmServiceCompletedByPro } from '../../professional-service-actions'
import { BOOKING_STATUS_LABELS, SERVICE_MODALITIES } from '@/lib/professional-types'
import Link from 'next/link'

const STATUS_TABS = [
    { key: 'pending',   label: 'Pendientes' },
    { key: 'accepted',  label: 'Aceptadas'  },
    { key: 'paid',      label: 'Pagadas'    },
    { key: 'completed', label: 'Completadas' },
    { key: 'all',       label: 'Todas'      },
]

interface Props {
    organizationId: string
    initialBookings: any[]
}

export default function BookingsManager({ organizationId, initialBookings }: Props) {
    const [bookings, setBookings]       = useState(initialBookings)
    const [activeTab, setActiveTab]     = useState('pending')
    const [rejectModal, setRejectModal] = useState<any | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [processing, setProcessing]   = useState<string | null>(null)
    const [toast, setToast]             = useState<string | null>(null)

    function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

    const filtered = bookings.filter(b => {
        if (activeTab === 'all') return true
        if (activeTab === 'completed') return ['completed', 'paid_out'].includes(b.status)
        return b.status === activeTab
    })

    const pendingCount = bookings.filter(b => b.status === 'pending').length

    async function handleAccept(booking: any) {
        setProcessing(booking.id)
        const res = await acceptServiceBooking(booking.id, organizationId)
        if (res.error) showToast(res.error)
        else {
            setBookings(bs => bs.map(b => b.id === booking.id ? { ...b, status: 'accepted' } : b))
            showToast('Reserva aceptada ✓ — Chat abierto con el cliente')
        }
        setProcessing(null)
    }

    async function handleReject() {
        if (!rejectModal || !rejectReason.trim()) return
        setProcessing(rejectModal.id)
        const res = await rejectServiceBooking(rejectModal.id, organizationId, rejectReason.trim())
        if (res.error) showToast(res.error)
        else {
            setBookings(bs => bs.map(b => b.id === rejectModal.id ? { ...b, status: 'rejected' } : b))
            showToast('Reserva rechazada')
            setRejectModal(null)
            setRejectReason('')
        }
        setProcessing(null)
    }

    async function handleCompleted(booking: any) {
        setProcessing(booking.id)
        const res = await confirmServiceCompletedByPro(booking.id)
        if (res.error) showToast(res.error)
        else {
            setBookings(bs => bs.map(b => b.id === booking.id ? { ...b, status: res.newStatus } : b))
            showToast('Servicio marcado como completado ✓')
        }
        setProcessing(null)
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-xl animate-fade-in">
                    {toast}
                </div>
            )}

            <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Reservas</h2>
                <p className="text-gray-500 text-xs mt-0.5">{bookings.length} reserva{bookings.length !== 1 ? 's' : ''} en total</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-white/5 overflow-x-auto no-scrollbar">
                {STATUS_TABS.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 px-3 -mb-px flex-shrink-0 flex items-center gap-1.5 ${
                            activeTab === t.key ? 'text-white border-brand-red' : 'text-gray-500 border-transparent hover:text-gray-300'
                        }`}>
                        {t.label}
                        {t.key === 'pending' && pendingCount > 0 && (
                            <span className="bg-brand-red text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">{pendingCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-white/8 rounded-3xl">
                    <Calendar className="w-12 h-12 text-gray-700" />
                    <p className="text-gray-500 font-bold">Sin reservas en esta categoría</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(booking => {
                        const client = booking.client || {}
                        const statusInfo = BOOKING_STATUS_LABELS[booking.status] || { label: booking.status, color: 'gray' }
                        const modality = SERVICE_MODALITIES.find(m => m.key === booking.modality)
                        const isProcessing = processing === booking.id

                        return (
                            <div key={booking.id} className="p-4 bg-white/3 border border-white/8 rounded-2xl hover:border-white/15 transition-all space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        {client.avatar_url
                                            ? <img src={client.avatar_url} className="w-10 h-10 rounded-xl object-cover" alt={client.full_name} />
                                            : <div className="w-10 h-10 rounded-xl bg-brand-red/20 flex items-center justify-center text-brand-red font-black">
                                                {(client.full_name || '?')[0]}
                                              </div>
                                        }
                                        <div>
                                            <p className="text-white font-bold text-sm">{client.full_name || client.username || 'Cliente'}</p>
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

                                {booking.notes && (
                                    <p className="text-gray-500 text-xs italic bg-white/3 rounded-xl px-3 py-2">"{booking.notes}"</p>
                                )}

                                {booking.rejection_reason && (
                                    <p className="text-red-400 text-xs bg-red-500/5 rounded-xl px-3 py-2">Motivo rechazo: {booking.rejection_reason}</p>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-1 flex-wrap">
                                    {booking.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleAccept(booking)} disabled={isProcessing}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                Aceptar
                                            </button>
                                            <button onClick={() => { setRejectModal(booking); setRejectReason('') }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-colors">
                                                <X className="w-3.5 h-3.5" /> Rechazar
                                            </button>
                                        </>
                                    )}

                                    {['accepted', 'paid', 'in_progress'].includes(booking.status) && (
                                        <>
                                            <Link href={`/dashboard/bookings/${booking.id}`}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-500/20 transition-colors">
                                                <MessageSquare className="w-3.5 h-3.5" /> Chat
                                            </Link>
                                            {booking.status === 'paid' && (
                                                <button onClick={() => handleCompleted(booking)} disabled={isProcessing}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-50">
                                                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                                    Marcar completado
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {['completed', 'paid_out'].includes(booking.status) && (
                                        <div className="flex items-center gap-1.5 text-xs text-green-400 font-bold">
                                            <Check className="w-3.5 h-3.5" />
                                            {booking.status === 'paid_out' ? `Cobrado €${Number(booking.professional_payout_amount).toFixed(2)}` : 'Completado · Esperando pago'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                        <h3 className="text-white font-black text-lg">Rechazar reserva</h3>
                        <p className="text-gray-400 text-sm">El cliente recibirá una notificación con el motivo.</p>
                        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/50 resize-none" />
                        <div className="flex gap-3">
                            <button onClick={() => setRejectModal(null)}
                                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/5 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleReject} disabled={!rejectReason.trim() || !!processing}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechazar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
