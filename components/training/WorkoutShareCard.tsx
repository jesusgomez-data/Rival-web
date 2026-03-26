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
    emom:      { label: 'EMOM',      color: '#ef4444' },
    amrap:     { label: 'AMRAP',     color: '#f97316' },
    fortime:   { label: 'FOR TIME',  color: '#eab308' },
    intervals: { label: 'INTERVALS', color: '#3b82f6' },
    strength:  { label: 'STRENGTH',  color: '#a855f7' },
    tabata:    { label: 'TABATA',    color: '#ec4899' },
    chipper:   { label: 'CHIPPER',   color: '#06b6d4' },
};

function getExerciseSummary(ex: { name: string; sets: any[] }): string {
    const s = ex.sets?.[0];
    if (!s) return '';
    const weight = s.weight && s.weight > 0 ? ` × ${s.weight}KG` : '';
    const unit = s.unit === 'cal' ? 'CAL' : s.unit === 'time' ? 'SEC' : '';
    if (ex.sets.length > 1) return `${ex.sets.length}×${s.reps}${unit || ' REPS'}${weight}`;
    return `${s.reps}${unit || ' REPS'}${weight}`;
}

function computeVolume(blocks: WorkoutBlock[]): number {
    return blocks.reduce((tot, b) =>
        tot + (b.exercises || []).reduce((a, ex) =>
            a + (ex.sets || []).reduce((s2, s) => s2 + (s.weight > 0 && s.reps > 0 ? s.weight * s.reps : 0), 0), 0), 0);
}

function computeSets(blocks: WorkoutBlock[]): number {
    return blocks.reduce((a, b) => a + (b.exercises || []).reduce((c, ex) => c + (ex.sets || []).length, 0), 0);
}

function patternStyle(type: SportCfg['patternType']): React.CSSProperties {
    if (type === 'dots')     return { backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 0)', backgroundSize: '20px 20px' };
    if (type === 'grid')     return { backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px' };
    if (type === 'diagonal') return { backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 0, transparent 50%)', backgroundSize: '16px 16px' };
    if (type === 'hlines')   return { backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 0, transparent 24px)' };
    return {};
}

// ─── Shared sub-pieces ───────────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <span style={{ background: `${color}22`, border: `1px solid ${color}55`, color, fontSize: '7px', fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '100px' }}>
            {children}
        </span>
    );
}

