
"use client";

import { Trophy, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";

interface PRCardProps {
    userName: string;
    avatarUrl: string;
    sport: string;
    exerciseName: string;
    weight: string;
    unit?: string;
    backgroundImage?: string;
    isStory?: boolean;
}

export default function PRCard({
    userName,
    avatarUrl,
    sport,
    exerciseName,
    weight,
    unit = "kg",
    backgroundImage,
    isStory = false
}: PRCardProps) {
    return (
        <div className={clsx(
            "relative overflow-hidden group shadow-2xl transition-all h-full w-full bg-[#050505] flex flex-col font-sans",
            !isStory && "rounded-[32px] sm:rounded-[48px] border border-white/5"
        )}>
            {/* Background Image / Photo */}
            <div className="absolute inset-0 z-0">
                {backgroundImage ? (
                    <div 
                        className="w-full h-full bg-cover bg-center opacity-80" 
                        style={{ 
                            backgroundImage: `url(${backgroundImage})`,
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red/10 via-black to-black" />
                )}
            </div>

            {/* Technical grid - Very subtle */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Content Layer */}
            <div className={clsx(
                "relative z-10 w-full h-full flex flex-col justify-between",
                isStory ? "p-6 sm:p-10 pt-16 sm:pt-20 pb-16 sm:pb-20" : "p-5 sm:p-8"
            )}>
                
                {/* Header: User Profile (Top Left) */}
                <div className="flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-700">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-[#FF3B3B]/50 p-0.5 sm:p-1 bg-black/20 backdrop-blur-md overflow-hidden relative shadow-xl">
                        <div className="w-full h-full rounded-full overflow-hidden relative">
                            {avatarUrl ? (
                                <Image src={avatarUrl} alt={userName} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-500 bg-gray-900 uppercase">
                                    {userName.substring(0, 2)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-white font-black text-lg sm:text-3xl italic uppercase tracking-tighter leading-none drop-shadow-2xl">
                            {userName}
                        </h2>
                        <p className="text-[8px] sm:text-[10px] font-black text-[#FF3B3B] uppercase tracking-[0.2em] mt-1 sm:mt-1.5 drop-shadow-lg italic flex items-center gap-1">
                            <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" /> ¡NUEVO PR! • {sport.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Compact Information Box (Bottom) */}
                <div className={clsx(
                    "w-full bg-[#121212]/70 backdrop-blur-2xl rounded-[24px] sm:rounded-[40px] p-5 sm:p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all animate-in slide-in-from-bottom-4 duration-700",
                    isStory && "mb-4 sm:mb-8"
                )}>
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex justify-between items-end gap-3">
                            <div className="flex-1 min-w-0">
                                <span className="text-[7px] sm:text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1.5 block opacity-70 italic font-mono">EJERCICIO</span>
                                <h3 className="text-xl sm:text-4xl font-heading font-black text-white italic uppercase tracking-tighter leading-none truncate pr-2">
                                    {exerciseName.replace(/\s/g, '').toUpperCase()}
                                </h3>
                            </div>
                            <div className="flex items-baseline gap-0.5 sm:gap-1 shrink-0">
                                <span className="text-2xl sm:text-5xl font-heading font-black text-[#FF3B3B] italic tracking-tighter leading-none drop-shadow-glow">
                                    {weight}
                                </span>
                                <span className="text-[10px] sm:text-lg font-black text-[#FF3B3B] italic uppercase tracking-tighter">{unit}</span>
                            </div>
                        </div>

                        {/* Minimal Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-0.5">
                                <span className="text-[7px] sm:text-[8px] font-black text-gray-500 uppercase tracking-widest italic">INTENSIDAD</span>
                                <span className="text-[8px] sm:text-[9px] font-black text-[#FF3B3B] italic">95% RPE</span>
                            </div>
                            <div className="h-1.5 sm:h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-[#FF3B3B] rounded-full shadow-[0_0_15px_rgba(255,59,59,0.5)] transition-all duration-1000" style={{ width: '95%' }} />
                            </div>
                        </div>
                    </div>
                </div>


            </div>
            
            {/* Ambient Ambient Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-red/[0.01] blur-[100px] pointer-events-none" />
        </div>
    );
}
