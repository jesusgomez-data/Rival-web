'use client'

import { useState } from 'react'
import { X, LogOut, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { requestCancellation } from './cancellation-actions'

const REASONS = [
    'Me voy de la ciudad',
    'Cambio de horario / disponibilidad',
    'Motivos económicos',
    'Cambio de centro o entrenador',
    'Lesión o motivos de salud',
    'No estoy satisfecho con el servicio',
    'Otro motivo',
]

interface Props {
    orgId: string
    orgName: string
    orgType: 'gym' | 'professional'
    onClose: () => void
    onSuccess: () => void
}

export default function CancellationRequestModal({ orgId, orgName, orgType, onClose, onSuccess }: Props) {
    const [step, setStep] = useState<'reason' | 'confirm' | 'done'>('reason')
    const [selectedReason, setSelectedReason] = useState('')
    const [customReason, setCustomReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const finalReason = selectedReason === 'Otro motivo' ? customReason.trim() : selectedReason

    async function handleSubmit() {
        setLoading(true)
        setError('')
        const res = await requestCancellation(orgId, finalReason || undefined)
        setLoading(false)
        if (res.error) {
            setError(res.error)
        } else {
            setStep('done')
        }
    }

    const label = orgType === 'professional' ? 'entrenador' : 'centro'

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <LogOut className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Solicitar Baja</h2>
                            <p className="text-[10px] text-gray-500 font-medium">{orgName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* STEP 1: Select reason */}
                    {step === 'reason' && (
                        <div className="space-y-4">
                            <p className="text-xs text-gray-400 font-medium leading-relaxed">
                                Tu solicitud será enviada al {label} para que la gestione.
                                Recibirás una notificación cuando sea procesada.
                            </p>

                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Motivo de la baja (opcional)</label>
                                <div className="space-y-1.5">
                                    {REASONS.map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setSelectedReason(r === selectedReason ? '' : r)}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                                                selectedReason === r
                                                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                                    : 'bg-white/[0.03] border-white/5 text-gray-300 hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>

                                {selectedReason === 'Otro motivo' && (
                                    <textarea
                                        placeholder="Cuéntanos más..."
                                        value={customReason}
                                        onChange={e => setCustomReason(e.target.value)}
                                        rows={3}
                                        className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-red-500/40 resize-none"
                                    />
                                )}
                            </div>

                            <button
                                onClick={() => setStep('confirm')}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                            >
                                Continuar →
                            </button>
                        </div>
                    )}

                    {/* STEP 2: Confirm */}
                    {step === 'confirm' && (
                        <div className="space-y-5">
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-yellow-300 uppercase tracking-wider">¿Confirmas la solicitud?</p>
                                    <p className="text-[11px] text-yellow-500/80 leading-relaxed">
                                        Enviarás una solicitud de baja a <strong className="text-yellow-300">{orgName}</strong>.
                                        Tu membresía permanece activa hasta que el {label} la confirme.
                                    </p>
                                </div>
                            </div>

                            {finalReason && (
                                <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Motivo</p>
                                    <p className="text-xs text-gray-300">{finalReason}</p>
                                </div>
                            )}

                            {error && (
                                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('reason')}
                                    disabled={loading}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Enviar Solicitud
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Done */}
                    {step === 'done' && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight">¡Solicitud Enviada!</h3>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                    {orgName} recibirá tu solicitud y la gestionará.
                                    Te notificaremos cuando sea procesada.
                                </p>
                            </div>
                            <button
                                onClick={() => { onSuccess(); onClose(); }}
                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
