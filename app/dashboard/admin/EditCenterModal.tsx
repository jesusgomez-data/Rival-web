'use client';

import { useState } from 'react';
import { X, Save, Trash2, Edit } from 'lucide-react';
import { updateOrganizationPlan, deleteOrganization } from './actions';
import Image from 'next/image';

interface EditCenterModalProps {
    open: boolean;
    onClose: () => void;
    center: any;
    onUpdate: () => void;
}

export default function EditCenterModal({ open, onClose, center, onUpdate }: EditCenterModalProps) {
    const [loading, setLoading] = useState(false);

    if (!open || !center) return null;

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const plan = formData.get('plan') as string;

        await updateOrganizationPlan(center.id, plan);

        setLoading(false);
        onUpdate();
        onClose();
    }

    async function handleDelete() {
        if (!confirm('¿ESTÁS SEGURO? Esta acción borrará el centro y todos sus datos. No se puede deshacer.')) return;
        setLoading(true);
        await deleteOrganization(center.id);
        setLoading(false);
        onUpdate();
        onClose();
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
                        <Edit className="w-5 h-5 text-brand-red" />
                        Editar Centro
                    </h3>
                </div>

                <form onSubmit={handleUpdate} className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/10 rounded-xl overflow-hidden flex items-center justify-center">
                            {center.logo_url ? (
                                <Image src={center.logo_url} width={64} height={64} alt={center.name} className="object-cover w-full h-full" />
                            ) : (
                                <span className="text-2xl font-black text-gray-500">{(center.name || 'C')[0]}</span>
                            )}
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white">{center.name}</h4>
                            <p className="text-xs text-gray-500">{center.city || 'Ubicación no definida'}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Plan de Suscripción</label>
                        <select
                            name="plan"
                            defaultValue={center.plan || 'free'}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none appearance-none"
                        >
                            <option className="bg-[#0a0a0a]" value="free">Rival Free (0€)</option>
                            <option className="bg-[#0a0a0a]" value="starter">Rival Starter (49.99€)</option>
                            <option className="bg-[#0a0a0a]" value="pro">Rival Pro (99.99€)</option>
                        </select>
                    </div>

                    {/* Future: Add Stripe Subscription Status / Cancel Link here */}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex-1 bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-gray-400 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-brand-red hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
