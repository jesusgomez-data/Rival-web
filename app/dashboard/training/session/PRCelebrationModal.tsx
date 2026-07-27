
"use client";

import React, { useEffect, useState } from 'react';
import { Trophy, Award, ChevronRight, X, Heart, Star, Flame } from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../../../ThemeContext';
import Image from 'next/image';

interface PRAchievement {
    name: string;
    previousMax: number | null;
    newMax: number;
    improvement: number | null;
}

interface PRCelebrationModalProps {
    achievements: PRAchievement[];
    onClose: () => void;
    userName: string;
}

export default function PRCelebrationModal({ achievements, onClose, userName }: PRCelebrationModalProps) {
    const { theme } = useTheme();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
        // Play celebration sound if available (optional)
    }, []);

    if (achievements.length === 0) return null;

    return (
        <div className={clsx(
            "fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6 backdrop-blur-2xl transition-all duration-500",
            visible ? "opacity-100" : "opacity-0",
            theme === 'dark' ? "bg-black/80" : "bg-white/60"
        )}>
            {/* Animated particles background (simplified) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute animate-bounce opacity-20"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                            animationDelay: `${Math.random() * 2}s`
                        }}
                    >
                        <Star className={clsx("w-4 h-4", i % 2 === 0 ? "text-yellow-500" : "text-brand-red")} />
                    </div>
                ))}
            </div>

            <div className={clsx(
                "w-full max-w-xl relative transform transition-all duration-700 delay-100 flex flex-col max-h-[92vh] sm:max-h-[90vh]",
                visible ? "translate-y-0 scale-100" : "translate-y-12 scale-95",
                theme === 'dark' ? "bg-[#0A0A0A] border border-white/10" : "bg-white border border-gray-100 shadow-2xl",
                "rounded-[40px] overflow-hidden shadow-glow-red"
            )}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Hero Header */}
                <div className="relative min-h-[12rem] md:min-h-[16rem] py-6 flex flex-col items-center justify-center text-center px-4 overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-brand-red/20 to-transparent" />

                    {/* Animated Trophy Icon */}
                    <div className="relative z-10 mb-3 animate-in zoom-in duration-500 delay-300">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-brand-red rounded-full flex items-center justify-center shadow-glow-red">
                            <Trophy className="w-8 h-8 md:w-12 md:h-12 text-white animate-pulse" />
                        </div>
                        {/* Orbiting elements */}
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center animate-bounce">
                            <Star className="w-3.5 h-3.5 text-white fill-current" />
                        </div>
                    </div>

                    <h2 className="text-xl sm:text-2xl md:text-4xl font-heading font-black italic text-brand-red uppercase tracking-tighter leading-tight relative z-10 drop-shadow-lg max-w-full break-words px-4">
                        ¡BRUTAL, {userName}!
                    </h2>
                    <p className="text-[9px] md:text-xs font-black text-gray-500 uppercase tracking-[0.3em] mt-2 relative z-10 italic">
                        HAS SUPERADO TUS LÍMITES
                    </p>
                </div>

                {/* Achievement List */}
                <div className="p-6 md:p-10 space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    {achievements.map((pr, idx) => (
                        <div
                            key={idx}
                            className={clsx(
                                "p-6 rounded-[32px] border flex items-center justify-between group transition-all hover:scale-[1.02]",
                                theme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                            )}
                            style={{ animationDelay: `${500 + (idx * 150)}ms` }}
                        >
                            <div className="flex-1 min-w-0">
                                <span className="text-[9px] font-black text-brand-red uppercase tracking-widest block mb-1">NUEVO RÉCORD</span>
                                <h4 className={clsx("text-lg md:text-xl font-heading font-black italic uppercase truncate", theme === 'dark' ? "text-white" : "text-black")}>
                                    {pr.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-2">
                                    {pr.previousMax != null ? (
                                        <>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Anterior:</span>
                                            <span className="text-[10px] font-black text-gray-400">{pr.previousMax}kg</span>
                                            <div className="w-1 h-1 rounded-full bg-gray-700" />
                                            <span className="text-[10px] font-bold text-green-500 uppercase">+{pr.improvement}kg</span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] font-bold text-green-500 uppercase">Primer récord registrado</span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right ml-4">
                                <div className="text-3xl md:text-4xl font-heading font-black italic text-brand-red leading-none">
                                    {pr.newMax}
                                </div>
                                <span className="text-[10px] font-black text-brand-red uppercase">kg</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Action */}
                <div className="p-8 md:p-10 pt-4 text-center">
                    <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-6">La evolución no se detiene. Tu progreso ha sido registrado en tu panel de control.</p>

                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-brand-red text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 group hover:bg-red-600 transition-all shadow-glow-red active:scale-95"
                    >
                        Continuar Entrenamiento <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
