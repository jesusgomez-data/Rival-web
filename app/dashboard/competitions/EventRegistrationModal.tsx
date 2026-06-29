'use client';

import { useState } from 'react';
import { Send, Loader2, X, PlusCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { requestEventRegistration } from './actions';

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md transition-opacity" onClick={onClose} />
            <div className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-lg flex flex-col rounded-[32px] overflow-hidden shadow-2xl shadow-brand-red/10 animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white z-[20] p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="overflow-y-auto max-h-[85vh] custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function EventRegistrationModal() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        try {
            await requestEventRegistration(formData);
            setSent(true);
            setTimeout(() => {
                setOpen(false);
                setSent(false); // Reset
            }, 3000);
        } catch (err: any) {
            alert(err.message || 'Hubo un error al enviar la solicitud.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="bg-white text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-red hover:text-white transition-colors shadow-lg hover:shadow-brand-red/20"
            >
                Registrar Evento
            </button>

            <Modal open={open} onClose={() => setOpen(false)}>
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-r from-brand-red/20 via-brand-red/5 to-transparent border-b border-white/10 p-8 flex flex-col justify-end">
                    <div className="absolute top-0 right-0 p-8 opacity-20">
                        <PlusCircle className="w-24 h-24 text-brand-red -rotate-12" />
                    </div>
                    <h2 className="text-3xl font-heading font-black italic uppercase tracking-tighter text-white relative z-10">
                        Alta de Competición
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest relative z-10">
                        Únete al calendario oficial de Rival
                    </p>
                </div>

                {sent ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                            <Send className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-heading font-black text-white italic uppercase mb-2">¡Solicitud Recibida!</h3>
                        <p className="text-sm text-gray-400 max-w-xs mx-auto font-medium">
                            Nuestro equipo de operaciones revisará los detalles de tu evento y te contactará en breve.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nombre del Evento</label>
                                <input
                                    name="eventName"
                                    required
                                    placeholder="Ej: Gran Fondo Madrid 2026"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-brand-red outline-none focus:bg-white/10 transition-all font-bold placeholder:font-medium placeholder:text-gray-600"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Tipo</label>
                                <select name="type" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-brand-red outline-none appearance-none font-bold">
                                    <option className="bg-black" value="HYROX">Hyrox</option>
                                    <option className="bg-black" value="CROSSFIT">CrossFit</option>
                                    <option className="bg-black" value="OCR">OCR / Obstáculos</option>
                                    <option className="bg-black" value="RUNNING">Running / Trail</option>
                                    <option className="bg-black" value="TRIATHLON">Triatlón</option>
                                    <option className="bg-black" value="OTHER">Otro</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Fecha Estimada</label>
                                <input
                                    type="date"
                                    name="date"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-brand-red outline-none font-bold [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Ubicación / Sede</label>
                                <input
                                    name="location"
                                    required
                                    placeholder="Ciudad, País"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-brand-red outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email de Organización</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="contacto@evento.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-brand-red outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Detalles Adicionales</label>
                                <textarea
                                    name="details"
                                    placeholder="Cuéntanos más sobre el evento, número esperado de atletas, web oficial..."
                                    className="w-full h-24 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-brand-red outline-none resize-none font-medium"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-brand-red hover:bg-red-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            Enviar Solicitud
                        </button>
                    </form>
                )}
            </Modal>
        </>
    );
}
