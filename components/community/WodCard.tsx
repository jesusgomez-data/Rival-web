"use client";

import { motion, AnimatePresence } from "framer-motion";
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
import { useState, useEffect } from "react";
import { WodBlock, WodFormat, WodSummary, ExerciseEntry } from "../training/WodCreator";
import { cn } from "@/lib/utils";
import { getWodResults } from "@/app/dashboard/community/actions";
import Link from "next/link";
import Image from "next/image";

interface WodData {
    title: string;
    blocks: WodBlock[];
    summary: WodSummary;
    media_url?: string | null;
}

interface WodCardProps {
    data: WodData;
    userName: string;
    publishDate?: string;
}

const FORMAT_CONFIG: Partial<Record<WodFormat, { label: string, color: string, icon: any }>> = {
    'EMOM': { label: 'EMOM', color: 'text-brand-red', icon: Timer },
    'AMRAP': { label: 'AMRAP', color: 'text-brand-orange', icon: Repeat },
    'FOR TIME': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    'INTERVALS': { label: 'INTERVALOS', color: 'text-brand-red', icon: Zap },
    'TABATA': { label: 'TABATA', color: 'text-brand-orange', icon: Zap },
    'DEATH BY': { label: 'DEATH BY', color: 'text-red-600', icon: Trophy }
};

const DEFAULT_CONFIG = { label: 'WOD', color: 'text-green-500', icon: Target };

