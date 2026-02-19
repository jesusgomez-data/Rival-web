"use client";

import React, { useState } from "react";
import {
    Plus,
    Trash2,
    GripVertical,
    Clock,
    Zap,
    Dumbbell,
    ChevronDown,
    ChevronUp,
    Timer,
    Repeat,
    Target,
    RefreshCw,
    Trophy
} from "lucide-react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getExercises, addNewExercise } from "@/app/dashboard/training/actions";
import { useEffect, useRef } from "react";

export type WodFormat = 'EMOM' | 'AMRAP' | 'FOR TIME' | 'INTERVALS' | 'TABATA' | 'QUALITY' | 'REST' | 'DEATH BY';

export interface ExerciseEntry {
    id: string;
    name: string;
    reps: string;
    detail: string;
    unit?: string;
    roundDetails?: string[];
    showRounds?: boolean;
}

export interface WodBlock {
    id: string;
    title: string;
    format: WodFormat;
    config: {
        minutes?: number;
        rounds?: number;
        work?: string;
        rest?: string;
        frequency?: string;
        timecap?: string;
    };
    exercises: ExerciseEntry[];
}

export interface WodSummary {
    totalTime: string;
    scoreType: 'TIME' | 'REPS' | 'WEIGHT' | 'ROUNDS' | 'CALORIES' | 'OTHER';
    scoreLabel: string;
}

interface WodCreatorProps {
    onUpdate: (wodData: { title: string, blocks: WodBlock[], summary: WodSummary }) => void;
}

const FORMAT_ICONS: Record<WodFormat, React.ReactNode> = {
    'EMOM': <Timer className="w-4 h-4" />,
    'AMRAP': <Repeat className="w-4 h-4" />,
    'FOR TIME': <Clock className="w-4 h-4" />,
    'INTERVALS': <Zap className="w-4 h-4" />,
    'TABATA': <Zap className="w-4 h-4 text-orange-500" />,
    'QUALITY': <Target className="w-4 h-4" />,
    'REST': <Clock className="w-4 h-4" />,
    'DEATH BY': <Target className="w-4 h-4 text-red-500" />
};

const FORMAT_DESCRIPTIONS: Record<WodFormat, string> = {
    'EMOM': 'Every Minute on the Minute',
    'AMRAP': 'As Many Rounds As Possible',
    'FOR TIME': 'Completar lo más rápido posible',
    'INTERVALS': 'Intervalos de trabajo y descanso',
    'TABATA': '20s trabajo / 10s descanso',
    'QUALITY': 'Movimientos técnicos y controlados',
    'REST': 'Descanso total entre bloques',
    'DEATH BY': 'Repeticiones incrementales por minuto'
};

