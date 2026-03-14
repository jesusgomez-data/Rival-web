
"use client";

import Image from "next/image";
import { Trophy, Dumbbell, MessageCircle } from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "../../ThemeContext";
import { isImageUrl, cn } from "@/lib/utils";

interface PRCardProps {
    userName: string;
    avatarUrl: string;
    sport: string; // e.g., 'Cross Training'
    exerciseName: string; // e.g., 'Back Squat'
    weight: string; // e.g., '140'
    unit?: string; // e.g., 'kg'
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
    const { theme } = useTheme();

    return (
        <div className={clsx(
            "relative overflow-hidden group shadow-2xl transition-all",
            isStory ? "w-full h-full dark-section" : "w-full aspect-square md:aspect-video rounded-[32px] border border-white/5 bg-black dark-section"
        )}>
            {/* Background Image with Overlay */}
            {backgroundImage && isImageUrl(backgroundImage) ? (
                <Image
                    src={backgroundImage}
                    alt="PR Background"
                    fill
                    className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-brand-gray to-black opacity-80" />
            )}

            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6 md:p-10 pointer-events-none">

                {/* Floating Rank Mockup (Top Right) - Optional and just for aesthetic if needed */}
                {!isStory && (
                    <div className="absolute top-6 right-6 border p-4 rounded-2xl shadow-xl z-20 w-32 md:w-40 bg-black/60 backdrop-blur-md border-white/10 hidden sm:block">
                        <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold text-[8px] md:text-[10px] uppercase tracking-widest text-gray-400 whitespace-nowrap">RANGO GLOBAL</span>
                        </div>
                        <div className="text-xl md:text-2xl font-heading font-black italic text-white leading-none">#42</div>
                        <div className="text-[9px] md:text-[10px] text-green-500 font-bold mt-1 uppercase tracking-tighter">▲ 3 LUGARES</div>
                    </div>
                )}

                {/* User Info Section */}
                <div className="flex items-center gap-4 mb-6 md:mb-8 animate-in slide-in-from-left-4 duration-500">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full p-0.5 bg-gradient-to-tr from-brand-red to-orange-500 shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden relative border-2 border-black bg-gray-800">
                            {avatarUrl && isImageUrl(avatarUrl) ? (
                                <Image
                                    src={avatarUrl}
                                    alt={userName}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500 bg-black uppercase">
                                    {userName?.substring(0, 2) || "?"}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl md:text-3xl font-heading font-black italic text-white leading-none uppercase tracking-tighter drop-shadow-lg">
                            {userName}
                        </h3>
                        <p className="text-[10px] md:text-xs text-brand-red font-black uppercase tracking-[0.2em] mt-1 md:mt-2 drop-shadow-md">
                            NUEVO PR • {sport.toUpperCase()}
                        </p>
                    </div>
                </div>

                {/* Exercise PR Box */}
                <div className="bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-white/10 relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700 delay-100">
                    {/* Interior Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-3xl -mr-10 -mt-10" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-end gap-4">
                            <div className="min-w-0 flex-1">
                                <span className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-1 block italic opacity-70">EJERCICIO</span>
                                <h4 className="text-2xl md:text-4xl font-heading font-black italic text-white uppercase tracking-tighter leading-tight break-words whitespace-normal pr-2">
                                    {exerciseName}
                                </h4>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="text-3xl md:text-5xl font-heading font-black italic text-brand-red leading-none drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                                    {weight}
                                </span>
                                <span className="text-[10px] md:text-xs font-black text-brand-red ml-1 uppercase">{unit}</span>
                            </div>
                        </div>

                        {/* Progress Bar Line */}
                        <div className="w-full bg-white/10 h-1.5 md:h-2 rounded-full overflow-hidden mt-6 md:mt-8 border border-white/5">
                            <div className="bg-brand-red h-full w-[85%] rounded-full shadow-[0_0_15px_rgba(220,38,38,0.6)]"></div>
                        </div>
                    </div>
                </div>

                {/* Action Suggestions (Only for feed, usually not rendered here but we can add placeholders if needed) */}
            </div>
        </div>
    );
}
