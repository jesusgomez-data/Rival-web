"use client";

import { motion } from "framer-motion";
import {
    Clock,
    Timer,
    Repeat,
    Zap,
    Target,
    Dumbbell,
    Trophy,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { useState } from "react";
import { WodBlock, WodFormat } from "../training/WodCreator";
import { cn } from "@/lib/utils";

interface WodData {
    title: string;
    blocks: WodBlock[];
    media_url?: string | null;
}

interface WodCardProps {
    data: WodData;
    userName: string;
}

const FORMAT_CONFIG: Record<WodFormat, { label: string, color: string, icon: any }> = {
    'EMOM': { label: 'EMOM', color: 'text-brand-red', icon: Timer },
    'AMRAP': { label: 'AMRAP', color: 'text-brand-orange', icon: Repeat },
    'FOR TIME': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    'INTERVALS': { label: 'INTERVALOS', color: 'text-brand-red', icon: Zap },
    'TABATA': { label: 'TABATA', color: 'text-brand-orange', icon: Zap },
    'QUALITY': { label: 'CALIDAD', color: 'text-green-500', icon: Target },
    'REST': { label: 'DESCANSO', color: 'text-gray-500', icon: Clock },
    'DEATH BY': { label: 'DEATH BY', color: 'text-red-600', icon: Trophy }
};

export default function WodCard({ data, userName }: WodCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!data.blocks || data.blocks.length === 0) return null;

    return (
        <div className="w-full bg-black/40 border border-white/5 rounded-[32px] overflow-hidden group hover:border-brand-red/30 transition-all shadow-2xl">
            {/* Header / Backdrop Image */}
            <div className="relative h-32 md:h-40 bg-gradient-to-br from-brand-red to-brand-orange overflow-hidden">
                {data.media_url ? (
                    <img src={data.media_url} alt="WOD" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Dumbbell className="w-40 h-40 -rotate-12" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-brand-red text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded">CROSS TRAINING</span>
                            <span className="text-white/60 text-[8px] font-bold uppercase tracking-widest">{data.blocks.length} BLOQUES</span>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-heading font-black italic uppercase tracking-tighter text-white drop-shadow-lg">
                            {data.title || 'WORKOUT OF THE DAY'}
                        </h3>
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all"
                    >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* WOD Content */}
            <div className={cn(
                "p-4 md:p-6 transition-all duration-500",
                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 md:max-h-none opacity-0 md:opacity-100 md:block hidden overflow-hidden"
            )}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.blocks.map((block, bIdx) => {
                        const config = FORMAT_CONFIG[block.format] || FORMAT_CONFIG['QUALITY'];
                        const Icon = config.icon;

                        return (
                            <div key={block.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.05] transition-colors flex flex-col justify-between group/block">
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-1.5 rounded-lg bg-white/5 border border-white/5", config.color)}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white">{block.title}</h4>
                                        </div>
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-white/5 border border-white/5", config.color)}>
                                            {config.label}
                                        </span>
                                    </div>

                                    {/* Format Summary (Config) */}
                                    <div className="mb-4 flex flex-wrap gap-3">
                                        {block.format === 'AMRAP' && block.config.timecap && (
                                            <WodMetric icon={<Clock />} label="TIME CAP" value={block.config.timecap} />
                                        )}
                                        {block.format === 'EMOM' && (
                                            <>
                                                <WodMetric icon={<Timer />} label="FREQ" value={block.config.frequency || '1 MIN'} />
                                                <WodMetric icon={<Clock />} label="TOTAL" value={`${block.config.minutes || 15} MIN`} />
                                            </>
                                        )}
                                        {block.format === 'INTERVALS' && (
                                            <>
                                                <WodMetric icon={<Repeat />} label="ROUNDS" value={block.config.rounds?.toString() || '8'} />
                                                <WodMetric icon={<Zap />} label="WORK" value={block.config.work || '40S'} />
                                                <WodMetric icon={<Clock />} label="REST" value={block.config.rest || '20S'} />
                                            </>
                                        )}
                                    </div>

                                    {/* Exercises */}
                                    <div className="space-y-2 border-t border-white/5 pt-4">
                                        {block.exercises.map((ex, exIdx) => (
                                            <div key={ex.id} className="flex items-center justify-between gap-2 group-hover/block:translate-x-1 transition-transform">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1 h-1 rounded-full bg-brand-red" />
                                                    <span className="text-xs font-bold text-gray-300 uppercase tracking-tight">{ex.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-brand-red uppercase tracking-widest">{ex.detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Expand Hint */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="md:hidden w-full py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 border-t border-white/5 hover:text-brand-red transition-colors"
                >
                    TAP PARA VER DETALLES DEL ENTRENAMIENTO
                </button>
            )}
        </div>
    );
}

function WodMetric({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">{label}</span>
            <div className="flex items-center gap-1.5">
                <span className="text-gray-500">{icon && <span className="w-2.5 h-2.5 inline-block">{icon}</span>}</span>
                <span className="text-[10px] font-black text-white italic">{value}</span>
            </div>
        </div>
    );
}
