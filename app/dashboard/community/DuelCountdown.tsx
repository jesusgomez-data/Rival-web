"use client";

import { useState, useEffect } from "react";
import { Timer, CheckCircle2 } from "lucide-react";

interface DuelCountdownProps {
    endDate: string; // ISO date string: '2026-02-28'
    status: 'active' | 'pending' | 'completed';
}

function formatTimeLeft(endDate: string): {
    text: string;
    urgent: boolean;
    expired: boolean;
    hoursLeft: number;
} {
    // End of the end_date day (23:59:59)
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const now = new Date();
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) {
        return { text: "Terminado", urgent: false, expired: true, hoursLeft: 0 };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hoursLeft = days * 24 + hours;

    if (days > 0) {
        return {
            text: `${days}d ${hours}h ${minutes}m`,
            urgent: days === 0,
            expired: false,
            hoursLeft,
        };
    }
    if (hours > 0) {
        return {
            text: `${hours}h ${minutes}m ${seconds}s`,
            urgent: hours < 6,
            expired: false,
            hoursLeft,
        };
    }
    return {
        text: `${minutes}m ${seconds}s`,
        urgent: true,
        expired: false,
        hoursLeft,
    };
}

export default function DuelCountdown({ endDate, status }: DuelCountdownProps) {
    const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(endDate));

    useEffect(() => {
        if (status !== 'active') return;

        const interval = setInterval(() => {
            setTimeLeft(formatTimeLeft(endDate));
        }, 1000);

        return () => clearInterval(interval);
    }, [endDate, status]);

    if (status === 'completed') {
        return (
            <div className="flex items-center gap-1.5 text-green-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Finalizado</span>
            </div>
        );
    }

    if (status === 'pending') {
        return (
            <div className="flex items-center gap-1.5 text-gray-500">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Pendiente de aceptar</span>
            </div>
        );
    }

    const { text, urgent, expired } = timeLeft;

    if (expired) {
        return (
            <div className="flex items-center gap-1.5 text-yellow-500">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Calculando resultado...</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-1.5 ${urgent ? 'text-yellow-400 animate-pulse' : 'text-brand-red'}`}>
            <Timer className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                {urgent ? '⚡ ' : ''}{text}
            </span>
        </div>
    );
}
