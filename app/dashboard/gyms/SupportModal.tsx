'use client';

import { useState } from 'react';
import { HelpCircle, Send, Loader2, X } from 'lucide-react';
import { createSupportTicket } from '@/app/dashboard/admin/support-actions';

import { createPortal } from 'react-dom';

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center p-4 pt-12">
            <div className="fixed inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose} />
            <div className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-sm max-h-[85vh] flex flex-col rounded-[24px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-in slide-in-from-top-10 duration-500">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white z-[20] p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

export default function SupportModal({ trigger }: { trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const category = formData.get('category') as string;
        const subject = formData.get('subject') as string;
        const message = formData.get('message') as string;

        const res = await createSupportTicket(subject, message, category);

        setLoading(false);
        if (res.success) {
            setSent(true);
            setTimeout(() => {
                setOpen(false);
                setSent(false); // Reset for next time
            }, 2000);
        } else {
            alert("Error: " + res.error);
        }
    }

    return (
        <>
            {trigger ? (
                <div onClick={() => setOpen(true)} className="cursor-pointer h-full w-full flex items-center justify-center">
                    {trigger}
                </div>
            ) : (
                <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors group">
                    <HelpCircle className="w-4 h-4 group-hover:text-brand-red transition-all" />
                    <span>Ayuda / Soporte</span>
                </button>
            )}

            <Modal open={open} onClose={() => setOpen(false)}>
                <div className="p-6 border-b border-white/10 bg-gradient-to-br from-brand-red/10 via-transparent to-transparent relative overflow-hidden">
                    <h2 className="text-xl font-heading font-black italic uppercase tracking-tighter text-white">Reportar Incidencia</h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Soporte Técnico</p>
                </div>

                {sent ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                            <Send className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">¡Reporte Enviado!</h3>
                        <p className="text-sm text-gray-400">El equipo técnico revisará tu caso en breve.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Categoría</label>
                            <select name="category" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none appearance-none">
                                <option className="bg-black" value="technical">Fallo Técnico / Bug</option>
                                <option className="bg-black" value="billing">Facturación</option>
                                <option className="bg-black" value="account">Cuenta y Accesos</option>
                                <option className="bg-black" value="feature">Sugerencia</option>
                                <option className="bg-black" value="other">Otro</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Asunto</label>
                            <input
                                name="subject"
                                required
                                placeholder="Ej: No puedo subir el logo..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Detalles</label>
                            <textarea
                                name="message"
                                required
                                placeholder="Describe el problema con detalle..."
                                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none resize-none"
                            />
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-brand-red hover:bg-red-600 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Enviar Reporte
                        </button>
                    </form>
                )}
            </Modal>
        </>
    );
}
