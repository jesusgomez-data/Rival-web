"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Plus,
    Trash2,
    Activity,
    Dumbbell,
    Clock,
    Zap,
    ChevronDown,
    Search,
    Timer,
    Repeat,
    Target,
    RefreshCw,
    Trophy
} from "lucide-react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getExercises, addNewExercise } from "@/app/dashboard/training/actions";

export type WodFormat = 'AMRAP' | 'FOR TIME' | 'EMOM' | 'TABATA' | 'INTERVALS' | 'DEATH BY';

export interface WodBlock {
    id: string;
    title: string;
    format: WodFormat;
    config: {
        timecap?: string;
        rounds?: number;
        work?: string;
        rest?: string;
        frequency?: string;
        minutes?: number;
    };
    exercises: ExerciseEntry[];
}

export interface ExerciseEntry {
    id: string;
    name: string;
    reps: string;
    detail: string;
    unit?: string;
    showRounds?: boolean;
    roundDetails?: string[];
}

export interface WodSummary {
    totalTime: string;
    scoreType: 'TIME' | 'REPS' | 'WEIGHT' | 'ROUNDS' | 'CALORIES' | 'OTHER';
    scoreLabel: string;
}

interface WodCreatorProps {
    onUpdate: (wodData: { title: string, blocks: WodBlock[], summary: WodSummary }) => void;
    initialData?: { title: string, blocks: WodBlock[], summary: WodSummary };
}

const FORMAT_ICONS: Record<WodFormat, React.ReactNode> = {
    'AMRAP': <Timer className="w-5 h-5" />,
    'FOR TIME': <Clock className="w-5 h-5" />,
    'EMOM': <Repeat className="w-5 h-5" />,
    'TABATA': <Activity className="w-5 h-5" />,
    'INTERVALS': <Activity className="w-5 h-5" />,
    'DEATH BY': <Target className="w-5 h-5" />
};

const FORMAT_DESCRIPTIONS: Record<WodFormat, string> = {
    'AMRAP': 'AS MANY ROUNDS AS POSSIBLE',
    'FOR TIME': 'COMPLETA EL TRABAJO POR TIEMPO',
    'EMOM': 'EVERY MINUTE ON THE MINUTE',
    'TABATA': '20s WORK / 10s REST',
    'INTERVALS': 'TRABAJO Y DESCANSO DEFINIDO',
    'DEATH BY': 'AÑADE REPETICIONES CADA MINUTO'
};

