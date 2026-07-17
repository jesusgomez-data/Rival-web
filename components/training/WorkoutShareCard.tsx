"use client";

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
    // 1. Check sets array (Normal GYM format)
    const s = Array.isArray(ex.sets) && ex.sets.length > 0 ? ex.sets[0] : null;
    if (s) {
        const reps = s.reps;
        const weight = s.weight ?? s.load;
        const unit = (s.unit || s.measure || '').toLowerCase();
        
        if (unit.includes('m')) return `· ${reps}M`;
        if (unit.includes('cal')) return `${reps} CAL`;
        if (unit === 'time' || unit.includes('sec')) return `${reps} SEC`;
        
        const wStr = (weight && Number(weight) > 0) ? ` · ${weight}KG` : '';
        if (reps) return `${reps}${wStr}`;
        if (weight && Number(weight) > 0) return `${weight}KG`;
    }

    // 2. Direct properties (reps, weight)
    const reps = ex.reps || ex.value;
    // Include ex.detail as a potential weight source for WOD exercises
    const weight = ex.weight || ex.weight_kg || ex.load || ex.kg || ex.detail;
    const unit = (ex.unit || ex.measure || '').toLowerCase();
    
    if (reps) {
        const repsStr = String(reps);
        if (unit.includes('m')) return `· ${repsStr}M`;
        if (unit.includes('cal')) return `${repsStr} CAL`;
        
        // Ensure weight is not the same as reps to avoid "10 · 10"
        const wStr = (weight && weight !== reps && (typeof weight !== 'number' || weight > 0)) 
            ? ` · ${weight}${unit.includes('kg') || unit.includes('lb') ? '' : 'KG'}` 
            : '';
        return `${repsStr}${wStr}`;
    }
    
    if (weight && (typeof weight !== 'number' || weight > 0)) return `${weight}${unit.includes('kg') || unit.includes('lb') ? '' : 'KG'}`;
    
    // 3. Fallbacks
    if (ex.detail) return `${ex.detail}${ex.unit || ''}`;
    if (ex.target && ex.target !== '-') return String(ex.target);
    
    return '';
}

// ─── Helper: resolve block type label & color ─────────────────────────────────
function getBlockStyle(block: any): { label: string; color: string } {
    const rawType = (block.format || block.type || block.blockType || '').toLowerCase().replace(/[\s_-]/g, '');
    let style = BLOCK_STYLES[rawType] ?? { label: (block.format || block.type || 'BLOCK').toUpperCase(), color: '#ffffff' };
    
    // Add duration if available (e.g., "EMOM 12'")
    const duration = block.duration || block.config?.minutes || block.config?.timecap;
    if (duration) {
        const durStr = String(duration).replace(/min|'/gi, '').trim();
        style = { ...style, label: `${style.label} ${durStr}'` };
    } else if (block.rounds) {
        style = { ...style, label: `${style.label} ${block.rounds} RDS` };
    }
    
    return style;
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
function BlockList({ blocks, accentColor }: { blocks: any[]; accentColor: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blocks.map((block: any, bi: number) => {
                const bs = getBlockStyle(block);
                const exercises: any[] = block.exercises || block.movements || [];
                const roundInfo = block.rounds ? `${block.rounds} ROUNDS` : (block.duration ? `${block.duration} MIN` : '');
                const blockLabel = block.title || block.label || '';
                const rightLabel = (blockLabel && blockLabel !== bs.label ? blockLabel.toUpperCase() : roundInfo);

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
                                <span style={{ fontSize: 10, color: '#888', letterSpacing: 1, fontWeight: 700 }}>
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

type CardProps = { blocks: WorkoutBlock[]; title: string; duration: number; cfg: SportCfg };

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
function CrossTrainingCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title} label={cfg.accentLabel} cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── HyroxCard ────────────────────────────────────────────────────────────────
function HyroxCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'HYROX TRAINING'} label="HYROX" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── GymCard ──────────────────────────────────────────────────────────────────
function GymCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'GYM · LIFT'} label="STRENGTH" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── BoxingCard ───────────────────────────────────────────────────────────────
function BoxingCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'BOXING'} label="COMBAT" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            <BlockList blocks={blocks} accentColor={cfg.color} />
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── RunningCard ──────────────────────────────────────────────────────────────
function RunningCard({ blocks, title, duration, cfg, runMetrics }: CardProps & { runMetrics?: { distance?: string; pace?: string; elevation?: string } }) {
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
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── CyclingCard ──────────────────────────────────────────────────────────────
function CyclingCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'CYCLING'} label="RIDE" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── SwimmingCard ─────────────────────────────────────────────────────────────
function SwimmingCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'SWIMMING'} label="POOL" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── YogaCard ─────────────────────────────────────────────────────────────────
function YogaCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'YOGA · MOB'} label="FLOW" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── OcrCard ──────────────────────────────────────────────────────────────────
function OcrCard({ blocks, title, duration, cfg }: CardProps) {
    return (
        <div style={{ padding: 24, fontFamily: "'Inter', 'Arial', sans-serif" }}>
            <CardHeader title={title || 'OCR'} label="OBSTACLE" cfg={cfg} duration={duration} />
            <div style={{ height: 1, background: `linear-gradient(90deg, ${cfg.color}80, transparent)`, marginBottom: 16 }} />
            {blocks.length > 0 && <BlockList blocks={blocks} accentColor={cfg.color} />}
            <Footer color={cfg.color} />
        </div>
    );
}

