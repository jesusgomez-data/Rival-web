'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';
import { getEventRequests, approveEventRequest, rejectEventRequest } from './actions';
import { format } from 'date-fns';

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-4xl flex flex-col rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white z-[20] p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="p-8 border-b border-white/5">
                    <h2 className="text-2xl font-heading font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                        <Calendar className="text-brand-red w-6 h-6" /> Aprobaciones Pendientes
                    </h2>
                </div>
                <div className="overflow-y-auto max-h-[70vh] p-8 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function EventRequestsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open) {
            setLoading(true);
            getEventRequests()
                .then(data => { setRequests(data); setLoading(false); })
                .catch(err => { console.error(err); setLoading(false); });
        }
    }, [open]);

    const handleApprove = (id: string) => {
        if (!confirm('¿Estás seguro de que deseas aprobar y publicar este evento en el calendario principal?')) return;
        startTransition(async () => {
            try {
                await approveEventRequest(id);
                setRequests(prev => prev.filter(r => r.id !== id));
            } catch (err: any) {
                alert(err.message || 'Error al aprobar la solicitud');
            }
        });
    };

    const handleReject = (id: string) => {
        if (!confirm('¿Estás seguro de que deseas rechazar este evento?')) return;
        startTransition(async () => {
            try {
                await rejectEventRequest(id);
                setRequests(prev => prev.filter(r => r.id !== id));
            } catch (err: any) {
                alert(err.message || 'Error al rechazar la solicitud');
            }
        });
    };

    return (
        <Modal open={open} onClose={onClose}>
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest text-sm">
                    No hay solicitudes pendientes.
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-brand-red/50 transition-colors">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="bg-brand-red text-white text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider">
                                        {req.type}
                                    </span>
                                    <h3 className="text-xl font-black italic uppercase tracking-tight text-white">{req.event_name}</h3>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                                    <p><strong>Fecha:</strong> {format(new Date(req.date), 'dd/MM/yyyy')}</p>
                                    <p><strong>Ubicación:</strong> {req.location}</p>
                                    <p><strong>Solicitante:</strong> {req.profiles?.username} ({req.contact_email})</p>
                                </div>
                                
                                {req.details && (
                                    <div className="mt-4 p-4 bg-black/40 rounded-xl text-sm text-gray-300">
                                        <strong>Detalles Adicionales:</strong><br/>
                                        {req.details}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-2 justify-center shrink-0">
                                <button 
                                    onClick={() => handleApprove(req.id)}
                                    disabled={isPending}
                                    className="bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <CheckCircle className="w-4 h-4" /> Aprobar y Publicar
                                </button>
                                <button 
                                    onClick={() => handleReject(req.id)}
                                    disabled={isPending}
                                    className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <XCircle className="w-4 h-4" /> Rechazar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
