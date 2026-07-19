"use client";

import {
    Clock,
    Timer,
    Repeat,
    Zap,
    Target,
    Trophy,
    ChevronDown,
    ChevronUp,
    Edit2,
    Activity
} from "lucide-react";
import { fetchWodCompletion } from "@/lib/wod-completion-cache";
import { useState, useEffect, useCallback, memo } from "react";
import { WodBlock, WodFormat, WodSummary, ExerciseEntry, WorkoutCategory } from "../training/WodCreator";
import { cn } from "@/lib/utils";
import WODLeaderboardModal from "@/components/WODLeaderboardModal";
import WODTrackerModal from "@/components/WODTrackerModal";

interface WodData {
    title: string;
    blocks: WodBlock[];
    summary: WodSummary;
    media_url?: string | null;
    category?: WorkoutCategory;
    // Session metrics as fallback for endurance cards (distance in meters, pace as string)
    metrics?: { distance?: number; pace?: string; elevation?: number; time?: string; duration?: number; splits?: { km: number; paceSecondsPerKm: number }[] } | null;
}

interface WodCardProps {
    data: WodData;
    userName: string;
    publishDate?: string;
    postId?: string;
    completionsCount?: number;
    hasCompleted?: boolean;
    isOfficial?: boolean;
    authorAvatar?: string;
}

const FORMAT_CONFIG: Partial<Record<WodFormat, { label: string, color: string, icon: any }>> = {
    'EMOM': { label: 'EMOM', color: 'text-brand-red', icon: Timer },
    'AMRAP': { label: 'AMRAP', color: 'text-brand-orange', icon: Repeat },
    'FOR TIME': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    'ROUNDS FOR TIME': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    '21-15-9': { label: 'POR TIEMPO', color: 'text-blue-500', icon: Clock },
    'INTERVALS': { label: 'INTERVALOS', color: 'text-brand-red', icon: Zap },
    'TABATA': { label: 'TABATA', color: 'text-brand-orange', icon: Zap },
    'DEATH BY': { label: 'DEATH BY', color: 'text-red-600', icon: Trophy },
    // Endurance
    'CARRERA LIBRE': { label: 'CARRERA LIBRE', color: 'text-cyan-400', icon: Activity },
    'INTERVALOS': { label: 'INTERVALOS', color: 'text-brand-red', icon: Repeat },
    'FARTLEK': { label: 'FARTLEK', color: 'text-yellow-400', icon: Zap },
    'TEMPO': { label: 'TEMPO', color: 'text-blue-400', icon: Timer },
    'SERIES': { label: 'SERIES', color: 'text-brand-red', icon: Target },
    'TRAIL': { label: 'TRAIL', color: 'text-green-400', icon: Activity },
};

const ENDURANCE_CATEGORIES: WorkoutCategory[] = ['RUNNING', 'CYCLING', 'SWIMMING'];

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

