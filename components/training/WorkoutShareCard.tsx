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
    date: string;
    userName: string;
    onClose: () => void;
}

const BLOCK_STYLES: Record<string, { label: string; color: string; dimColor: string }> = {
    emom:      { label: 'EMOM',      color: '#ef4444', dimColor: 'rgba(239,68,68,0.18)' },
    amrap:     { label: 'AMRAP',     color: '#f97316', dimColor: 'rgba(249,115,22,0.18)' },
    fortime:   { label: 'FOR TIME',  color: '#eab308', dimColor: 'rgba(234,179,8,0.18)' },
    intervals: { label: 'INTERVALS', color: '#3b82f6', dimColor: 'rgba(59,130,246,0.18)' },
    strength:  { label: 'STRENGTH',  color: '#a855f7', dimColor: 'rgba(168,85,247,0.18)' },
    tabata:    { label: 'TABATA',    color: '#ec4899', dimColor: 'rgba(236,72,153,0.18)' },
    chipper:   { label: 'CHIPPER',   color: '#06b6d4', dimColor: 'rgba(6,182,212,0.18)' },
};

function getBlockMeta(block: WorkoutBlock): string[] {
    const tags: string[] = [];
    if (block.type === 'emom') {
        if (block.rounds) tags.push(`FREQ ${block.rounds}MIN`);
        if (block.duration) tags.push(`TOTAL ${block.duration}MIN`);
    } else if (block.type === 'amrap') {
        if (block.duration) tags.push(`${block.duration} MIN`);
    } else if (block.type === 'intervals') {
        if (block.rounds) tags.push(`RONDAS ${block.rounds}`);
        if (block.duration) tags.push(`WORK ${block.duration}MIN`);
    } else if (block.type === 'fortime') {
        if (block.duration) tags.push(`TIME CAP ${block.duration}MIN`);
    } else if (block.type === 'tabata') {
        tags.push('20SEC ON / 10SEC OFF');
        if (block.rounds) tags.push(`${block.rounds} RONDAS`);
    }
    return tags;
}

function getExerciseSummary(ex: { name: string; sets: any[] }): string {
    const s = ex.sets?.[0];
    if (!s) return '';
    const weight = s.weight && s.weight > 0 ? ` × ${s.weight}KG` : '';
    const unit = s.unit === 'cal' ? 'CAL' : s.unit === 'time' ? 'SEC' : '';
    if (ex.sets.length > 1) {
        return `${ex.sets.length}×${s.reps}${unit || ' REPS'}${weight}`;
    }
    return `${s.reps}${unit || ' REPS'}${weight}`;
}

export default function WorkoutShareCard({ blocks, workoutTitle, sportType, duration, date, userName, onClose }: WorkoutShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const durationMin = Math.floor(duration / 60);
    const durationSec = duration % 60;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                quality: 1.0,
                pixelRatio: 3,
                cacheBust: true,
                backgroundColor: '#090909',
            });
            const link = document.createElement('a');
            link.download = `RivalFit-WOD-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error(err);
            alert("Error al generar la descarga. Intenta de nuevo.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShareToStory = () => {
        const event = new CustomEvent('share-to-story', {
            detail: {
                type: 'workout_sticker',
                content: JSON.stringify({ title: workoutTitle, sportType, duration, blocks }),
            }
        });
        window.dispatchEvent(event);
        onClose();
        alert("¡Tu WOD se ha enviado al editor de historias!");
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
            <div className="w-full max-w-[360px] flex flex-col gap-3 animate-in zoom-in-95 duration-300 py-4">
                {/* Top bar */}
                <div className="flex justify-between items-center text-white px-2">
                    <h3 className="font-heading font-black italic uppercase tracking-tighter text-lg">Tu WOD de Hoy</h3>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-brand-red transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ============ THE CARD ============ */}
                <div
                    ref={cardRef}
                    style={{ background: '#090909', fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    className="w-full rounded-[28px] overflow-hidden relative shadow-2xl border border-white/[0.07]"
                >
                    {/* Top accent */}
                    <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #ef4444 0%, #ff6b6b 50%, #ef4444 100%)' }} />

                    {/* Dot grid bg */}
                    <div
                        className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 0)', backgroundSize: '18px 18px' }}
                    />
                    {/* Glow bottom-right */}
                    <div className="absolute bottom-0 right-0 w-52 h-52 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)' }} />

                    <div className="relative p-5 space-y-4">

                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                {/* Sport & blocks badge */}
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] flex-shrink-0" style={{ boxShadow: '0 0 6px #ef4444' }} />
                                    <span style={{ color: '#ef4444', fontSize: '8px', fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                                        {sportType.toUpperCase()}
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                                        · {blocks.length} BLOQUE{blocks.length !== 1 ? 'S' : ''}
                                    </span>
                                </div>
                                <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {workoutTitle}
                                </h2>
                            </div>
                            {/* Duration */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ color: '#fff', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, letterSpacing: '-0.03em' }}>
                                    {durationMin}<span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>:{String(durationSec).padStart(2, '0')}</span>
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '2px' }}>MIN</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                        {/* Blocks */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {blocks.map((block, i) => {
                                const style = BLOCK_STYLES[block.type] ?? { label: block.type.toUpperCase(), color: '#ef4444', dimColor: 'rgba(239,68,68,0.15)' };
                                const meta = getBlockMeta(block);

                                return (
                                    <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>

                                        {/* Block header row */}
                                        <div style={{ background: style.dimColor, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                {/* Type pill */}
                                                <span style={{
                                                    background: `${style.color}25`,
                                                    border: `1px solid ${style.color}50`,
                                                    color: style.color,
                                                    fontSize: '8px',
                                                    fontWeight: 900,
                                                    letterSpacing: '0.25em',
                                                    textTransform: 'uppercase',
                                                    padding: '2px 7px',
                                                    borderRadius: '100px',
                                                    flexShrink: 0,
                                                }}>
                                                    {style.label}
                                                </span>
                                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {block.title}
                                                </span>
                                            </div>
                                            {/* Meta tags */}
                                            {meta.length > 0 && (
                                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                                    {meta.map((m, j) => (
                                                        <span key={j} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: '4px' }}>{m}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Exercises */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {block.exercises.map((ex, j) => {
                                                const summary = getExerciseSummary(ex);
                                                return (
                                                    <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: style.color, flexShrink: 0, opacity: 0.7 }} />
                                                            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {ex.name}
                                                            </span>
                                                        </div>
                                                        {summary && (
                                                            <span style={{ color: style.color, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                                                                {summary}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em' }}>{userName}</p>
                                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: '2px' }}>{date}</p>
                            </div>
                            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em' }}>
                                RIVAL <span style={{ color: '#ef4444' }}>FIT</span>
                            </p>
                        </div>
                    </div>
                </div>
                {/* ============ END CARD ============ */}

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleShareToStory}
                        className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-heading font-black italic uppercase tracking-widest flex items-center justify-center gap-2 shadow-glow active:scale-95 transition-all text-xs border border-white/10"
                    >
                        <Send className="w-4 h-4 -rotate-12" />
                        A HISTORIA
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 py-4 bg-white text-black rounded-2xl font-heading font-black italic uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/90 active:scale-95 transition-all text-xs"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isDownloading ? "..." : "GUARDAR PNG"}
                    </button>
                </div>

                <p className="text-center text-[9px] text-white/30 font-black uppercase tracking-widest px-4">
                    Optimizado para Instagram Stories y Rival Feed
                </p>
            </div>
        </div>
    );
}
