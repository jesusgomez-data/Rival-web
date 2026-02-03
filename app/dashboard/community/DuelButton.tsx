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
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                isRival
                    ? "bg-brand-red text-white shadow-[0_4px_15px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95"
                    : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10"
            )}
        >
            {status === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Swords className="w-3.5 h-3.5" />
            )}
            {isRival ? "Desafiar" : "Duelo"}
        </button>
    );
}
