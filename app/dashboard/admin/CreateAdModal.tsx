'use client';

import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, Save, Upload, Loader2, Sparkles } from 'lucide-react';
import { createAd, uploadAdMedia } from './ad-actions';
import { cn } from '@/lib/utils';

interface CreateAdModalProps {
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function CreateAdModal({ open, onClose, onUpdate }: CreateAdModalProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        link_url: '',
        duration_days: 7 // Valor por defecto
    });

    if (!open) return null;

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);
            const url = await uploadAdMedia(uploadData);
            setFormData({ ...formData, image_url: url });
        } catch (error) {
            console.error(error);
            alert('Error al subir archivo');
        } finally {
            setUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await createAd(formData);
            onUpdate();
            onUpdate();
            onClose();
            setFormData({ title: '', description: '', image_url: '', link_url: '', duration_days: 7 });
        } catch (error) {
            console.error(error);
            alert('Error al crear anuncio');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 transition-colors duration-300">
            <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/[0.02]">
                    <h3 className="text-lg font-bold uppercase italic tracking-tighter text-black dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-red" />
                        Nueva Publicidad
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Título del Anuncio</label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Oferta Suplementos"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:border-brand-red outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Descripción corta</label>
                        <input
                            type="text"
                            placeholder="Ej: 20% descuento hoy"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:border-brand-red outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                            <ImageIcon className="w-3 h-3 uppercase" /> Multimedia (Imagen o Video)
                        </label>

                        <div className="flex flex-col gap-3">
                            <input
                                type="url"
                                required
                                placeholder="URL de la imagen/video..."
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-[10px] text-black dark:text-white focus:border-brand-red outline-none transition-all font-mono placeholder:text-gray-400"
                            />

                            <div className="flex items-center gap-2">
                                <div className="h-[1px] flex-1 bg-white/5" />
                                <span className="text-[8px] font-black text-gray-600 uppercase">o también</span>
                                <div className="h-[1px] flex-1 bg-white/5" />
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={handleFileUpload}
                            />

                            <button
                                type="button"
                                disabled={uploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-dashed border-gray-200 dark:border-white/10 hover:border-brand-red/50 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest text-black dark:text-gray-300"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin text-brand-red" /> : <Upload className="w-4 h-4 text-brand-red" />}
                                {formData.image_url ? 'Cambiar Archivo' : 'Subir Imagen/Video'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LinkIcon className="w-3 h-3" /> URL de Destino
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, link_url: '/dashboard/settings/billing' })}
                                className="text-[8px] text-brand-red hover:underline"
                            >
                                Usar Planes Premium
                            </button>
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: https://rival.com/promo o /ruta/interna"
                            value={formData.link_url}
                            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:border-brand-red outline-none transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Duración de la Publicidad (Días)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[3, 7, 15, 30].map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, duration_days: days })}
                                    className={cn(
                                        "py-2 rounded-xl text-[10px] font-black uppercase transition-all border",
                                        formData.duration_days === days
                                            ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20"
                                            : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10"
                                    )}
                                >
                                    {days} Días
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-[10px] text-gray-500 italic">
                        * Este anuncio solo será visible para atletas con plan GRATIS.
                    </p>

                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="w-full bg-brand-red hover:bg-red-600 py-4 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-brand-red/20 active:scale-[0.98]"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Publicar Anuncio
                    </button>
                </form>
            </div>
        </div>
    );
}