function WodCard({ data, userName, publishDate, postId, completionsCount = 0, hasCompleted: initialHasCompleted = false, isOfficial = false, authorAvatar }: WodCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showWODLeaderboard, setShowWODLeaderboard] = useState(false);
    const [showWODTracker, setShowWODTracker] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(initialHasCompleted);
    const [, setIsLoadingStatus] = useState(false);
    const [userCompletion, setUserCompletion] = useState<any>(null);

    const originalWodPostId = (data as any).original_wod_post_id;

    const checkCompletionStatus = useCallback(async () => {
        const targetWodId = originalWodPostId || postId;
        if (!targetWodId) return;
        setIsLoadingStatus(true);
        try {
            // Caché de sesión compartida: una sola llamada por WOD,
            // aunque la tarjeta se monte 20 veces (fix del N+1 de Sentry)
            const { completion } = await fetchWodCompletion(targetWodId);
            if (completion) {
                setHasCompleted(true);
                setUserCompletion(completion);
            }
        } catch {
            /* silencioso: sin red no hay estado de completado */
        } finally {
            setIsLoadingStatus(false);
        }
    }, [postId, originalWodPostId]);

    useEffect(() => {
        if (!postId && !originalWodPostId) return;
        checkCompletionStatus();
    }, [checkCompletionStatus]);

    if (!data.blocks || data.blocks.length === 0) return null;

    const isEndurance = ENDURANCE_CATEGORIES.includes(data.category || 'CROSS_TRAINING');

    // --- RENDERIZADO ENDURANCE (RUNNING, CYCLING, SWIMMING) ---
    if (isEndurance) {
        const firstBlock = data.blocks[0];
        const config = firstBlock?.config || {};
        
        // Fallback distance/pace from session metrics (for live-session running posts)
        const sessionDistM = data.metrics?.distance || 0;
        const sessionDistKm = sessionDistM > 0 ? (sessionDistM / 1000).toFixed(2) : null;
        const sessionPace = data.metrics?.pace || null;
        const sessionTime = data.metrics?.time || (data.metrics?.duration
            ? `${Math.floor(data.metrics.duration / 60)}:${String(data.metrics.duration % 60).padStart(2, '0')}`
            : null);

        // Mapeo de métricas por deporte
        const metricsMap = {
            'RUNNING': {
                distUnit: 'KM',
                paceLabel: 'RITMO',
                paceUnit: '/KM',
                paceValue: config.pace || sessionPace || '--:--',
                distValue: config.distance?.split(' ')[0] || sessionDistKm || (data.summary?.scoreType === 'DISTANCE' ? data.summary.scoreLabel : '--')
            },
            'CYCLING': {
                distUnit: 'KM',
                paceLabel: 'VELOCIDAD',
                paceUnit: 'KM/H',
                paceValue: config.pace || sessionPace || '--',
                distValue: config.distance?.split(' ')[0] || sessionDistKm || (data.summary?.scoreType === 'DISTANCE' ? data.summary.scoreLabel : '--')
            },
            'SWIMMING': {
                distUnit: 'M',
                paceLabel: 'RITMO',
                paceUnit: '/100M',
                paceValue: config.pace || sessionPace || '--:--',
                distValue: config.distance?.split(' ')[0] || sessionDistKm || (data.summary?.scoreType === 'DISTANCE' ? data.summary.scoreLabel : '--')
            }
        };

        const sportMetrics = metricsMap[data.category as keyof typeof metricsMap] || metricsMap['RUNNING'];

        return (
            <div className={cn(
                "w-full bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden group hover:border-brand-red/30 transition-all shadow-2xl relative keep-all dark-section font-sans",
                isExpanded ? "ring-2 ring-brand-red/20" : ""
            )}>
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                {/* Strava Header */}
                <div className="relative p-6 z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <span className={cn("text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded shadow-glow-sm", CATEGORY_CONFIG[data.category || 'CROSS_TRAINING'].color)}>
                                {CATEGORY_CONFIG[data.category || 'CROSS_TRAINING'].label}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-brand-red animate-pulse" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">{userName} SESSION</span>
                        </div>
                        <div className="bg-white/5 px-2 py-1 rounded-full border border-white/5 flex items-center gap-2">
                            <Activity className="w-2.5 h-2.5 text-brand-red/50" />
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-tighter italic">GPS_SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="mb-4 flex items-end justify-between">
                        <div className="min-w-0">
                            <h3 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none group-hover:text-brand-red transition-colors">
                                {data.title || 'ENDURANCE SESSION'}
                            </h3>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">{publishDate || 'PREMIUM ACTIVITY PERFORMANCE'}</p>
                        </div>
                    </div>

                    {/* Main Stats Grid - Strava Inspired (Persistent in both states) */}
                    <div className={cn(
                        "grid grid-cols-3 gap-4 border-y border-white/5 py-8 relative transition-all duration-500",
                        isExpanded ? "bg-white/[0.02] -mx-6 px-6 mb-8" : "mb-6"
                    )}>
                        <div className="space-y-1">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Distancia</span>
                            <div className="flex items-baseline gap-1 font-mono">
                                <span className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter">
                                    {sportMetrics.distValue}
                                </span>
                                <span className="text-sm font-black text-brand-red italic uppercase">{sportMetrics.distUnit}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-1 border-x border-white/5 px-4">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{sportMetrics.paceLabel}</span>
                            <div className="flex items-baseline gap-1 font-mono">
                                <span className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter">
                                    {sportMetrics.paceValue}
                                </span>
                                <span className="text-[10px] md:text-xs font-black text-brand-red italic uppercase">{sportMetrics.paceUnit}</span>
                            </div>
                        </div>

                        <div className="space-y-1 pl-4">
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tiempo</span>
                            <div className="flex items-baseline gap-1 font-mono">
                                <span className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter">
                                    {data.summary?.totalTime || sessionTime || '--:--'}
                                </span>
                                <span className="text-sm font-black text-brand-red italic uppercase">MIN</span>
                            </div>
                        </div>
                    </div>

                    {/* EXPANDED CONTENT: Analysis, Splits, Charts */}
                    {isExpanded && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-10 pb-6">
                            {/* Splits per km chart - real GPS data */}
                            <div className="space-y-4">
                                {(() => {
                                    const splits = (data.metrics as any)?.splits as { km: number; paceSecondsPerKm: number }[] | undefined;
                                    const hasRealSplits = splits && splits.length >= 2;
                                    let barHeights: number[] = [];
                                    let paceLabels: string[] = [];
                                    if (hasRealSplits) {
                                        const paces = splits.map(s => s.paceSecondsPerKm);
                                        const minP = Math.min(...paces);
                                        const maxP = Math.max(...paces);
                                        const range = maxP - minP || 1;
                                        barHeights = paces.map(p => Math.round(20 + ((maxP - p) / range) * 75));
                                        paceLabels = paces.map(p => {
                                            const m = Math.floor(p / 60);
                                            const s = Math.round(p % 60);
                                            return `${m}:${s < 10 ? '0' + s : s}`;
                                        });
                                    }
                                    return (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <Activity className="w-3.5 h-3.5 text-brand-red" />
                                                    SPLITS POR KILÓMETRO
                                                </h4>
                                                <span className="text-[8px] font-bold text-gray-500 uppercase">
                                                    {hasRealSplits ? `${splits.length} KM · GPS REAL` : 'SIN DATOS DE SPLITS'}
                                                </span>
                                            </div>
                                            <div className="h-24 w-full bg-white/[0.02] rounded-2xl border border-white/5 relative overflow-hidden group/chart">
                                                {hasRealSplits ? (
                                                    <div className="absolute inset-0 flex items-end justify-between px-2 pb-1 gap-1">
                                                        {barHeights.map((h, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-full bg-brand-red/30 rounded-t-sm group-hover/chart:bg-brand-red/50 transition-all hover:!bg-brand-red relative group/bar"
                                                                style={{ height: `${h}%` }}
                                                            >
                                                                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[6px] font-black text-white/60 opacity-0 group-hover/bar:opacity-100 whitespace-nowrap transition-opacity">
                                                                    {paceLabels[i]}/km
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Los próximos runs mostrarán splits reales</span>
                                                    </div>
                                                )}
                                                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5 border-dashed border-t border-white/10" />
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Splits / Blocks */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
                                    <Target className="w-3.5 h-3.5 text-brand-red" />
                                    DETALLE DE BLOQUES Y SPLITS
                                </h4>
                                <div className="grid gap-4">
                                    {data.blocks.map((block, bIdx) => (
                                        <div key={bIdx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.05] transition-all relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3 opacity-5">
                                                <span className="text-4xl font-black italic">{bIdx + 1}</span>
                                            </div>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                                                <div>
                                                    <span className="text-[9px] font-black text-brand-red uppercase tracking-widest bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/10">{block.format}</span>
                                                    <h5 className="text-lg font-black text-white italic uppercase tracking-tight mt-1">{block.title}</h5>
                                                </div>
                                                <div className="flex gap-6">
                                                    {block.config?.work && (
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-bold text-gray-500 uppercase">TRABAJO</span>
                                                            <span className="text-xs font-black text-white">{block.config.work}</span>
                                                        </div>
                                                    )}
                                                    {block.config?.rest && (
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-bold text-gray-500 uppercase">REST</span>
                                                            <span className="text-xs font-black text-gray-400">{block.config.rest}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {block.exercises && block.exercises.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                                    {block.exercises.map((ex, eIdx) => (
                                                        <div key={eIdx} className="flex items-center justify-between text-[11px] font-bold text-gray-400 group/ex">
                                                            <span className="group-hover/ex:text-white transition-colors uppercase italic">• {ex.name}</span>
                                                            {ex.reps && <span className="text-white">{ex.reps} {ex.detail}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-8 mt-10 flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('repost-wod', { 
                                            detail: { ...data, postId: (data as any).original_wod_post_id || postId }
                                        }));
                                    }}
                                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-4 flex items-center justify-center gap-3 transition-all active:scale-95 group/rep"
                                >
                                    <Repeat className="w-4 h-4 text-brand-red group-hover/rep:rotate-180 transition-transform duration-500" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Repostear Actividad</span>
                                </button>
                                {postId && (
                                    <button
                                        onClick={() => setShowWODLeaderboard(true)}
                                        className="flex-1 bg-brand-red/10 hover:bg-brand-red/20 border border-brand-red/20 rounded-2xl py-4 flex items-center justify-center gap-3 transition-all active:scale-95"
                                    >
                                        <Trophy className="w-4 h-4 text-brand-red animate-pulse" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Ver Ranking del Tramo</span>
                                    </button>
                                )}
                            </div>

                            <button 
                                onClick={() => setIsExpanded(false)}
                                className="w-full py-4 text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors border-t border-white/5 mt-6"
                            >
                                <ChevronUp className="w-4 h-4 inline-block mr-2" /> CERRAR DETALLES
                            </button>
                        </div>
                    )}
                    {/* COLLAPSED CONTENT: Action Hint */}
                    {!isExpanded && (
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="w-full flex items-center justify-center gap-2 text-[9px] font-black text-gray-600 uppercase tracking-widest hover:text-white transition-colors py-3 bg-white/[0.02] rounded-xl border border-dashed border-white/5 hover:border-brand-red/30"
                        >
                            <Activity className="w-3.5 h-3.5 text-brand-red" />
                            Click para ver analítica de ritmo y bloques
                        </button>
                    )}

                    {/* Modals for Tracking and Leaderboard (Endurance View) */}
                    {postId && (
                        <>
                            <WODTrackerModal
                                wodPostId={(data as any).original_wod_post_id || postId || ""}
                                wodTitle={data.title || "WOD"}
                                scoreType={data.summary?.scoreType}
                                hasTimecap={Array.isArray(data.blocks) && data.blocks.some((b: any) => !!b?.config?.timecap)}
                                defaultPartner={(data as any).partner || null}
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
            </div>
        );
    }

    // ── Official "WOD del día" premium card ──────────────────────────────────
    if (isOfficial) {
        const catCfg = CATEGORY_CONFIG[data.category || 'CROSS_TRAINING'];
        const firstBlock = data.blocks?.[0];
        const formatLabel = firstBlock ? (FORMAT_CONFIG[firstBlock.format]?.label || firstBlock.format) : 'WOD';
        const formatColor = firstBlock ? (FORMAT_CONFIG[firstBlock.format]?.color || 'text-brand-red') : 'text-brand-red';
        const exercisePreview = firstBlock?.exercises?.slice(0, 4) ?? [];

        return (
            <div className="w-full bg-[#0d0d0d] border border-white/8 rounded-3xl overflow-hidden shadow-2xl keep-all dark-section">
                <div className="p-4 flex gap-4 items-stretch">
                    {/* Left: cover / avatar */}
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-red/30 to-black border border-white/10">
                        {data.media_url ? (
                            <img src={data.media_url} alt="WOD" className="w-full h-full object-cover" />
                        ) : authorAvatar ? (
                            <img src={authorAvatar} alt={userName} className="w-full h-full object-cover grayscale" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">{catCfg.icon}</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <span className={cn("absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded text-white", catCfg.color)}>
                            {catCfg.icon}
                        </span>
                    </div>

                    {/* Right: content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 mb-0.5">Próximo entrenamiento</p>
                            <h3 className="text-base font-black text-white leading-tight truncate">{data.title || 'WOD del día'}</h3>
                            <p className={cn("text-xs font-bold mt-0.5", formatColor)}>{formatLabel}</p>
                        </div>
                        <div className="space-y-0.5">
                            {exercisePreview.map((ex, i) => (
                                <p key={i} className="text-xs text-gray-400 truncate">
                                    {ex.reps ? <span className="text-white font-bold mr-1">{ex.reps}</span> : null}{ex.name}
                                </p>
                            ))}
                            {(firstBlock?.exercises?.length ?? 0) > 4 && (
                                <p className="text-[10px] text-gray-600">+{(firstBlock?.exercises?.length ?? 0) - 4} más...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* CTA button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full bg-brand-red hover:bg-red-600 active:scale-[0.98] transition-all text-white py-3.5 px-4 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest"
                >
                    {isExpanded ? 'Ocultar entrenamiento' : 'Ver entrenamiento'} <span className="text-base leading-none">→</span>
                </button>

                {/* Expandable details */}
                {isExpanded && (
                    <div className="border-t border-white/5">
                        <div className="p-4 space-y-3">
                            {data.blocks.map((block) => {
                                const cfg = FORMAT_CONFIG[block.format] || DEFAULT_CONFIG;
                                const Icon = cfg.icon;
                                return (
                                    <div key={block.id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-3">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", cfg.color)}>{block.format}</span>
                                            {block.config?.timecap && <span className="text-[9px] text-gray-500 font-bold">· {block.config.timecap} TIME CAP</span>}
                                            {block.config?.rounds && <span className="text-[9px] text-gray-500 font-bold">· {block.config.rounds} RONDAS</span>}
                                        </div>
                                        <div className="space-y-2">
                                            {block.exercises && block.exercises.map((ex) => (
                                                <div key={ex.id} className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-300 font-medium">{ex.name}</span>
                                                    <div className="flex items-center gap-1">
                                                        {ex.reps && <span className="text-xs font-black text-white">{ex.reps}</span>}
                                                        {ex.detail && <span className="text-xs font-black text-brand-red">{ex.detail}{ex.unit}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Leaderboard / Track */}
                        {postId && (
                            <div className="px-4 pb-4 flex gap-2">
                                <button
                                    onClick={() => setShowWODTracker(true)}
                                    className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                                >
                                    Registrar resultado
                                </button>
                                <button
                                    onClick={() => setShowWODLeaderboard(true)}
                                    className="flex-1 py-2.5 bg-brand-red/10 border border-brand-red/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-red hover:bg-brand-red/20 transition-all"
                                >
                                    Ver ranking
                                </button>
                            </div>
                        )}

                        {postId && (
                            <>
                                <WODTrackerModal
                                    wodPostId={(data as any).original_wod_post_id || postId}
                                    wodTitle={data.title || "WOD"}
                                    scoreType={data.summary?.scoreType}
                                    hasTimecap={Array.isArray(data.blocks) && data.blocks.some((b: any) => !!b?.config?.timecap)}
                                    defaultPartner={(data as any).partner || null}
                                    isOpen={showWODTracker}
                                    onClose={() => setShowWODTracker(false)}
                                    onSuccess={() => window.location.reload()}
                                />
                                <WODLeaderboardModal
                                    wodPostId={(data as any).original_wod_post_id || postId}
                                    wodTitle={data.title || "WOD"}
                                    isOpen={showWODLeaderboard}
                                    onClose={() => setShowWODLeaderboard(false)}
                                />
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full bg-[#111111] border border-white/5 rounded-[32px] overflow-hidden group hover:border-brand-red/30 transition-all shadow-2xl relative keep-all dark-section">
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
                    {data.blocks.map((block: WodBlock) => {
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
                                                {(() => {
                                                    const duration = block.config?.minutes || block.config?.timecap;
                                                    if (duration) {
                                                        const durStr = String(duration).replace(/min|'/gi, '').trim();
                                                        return `${block.format} ${durStr}'`;
                                                    }
                                                    return block.format;
                                                })()}
                                            </h4>
                                        </div>
                                        {block.title && !block.title.startsWith('BLOCK') && (
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
                                    {block.exercises && block.exercises.length > 0 && (
                                        <div className="space-y-4 border-t border-white/5 pt-4">
                                            {block.exercises.map((ex: ExerciseEntry) => (
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
                                    )}
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
                                    {data.summary.scoreType === 'NONE' ? 'FINALIZADO' : (() => {
                                        if (userCompletion) {
                                            const type = userCompletion.completion_type;
                                            if (type === 'time' && userCompletion.completion_time_seconds) {
                                                const mins = Math.floor(userCompletion.completion_time_seconds / 60);
                                                const secs = userCompletion.completion_time_seconds % 60;
                                                return `${mins}:${String(secs).padStart(2, '0')}`;
                                            } else if (type === 'rounds' && userCompletion.rounds_completed !== null && userCompletion.rounds_completed !== undefined) {
                                                return `${userCompletion.rounds_completed} Rds`;
                                            } else if (type === 'reps' && userCompletion.total_reps !== null && userCompletion.total_reps !== undefined) {
                                                return `${userCompletion.total_reps} Reps`;
                                            } else if (type === 'weight' && userCompletion.weight_kg !== null && userCompletion.weight_kg !== undefined) {
                                                return `${userCompletion.weight_kg} kg`;
                                            } else if (userCompletion.score !== null && userCompletion.score !== undefined) {
                                                return `${userCompletion.score}`;
                                            }
                                        }
                                        const label = data.summary?.scoreLabel;
                                        return (label && label !== "Tiempo total o Rondas/Reps completadas") ? label : 'PENDIENTE';
                                    })()}
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
                        scoreType={data.summary?.scoreType}
                        hasTimecap={Array.isArray(data.blocks) && data.blocks.some((b: any) => !!b?.config?.timecap)}
                        defaultPartner={(data as any).partner || null}
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

export default memo(WodCard);