function StatBox({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase' }}>{label}</p>
            <p style={{ color: '#fff', fontSize: '22px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
            {unit && <p style={{ color, fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{unit}</p>}
        </div>
    );
}

function Bars({ color, heights, height = 28 }: { color: string; heights?: number[]; height?: number }) {
    const h = heights || [30,50,45,70,60,80,55,90,65,75,85,60,70,80,65,55,75,85,70,60];
    return (
        <div style={{ height: `${height}px`, display: 'flex', alignItems: 'flex-end', gap: '2px', opacity: 0.35 }}>
            {h.map((v, i) => (
                <div key={i} style={{ flex: 1, height: `${v}%`, background: color, borderRadius: '2px 2px 0 0' }} />
            ))}
        </div>
    );
}

function Footer({ userName, date, color }: { userName: string; date: string; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '10px' }}>
            <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em' }}>{userName}</p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: '2px' }}>{date}</p>
            </div>
            <p style={{ color: '#fff', fontSize: '16px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.03em' }}>
                RIVAL <span style={{ color }}>FIT</span>
            </p>
        </div>
    );
}

// ─── Sport-specific card bodies ───────────────────────────────────────────────

function CrossTrainingCard({ blocks, workoutTitle, displayDuration, cfg, userName, date }: any) {
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, display: 'inline-block', boxShadow: `0 0 8px ${cfg.color}` }} />
                        <Badge color={cfg.color}>{cfg.accentLabel}</Badge>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '7px', fontWeight: 700, letterSpacing: '0.2em' }}>· {blocks.length} BLQ</span>
                    </div>
                    <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {workoutTitle}
                    </h2>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: '#fff', fontSize: '22px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, letterSpacing: '-0.03em' }}>{displayDuration}</p>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '2px' }}>MIN</p>
                </div>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            {/* Blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(blocks || []).map((block: WorkoutBlock, i: number) => {
                    const key = (block.type || '').toLowerCase();
                    const s = BLOCK_STYLES[key] ?? { label: (block.type || 'BLOQUE').toUpperCase(), color: cfg.color };
                    return (
                        <div key={i} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ background: `${s.color}18`, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Badge color={s.color}>{s.label}</Badge>
                                {block.title && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.title}</span>}
                                {block.duration && <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.15em', flexShrink: 0 }}>{block.duration}MIN</span>}
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(block.exercises || []).map((ex: any, j: number) => {
                                    const sum = getExerciseSummary(ex);
                                    return (
                                        <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: s.color, flexShrink: 0, opacity: 0.7 }} />
                                                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.name}</span>
                                            </div>
                                            {sum && <span style={{ color: s.color, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', flexShrink: 0 }}>{sum}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function RunningCard({ runMetrics, workoutTitle, displayDuration, cfg, userName, date }: any) {
    const dist = (runMetrics?.distance || '--').replace(/[A-Za-z\s]/g, '').trim() || '--';
    const pace = runMetrics?.pace || '--';
    const elev = runMetrics?.elevation || null;
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>{date}</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '17px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '-6px 0 0' }}>
                {workoutTitle}
            </h2>
            {/* Distance hero */}
            <div style={{ textAlign: 'center', padding: '14px 0 8px', borderTop: '1px solid rgba(59,130,246,0.15)', borderBottom: '1px solid rgba(59,130,246,0.15)' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '4px' }}>DISTANCIA TOTAL</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ color: '#fff', fontSize: '64px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>{dist}</span>
                    <span style={{ color: cfg.color, fontSize: '22px', fontWeight: 900, fontStyle: 'italic' }}>KM</span>
                </div>
            </div>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: elev ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px', background: `${cfg.color}0a`, borderRadius: '14px', padding: '14px', border: `1px solid ${cfg.color}20` }}>
                <StatBox label="RITMO" value={pace} unit="/KM" color={cfg.color} />
                <StatBox label="TIEMPO" value={displayDuration} unit="MIN" color={cfg.color} />
                {elev && <StatBox label="DESNIVEL" value={elev} unit="D+" color={cfg.color} />}
            </div>
            {/* Pace bars */}
            <Bars color={cfg.color} heights={[40,55,48,72,65,80,58,90,68,78,88,62,72,82,68,58,76,88,72,62]} />
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function CyclingCard({ runMetrics, workoutTitle, displayDuration, cfg, userName, date }: any) {
    const dist = (runMetrics?.distance || '--').replace(/[A-Za-z\s]/g, '').trim() || '--';
    const speed = runMetrics?.pace || '--';
    const elev = runMetrics?.elevation || null;
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>{date}</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '17px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '-6px 0 0' }}>
                {workoutTitle}
            </h2>
            {/* Distance hero */}
            <div style={{ textAlign: 'center', padding: '14px 0 8px', borderTop: `1px solid ${cfg.color}25`, borderBottom: `1px solid ${cfg.color}25` }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '4px' }}>DISTANCIA</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ color: '#fff', fontSize: '64px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>{dist}</span>
                    <span style={{ color: cfg.color, fontSize: '22px', fontWeight: 900, fontStyle: 'italic' }}>KM</span>
                </div>
            </div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: elev ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px', background: `${cfg.color}0a`, borderRadius: '14px', padding: '14px', border: `1px solid ${cfg.color}20` }}>
                <StatBox label="VELOCIDAD" value={speed} unit="KM/H" color={cfg.color} />
                <StatBox label="TIEMPO" value={displayDuration} unit="MIN" color={cfg.color} />
                {elev && <StatBox label="DESNIVEL" value={elev} unit="D+" color={cfg.color} />}
            </div>
            {/* Speedometer bars (ascending then descending) */}
            <Bars color={cfg.color} heights={[20,30,40,55,65,75,85,90,85,75,65,55,45,55,65,75,80,85,80,70]} />
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function SwimmingCard({ runMetrics, workoutTitle, displayDuration, cfg, userName, date }: any) {
    const dist = (runMetrics?.distance || '--').replace(/[A-Za-z\s]/g, '').trim() || '--';
    const pace = runMetrics?.pace || '--';
    const unit = dist !== '--' && parseFloat(dist) < 5 ? 'KM' : 'M';
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>{date}</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '17px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '-6px 0 0' }}>
                {workoutTitle}
            </h2>
            {/* Distance hero */}
            <div style={{ textAlign: 'center', padding: '14px 0 8px', background: `${cfg.color}08`, borderRadius: '16px', border: `1px solid ${cfg.color}20` }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '4px' }}>DISTANCIA</p>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ color: '#fff', fontSize: '64px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>{dist}</span>
                    <span style={{ color: cfg.color, fontSize: '22px', fontWeight: 900, fontStyle: 'italic' }}>{unit}</span>
                </div>
            </div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <StatBox label="RITMO" value={pace} unit="/100M" color={cfg.color} />
                <StatBox label="TIEMPO" value={displayDuration} unit="MIN" color={cfg.color} />
            </div>
            {/* Wave bars */}
            <Bars color={cfg.color} heights={[50,60,70,65,55,70,80,60,50,70,80,65,55,75,85,65,55,70,60,50]} />
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function GymCard({ blocks, workoutTitle, displayDuration, cfg, userName, date }: any) {
    const totalVol = computeVolume(blocks);
    const totalSets = computeSets(blocks);
    const allExercises = blocks.flatMap((b: WorkoutBlock) => b.exercises || []);
    const heaviest = [...allExercises].sort((a: any, b: any) => {
        const wa = Math.max(...(a.sets || []).map((s: any) => s.weight || 0));
        const wb = Math.max(...(b.sets || []).map((s: any) => s.weight || 0));
        return wb - wa;
    }).slice(0, 5);

    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                    <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                    <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: '6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {workoutTitle}
                    </h2>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: '#fff', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1, letterSpacing: '-0.03em' }}>{displayDuration}</p>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '2px' }}>MIN</p>
                </div>
            </div>
            {/* Volume hero */}
            {totalVol > 0 && (
                <div style={{ textAlign: 'center', padding: '12px', background: `${cfg.color}0c`, borderRadius: '16px', border: `1px solid ${cfg.color}25` }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '4px' }}>VOLUMEN TOTAL</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ color: '#fff', fontSize: '48px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>
                            {totalVol >= 1000 ? `${(totalVol / 1000).toFixed(1)}` : totalVol}
                        </span>
                        <span style={{ color: cfg.color, fontSize: '18px', fontWeight: 900, fontStyle: 'italic' }}>
                            {totalVol >= 1000 ? 'TON' : 'KG'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <StatBox label="SERIES" value={String(totalSets)} color={cfg.color} />
                        <StatBox label="BLOQUES" value={String(blocks.length)} color={cfg.color} />
                        <StatBox label="EJERCS." value={String(allExercises.length)} color={cfg.color} />
                    </div>
                </div>
            )}
            {/* Top exercises */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {heaviest.map((ex: any, i: number) => {
                    const maxW = Math.max(...(ex.sets || []).map((s: any) => s.weight || 0));
                    const sum = getExerciseSummary(ex);
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span style={{ color: cfg.color, fontSize: '10px', fontWeight: 900, width: '16px', flexShrink: 0 }}>
                                    {'●'.repeat(Math.min(i + 1, 3))}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ex.name}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                {maxW > 0 && <span style={{ color: cfg.color, fontSize: '10px', fontWeight: 900 }}>{maxW}KG</span>}
                                {sum && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 700 }}>{sum}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function HyroxCard({ blocks, workoutTitle, displayDuration, cfg, userName, date }: any) {
    const stations = blocks.length;
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.2em' }}>FUNCTIONAL FITNESS RACE</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '-4px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {workoutTitle}
            </h2>
            {/* Race time hero */}
            <div style={{ textAlign: 'center', padding: '16px', background: `${cfg.color}0d`, borderRadius: '16px', border: `1px solid ${cfg.color}30` }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '6px' }}>TIEMPO DE CARRERA</p>
                <p style={{ color: '#fff', fontSize: '56px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>{displayDuration}</p>
                <p style={{ color: cfg.color, fontSize: '9px', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', marginTop: '4px' }}>MIN · SEC</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${cfg.color}20` }}>
                    <StatBox label="ESTACIONES" value={String(stations)} color={cfg.color} />
                    <StatBox label="ESTADO" value="FINISH" color={cfg.color} />
                </div>
            </div>
            {/* Station list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {blocks.map((b: WorkoutBlock, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: cfg.color, fontSize: '9px', fontWeight: 900, width: '16px', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title || b.type || `Station ${i + 1}`}</span>
                    </div>
                ))}
            </div>
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function OcrCard({ blocks, runMetrics, workoutTitle, displayDuration, cfg, userName, date }: any) {
    const dist = (runMetrics?.distance || '--').replace(/[A-Za-z\s]/g, '').trim() || '--';
    const elev = runMetrics?.elevation || null;
    const obstacles = blocks.length > 0 ? blocks.length * 3 : null;
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>TRAIL & OBSTACLE</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '-4px 0 0' }}>
                {workoutTitle}
            </h2>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: `${cfg.color}08`, borderRadius: '16px', padding: '14px', border: `1px solid ${cfg.color}20` }}>
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '4px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '4px' }}>DISTANCIA</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ color: '#fff', fontSize: '52px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>{dist}</span>
                        <span style={{ color: cfg.color, fontSize: '20px', fontWeight: 900, fontStyle: 'italic' }}>KM</span>
                    </div>
                </div>
                <StatBox label="TIEMPO" value={displayDuration} unit="MIN" color={cfg.color} />
                {elev ? <StatBox label="DESNIVEL" value={elev} unit="D+" color={cfg.color} /> : obstacles ? <StatBox label="OBSTÁCULOS" value={`~${obstacles}`} color={cfg.color} /> : null}
            </div>
            {/* Terrain bars */}
            <Bars color={cfg.color} heights={[20,35,55,70,65,80,90,75,60,80,95,85,70,60,75,85,90,80,65,50]} />
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function YogaCard({ workoutTitle, displayDuration, cfg, userName, date }: any) {
    const durationMin = displayDuration.split(':')[0] || displayDuration;
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.25em' }}>MIND & BODY</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '-4px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {workoutTitle}
            </h2>
            {/* Duration as hero + breathing decoration */}
            <div style={{ textAlign: 'center', padding: '20px 14px', background: `${cfg.color}08`, borderRadius: '20px', border: `1px solid ${cfg.color}20`, position: 'relative', overflow: 'hidden' }}>
                {/* Concentric rings decoration */}
                {[1, 2, 3].map((r) => (
                    <div key={r} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: `${r * 80}px`, height: `${r * 80}px`, borderRadius: '50%', border: `1px solid ${cfg.color}${r === 1 ? '30' : r === 2 ? '18' : '0c'}`, pointerEvents: 'none' }} />
                ))}
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 900, letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: '6px', position: 'relative' }}>PRÁCTICA</p>
                <p style={{ color: '#fff', fontSize: '60px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1, position: 'relative' }}>{durationMin}</p>
                <p style={{ color: cfg.color, fontSize: '9px', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', marginTop: '4px', position: 'relative' }}>MINUTOS</p>
            </div>
            {/* Soft stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: cfg.color, fontSize: '16px', fontWeight: 900, fontStyle: 'italic' }}>🌬</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4px' }}>BREATH</p>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: cfg.color, fontSize: '16px', fontWeight: 900, fontStyle: 'italic' }}>🧠</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4px' }}>FOCUS</p>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: cfg.color, fontSize: '16px', fontWeight: 900, fontStyle: 'italic' }}>✅</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4px' }}>DONE</p>
                </div>
            </div>
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

function BoxingCard({ blocks, workoutTitle, displayDuration, cfg, userName, date }: any) {
    const rounds = blocks.length > 0 ? blocks.length : Math.ceil(parseInt(displayDuration) / 3) || '--';
    return (
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge color={cfg.color}>{cfg.emoji} {cfg.accentLabel}</Badge>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.2em' }}>FIGHT SESSION</span>
            </div>
            <h2 style={{ color: '#fff', fontSize: '19px', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.1, margin: '-4px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {workoutTitle}
            </h2>
            {/* Rounds hero */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ textAlign: 'center', padding: '16px 12px', background: `${cfg.color}15`, borderRadius: '16px', border: `1px solid ${cfg.color}35` }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '4px' }}>ROUNDS</p>
                    <p style={{ color: '#fff', fontSize: '52px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>{rounds}</p>
                </div>
                <div style={{ textAlign: 'center', padding: '16px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '7px', fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: '4px' }}>TIEMPO</p>
                    <p style={{ color: '#fff', fontSize: '36px', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.04em', lineHeight: 1 }}>{displayDuration}</p>
                    <p style={{ color: cfg.color, fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px' }}>MIN</p>
                </div>
            </div>
            {/* Impact bars - sharp peaks like punches */}
            <Bars color={cfg.color} heights={[20,80,15,90,10,95,20,85,15,75,10,90,20,80,15,95,10,85,20,70]} height={36} />
            {/* Rounds detail */}
            {blocks.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {blocks.map((b: WorkoutBlock, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ color: cfg.color, fontSize: '10px', fontWeight: 900, width: '22px', flexShrink: 0 }}>R{i + 1}</span>
                            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(b.exercises || []).map((e: any) => e.name).filter(Boolean).join(' · ') || b.title || b.type || 'Round'}
                            </span>
                            {b.duration && <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 900, flexShrink: 0 }}>{b.duration}MIN</span>}
                        </div>
                    ))}
                </div>
            )}
            <Footer userName={userName} date={date} color={cfg.color} />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WorkoutShareCard({ blocks, workoutTitle, sportType, duration, durationLabel, date, userName, onClose, category, runMetrics, wodBlocks }: WorkoutShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const durationMin = Math.floor(duration / 60);
    const durationSec = duration % 60;
    const displayDuration = durationLabel || (duration > 0 ? `${durationMin}:${String(durationSec).padStart(2, '0')}` : '--:--');

    const sportKey = getSportKey(category, sportType);
    const cfg = SPORTS[sportKey];

    // Resolve endurance metrics (also from wodBlocks[0].config as fallback)
    const firstWodBlock = wodBlocks?.[0];
    const resolvedRunMetrics = {
        distance: runMetrics?.distance || firstWodBlock?.config?.distance,
        pace: runMetrics?.pace || firstWodBlock?.config?.pace,
        elevation: runMetrics?.elevation,
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { quality: 1.0, pixelRatio: 3, cacheBust: true, backgroundColor: cfg.bg });
            const a = document.createElement('a');
            a.download = `RivalFit-${cfg.label.replace(/\s/g, '-')}-${Date.now()}.png`;
            a.href = dataUrl; a.click();
        } catch (err) { console.error(err); alert("Error al generar la descarga."); }
        finally { setIsDownloading(false); }
    };

    const handleShareToStory = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { quality: 1.0, pixelRatio: 3, cacheBust: true, backgroundColor: cfg.bg });
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], `RivalFit-${Date.now()}.png`, { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Rival Fit', text: '¡Mira mi entrenamiento en Rival Fit!' });
                onClose();
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = `RivalFit-${Date.now()}.png`; a.click();
                URL.revokeObjectURL(url);
                alert('Imagen descargada. Súbela a Instagram Stories desde tu galería.');
                onClose();
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') { console.error(err); alert('Error. Descarga la imagen manualmente.'); }
        } finally { setIsDownloading(false); }
    };

    const cardProps = { blocks, runMetrics: resolvedRunMetrics, workoutTitle, displayDuration, cfg, userName, date };

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
            <div className="w-full max-w-[360px] flex flex-col gap-3 animate-in zoom-in-95 duration-300 py-4">
                {/* Top bar */}
                <div className="flex justify-between items-center text-white px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{cfg.emoji}</span>
                        <h3 className="font-heading font-black italic uppercase tracking-tighter text-sm">{cfg.label}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-brand-red transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* THE CARD */}
                <div
                    ref={cardRef}
                    style={{ background: cfg.bg, fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflow: 'hidden', borderRadius: '24px' }}
                    className="w-full shadow-2xl border border-white/[0.06]"
                >
                    {/* Background pattern */}
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.035, pointerEvents: 'none', ...patternStyle(cfg.patternType) }} />
                    {/* Glow */}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '220px', height: '220px', borderRadius: '50%', background: `radial-gradient(circle, ${cfg.color}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '160px', height: '160px', borderRadius: '50%', background: `radial-gradient(circle, ${cfg.color}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    {/* Top accent bar */}
                    <div style={{ height: '3px', width: '100%', background: `linear-gradient(90deg, ${cfg.color} 0%, ${cfg.color}aa 50%, transparent 100%)` }} />

                    {/* Sport-specific card body */}
                    {sportKey === 'cross_training' && <CrossTrainingCard {...cardProps} />}
                    {sportKey === 'running'        && <RunningCard       {...cardProps} />}
                    {sportKey === 'cycling'        && <CyclingCard       {...cardProps} />}
                    {sportKey === 'swimming'       && <SwimmingCard      {...cardProps} />}
                    {sportKey === 'gym'            && <GymCard           {...cardProps} />}
                    {sportKey === 'hyrox'          && <HyroxCard         {...cardProps} />}
                    {sportKey === 'ocr'            && <OcrCard           {...cardProps} />}
                    {sportKey === 'yoga'           && <YogaCard          {...cardProps} />}
                    {sportKey === 'boxing'         && <BoxingCard        {...cardProps} />}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleShareToStory}
                        disabled={isDownloading}
                        className="flex-1 py-4 text-white rounded-2xl font-heading font-black italic uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all text-xs border border-white/10 disabled:opacity-60"
                        style={{ background: cfg.color }}
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -rotate-12" />}
                        INSTAGRAM
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
                <p className="text-center text-[9px] text-white/25 font-black uppercase tracking-widest">
                    Optimizado para Instagram Stories y Rival Feed
                </p>
            </div>
        </div>
    );
}