export default function WodCreator({ onUpdate, initialData }: WodCreatorProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [blocks, setBlocks] = useState<WodBlock[]>(initialData?.blocks || [
        {
            id: '1',
            title: 'METCON',
            format: 'AMRAP',
            config: { timecap: '20:00' },
            exercises: [
                { id: 'ex1', name: '', reps: '', detail: '' }
            ]
        }
    ]);

    const [summary, setSummary] = useState<WodSummary>(initialData?.summary || {
        totalTime: '60:00',
        scoreType: 'REPS',
        scoreLabel: ''
    });

    const [catalog, setCatalog] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeExercisePath, setActiveExercisePath] = useState<{ bId: string, exId: string } | null>(null);
    const [isSavingNew, setIsSavingNew] = useState(false);
    const [activeUnitPath, setActiveUnitPath] = useState<{ bId: string, exId: string } | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRefs = useRef<Record<string, HTMLInputElement>>({});

    useEffect(() => {
        const loadExercises = async () => {
            const data = await getExercises('cross_training');
            setCatalog(data || []);
        };
        loadExercises();
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveExercisePath(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateWod = (newTitle: string, newBlocks: WodBlock[], newSummary: WodSummary = summary) => {
        onUpdate({ title: newTitle, blocks: newBlocks, summary: newSummary });
    };

    const addBlock = () => {
        const newBlock: WodBlock = {
            id: Math.random().toString(36).substring(7),
            title: `BLOCK ${blocks.length + 1}`,
            format: 'AMRAP',
            config: { timecap: '10:00' },
            exercises: [{ id: Math.random().toString(36).substring(7), name: '', reps: '', detail: '' }]
        };
        const updated = [...blocks, newBlock];
        setBlocks(updated);
        updateWod(title, updated, summary);
    };

    const removeBlock = (id: string) => {
        const updated = blocks.filter(b => b.id !== id);
        setBlocks(updated);
        updateWod(title, updated, summary);
    };

    const updateBlock = (id: string, updates: Partial<WodBlock>) => {
        const updated = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
        setBlocks(updated);
        updateWod(title, updated, summary);
    };

    const addExercise = (blockId: string) => {
        const updated = blocks.map(b => {
            if (b.id === blockId) {
                return {
                    ...b,
                    exercises: [...b.exercises, { id: Math.random().toString(36).substring(7), name: '', reps: '', detail: '' }]
                };
            }
            return b;
        });
        setBlocks(updated);
        updateWod(title, updated, summary);
    };

    const removeExercise = (blockId: string, exId: string) => {
        const updated = blocks.map(b => {
            if (b.id === blockId) {
                return {
                    ...b,
                    exercises: b.exercises.filter(ex => ex.id !== exId)
                };
            }
            return b;
        });
        setBlocks(updated);
        updateWod(title, updated, summary);
    };

    const COMMON_UNITS = ['REPS', 'KG', 'LBS', 'SEC', 'MIN', 'M', 'KM', 'CAL', '%', 'MAX'];

    const updateExercise = (blockId: string, exId: string, updates: Partial<ExerciseEntry>) => {
        const updated = blocks.map(b => {
            if (b.id === blockId) {
                return {
                    ...b,
                    exercises: b.exercises.map(ex => ex.id === exId ? { ...ex, ...updates } : ex)
                };
            }
            return b;
        });
        setBlocks(updated);
        updateWod(title, updated, summary);
    };

    const updateSummary = (updates: Partial<WodSummary>) => {
        const newSummary = { ...summary, ...updates };
        setSummary(newSummary);
        updateWod(title, blocks, newSummary);
    };

    const handleSaveNewExercise = async (blockId: string, exId: string, name: string) => {
        if (!name || name.length < 3) return;
        setIsSavingNew(true);
        const res = await addNewExercise({ name });
        if (res.success) {
            const data = await getExercises('cross_training');
            setCatalog(data || []);
        }
        setIsSavingNew(false);
        setActiveExercisePath(null);
    };

    return (
        <div className="space-y-6">
            <div className="relative group">
                <input
                    type="text"
                    placeholder="TÍTULO DEL WOD (Ej: THE CHIEF, MURPH...)"
                    value={title}
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setTitle(val);
                        updateWod(val, blocks, summary);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black italic tracking-tighter text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/50 transition-all uppercase"
                />
            </div>

            <div className="space-y-4">
                {blocks.map((block, idx) => (
                    <div key={block.id} className="bg-brand-gray/50 border border-white/10 rounded-[24px]">
                        {/* Block Header */}
                        <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red">
                                    {FORMAT_ICONS[block.format]}
                                </div>
                                <input
                                    className="bg-transparent border-none p-0 text-xs font-black uppercase tracking-widest text-white focus:ring-0 w-full"
                                    value={block.title}
                                    onChange={(e) => updateBlock(block.id, { title: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="flex flex-col">
                                <select
                                    className="bg-black/40 border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-red px-3 py-1.5 outline-none focus:border-brand-red/50 transition-all cursor-pointer"
                                    value={block.format}
                                    onChange={(e) => {
                                        const newFormat = e.target.value as WodFormat;
                                        // Clear irrelevant config when format changes
                                        let newConfig: any = {};
                                        if (newFormat === 'AMRAP') newConfig = { timecap: '20:00' };
                                        else if (newFormat === 'FOR TIME') newConfig = { timecap: '' };
                                        else if (newFormat === 'EMOM' || newFormat === 'DEATH BY') newConfig = { frequency: '1 MIN', minutes: 15 };
                                        else if (newFormat === 'TABATA') newConfig = { rounds: 8, work: '20S', rest: '10S' };
                                        else if (newFormat === 'INTERVALS') newConfig = { rounds: 4, work: '40S', rest: '20S' };
                                        updateBlock(block.id, { format: newFormat, config: newConfig });
                                    }}
                                >
                                    {Object.keys(FORMAT_ICONS).map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                                <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1 text-center">{FORMAT_DESCRIPTIONS[block.format]}</span>
                            </div>

                            <button type="button" onClick={() => removeBlock(block.id)} className="text-gray-600 hover:text-brand-red transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Block Config */}
                        <div className="p-4 border-b border-white/5 bg-black/20">
                            <div className="flex flex-wrap gap-4 sm:gap-8">
                                {(block.format === 'EMOM' || block.format === 'DEATH BY') && (
                                    <>
                                        <ConfigInput label="EVERY" value={block.config.frequency || '1 MIN'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, frequency: v } })} />
                                        <ConfigInput label="MINS" value={block.config.minutes === undefined ? '' : block.config.minutes.toString()} onChange={(v) => updateBlock(block.id, { config: { ...block.config, minutes: v === '' ? undefined : (parseInt(v) || 0) } })} />
                                        <div className="flex flex-col justify-center px-4 border-l border-white/10">
                                            <span className="text-xs font-black text-brand-red uppercase tracking-widest leading-none">
                                                {block.config.minutes && block.config.frequency ? Math.floor(block.config.minutes / (parseInt(block.config.frequency) || 1)) : 0}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1">RONDAS TOTALES</span>
                                        </div>
                                    </>
                                )}
                                {block.format === 'AMRAP' && (
                                    <ConfigInput label="TIME CAP" value={block.config.timecap || '20:00'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, timecap: v } })} />
                                )}
                                {block.format === 'FOR TIME' && (
                                    <ConfigInput label="TIME CAP (OPT)" value={block.config.timecap || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, timecap: v } })} />
                                )}
                                {block.format === 'TABATA' && (
                                    <>
                                        <ConfigInput label="ROUNDS" value={block.config.rounds === undefined ? '' : block.config.rounds.toString()} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: v === '' ? undefined : (parseInt(v) || 0) } })} />
                                        <ConfigInput label="WORK" value={block.config.work || '20S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, work: v } })} />
                                        <ConfigInput label="REST" value={block.config.rest || '10S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rest: v } })} />
                                    </>
                                )}
                                {block.format === 'INTERVALS' && (
                                    <>
                                        <ConfigInput label="ROUNDS" value={block.config.rounds === undefined ? '' : block.config.rounds.toString()} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: v === '' ? undefined : (parseInt(v) || 0) } })} />
                                        <ConfigInput label="WORK" value={block.config.work || '40S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, work: v } })} />
                                        <ConfigInput label="REST" value={block.config.rest || '20S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rest: v } })} />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Exercises List */}
                        <div className="p-4 space-y-4">
                            {block.exercises.map((ex, eIdx) => (
                                <React.Fragment key={ex.id}>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 group/ex border-b border-white/5 sm:border-0 pb-4 sm:pb-0">
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <div className="text-[10px] font-black text-gray-700 w-4 shrink-0">{eIdx + 1}</div>
                                            <div className="flex-[2] relative sm:hidden">
                                                <input
                                                    placeholder="EJERCICIO"
                                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase"
                                                    value={ex.name}
                                                    onFocus={() => {
                                                        setActiveExercisePath({ bId: block.id, exId: ex.id });
                                                        setSearchQuery(ex.name);
                                                    }}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase();
                                                        updateExercise(block.id, ex.id, { name: val });
                                                        setSearchQuery(val);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full">
                                            <input
                                                placeholder="REPS"
                                                inputMode="decimal"
                                                className="w-20 sm:w-16 bg-white/5 border border-white/5 rounded-xl px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase shrink-0"
                                                value={ex.reps}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => updateExercise(block.id, ex.id, { reps: e.target.value.toUpperCase() })}
                                            />

                                            <div className="hidden sm:block flex-[3] relative">
                                                <input
                                                    ref={el => { if (el) inputRefs.current[ex.id] = el; }}
                                                    placeholder="EJERCICIO"
                                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase"
                                                    value={ex.name}
                                                    onFocus={() => {
                                                        setActiveExercisePath({ bId: block.id, exId: ex.id });
                                                        setSearchQuery(ex.name);
                                                    }}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase();
                                                        updateExercise(block.id, ex.id, { name: val });
                                                        setSearchQuery(val);
                                                    }}
                                                />
                                                <AnimatePresence>
                                                    {activeExercisePath?.bId === block.id && activeExercisePath?.exId === ex.id && searchQuery.length > 0 && (
                                                        <motion.div
                                                            ref={dropdownRef}
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute left-0 right-0 top-full mt-2 bg-brand-gray border border-white/10 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto backdrop-blur-xl ring-1 ring-black/50"
                                                        >
                                                            {catalog
                                                                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                                .sort((a, b) => a.name.toUpperCase().startsWith(searchQuery) ? -1 : 1)
                                                                .slice(0, 15)
                                                                .map((ce, i) => (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            updateExercise(block.id, ex.id, { name: ce.name.toUpperCase() });
                                                                            setActiveExercisePath(null);
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 text-[10px] font-bold text-gray-300 hover:text-white hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors uppercase flex items-center gap-2"
                                                                    >
                                                                        <span className={cn("w-1.5 h-1.5 rounded-full", ce.name.toUpperCase() === searchQuery ? "bg-brand-red" : "bg-white/20")} />
                                                                        {ce.name}
                                                                    </button>
                                                                ))
                                                            }
                                                            {!catalog.find(c => c.name.toUpperCase() === searchQuery) && (
                                                                <button type="button" onClick={() => handleSaveNewExercise(block.id, ex.id, searchQuery)} className="w-full text-left px-4 py-3 text-[9px] font-black text-brand-red bg-brand-red/5 hover:bg-brand-red/10 border-t border-white/5 transition-all flex items-center justify-between uppercase tracking-widest">
                                                                    <span>AGREGAR "{searchQuery}" A LA LIBRERÍA</span>
                                                                    {isSavingNew ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                                                </button>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <div className="flex-1 relative group/unit">
                                                <input
                                                    placeholder="VALOR"
                                                    inputMode="decimal"
                                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-brand-red placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase"
                                                    value={ex.detail}
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                        setActiveUnitPath({ bId: block.id, exId: ex.id });
                                                    }}
                                                    onChange={(e) => updateExercise(block.id, ex.id, { detail: e.target.value.toUpperCase() })}
                                                />

                                                <AnimatePresence>
                                                    {activeUnitPath?.bId === block.id && activeUnitPath?.exId === ex.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.9 }}
                                                            className="absolute left-[-150%] sm:left-[-100%] right-0 top-full mt-1 bg-black/95 border border-white/10 rounded-2xl p-2 z-50 shadow-2xl backdrop-blur-md grid grid-cols-4 gap-2 min-w-[220px]"
                                                        >
                                                            {COMMON_UNITS.map(u => (
                                                                <button
                                                                    key={u}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        updateExercise(block.id, ex.id, { unit: u });
                                                                        setActiveUnitPath(null);
                                                                    }}
                                                                    className={cn(
                                                                        "py-2.5 rounded-xl text-[10px] sm:text-[8px] font-black transition-all",
                                                                        ex.unit === u ? "bg-brand-red text-white" : "bg-white/5 text-gray-500 hover:text-white"
                                                                    )}
                                                                >
                                                                    {u}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {ex.unit && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-red/20 border border-brand-red/30 rounded px-2 py-1 pointer-events-none">
                                                        <span className="text-[8px] font-black text-brand-red leading-none">{ex.unit}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {(block.format === 'EMOM' || block.format === 'DEATH BY') && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateExercise(block.id, ex.id, { showRounds: !ex.showRounds })}
                                                    className={cn(
                                                        "p-3 sm:p-2 rounded-xl border transition-all shrink-0",
                                                        ex.showRounds ? "bg-brand-red border-brand-red text-white" : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
                                                    )}
                                                    title="Pesos por Ronda"
                                                >
                                                    <Repeat className="w-4 h-4 sm:w-3 sm:h-3" />
                                                </button>
                                            )}

                                            <button type="button" onClick={() => removeExercise(block.id, ex.id)} className="p-2 text-gray-700 hover:text-brand-red transition-all shrink-0">
                                                <Trash2 className="w-4 h-4 sm:w-3 sm:h-3" />
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {activeExercisePath?.bId === block.id && activeExercisePath?.exId === ex.id && searchQuery.length > 0 && (
                                                <div className="sm:hidden w-full mt-2">
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="bg-brand-gray border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100] max-h-60 overflow-y-auto"
                                                    >
                                                        {catalog
                                                            .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                            .sort((a, b) => a.name.toUpperCase().startsWith(searchQuery) ? -1 : 1)
                                                            .slice(0, 10)
                                                            .map((ce, i) => (
                                                                <button key={i} type="button" onClick={() => { updateExercise(block.id, ex.id, { name: ce.name.toUpperCase() }); setActiveExercisePath(null); }} className="w-full text-left px-4 py-4 text-xs font-bold text-gray-300 active:bg-white/10 border-b border-white/5 last:border-0 uppercase flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-brand-red" />
                                                                    {ce.name}
                                                                </button>
                                                            ))
                                                        }
                                                    </motion.div>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {ex.showRounds && (block.format === 'EMOM' || block.format === 'DEATH BY') && (
                                        <div className="ml-7 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {Array.from({ length: Math.floor((block.config.minutes || 15) / (parseInt(block.config.frequency || '1') || 1)) }).map((_, rIdx) => (
                                                <div key={rIdx} className="flex flex-col gap-1">
                                                    <span className="text-[7px] font-bold text-gray-600 uppercase text-center">R{rIdx + 1}</span>
                                                    <input
                                                        placeholder="PESO"
                                                        inputMode="decimal"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white text-center focus:outline-none focus:border-brand-red/30 transition-all font-mono"
                                                        value={ex.roundDetails?.[rIdx] || ''}
                                                        onChange={(e) => {
                                                            const newDetails = [...(ex.roundDetails || [])];
                                                            newDetails[rIdx] = e.target.value.toUpperCase();
                                                            updateExercise(block.id, ex.id, { roundDetails: newDetails });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}

                            <button
                                type="button"
                                onClick={() => addExercise(block.id)}
                                className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-brand-red/30 hover:text-brand-red transition-all mt-2"
                            >
                                <Plus className="w-3 h-3 inline-block mr-1" /> AÑADIR LÍNEA
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addBlock}
                className="w-full py-4 bg-brand-red/10 border border-brand-red/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-brand-red hover:bg-brand-red hover:text-white transition-all shadow-glow-sm"
            >
                <Plus className="w-4 h-4 inline-block mr-2" /> AÑADIR BLOQUE DE TRABAJO
            </button>

            {/* Workout Summary Section */}
            <div className="bg-brand-red/5 border border-brand-red/20 rounded-[28px] p-6 mt-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-brand-red text-white rounded-lg shadow-glow-sm">
                        <Trophy className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Resumen y Objetivo del WOD</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">Tiempo Total Estimado</span>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-red" />
                            <input
                                type="text"
                                placeholder="Ej: 60:00"
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-4 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/50 transition-all uppercase"
                                value={summary.totalTime}
                                onChange={(e) => updateSummary({ totalTime: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">RESULTADO</span>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-brand-red uppercase tracking-widest outline-none focus:border-brand-red/50 transition-all cursor-pointer h-[54px]"
                            value={summary.scoreType}
                            onChange={(e) => updateSummary({ scoreType: e.target.value as any })}
                        >
                            <option value="TIME">TIEMPO (MM:SS)</option>
                            <option value="REPS">REPETICIONES</option>
                            <option value="WEIGHT">PESO (KG/LBS)</option>
                            <option value="ROUNDS">RONDAS</option>
                            <option value="CALORIES">CALORÍAS</option>
                            <option value="OTHER">OTROS</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">TOTAL</span>
                        <input
                            type="text"
                            placeholder="Ej: 21:05 / 250 REPS"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/50 transition-all uppercase"
                            value={summary.scoreLabel}
                            onChange={(e) => updateSummary({ scoreLabel: e.target.value.toUpperCase() })}
                        />
                    </div>
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-brand-yellow" />
                        <p className="text-[10px] font-bold text-gray-400">
                            <span className="text-white">INFO:</span> Al publicar, los atletas deberán registrar su puntuación basándose en <span className="text-brand-red">{summary.scoreLabel}</span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfigInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-2 min-w-[80px]">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">{label}</span>
            <input
                inputMode="decimal"
                className="bg-black/20 border border-white/5 rounded-xl text-sm font-black text-brand-red px-4 py-3 focus:ring-0 focus:border-brand-red transition-all w-28 sm:w-24"
                value={value}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
        </div>
    );
}
