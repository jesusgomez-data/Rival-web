"use client";

import React, { useRef, useState } from 'react';
import { Download, X, Loader2, Send } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { WorkoutBlock } from '@/app/dashboard/training/types';

interface WorkoutShareCardProps {
    blocks: WorkoutBlock[];
    workoutTitle: string;
    sportType: string;
    duration: number;
    durationLabel?: string;
    date: string;
    userName: string;
    onClose: () => void;
    category?: string;
    runMetrics?: { distance?: string; pace?: string; elevation?: string };
    wodBlocks?: any[];
}

type SportKey = 'cross_training' | 'running' | 'gym' | 'ocr' | 'hyrox' | 'cycling' | 'swimming' | 'yoga' | 'boxing';

interface SportCfg {
    label: string; emoji: string; color: string; bg: string;
    accentLabel: string; patternType: 'dots' | 'grid' | 'diagonal' | 'hlines' | 'none';
}

const SPORTS: Record<SportKey, SportCfg> = {
    cross_training: { label: 'CROSS TRAINING', emoji: '🏋️', color: '#ef4444', bg: '#080808', patternType: 'dots',     accentLabel: 'WOD' },
    running:        { label: 'RUNNING',         emoji: '🏃', color: '#3b82f6', bg: '#030810', patternType: 'grid',     accentLabel: 'RUN' },
    gym:            { label: 'GYM · LIFT',       emoji: '💪', color: '#a855f7', bg: '#06030f', patternType: 'diagonal', accentLabel: 'STRENGTH' },
    ocr:            { label: 'OCR',              emoji: '🧗', color: '#22c55e', bg: '#020b04', patternType: 'dots',     accentLabel: 'OBSTACLE' },
    hyrox:          { label: 'HYROX',            emoji: '🔥', color: '#f97316', bg: '#080400', patternType: 'grid',     accentLabel: 'RACE' },
    cycling:        { label: 'CYCLING',          emoji: '🚴', color: '#eab308', bg: '#070700', patternType: 'hlines',   accentLabel: 'RIDE' },
    swimming:       { label: 'SWIMMING',         emoji: '🏊', color: '#06b6d4', bg: '#010c10', patternType: 'dots',     accentLabel: 'POOL' },
    yoga:           { label: 'YOGA · MOB',       emoji: '🧘', color: '#c084fc', bg: '#050010', patternType: 'none',     accentLabel: 'FLOW' },
    boxing:         { label: 'BOXING',           emoji: '🥊', color: '#dc2626', bg: '#080000', patternType: 'diagonal', accentLabel: 'COMBAT' },
};

function getSportKey(category?: string, sportType?: string): SportKey {
    const r = (category || sportType || '').toLowerCase().replace(/[\s_/-]/g, '');
    if (r.includes('running') || r.includes('carrera')) return 'running';
    if (r.includes('cycling') || r.includes('ciclismo') || r.includes('bici')) return 'cycling';
    if (r.includes('swimming') || r.includes('natacion')) return 'swimming';
    if (r.includes('hyrox')) return 'hyrox';
    if (r.includes('ocr')) return 'ocr';
    if (r.includes('yoga') || r.includes('mob') || r.includes('movilidad')) return 'yoga';
    if (r.includes('boxing') || r.includes('boxeo') || r.includes('combat')) return 'boxing';
    if (r.includes('gym') || r.includes('musc') || r.includes('fitness') || r.includes('lift')) return 'gym';
    return 'cross_training';
}

const BLOCK_STYLES: Record<string, { label: string; color: string }> = {
    emom:      { label: 'EMOM',            color: '#ef4444' },
    amrap:     { label: 'AMRAP',           color: '#f97316' },
    fortime:   { label: 'FOR TIME',        color: '#eab308' },
    rounds:    { label: 'ROUNDS FOR TIME', color: '#eab308' },
    intervals: { label: 'INTERVALS',       color: '#3b82f6' },
    strength:  { label: 'STRENGTH',        color: '#a855f7' },
    tabata:    { label: 'TABATA',          color: '#ec4899' },
    chipper:   { label: 'CHIPPER',         color: '#06b6d4' },
};

