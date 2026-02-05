'use client';

import { useState } from 'react';
import { X, Save, Trash2, User, Shield } from 'lucide-react';
import { updateUserPlan } from './actions';
import Image from 'next/image';

interface EditUserModalProps {
    open: boolean;
    onClose: () => void;
    user: any;
    onUpdate: () => void;
}

export default function EditUserModal({ open, onClose, user, onUpdate }: EditUserModalProps) {
    const [loading, setLoading] = useState(false);

    if (!open || !user) return null;

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const tier = formData.get('tier') as string;

        await updateUserPlan(user.id, tier);

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
                        <User className="w-5 h-5 text-brand-red" />
                        Editar Atleta
                    </h3>
                </div>

                <form onSubmit={handleUpdate} className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/10 rounded-full overflow-hidden flex items-center justify-center border-2 border-brand-red/20">
                            {user.avatar_url ? (
                                <Image src={user.avatar_url} width={64} height={64} alt={user.full_name} className="object-cover w-full h-full" />
                            ) : (
                                <span className="text-2xl font-black text-gray-500">{(user.full_name || 'U')[0]}</span>
                            )}
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white">{user.full_name || 'Sin Nombre'}</h4>
                            <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                            <p className="text-[10px] text-brand-red uppercase font-black tracking-widest mt-1">Nivel {user.level || 'Recluta'}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suscripción Atleta</label>
                        <select
                            name="tier"
                            defaultValue={user.subscription_tier || 'free'}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none appearance-none"
                        >
                            <option className="bg-[#0a0a0a]" value="free">Free (Gratis)</option>
                            <option className="bg-[#0a0a0a]" value="premium">Premium ($4.99)</option>
                            <option className="bg-[#0a0a0a]" value="elite">Elite ($9.99)</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
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