export default function WodCard({ data, userName, publishDate }: WodCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showRanking, setShowRanking] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [isLoadingResults, setIsLoadingResults] = useState(false);

    useEffect(() => {
        if (showRanking) {
            handleFetchResults();
        }
    }, [showRanking]);

    const handleFetchResults = async () => {
        setIsLoadingResults(true);
        try {
            const dataResults = await getWodResults(data.title);
            setResults(dataResults);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingResults(false);
        }
    };

    if (!data.blocks || data.blocks.length === 0) return null;

    return (
        <div className="w-full bg-black/40 border border-white/5 rounded-[32px] overflow-hidden group hover:border-brand-red/30 transition-all shadow-2xl relative">
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
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-brand-red text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded">CROSS TRAINING</span>
                            <span className="text-white/60 text-[8px] font-bold uppercase tracking-widest">{data.blocks.length} BLOQUES</span>
                        </div>
                        <h3 className="text-xl md:text-3xl font-heading font-black italic uppercase tracking-tighter text-white drop-shadow-lg leading-tight truncate">
                            {data.title || 'WORKOUT OF THE DAY'}
                        </h3>
                        {publishDate && (
                            <p className="text-[8px] md:text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] mt-0.5">
                                {publishDate}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-brand-red hover:border-brand-red transition-all shrink-0 ml-4"
                    >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* WOD Content */}
            <div className={cn(
                "p-4 md:p-6 transition-all duration-500 overflow-hidden",
                isExpanded ? "max-h-[3000px] opacity-100 py-4 md:py-6" : "max-h-0 opacity-0 py-0"
            )}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.blocks.map((block: WodBlock, bIdx: number) => {
                        const config = FORMAT_CONFIG[block.format] || DEFAULT_CONFIG;
                        const Icon = config.icon;

                        return (
                            <div key={block.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.05] transition-colors flex flex-col justify-between group/block">
                                <div>
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn("p-1.5 rounded-lg bg-white/5 border border-white/5", config.color)}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white">
                                                {block.format}
                                            </h4>
                                        </div>
                                        {block.title && block.title !== 'METCON' && !block.title.startsWith('BLOCK') && (
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{block.title}</span>
                                        )}
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
                                    <div className="space-y-4 border-t border-white/5 pt-4">
                                        {block.exercises.map((ex: ExerciseEntry, exIdx: number) => (
                                            <div key={ex.id} className="space-y-2">
                                                <div className="flex items-center justify-between gap-2 group-hover/block:translate-x-1 transition-transform">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1 h-1 rounded-full bg-brand-red" />
                                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-tight">{ex.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {ex.reps && <span className="text-[10px] font-black text-white uppercase tracking-widest">{ex.reps}</span>}
                                                        {ex.reps && ex.detail && <span className="text-[10px] font-black text-gray-600">X</span>}
                                                        {ex.detail && <span className="text-[10px] font-black text-brand-red uppercase tracking-widest">{ex.detail}{ex.unit}</span>}
                                                    </div>
                                                </div>

                                                {ex.roundDetails && ex.roundDetails.length > 0 && (
                                                    <div className="ml-4 grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-2 bg-black/20 rounded-xl border border-white/5">
                                                        {ex.roundDetails.map((detail: string, rIdx: number) => detail ? (
                                                            <div key={rIdx} className="flex flex-col gap-0.5">
                                                                <span className="text-[6px] font-bold text-gray-600 uppercase text-center">R{rIdx + 1}</span>
                                                                <span className="text-[8px] font-black text-white text-center bg-white/5 rounded py-0.5">{detail}{ex.unit || 'KG'}</span>
                                                            </div>
                                                        ) : null)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Workout Summary Section */}
                {data.summary && (
                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-red/10 border border-brand-red/20 rounded-2xl">
                                <Trophy className="w-6 h-6 text-brand-red" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">PUNTUACIÓN FINAL</p>
                                <h4 className="text-xl font-heading font-black italic uppercase tracking-tighter text-white">
                                    {data.summary.scoreLabel || 'PENDIENTE'}
                                </h4>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="bg-brand-red/5 border border-brand-red/10 rounded-2xl px-6 py-4 flex items-center gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">TIPO</span>
                                    <span className="text-xs font-black text-brand-red uppercase tracking-widest">{data.summary.scoreType}</span>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">TIEMPO TOTAL</span>
                                    <span className="text-xs font-black text-white italic tracking-tighter">{data.summary.totalTime}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('repost-wod', { detail: data }));
                                    }}
                                    className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl px-6 py-4 flex items-center gap-2 transition-all active:scale-95 group/repost"
                                >
                                    <Repeat className="w-4 h-4 text-brand-red group-hover/repost:rotate-180 transition-transform duration-500" />
                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">REPOSTEAR WOD</span>
                                </button>

                                <button
                                    onClick={() => setShowRanking(true)}
                                    className="bg-brand-red/10 hover:bg-brand-red/20 border border-brand-red/20 rounded-2xl px-6 py-3 flex items-center justify-center gap-2 transition-all active:scale-95 group/ranking"
                                >
                                    <Trophy className="w-3.5 h-3.5 text-brand-red animate-bounce" />
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">VER RANKING DE LA ARENA</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Expand Hint */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 border-t border-white/5 hover:text-brand-red transition-all hover:bg-white/5"
                >
                    CLICK PARA VER DETALLES DEL ENTRENAMIENTO
                </button>
            )}

            {/* Ranking Modal */}
            <AnimatePresence>
                {showRanking && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRanking(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl relative z-10"
                        >
                            {/* Modal Header */}
                            <div className="p-6 bg-gradient-to-br from-brand-red/20 to-transparent border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <p className="text-[8px] text-brand-red font-black uppercase tracking-[0.3em] mb-1">TABLA DE RESULTADOS</p>
                                    <h3 className="text-xl font-heading font-black italic uppercase tracking-tighter text-white truncate max-w-[250px]">
                                        {data.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowRanking(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                >
                                    <ChevronDown className="w-5 h-5 rotate-180" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {isLoadingResults ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                                        <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Calculando posiciones...</p>
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="space-y-2">
                                        {results.map((res, index) => (
                                            <div key={res.id} className="flex items-center gap-4 bg-white/[0.03] border border-white/5 p-3 rounded-2xl hover:bg-white/[0.05] transition-all group">
                                                <div className="w-6 text-center font-heading font-black italic text-brand-red text-lg">
                                                    #{index + 1}
                                                </div>
                                                <Link href={`/dashboard/profile/${res.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-full border border-white/10 bg-black overflow-hidden relative group-hover:border-brand-red/50 transition-colors">
                                                        {res.avatarUrl ? (
                                                            <Image src={res.avatarUrl} alt={res.username} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] bg-gray-800 font-black text-gray-500 italic">
                                                                {res.username?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-black text-white uppercase tracking-tight truncate">{res.fullName || res.username}</h4>
                                                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">@{res.username}</p>
                                                    </div>
                                                </Link>
                                                <div className="text-right">
                                                    <p className="text-sm font-heading font-black italic text-brand-red leading-none">{res.score}</p>
                                                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{res.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center space-y-3">
                                        <Trophy className="w-12 h-12 text-gray-800 mx-auto" />
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">No hay resultados publicados para este WOD todavía.</p>
                                        <p className="text-[8px] text-brand-red font-black uppercase tracking-[0.2em]">¡SÉ EL PRIMERO EN REPOSTEAR!</p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-white/5 border-t border-white/5">
                                <p className="text-[8px] text-gray-600 text-center font-bold uppercase tracking-widest px-10">
                                    Los resultados se basan en los reposts públicos realizados en la comunidad.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
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
