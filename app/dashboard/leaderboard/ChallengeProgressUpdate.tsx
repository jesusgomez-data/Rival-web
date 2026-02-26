"use client";

import { useState } from "react";
import { Loader2, Plus, Save, X } from "lucide-react";
import { updateChallengeProgress } from "./ranking-actions";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

interface ChallengeProgressUpdateProps {
    challengeId: string;
    currentProgress: number;
    targetValue: number;
}

export default function ChallengeProgressUpdate({ challengeId, currentProgress, targetValue }: ChallengeProgressUpdateProps) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(currentProgress || 0);
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const res = await updateChallengeProgress(challengeId, Number(progress));
            if (res.success) {
                setIsEditing(false);
                router.refresh();
            } else {
                alert(res.error || "Error al actualizar progreso");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-white group"
            >
                <Plus className="w-3 h-3 group-hover:text-brand-red transition-colors" /> Actualizar Progreso
            </button>
        );
    }

    return (
        <div className="mt-4 p-4 bg-zinc-900/80 rounded-xl border border-white/10 space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-brand-red">Nuevo Progreso Total</p>
                <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="number"
                        value={progress}
                        onChange={(e) => setProgress(Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-brand-red/50 transition-all font-mono"
                        placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-600 font-bold uppercase">VAL</span>
                </div>
                <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="bg-brand-red text-white px-4 rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center disabled:opacity-50 hover:bg-red-600 transition-colors shadow-glow-sm"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
            </div>

            <p className="text-[10px] text-gray-500 italic">
                Meta: {targetValue} • Actual: {currentProgress}
            </p>
        </div>
    );
}
