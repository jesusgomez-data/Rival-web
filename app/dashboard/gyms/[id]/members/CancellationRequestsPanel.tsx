'use client'

import { useState } from 'react'
import { LogOut, Check, X, Clock, User, Loader2, MessageSquare } from 'lucide-react'
import { acceptCancellation, rejectCancellation } from '../../cancellation-actions'

interface CancellationRequest {
    id: string
    full_name: string
    cancellation_requested_at: string
    cancellation_reason: string | null
    user_id: string | null
    plan: string | null
    profiles: { full_name: string; avatar_url: string | null; username: string } | null
}

interface Props {
    centerId: string
    requests: CancellationRequest[]
    onUpdate: () => void
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (d > 0) return `hace ${d}d`
    if (h > 0) return `hace ${h}h`
    return `hace ${m}m`
}

export default function CancellationRequestsPanel({ centerId, requests, onUpdate }: Props) {
    const [processing, setProcessing] = useState<string | null>(null)
    const [rejectModal, setRejectModal] = useState<CancellationRequest | null>(null)
    const [rejectMessage, setRejectMessage] = useState('')
    const [toast, setToast] = useState<string | null>(null)

    if (requests.length === 0) return null

    function showToast(msg: string) {
        setToast(msg)
        setTimeout(() => setToast(null), 3000)
    }

    async function handleAccept(req: CancellationRequest) {
        if (!confirm(`¿Confirmar la baja de ${req.profiles?.full_name || req.full_name}? Esta acción no se puede deshacer.`)) return
        setProcessing(req.id)
        const res = await acceptCancellation(req.id, centerId)
        setProcessing(null)
        if (res.error) alert(res.error)
        else { showToast('Baja confirmada y atleta notificado'); onUpdate() }
    }

    async function handleReject() {
        if (!rejectModal) return
        setProcessing(rejectModal.id)
        const res = await rejectCancellation(rejectModal.id, centerId, rejectMessage.trim() || undefined)
        setProcessing(null)
        if (res.error) alert(res.error)
        else {
            setRejectModal(null)
            setRejectMessage('')
            showToast('Solicitud rechazada y atleta notificado')
            onUpdate()
        }
    }

    return (
        <>
            {toast && (
                <div className="fixed top-6 right-6 z-[300] bg-green-500/90 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2">
                    <Check className="w-4 h-4" /> {toast}
                </div>
            )}

            {/* Reject modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <X className="w-4 h-4 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Rechazar Solicitud</h3>
                                <p className="text-[10px] text-gray-500">{rejectModal.profiles?.full_name || rejectModal.full_name}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                Mensaje para el atleta (opcional)
                            </label>
                            <textarea
                                value={rejectMessage}
                                onChange={e => setRejectMessage(e.target.value)}
                                placeholder="Explica el motivo del rechazo..."
                                rows={3}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-brand-red/40 resize-none"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRejectModal(null); setRejectMessage('') }}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!!processing}
                                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Panel */}
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl overflow-hidden mb-6">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-500/10">
                    <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                        {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} de baja pendiente{requests.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="divide-y divide-white/5">
                    {requests.map(req => {
                        const name = req.profiles?.full_name || req.full_name
                        const avatar = req.profiles?.avatar_url
                        const isProcessing = processing === req.id

                        return (
                            <div key={req.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-all">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 relative">
                                    {avatar
                                        ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
                                        : <User className="w-full h-full p-2 text-gray-500" />
                                    }
                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-[#0d0d0d] flex items-center justify-center">
                                        <LogOut className="w-1.5 h-1.5 text-white" />
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white truncate">{name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Clock className="w-3 h-3 text-gray-600" />
                                        <span className="text-[10px] text-gray-500">{timeAgo(req.cancellation_requested_at)}</span>
                                        {req.plan && (
                                            <>
                                                <span className="text-gray-700">·</span>
                                                <span className="text-[10px] text-gray-500 uppercase">{req.plan}</span>
                                            </>
                                        )}
                                    </div>
                                    {req.cancellation_reason && (
                                        <div className="flex items-start gap-1.5 mt-1">
                                            <MessageSquare className="w-3 h-3 text-gray-600 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-gray-400 italic leading-tight">&ldquo;{req.cancellation_reason}&rdquo;</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => setRejectModal(req)}
                                        disabled={isProcessing}
                                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                    >
                                        <X className="w-3 h-3" /> Rechazar
                                    </button>
                                    <button
                                        onClick={() => handleAccept(req)}
                                        disabled={isProcessing}
                                        className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                    >
                                        {isProcessing
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <Check className="w-3 h-3" />
                                        }
                                        Confirmar Baja
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    )
}
