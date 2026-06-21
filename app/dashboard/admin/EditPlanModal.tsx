'use client';

import { useState } from 'react';
import { X, Save, Zap, HelpCircle } from 'lucide-react';
import { upsertApplicationPlan } from './actions';

interface EditPlanModalProps {
    open: boolean;
    onClose: () => void;
    plan: any;
    onUpdate: () => void;
}

export default function EditPlanModal({ open, onClose, plan, onUpdate }: EditPlanModalProps) {
    const [loading, setLoading] = useState(false);

    if (!open || !plan) return null;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            const name = formData.get('name') as string;
            const price = formData.get('price') as string;
            const features = formData.get('features') as string;
            const type = formData.get('type') as string;

            await upsertApplicationPlan({
                id: plan.id,
                name,
                price,
                features,
                type,
                planKey: plan.planKey || name.toLowerCase().replace(/[^a-z0-9]/g, '_')
            });

            onUpdate();
            onClose();
        } catch (error: any) {
            alert('Error al guardar el plan: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors duration-300">
            <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white z-10 p-2">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
                    <h3 className="text-lg font-bold italic uppercase text-black dark:text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-brand-red" />
                        {plan.id ? 'Editar Plan' : 'Crear Nuevo Plan'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Nombre del Plan</label>
                            <input
                                type="text"
                                name="name"
                                defaultValue={plan.name}
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:border-brand-red outline-none transition-colors placeholder:text-gray-400"
                                placeholder="Ej: Elite Centro"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Precio Mensual (€)</label>
                            <input
                                type="text"
                                name="price"
                                defaultValue={plan.price}
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:border-brand-red outline-none transition-colors placeholder:text-gray-400"
                                placeholder="Ej: 149.99€"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Características (Separadas por coma)</label>
                            <textarea
                                name="features"
                                defaultValue={plan.features}
                                rows={3}
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:border-brand-red outline-none resize-none transition-colors placeholder:text-gray-400"
                                placeholder="Ej: Soporte 24/7, Usuarios Ilimitados, API Access"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Tipo de Entidad</label>
                            <select
                                name="type"
                                defaultValue={plan.type || 'center'}
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:border-brand-red outline-none appearance-none transition-colors"
                            >
                                <option className="bg-white dark:bg-[#0a0a0a]" value="center">Centro / Organización</option>
                                <option className="bg-white dark:bg-[#0a0a0a]" value="user">Atleta Individual</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider border border-gray-200 dark:border-white/10"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-brand-red hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Guardar Plan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
