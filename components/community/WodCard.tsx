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
    ChevronUp,
    Edit2,
    Activity
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { WodBlock, WodFormat, WodSummary, ExerciseEntry, WorkoutCategory } from "../training/WodCreator";
import { cn, isImageUrl } from "@/lib/utils";
import { getWodResults } from "@/app/dashboard/community/actions";
import Link from "next/link";
import Image from "next/image";
import WODLeaderboardModal from "@/components/WODLeaderboardModal";
import WODTrackerModal from "@/components/WODTrackerModal";

interface WodData {
    title: string;
    blocks: WodBlock[];
    summary: WodSummary;
    media_url?: string | null;
    category?: WorkoutCategory;
}

interface WodCardProps {
    data: WodData;
    userName: string;
    publishDate?: string;
    postId?: string;
    completionsCount?: number;
    hasCompleted?: boolean;
}

const FORMAT_CONFIG: Partial<Record<WodFormat, { label: string, color: string, icon: any }>> = {
    'EMOM': { label: 'EMOM', color: 'text-brand-red', icon: Timer },
    'AMRAP': { label: 'AMRAP', color: 'text-brand-orange', icon: Repeat },
    'FOR TIME': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    'ROUNDS FOR TIME': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    '21-15-9': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    'INTERVALS': { label: 'INTERVALOS', color: 'text-brand-red', icon: Zap },
    'TABATA': { label: 'TABATA', color: 'text-brand-orange', icon: Zap },
    'DEATH BY': { label: 'DEATH BY', color: 'text-red-600', icon: Trophy }
};

const DEFAULT_CONFIG = { label: 'WOD', color: 'text-green-500', icon: Target };

const CATEGORY_CONFIG: Record<WorkoutCategory, { label: string, color: string, icon: string, gradient: string }> = {
    'CROSS_TRAINING': { label: 'CROSS TRAINING', color: 'bg-brand-red', icon: '🏋️', gradient: 'from-brand-red to-brand-orange' },
    'RUNNING': { label: 'RUNNING', color: 'bg-blue-600', icon: '🏃', gradient: 'from-blue-600 to-cyan-500' },
    'GYM': { label: 'GYM / MUSCLE', color: 'bg-purple-600', icon: '💪', gradient: 'from-purple-600 to-indigo-500' },
    'OCR': { label: 'OCR / OBSTACLES', color: 'bg-orange-600', icon: '🧗', gradient: 'from-orange-600 to-yellow-500' },
    'HYROX': { label: 'HYROX', color: 'bg-red-700', icon: '🔥', gradient: 'from-red-700 to-orange-600' },
    'CYCLING': { label: 'CYCLING', color: 'bg-green-600', icon: '🚴', gradient: 'from-green-600 to-emerald-500' },
    'SWIMMING': { label: 'SWIMMING', color: 'bg-blue-500', icon: '🏊', gradient: 'from-blue-500 to-blue-300' },
    'YOGA': { label: 'YOGA / MOBILITY', color: 'bg-teal-500', icon: '🧘', gradient: 'from-teal-500 to-emerald-400' },
    'BOXING': { label: 'BOXING', color: 'bg-red-800', icon: '🥊', gradient: 'from-red-800 to-red-600' }
};

