"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Save, Trash2, Calendar, Trophy, Target } from "lucide-react";
import { createChallenge, updateChallenge, deleteChallenge } from "./ranking-actions";
import { clsx } from "clsx";

interface ChallengeAdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    challenge?: any; // If provided, we are editing
    onSuccess: () => void;
}

export default function ChallengeAdminModal({ isOpen, onClose, challenge, onSuccess }: ChallengeAdminModalProps) {
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        xp_reward: 1000,
        goal_type: "xp",
        goal_value: 10000,
        goal_unit: "XP",
        start_date: "",
        end_date: ""
    });

    useEffect(() => {
        if (challenge) {
            setFormData({
                title: challenge.title || "",
                description: challenge.description || "",
                xp_reward: challenge.xp_reward || 1000,
                goal_type: challenge.goal_type || "xp",
                goal_value: challenge.goal_value || 10000,
                goal_unit: challenge.goal_unit || "XP",
                start_date: challenge.start_date ? new Date(challenge.start_date).toISOString().split('T')[0] : "",
                end_date: challenge.end_date ? new Date(challenge.end_date).toISOString().split('T')[0] : ""
            });
        } else {
            setFormData({
                title: "",
                description: "",
                xp_reward: 1000,
                goal_type: "xp",
                goal_value: 10000,
                goal_unit: "XP",
                start_date: "",
                end_date: ""
            });
        }
    }, [challenge, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dataToSubmit = {
            ...formData,
            start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
            end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
        };

        try {
            const res = challenge
                ? await updateChallenge(challenge.id, dataToSubmit)
                : await createChallenge(dataToSubmit);

            if (res.success) {
                onSuccess();
                onClose();
            } else {
                alert(res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!challenge || !confirm("¿Seguro que quieres eliminar este reto?")) return;
        setDeleting(true);
        try {
            const res = await deleteChallenge(challenge.id);
            if (res.success) {
                onSuccess();
                onClose();
            } else {
                alert(res.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-heading font-black text-white italic uppercase tracking-tighter">
                        {challenge ? "Editar Reto" : "Nuevo Reto"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título del Reto</label>
                        <input
                            required
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                            placeholder="Ej: Ruta de los 100km"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descripción</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors min-h-[100px] resize-none"
                            placeholder="Describe el reto para los atletas..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Recompensa (XP)</label>
                            <input
                                type="number"
                                required
                                value={formData.xp_reward}
                                onChange={e => setFormData(prev => ({ ...prev, xp_reward: parseInt(e.target.value) }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Valor Objetivo</label>
                            <input
                                type="number"
                                required
                                value={formData.goal_value}
                                onChange={e => setFormData(prev => ({ ...prev, goal_value: parseFloat(e.target.value) }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Objetivo</label>
                            <select
                                value={formData.goal_type}
                                onChange={e => setFormData(prev => ({ ...prev, goal_type: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                            >
                                <option value="xp">Ganar XP</option>
                                <option value="distance">Distancia (km)</option>
                                <option value="volume">Volumen (kg)</option>
                                <option value="reps">Repeticiones</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Unidad</label>
                            <input
                                value={formData.goal_unit}
                                onChange={e => setFormData(prev => ({ ...prev, goal_unit: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                                placeholder="Ej: km, kg, etc"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha Inicio</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={e => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Fecha Fin</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={e => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-brand-red outline-none transition-colors"
                            />
                        </div>
                    </div>
                </form>

                <div className="p-6 border-t border-white/5 flex gap-3">
                    {challenge && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all disabled:opacity-50"
                        >
                            {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 bg-brand-red hover:bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-glow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {challenge ? "Guardar Cambios" : "Crear Reto"}
                    </button>
                </div>
            </div>
        </div>
    );
}
