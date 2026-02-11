"use client";

import { useState } from "react";
import { Swords, Loader2, CheckCircle2 } from "lucide-react";
import { createDuel } from "./duel-actions";
import clsx from "clsx";

interface DuelButtonProps {
    targetId: string;
    isRival?: boolean;
}

export default function DuelButton({ targetId, isRival }: DuelButtonProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

    const handleDuel = async () => {
        setStatus('loading');
        const res = await createDuel(targetId);
        if (res.success) {
            setStatus('sent');
        } else {
            setStatus('idle');
            alert(res.error || "Error al enviar el desafío.");
        }
    };

    if (status === 'sent') {
        return (
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-red/10 text-brand-red rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-red/20 opacity-80 cursor-default">
                <CheckCircle2 className="w-3.5 h-3.5" /> Duelo Enviado
            </button>
        );
    }

    return (
        <button
            onClick={handleDuel}
            disabled={status === 'loading'}
            className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                isRival
                    ? "bg-gradient-to-r from-brand-red to-red-600 text-white shadow-[0_8px_20px_rgba(220,38,38,0.4)] hover:scale-105 hover:shadow-[0_8px_25px_rgba(220,38,38,0.5)] active:scale-95"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
            )}
        >
            {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Swords className="w-4 h-4" />
            )}
            {isRival ? "Desafiar" : "Duelo"}
        </button>
    );
}