export default function WodCard({ data, userName, publishDate, postId, completionsCount = 0, hasCompleted: initialHasCompleted = false }: WodCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showWODLeaderboard, setShowWODLeaderboard] = useState(false);
    const [showWODTracker, setShowWODTracker] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(initialHasCompleted);
    const [isLoadingStatus, setIsLoadingStatus] = useState(false);

    useEffect(() => {
        if (postId || (data as any).original_wod_post_id) {
            checkCompletionStatus();
        }
    }, [postId, data]);

    const checkCompletionStatus = async () => {
        setIsLoadingStatus(true);
        const targetWodId = (data as any).original_wod_post_id || postId;
        if (!targetWodId) {
            setIsLoadingStatus(false);
            return;
        }
        try {
            const response = await fetch(`/api/wod/my-completion?wodPostId=${targetWodId}`);
            const resData = await response.json();
            if (resData.success && resData.completion) {
                setHasCompleted(true);
            }
        } catch (error) {
            console.error("Error checking completion status:", error);
        } finally {
            setIsLoadingStatus(false);
        }
    };

    if (!data.blocks || data.blocks.length === 0) return null;

    return (
        <div className="w-full bg-black/40 border border-white/5 rounded-[32px] overflow-hidden group hover:border-brand-red/30 transition-all shadow-2xl relative">
            {/* Header / Backdrop Image */}
            <div className={cn("relative h-32 md:h-40 overflow-hidden bg-gradient-to-br", CATEGORY_CONFIG[data.category || 'CROSS_TRAINING'].gradient)}>
                {data.media_url ? (
                    <img src={data.media_url} alt="WOD" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-8xl transform -rotate-12 opacity-30 select-none">
                            {CATEGORY_CONFIG[data.category || 'CROSS_TRAINING'].icon}
                        </div>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <div className="absolute top-4 left-6 flex items-center gap-2 z-10">
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-brand-red" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{completionsCount} ATLETAS</span>
                    </div>
                </div>

                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn("text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded", CATEGORY_CONFIG[data.category || 'CROSS_TRAINING'].color)}>
                                {CATEGORY_CONFIG[data.category || 'CROSS_TRAINING'].label}
                            </span>
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
                                    <div className="mb-4 flex flex-wrap gap-4">
                                        {block.config?.rounds && (
                                            <WodMetric icon={<Repeat className="w-full h-full" />} label="RONDAS" value={block.config.rounds.toString()} />
                                        )}
                                        {block.config?.timecap && (
                                            <WodMetric icon={<Clock className="w-full h-full" />} label="TIME CAP" value={block.config.timecap} />
                                        )}
                                        {(block.format === 'EMOM' || block.format === 'DEATH BY') && (
                                            <>
                                                <WodMetric icon={<Timer className="w-full h-full" />} label="FREQ" value={block.config?.frequency || '1 MIN'} />
                                                <WodMetric icon={<Clock className="w-full h-full" />} label="TOTAL" value={`${block.config?.minutes || 15} MIN`} />
                                            </>
                                        )}
                                        {(block.format === 'INTERVALS' || block.format === 'TABATA') && (
                                            <>
                                                <WodMetric icon={<Zap className="w-full h-full" />} label="WORK" value={block.config?.work || '20S'} />
                                                <WodMetric icon={<Clock className="w-full h-full" />} label="REST" value={block.config?.rest || '10S'} />
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
                                    {data.summary.scoreType === 'NONE' ? 'COMPLETADO' : (data.summary.scoreLabel || 'PENDIENTE')}
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
                                <div className="flex gap-2">
                                    {hasCompleted && (
                                        <button
                                            onClick={() => {
                                                if (postId) {
                                                    setShowWODTracker(true);
                                                } else {
                                                    window.dispatchEvent(new CustomEvent('repost-wod', { 
                                                        detail: {
                                                            ...data,
                                                            postId: postId
                                                        } 
                                                    }));
                                                }
                                            }}
                                            className={cn(
                                                "flex-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl px-6 py-4 flex items-center justify-center gap-2 transition-all active:scale-95 group/track",
                                                "border-green-500/50 hover:bg-green-500/5"
                                            )}
                                        >
                                            <Edit2 className="w-4 h-4 text-green-500" />
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">
                                                EDITAR MI RESULTADO
                                            </span>
                                        </button>
                                    )}

                                    {postId && (
                                        <button
                                            onClick={() => {
                                                window.dispatchEvent(new CustomEvent('repost-wod', { 
                                                    detail: {
                                                        ...data,
                                                        postId: (data as any).original_wod_post_id || postId
                                                    }
                                                }));
                                            }}
                                            className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl px-4 py-4 flex items-center justify-center transition-all active:scale-95 group/repost"
                                            title="Repostear en mi muro"
                                        >
                                            <Repeat className="w-4 h-4 text-brand-red group-hover/repost:rotate-180 transition-transform duration-500" />
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest ml-2">REPOSTEAR</span>
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        if (postId) {
                                            setShowWODLeaderboard(true);
                                        } else {
                                            alert("La funcionalidad de ranking requiere un ID de publicación válido.");
                                        }
                                    }}
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

            {/* Modals for Tracking and Leaderboard */}
            {postId && (
                <>
                    <WODTrackerModal
                        wodPostId={(data as any).original_wod_post_id || postId || ""}
                        wodTitle={data.title || "WOD"}
                        wodType={data.summary?.scoreType?.toUpperCase() === 'TIME' ? 'time' : 'rounds'}
                        isOpen={showWODTracker}
                        onClose={() => setShowWODTracker(false)}
                        onSuccess={() => window.location.reload()}
                    />
                    <WODLeaderboardModal
                        wodPostId={(data as any).original_wod_post_id || postId || ""}
                        wodTitle={data.title || "WOD"}
                        isOpen={showWODLeaderboard}
                        onClose={() => setShowWODLeaderboard(false)}
                    />
                </>
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