export default function WodCreator({ onUpdate }: WodCreatorProps) {
    const [title, setTitle] = useState("");
    const [catalog, setCatalog] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeExercisePath, setActiveExercisePath] = useState<{ bId: string, exId: string } | null>(null);
    const [isSavingNew, setIsSavingNew] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        async function loadCatalog() {
            const data = await getExercises('cross_training');
            setCatalog(data || []);
        }
        loadCatalog();

        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            // Check if click is outside dropdown AND outside any exercise input
            const isClickOnInput = Object.values(inputRefs.current).some(input => input?.contains(target));

            if (dropdownRef.current && !dropdownRef.current.contains(target) && !isClickOnInput) {
                setActiveExercisePath(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const [blocks, setBlocks] = useState<WodBlock[]>([
        {
            id: 'warmup',
            title: 'WARM-UP',
            format: 'QUALITY',
            config: {},
            exercises: [{ id: 'w1', name: '', reps: '', detail: '' }]
        },
        {
            id: 'metcon',
            title: 'METCON',
            format: 'AMRAP',
            config: { timecap: '20:00' },
            exercises: [{ id: 'm1', name: '', reps: '', detail: '' }]
        }
    ]);

    const [summary, setSummary] = useState<WodSummary>({
        totalTime: '60:00',
        scoreType: 'REPS',
        scoreLabel: 'REPETICIONES TOTALES'
    });

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

    const [activeUnitPath, setActiveUnitPath] = useState<{ bId: string, exId: string } | null>(null);

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
            // Refresh catalog
            const data = await getExercises('cross_training');
            setCatalog(data || []);
        }
        setIsSavingNew(false);
        setActiveExercisePath(null);
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
        updateWod(title, updated);
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
                        updateWod(val, blocks);
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
                                    onChange={(e) => updateBlock(block.id, { format: e.target.value as WodFormat })}
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
                            <div className="flex flex-wrap gap-4">
                                {(block.format === 'EMOM' || block.format === 'DEATH BY') && (
                                    <>
                                        <ConfigInput label="EVERY" value={block.config.frequency || '1 MIN'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, frequency: v } })} />
                                        <ConfigInput label="MINS" value={block.config.minutes?.toString() || '15'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, minutes: parseInt(v) } })} />
                                        <div className="flex flex-col justify-center px-4 border-l border-white/10">
                                            <span className="text-[10px] font-black text-brand-red uppercase tracking-widest leading-none">
                                                {Math.floor((block.config.minutes || 15) / (parseInt(block.config.frequency || '1') || 1))}
                                            </span>
                                            <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">RONDAS TOTALES</span>
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
                                        <ConfigInput label="ROUNDS" value={block.config.rounds?.toString() || '8'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: parseInt(v) } })} />
                                        <ConfigInput label="WORK" value={block.config.work || '20S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, work: v } })} />
                                        <ConfigInput label="REST" value={block.config.rest || '10S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rest: v } })} />
                                    </>
                                )}
                                {block.format === 'INTERVALS' && (
                                    <>
                                        <ConfigInput label="ROUNDS" value={block.config.rounds?.toString() || '8'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: parseInt(v) } })} />
                                        <ConfigInput label="WORK" value={block.config.work || '40S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, work: v } })} />
                                        <ConfigInput label="REST" value={block.config.rest || '20S'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rest: v } })} />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Exercises List */}
                        <div className="p-4 space-y-3">
                            {block.exercises.map((ex, eIdx) => (
                                <React.Fragment key={ex.id}>
                                    <div className="flex items-center gap-3 group/ex">
                                        <div className="text-[10px] font-black text-gray-700 w-4 shrink-0">{eIdx + 1}</div>
                                        <input
                                            placeholder="REPS"
                                            className="w-16 bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase shrink-0"
                                            value={ex.reps}
                                            onChange={(e) => updateExercise(block.id, ex.id, { reps: e.target.value.toUpperCase() })}
                                        />
                                        <div className="flex-[2] relative">
                                            <input
                                                ref={el => { if (el) inputRefs.current[ex.id] = el; }}
                                                placeholder="EJERCICIO"
                                                className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase"
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

                                            {/* Autocomplete Dropdown */}
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
                                                            .sort((a, b) => {
                                                                const query = searchQuery.toLowerCase();
                                                                const aName = a.name.toLowerCase();
                                                                const bName = b.name.toLowerCase();

                                                                // Exact match first
                                                                if (aName === query) return -1;
                                                                if (bName === query) return 1;

                                                                // Starts with second
                                                                if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
                                                                if (!aName.startsWith(query) && bName.startsWith(query)) return 1;

                                                                return aName.localeCompare(bName);
                                                            })
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
                                                                    <span className={cn(
                                                                        "w-1.5 h-1.5 rounded-full",
                                                                        ce.name.toLowerCase() === searchQuery.toLowerCase() ? "bg-brand-red" : "bg-white/20"
                                                                    )} />
                                                                    {ce.name}
                                                                </button>
                                                            ))
                                                        }

                                                        {/* Option to add new if no exact match */}
                                                        {!catalog.find(c => c.name.toLowerCase() === searchQuery.toLowerCase()) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveNewExercise(block.id, ex.id, searchQuery)}
                                                                className="w-full text-left px-4 py-3 text-[9px] font-black text-brand-red bg-brand-red/5 hover:bg-brand-red/10 border-t border-white/5 transition-all flex items-center justify-between uppercase tracking-widest"
                                                            >
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
                                                className="w-full bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-brand-red placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase"
                                                value={ex.detail}
                                                onFocus={() => setActiveUnitPath({ bId: block.id, exId: ex.id })}
                                                onChange={(e) => updateExercise(block.id, ex.id, { detail: e.target.value.toUpperCase() })}
                                            />

                                            {/* Unit Selector Overlay */}
                                            <AnimatePresence>
                                                {activeUnitPath?.bId === block.id && activeUnitPath?.exId === ex.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className="absolute left-0 right-0 top-full mt-1 bg-black/90 border border-white/10 rounded-xl p-1 z-50 shadow-2xl backdrop-blur-md grid grid-cols-5 gap-1"
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
                                                                    "py-1 rounded-lg text-[8px] font-black transition-all",
                                                                    ex.unit === u ? "bg-brand-red text-white" : "bg-white/5 text-gray-500 hover:text-white"
                                                                )}
                                                            >
                                                                {u}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Current Unit Badge */}
                                            {ex.unit && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-red/20 border border-brand-red/30 rounded px-1.5 py-0.5 pointer-events-none">
                                                    <span className="text-[7px] font-black text-brand-red leading-none">{ex.unit}</span>
                                                </div>
                                            )}
                                        </div>

                                        {(block.format === 'EMOM' || block.format === 'DEATH BY') && (
                                            <button
                                                type="button"
                                                onClick={() => updateExercise(block.id, ex.id, { showRounds: !ex.showRounds })}
                                                className={cn(
                                                    "p-2 rounded-xl border transition-all shrink-0",
                                                    ex.showRounds ? "bg-brand-red border-brand-red text-white" : "bg-white/5 border-white/5 text-gray-500 hover:text-white"
                                                )}
                                                title="Pesos por Ronda"
                                            >
                                                <Repeat className="w-3 h-3" />
                                            </button>
                                        )}

                                        <button type="button" onClick={() => removeExercise(block.id, ex.id)} className="text-gray-700 hover:text-brand-red transition-all shrink-0">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Per-Round Details for EMOM */}
                                    {
                                        ex.showRounds && (block.format === 'EMOM' || block.format === 'DEATH BY') && (
                                            <div className="ml-7 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {Array.from({ length: Math.floor((block.config.minutes || 15) / (parseInt(block.config.frequency || '1') || 1)) }).map((_, rIdx) => (
                                                    <div key={rIdx} className="flex flex-col gap-1">
                                                        <span className="text-[7px] font-bold text-gray-600 uppercase text-center">R{rIdx + 1}</span>
                                                        <input
                                                            placeholder="PESO"
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white text-center focus:outline-none focus:border-brand-red/30 transition-all"
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
                                        )
                                    }
                                </React.Fragment>
                            ))}
                            <button
                                type="button"
                                onClick={() => addExercise(block.id)}
                                className="w-full py-2 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-gray-600 hover:border-brand-red/30 hover:text-brand-red transition-all mt-2"
                            >
                                <Plus className="w-3 h-3 inline-block mr-1" /> AÑADIR LÍNEA
                            </button>
                        </div>
                    </div>
                ))}

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
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none">Tiempo Total Estimado</span>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-red" />
                                <input
                                    type="text"
                                    placeholder="Ej: 60:00"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[10px] font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/50 transition-all uppercase"
                                    value={summary.totalTime}
                                    onChange={(e) => updateSummary({ totalTime: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none">Tipo de Resultado</span>
                            <select
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-brand-red uppercase tracking-widest outline-none focus:border-brand-red/50 transition-all cursor-pointer"
                                value={summary.scoreType}
                                onChange={(e) => updateSummary({ scoreType: e.target.value as any })}
                            >
                                <option value="TIME">POR TIEMPO (MM:SS)</option>
                                <option value="REPS">REPETICIONES TOTALES</option>
                                <option value="WEIGHT">PESO MÁXIMO (KG)</option>
                                <option value="ROUNDS">RONDAS COMPLETAS</option>
                                <option value="CALORIES">CALORÍAS TOTALES</option>
                                <option value="OTHER">OTRO / PERSONALIZADO</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none">Etiqueta del Resultado</span>
                            <input
                                type="text"
                                placeholder="Ej: MAX FRONT SQUAT"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/50 transition-all uppercase"
                                value={summary.scoreLabel}
                                onChange={(e) => updateSummary({ scoreLabel: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-brand-yellow" />
                            <p className="text-[9px] font-bold text-gray-400">
                                <span className="text-white">INFO:</span> Al publicar, los atletas deberán registrar su puntuación basándose en <span className="text-brand-red">{summary.scoreLabel}</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfigInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest leading-none">{label}</span>
            <input
                className="bg-transparent border-b border-white/10 text-[10px] font-black text-white p-0 focus:ring-0 focus:border-brand-red transition-all w-16"
                value={value}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
        </div>
    );
}