// ─── Exercise detail formatter ────────────────────────────────────────────────
function getExerciseDetail(ex: any): string {
    // Only treat sets as array if it actually is one (not a string/number count)
    const s = Array.isArray(ex.sets) ? ex.sets[0] : undefined;
    if (s) {
        const unit = (s.unit || '').toLowerCase();
        if (unit === 'm' || unit === 'meters' || unit === 'meter') return `· ${s.reps}M`;
        if (unit === 'cal' || unit === 'calories') return `${s.reps} CAL`;
        if (unit === 'time') return `${s.reps} SEC`;
        const weight = s.weight ?? 0;
        const w = weight > 0 ? ` · ${weight}KG` : '';
        if (s.reps) return `${s.reps}${w}`;
        if (w) return w.trim();
    }
    // Fallback to top-level properties (WOD definition format)
    if (ex.value) return String(ex.value);
    const exUnit = (ex.unit || ex.measure || '').toLowerCase();
    const rawReps = ex.reps;
    if (rawReps) {
        const repsStr = String(rawReps);
        if (exUnit === 'm' || exUnit === 'meters') return `· ${repsStr}M`;
        if (exUnit === 'cal') return `${repsStr} CAL`;
        const tW = (ex.weight ?? ex.weight_kg ?? 0) > 0 ? ` · ${ex.weight ?? ex.weight_kg}KG` : '';
        return `${repsStr}${tW}`;
    }
    if (ex.detail) return `${ex.detail}${ex.unit || ''}`;
    if (ex.target && ex.target !== '-') return String(ex.target);
    return '';
}

// ─── Helper: resolve block type label & color ─────────────────────────────────
function getBlockStyle(block: any): { label: string; color: string } {
    const key = (block.type || block.blockType || '').toLowerCase().replace(/[\s_-]/g, '');
    return BLOCK_STYLES[key] ?? { label: (block.type || 'BLOCK').toUpperCase(), color: '#ffffff' };
}

// ─── Background pattern ───────────────────────────────────────────────────────
function patternStyle(type: SportCfg['patternType'], color: string): React.CSSProperties {
    const c = color + '18';
    switch (type) {
        case 'dots':
            return { backgroundImage: `radial-gradient(circle, ${c} 1px, transparent 1px)`, backgroundSize: '20px 20px' };
        case 'grid':
            return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`, backgroundSize: '24px 24px' };
        case 'diagonal':
            return { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 50%)`, backgroundSize: '18px 18px' };
        case 'hlines':
            return { backgroundImage: `repeating-linear-gradient(0deg, ${c} 0, ${c} 1px, transparent 0, transparent 20px)`, backgroundSize: '100% 20px' };
        default:
            return {};
    }
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span style={{
            background: color + '22',
            color: color,
            border: `1px solid ${color}55`,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
        }}>{label}</span>
    );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{ textAlign: 'center', minWidth: 72 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color, letterSpacing: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: '#777', letterSpacing: 1, textTransform: 'uppercase', marginTop: 1 }}>{label}</div>
        </div>
    );
}


// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ color }: { color: string }) {
    return (
        <div style={{
            marginTop: 20,
            paddingTop: 12,
            borderTop: `1px solid ${color}30`,
            textAlign: 'center',
            fontSize: 10,
            color: '#555',
            letterSpacing: 2,
            fontWeight: 600,
            textTransform: 'uppercase',
        }}>
            ◉ RIVAL FIT ATLETA
        </div>
    );
}

