'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Megaphone, AlertCircle } from 'lucide-react';
import { createAnnouncement } from './actions';

interface BroadcastModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BroadcastModal({ open, onClose, onSuccess }: BroadcastModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;

        setLoading(true);
        setError('');
        try {
            await createAnnouncement(title, content);
            setTitle('');
            setContent('');
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al enviar comunicado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shadow-lg shadow-brand-red/20">
                                        <Megaphone className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-heading font-black italic uppercase tracking-tighter">Broadcast Global</h2>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Comunicado a toda la comunidad</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Título del Mensaje</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Ej: Nueva actualización del sistema..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-brand-red outline-none transition-all placeholder:text-gray-600 font-bold"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Contenido del Mensaje</label>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Escribe aquí el mensaje que verán todos los usuarios..."
                                        rows={5}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:border-brand-red outline-none transition-all placeholder:text-gray-600 font-bold resize-none"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !title || !content}
                                    className="w-full bg-brand-red hover:bg-brand-accent disabled:opacity-50 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] uppercase text-xs tracking-widest"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" /> Lanzar Comunicado
                                        </>
                                    )}
                                </button>

                                <p className="text-[9px] text-gray-500 font-bold uppercase text-center italic">
                                    * Este mensaje será enviado como notificación push a todos los usuarios registrados.
                                </p>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
