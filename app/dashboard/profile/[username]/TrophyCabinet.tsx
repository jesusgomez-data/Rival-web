"use client";

import { useState } from "react";
import { Trophy, Swords, Zap, Dumbbell, Award, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

interface TrophyCabinetProps {
    combatStats: { wins: number };
    profileLevel: number;
}

export default function TrophyCabinet({ combatStats, profileLevel }: TrophyCabinetProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const trophies = [
        { id: 'beast', name: 'Bestia de Hierro', desc: 'Completó 10+ Entrenamientos', icon: <Dumbbell className="w-6 h-6" />, active: true },
        { id: 'gladiator', name: 'Gladiador de Arena', desc: 'Ganó su primer Duelo', icon: <Swords className="w-6 h-6" />, active: combatStats.wins > 0 },
        { id: 'loyal', name: 'Veterano Curtido', desc: 'Miembro desde 2026', icon: <Award className="w-6 h-6" />, active: true },
        { id: 'champion', name: 'Campeón Rival', desc: 'Alcanzó Nivel 5', icon: <Trophy className="w-6 h-6" />, active: profileLevel >= 5 },
    ];

    return (
        <div className="bg-brand-gray/5 md:bg-transparent border md:border-none border-white/5 rounded-3xl p-5 md:p-0 transition-all">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between md:hidden"
            >
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    Vitrina de Trofeos
                </h3>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>

            {/* Desktop Header (Always visible) */}
            <h3 className="hidden md:block text-xs font-black text-gray-500 uppercase tracking-[0.4em] mb-6 ml-4">
                Vitrina de Trofeos
            </h3>

            <div className={clsx(
                "grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 transition-all duration-300 overflow-hidden",
                isExpanded ? "mt-6 max-h-[1000px] opacity-100" : "max-h-0 md:max-h-none opacity-0 md:opacity-100 md:mt-0"
            )}>
                {trophies.map((t) => (
                    <div key={t.id} className={`group relative p-6 rounded-[32px] border transition-all duration-500 flex flex-col items-center justify-center text-center ${t.active ? 'bg-brand-red/5 border-brand-red/20 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'bg-white/5 border-white/5 opacity-40 grayscale'}`}>
                        <div className={`p-4 rounded-2xl mb-4 ${t.active ? 'bg-brand-red/10 text-brand-red' : 'bg-white/5 text-gray-600'}`}>
                            {t.icon}
                        </div>
                        <p className="text-[10px] font-black uppercase text-white tracking-widest">{t.name}</p>
                        <p className="text-[8px] text-gray-500 font-bold mt-1 uppercase leading-tight">{t.desc}</p>

                        {t.active && (
                            <div className="absolute -top-1 -right-1">
                                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
