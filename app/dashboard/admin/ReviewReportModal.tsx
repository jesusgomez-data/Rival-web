'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewReportModalProps {
    open: boolean;
    onClose: () => void;
    report: any;
    onUpdate: () => void;
    onAction: (id: string, action: 'ignore' | 'delete' | 'ban', targetType: string, targetId: string) => Promise<void>;
}

export default function ReviewReportModal({ open, onClose, report, onUpdate, onAction }: ReviewReportModalProps) {
    const [loading, setLoading] = useState<'ignore' | 'delete' | 'ban' | null>(null);

    if (!open || !report) return null;

    async function handleAction(action: 'ignore' | 'delete' | 'ban') {
        setLoading(action);
        try {
            await onAction(report.id, action, report.type.toLowerCase(), report.target);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Error al ejecutar la acción de moderación');
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 p-2">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold italic uppercase text-white flex items-center gap-2">
                        <AlertTriangle className={cn("w-5 h-5", report.severity === 'high' ? "text-red-500" : "text-yellow-500")} />
                        Moderar Reporte
                    </h3>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-white font-bold">@{report.user}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-black">Identificación del reporte</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Motivo del Reporte</label>
                                <div className="text-sm text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5">
                                    {report.reason || "Sin descripción proporcionada."}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Objetivo</label>
                                    <div className="text-xs text-white font-mono truncate">{report.target}</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Fecha</label>
                                    <div className="text-xs text-white font-mono">{report.date}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {report.status !== 'Resolved' && (
                            <>
                                <button
                                    onClick={() => handleAction('delete')}
                                    disabled={!!loading}
                                    className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-red-600/20"
                                >
                                    {loading === 'delete' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Eliminar Contenido
                                </button>
                                <button
                                    onClick={() => handleAction('ban')}
                                    disabled={!!loading}
                                    className="w-full bg-red-900/20 hover:bg-red-900 text-red-400 hover:text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-red-900/30"
                                >
                                    {loading === 'ban' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="w-4 h-4" />}
                                    Banear Usuario
                                </button>
                                <button
                                    onClick={() => handleAction('ignore')}
                                    disabled={!!loading}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/5"
                                >
                                    {loading === 'ignore' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Ignorar / Marcar Resuelto
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { Trash2, Shield } from 'lucide-react';