// ─── Shared: block list renderer ──────────────────────────────────────────────
function BlockList({ blocks, accentColor, blockResults }: { blocks: any[]; accentColor: string; blockResults?: Record<number, string> }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blocks.map((block: any, bi: number) => {
                const bs = getBlockStyle(block);
                const exercises: any[] = block.exercises || block.movements || [];
                const roundInfo = block.rounds ? `${block.rounds} ROUNDS` : (block.duration ? `${block.duration} MIN` : '');
                const blockLabel = block.title || block.label || '';
                const manualResult = blockResults?.[bi];
                const rightLabel = manualResult || (blockLabel && blockLabel !== bs.label ? blockLabel.toUpperCase() : roundInfo);

                return (
                    <div key={bi} style={{
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12,
                        overflow: 'hidden',
                    }}>
                        {/* Block header */}
                        <div style={{
                            background: bs.color + '20',
                            padding: '7px 12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: `1px solid ${bs.color}30`,
                        }}>
                            <Badge label={bs.label} color={bs.color} />
                            {rightLabel ? (
                                <span style={{ fontSize: 10, color: manualResult ? accentColor : '#888', letterSpacing: 1, fontWeight: 700 }}>
                                    {rightLabel}
                                </span>
                            ) : null}
                        </div>
                        {/* Exercise rows */}
                        <div style={{ padding: '6px 0' }}>
                            {exercises.length === 0 ? (
                                <div style={{ padding: '4px 12px', fontSize: 11, color: '#666' }}>—</div>
                            ) : (
                                exercises.map((ex: any, ei: number) => {
                                    const name = (ex.name || ex.exercise || ex.movement || '').toUpperCase();
                                    const detail = getExerciseDetail(ex);
                                    // Arrow indicator from exercise name
                                    const arrow = name.includes('ROW') ? '→' : name.includes('RUN') ? '↑' : '·';
                                    const displayName = name ? `${name} ${arrow}` : arrow;
                                    return (
                                        <div key={ei} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '4px 12px',
                                            borderBottom: ei < exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                        }}>
                                            <span style={{ fontSize: 11, color: '#e0e0e0', fontWeight: 600, letterSpacing: 0.5 }}>
                                                {displayName}
                                            </span>
                                            {detail ? (
                                                <span style={{ fontSize: 11, color: accentColor, fontWeight: 700, letterSpacing: 0.5 }}>
                                                    {detail}
                                                </span>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

type CardProps = { blocks: WorkoutBlock[]; title: string; duration: number; cfg: SportCfg; blockResults?: Record<number, string> };

function CardHeader({ title, label, cfg, duration }: { title: string; label: string; cfg: SportCfg; duration: number }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
                <div style={{ fontSize: 11, color: cfg.color, letterSpacing: 3, fontWeight: 700, marginBottom: 4 }}>{cfg.emoji} {label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1.1 }}>
                    {title || cfg.label}
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{duration || '--'}</div>
                <div style={{ fontSize: 9, color: '#666', letterSpacing: 1 }}>MIN</div>
            </div>
        </div>
    );
}

// ─── CrossTrainingCard ────────────────────────────────────────────────────────
function CrossTrainingCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title} label={cfg.accentLabel} cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── HyroxCard ────────────────────────────────────────────────────────────────
function HyroxCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'HYROX TRAINING'} label="HYROX" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── GymCard ──────────────────────────────────────────────────────────────────
function GymCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'GYM · LIFT'} label="STRENGTH" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── BoxingCard ───────────────────────────────────────────────────────────────
function BoxingCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'BOXING'} label="COMBAT" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── RunningCard ──────────────────────────────────────────────────────────────
function RunningCard({ blocks, title, duration, cfg, blockResults, runMetrics }: CardProps & { runMetrics?: { distance?: string; pace?: string; elevation?: string } }) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'RUNNING'} label="RUN" cfg={cfg} duration={duration} />
            {runMetrics && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                    {runMetrics.distance && <StatBox label="DISTANCIA" value={runMetrics.distance} color={cfg.color} />}
                    {runMetrics.pace && <StatBox label="RITMO" value={runMetrics.pace} color={cfg.color} />}
                    {runMetrics.elevation && <StatBox label="DESNIVEL" value={runMetrics.elevation} color={cfg.color} />}
                </div>
            )}
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── CyclingCard ──────────────────────────────────────────────────────────────
function CyclingCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'CYCLING'} label="RIDE" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── SwimmingCard ─────────────────────────────────────────────────────────────
function SwimmingCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'SWIMMING'} label="POOL" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── YogaCard ─────────────────────────────────────────────────────────────────
function YogaCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'YOGA · MOB'} label="FLOW" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── OcrCard ──────────────────────────────────────────────────────────────────
function OcrCard({ blocks, title, duration, cfg, blockResults }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'OCR'} label="OBSTACLE" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} blockResults={blockResults} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── Card router ──────────────────────────────────────────────────────────────
function SportCard({ sportKey, blocks, title, duration, cfg, runMetrics, blockResults }: {
    sportKey: SportKey; blocks: WorkoutBlock[]; title: string; duration: number;
    cfg: SportCfg; runMetrics?: { distance?: string; pace?: string; elevation?: string };
    blockResults?: Record<number, string>;
}) {
    switch (sportKey) {
        case 'hyrox':    return <HyroxCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
        case 'gym':      return <GymCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
        case 'boxing':   return <BoxingCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
        case 'running':  return <RunningCard blocks={blocks} title={title} duration={duration} cfg={cfg} runMetrics={runMetrics} blockResults={blockResults} />;
        case 'cycling':  return <CyclingCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
        case 'swimming': return <SwimmingCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
        case 'yoga':     return <YogaCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
        case 'ocr':      return <OcrCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
        default:         return <CrossTrainingCard blocks={blocks} title={title} duration={duration} cfg={cfg} blockResults={blockResults} />;
    }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function WorkoutShareCard({
    blocks,
    workoutTitle,
    sportType,
    duration,
    durationLabel,
    date,
    userName,
    onClose,
    category,
    runMetrics,
    wodBlocks,
}: WorkoutShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [storyLoading, setStoryLoading] = useState(false);
    const [editDuration, setEditDuration] = useState<string>('');
    const [blockResults, setBlockResults] = useState<Record<number, string>>({});

    const sportKey = getSportKey(category, sportType);
    const cfg = SPORTS[sportKey];

    // Merge blocks sources
    const allBlocks: WorkoutBlock[] = (wodBlocks && wodBlocks.length > 0 ? wodBlocks : blocks) ?? [];

    // Compute display duration in minutes
    const durationMins = (() => {
        // Try to parse from durationLabel string (e.g. "45:30" or "1:05:00")
        if (durationLabel && typeof durationLabel === 'string' && durationLabel.includes(':')) {
            const parts = durationLabel.split(':').map(Number);
            if (parts.length === 2) return parts[0]; // "45:30" → 45 min
            if (parts.length === 3) return parts[0] * 60 + parts[1]; // "1:05:00" → 65 min
        }
        if (durationLabel && !isNaN(Number(durationLabel)) && Number(durationLabel) > 0) {
            const n = Number(durationLabel);
            return n > 90 ? Math.round(n / 60) : n;
        }
        // Convert seconds to minutes
        if (duration > 90) return Math.round(duration / 60);
        return duration > 0 ? duration : 0;
    })();

    // ── Download PNG ──────────────────────────────────────────────────────────
    const handleDownload = async () => {
        if (!cardRef.current) return;
        setLoading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
            const link = document.createElement('a');
            link.download = `rival-workout-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error('Download error', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Share via Web Share API ────────────────────────────────────────────────
    const handleShare = async () => {
        if (!cardRef.current) return;
        setLoading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], 'rival-workout.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: workoutTitle || 'Mi entrenamiento', text: '¡Entrenamiento completado con Rival Fit!' });
            } else {
                const link = document.createElement('a');
                link.download = 'rival-workout.png';
                link.href = dataUrl;
                link.click();
            }
        } catch (e) {
            console.error('Share error', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Share to Story (9:16 Instagram) ──────────────────────────────────────
    const handleShareToStory = async () => {
        if (!cardRef.current) return;
        setStoryLoading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 3 });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], 'rival-story.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Historia Rival Fit' });
            } else {
                const link = document.createElement('a');
                link.download = 'rival-story.png';
                link.href = dataUrl;
                link.click();
            }
        } catch (e) {
            console.error('Story share error', e);
        } finally {
            setStoryLoading(false);
        }
    };

    return (
        /* ── Modal overlay ─────────────────────────────────────────────────── */
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
        }}>
            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'fixed', top: 16, right: 16,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: 36, height: 36,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff',
                    zIndex: 10000,
                }}
            >
                <X size={18} />
            </button>

            {/* ── The shareable card ──────────────────────────────────────────── */}
            <div
                ref={cardRef}
                style={{
                    width: 390,
                    background: '#0a0a0a',
                    border: `2px solid ${cfg.color}50`,
                    borderRadius: 20,
                    overflow: 'hidden',
                    position: 'relative',
                    ...patternStyle(cfg.patternType, cfg.color),
                }}
            >
                {/* Date strip */}
                <div style={{
                    background: cfg.color + '15',
                    borderBottom: `1px solid ${cfg.color}30`,
                    padding: '6px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <span style={{ fontSize: 10, color: cfg.color, letterSpacing: 2, fontWeight: 600 }}>
                        {date}
                    </span>
                    <span style={{ fontSize: 10, color: '#555', letterSpacing: 2 }}>
                        {userName}
                    </span>
                </div>

                {/* Sport card content */}
                <SportCard
                    sportKey={sportKey}
                    blocks={allBlocks}
                    title={workoutTitle}
                    duration={editDuration !== '' ? (parseInt(editDuration) || 0) : durationMins}
                    cfg={cfg}
                    runMetrics={runMetrics}
                    blockResults={blockResults}
                />
            </div>

            {/* ── Edit panel ──────────────────────────────────────────────────── */}
            <div style={{
                width: 390, marginTop: 12,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${cfg.color}30`,
                borderRadius: 16, padding: '14px 16px',
            }}>
                <p style={{ fontSize: 10, color: cfg.color, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                    ✏ Editar tiempos
                </p>
                {/* Total time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 600, width: 90, flexShrink: 0 }}>TIEMPO TOTAL</span>
                    <input
                        type="number"
                        min={0}
                        placeholder={durationMins > 0 ? String(durationMins) : 'min'}
                        value={editDuration}
                        onChange={e => setEditDuration(e.target.value)}
                        style={{
                            flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${cfg.color}40`,
                            borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700,
                            padding: '6px 10px', outline: 'none',
                        }}
                    />
                    <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>MIN</span>
                </div>
                {/* Per-block results */}
                {allBlocks.map((block: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#888', fontWeight: 600, width: 90, flexShrink: 0, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {block.title || block.label || `BLOQUE ${i + 1}`}
                        </span>
                        <input
                            type="text"
                            placeholder="ej: 12:30 / 5 RDS"
                            value={blockResults[i] || ''}
                            onChange={e => setBlockResults(prev => ({ ...prev, [i]: e.target.value }))}
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${cfg.color}30`,
                                borderRadius: 8, color: cfg.color, fontSize: 12, fontWeight: 700,
                                padding: '6px 10px', outline: 'none',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* ── Action buttons ──────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center',
            }}>
                {/* Download */}
                <button
                    onClick={handleDownload}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: cfg.color,
                        color: '#000',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        letterSpacing: 0.5,
                    }}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    DESCARGAR
                </button>

                {/* Share */}
                <button
                    onClick={handleShare}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: `1px solid ${cfg.color}50`,
                        borderRadius: 10,
                        padding: '10px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        letterSpacing: 0.5,
                    }}
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    COMPARTIR
                </button>

                {/* Story */}
                <button
                    onClick={handleShareToStory}
                    disabled={storyLoading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,255,255,0.05)',
                        color: cfg.color,
                        border: `1px solid ${cfg.color}40`,
                        borderRadius: 10,
                        padding: '10px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: storyLoading ? 'not-allowed' : 'pointer',
                        opacity: storyLoading ? 0.7 : 1,
                        letterSpacing: 0.5,
                    }}
                >
                    {storyLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    HISTORIA
                </button>
            </div>
        </div>
    );
}