// ─── Card router ──────────────────────────────────────────────────────────────
function SportCard({ sportKey, blocks, title, duration, cfg, runMetrics }: {
    sportKey: SportKey; blocks: WorkoutBlock[]; title: string; duration: number;
    cfg: SportCfg; runMetrics?: { distance?: string; pace?: string; elevation?: string };
}) {
    switch (sportKey) {
        case 'hyrox':    return <HyroxCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
        case 'gym':      return <GymCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
        case 'boxing':   return <BoxingCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
        case 'running':  return <RunningCard blocks={blocks} title={title} duration={duration} cfg={cfg} runMetrics={runMetrics} />;
        case 'cycling':  return <CyclingCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
        case 'swimming': return <SwimmingCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
        case 'yoga':     return <YogaCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
        case 'ocr':      return <OcrCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
        default:         return <CrossTrainingCard blocks={blocks} title={title} duration={duration} cfg={cfg} />;
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

    // Some browsers (notably iOS Safari) silently drop a download triggered by
    // an <a download> click when the element was never attached to the DOM —
    // appending it first (and removing it after) makes the download reliable
    // everywhere instead of only on browsers that tolerate the detached case.
    const triggerDownload = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Download PNG ──────────────────────────────────────────────────────────
    // pixelRatio 2 (not 3): still sharp for a phone screen / social post, but
    // meaningfully faster to render and encode — the earlier 3x was the main
    // source of the "tarda mucho" complaint.
    //
    // On iOS, an <a download> click does NOT save to the Photos app — it just
    // opens the image in a new tab (there's no JS API that writes straight to
    // the camera roll). The only route that reliably lands in Photos is the
    // native share sheet's "Guardar en Fotos" option, which is what
    // navigator.share({ files }) triggers. So on any device that supports it
    // (effectively all modern mobile browsers), prefer that path for the
    // "Descargar" button too — not just as a share action but as the de facto
    // save-to-gallery flow. Desktop (no navigator.share) keeps the plain
    // anchor download, which already saves straight to the Downloads folder.
    const handleDownload = async () => {
        if (!cardRef.current) return;
        setLoading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
            const filename = `rival-workout-${Date.now()}.png`;

            if (navigator.share) {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare?.({ files: [file] })) {
                    try {
                        await navigator.share({ files: [file] });
                        return;
                    } catch (shareErr: any) {
                        if (shareErr?.name === 'AbortError') return; // user cancelled, not an error
                        // fall through to plain download below
                    }
                }
            }

            triggerDownload(dataUrl, filename);
        } catch (e) {
            // Was failing silently — a failed download looked identical to a
            // slow one, with no way to tell the difference. Now it says so.
            console.error('Download error', e);
            alert('No se pudo descargar la imagen. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // ── Share via Web Share API (WhatsApp, Instagram, etc. via the OS sheet) ──
    const handleShare = async () => {
        if (!cardRef.current) return;
        setLoading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], 'rival-workout.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: workoutTitle || 'Mi entrenamiento', text: '¡Mira mi entrenamiento en Rival Fit! 🔥' });
            } else {
                triggerDownload(dataUrl, 'rival-workout.png');
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') console.error('Share error', e);
        } finally {
            setLoading(false);
        }
    };

    // ── Share to Story: opens the app's own Historia composer with this
    // image pre-loaded as the background, same event FeedPost's share menu
    // uses for "Enviar a Mis Historias" — NOT the OS share sheet.
    const handleShareToStory = async () => {
        if (!cardRef.current) return;
        setStoryLoading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
            window.dispatchEvent(new CustomEvent('share-to-story', { detail: { type: 'image', url: dataUrl } }));
            onClose();
        } catch (e) {
            console.error('Story share error', e);
        } finally {
            setStoryLoading(false);
        }
    };

    // Portaled straight into <body>: this component is mounted inline inside a
    // post card, which can contain its own stacking-context-creating elements
    // (video overlays, animated badges). Rendering here instead of in-place
    // guarantees this modal — and its buttons — are never trapped under, or
    // have taps swallowed by, something elsewhere in the card.
    return createPortal(
        /* ── Modal overlay ─────────────────────────────────────────────────── */
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.92)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                // env(safe-area-inset-top) pushes the close button below the
                // notch/status bar — without it, the "X" sat right under the
                // iPhone's status bar / swipe-down zone, where taps get
                // grabbed by the OS (Control Center, notification shade)
                // before they ever reach the page.
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                paddingBottom: 32,
                paddingLeft: 12,
                paddingRight: 12,
            }}
        >
            {/* Top bar: close button */}
            <div style={{
                width: '100%',
                maxWidth: 420,
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 12,
                flexShrink: 0,
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '50%',
                        width: 44, height: 44,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff',
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        flexShrink: 0,
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* ── The shareable card ──────────────────────────────────────────── */}
            <div
                ref={cardRef}
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: '#0a0a0a',
                    border: `2px solid ${cfg.color}50`,
                    borderRadius: 20,
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
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
                    duration={durationMins}
                    cfg={cfg}
                    runMetrics={runMetrics}
                />
            </div>

            {/* ── Action buttons ──────────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                gap: 10,
                marginTop: 20,
                flexWrap: 'wrap',
                justifyContent: 'center',
                width: '100%',
                maxWidth: 420,
                flexShrink: 0,
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
                        padding: '12px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        letterSpacing: 0.5,
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        minHeight: 48,
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
                        padding: '12px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        letterSpacing: 0.5,
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        minHeight: 48,
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
                        padding: '12px 20px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: storyLoading ? 'not-allowed' : 'pointer',
                        opacity: storyLoading ? 0.7 : 1,
                        letterSpacing: 0.5,
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation',
                        minHeight: 48,
                    }}
                >
                    {storyLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    HISTORIA
                </button>
            </div>
        </div>,
        document.body
    );
}
