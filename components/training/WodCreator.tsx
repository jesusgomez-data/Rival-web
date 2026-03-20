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
    Trophy,
    Calendar
} from "lucide-react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getExercises, addNewExercise } from "@/app/dashboard/training/actions";

export type WodFormat = 'AMRAP' | 'FOR TIME' | 'EMOM' | 'TABATA' | 'INTERVALS' | 'DEATH BY' | 'ROUNDS FOR TIME' | '21-15-9' | 'FUERZA' | 'LIBRE'
    // Endurance formats
    | 'CARRERA LIBRE' | 'INTERVALOS' | 'FARTLEK' | 'TEMPO' | 'SERIES' | 'TRAIL';
export type WorkoutCategory = 'CROSS_TRAINING' | 'RUNNING' | 'GYM' | 'OCR' | 'HYROX' | 'CYCLING' | 'SWIMMING' | 'YOGA' | 'BOXING';

import { BENCHMARKS } from "./benchmarks";

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
        distance?: string;
        pace?: string;
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

export type ScoreType = 'TIME' | 'REPS' | 'WEIGHT' | 'ROUNDS' | 'CALORIES' | 'DISTANCE' | 'PACE' | 'WATTS' | 'OTHER' | 'NONE';

export interface WodSummary {
    totalTime: string;
    scoreType: ScoreType;
    scoreLabel: string;
}

interface WodCreatorProps {
    onUpdate: (wodData: { title: string, date: string, blocks: WodBlock[], summary: WodSummary, category?: WorkoutCategory }) => void;
    initialData?: { title: string, date: string, blocks: WodBlock[], summary: WodSummary, category?: WorkoutCategory };
}

const FORMAT_ICONS: Record<WodFormat, React.ReactNode> = {
    'AMRAP': <Timer className="w-5 h-5" />,
    'FOR TIME': <Clock className="w-5 h-5" />,
    'EMOM': <Repeat className="w-5 h-5" />,
    'TABATA': <Activity className="w-5 h-5" />,
    'INTERVALS': <Activity className="w-5 h-5" />,
    'DEATH BY': <Target className="w-5 h-5" />,
    'ROUNDS FOR TIME': <Repeat className="w-5 h-5" />,
    '21-15-9': <Zap className="w-5 h-5" />,
    'FUERZA': <Dumbbell className="w-5 h-5" />,
    'LIBRE': <Activity className="w-5 h-5" />,
    // Endurance
    'CARRERA LIBRE': <Activity className="w-5 h-5" />,
    'INTERVALOS': <Repeat className="w-5 h-5" />,
    'FARTLEK': <Zap className="w-5 h-5" />,
    'TEMPO': <Timer className="w-5 h-5" />,
    'SERIES': <Target className="w-5 h-5" />,
    'TRAIL': <Activity className="w-5 h-5" />,
};

const FORMAT_DESCRIPTIONS: Record<WodFormat, string> = {
    'AMRAP': 'AS MANY ROUNDS AS POSSIBLE',
    'FOR TIME': 'COMPLETA EL TRABAJO POR TIEMPO',
    'EMOM': 'EVERY MINUTE ON THE MINUTE',
    'TABATA': '20s WORK / 10s REST',
    'INTERVALS': 'TRABAJO Y DESCANSO DEFINIDO',
    'DEATH BY': 'AÑADE REPETICIONES CADA MINUTO',
    'ROUNDS FOR TIME': 'REALIZA LAS RONDAS POR TIEMPO',
    '21-15-9': 'ESQUEMA CLÁSICO DE REPETICIONES',
    'FUERZA': 'TRABAJO DE FUERZA Y POWERLIFTING',
    'LIBRE': 'ENTRENAMIENTO SIN FORMATO DEFINIDO',
    // Endurance
    'CARRERA LIBRE': 'DISTANCIA Y TIEMPO LIBRE',
    'INTERVALOS': 'SERIES CON DESCANSO DEFINIDO',
    'FARTLEK': 'RITMO VARIABLE POR SENSACIONES',
    'TEMPO': 'RITMO CONSTANTE Y CONTROLADO',
    'SERIES': 'REPETICIONES EN PISTA / DISTANCIA',
    'TRAIL': 'CARRERA POR MONTAÑA / TRAIL',
};

const CATEGORY_FORMATS: Record<WorkoutCategory, WodFormat[]> = {
    'CROSS_TRAINING': ['AMRAP', 'FOR TIME', 'EMOM', 'TABATA', 'INTERVALS', 'DEATH BY', 'ROUNDS FOR TIME', '21-15-9', 'FUERZA', 'LIBRE'],
    'GYM':            ['FUERZA', 'INTERVALS', 'LIBRE'],
    'OCR':            ['FOR TIME', 'ROUNDS FOR TIME', 'INTERVALS', 'LIBRE'],
    'HYROX':          ['FOR TIME', 'INTERVALS', 'ROUNDS FOR TIME', 'LIBRE'],
    'BOXING':         ['ROUNDS FOR TIME', 'TABATA', 'INTERVALS', 'LIBRE'],
    'YOGA':           ['LIBRE'],
    'RUNNING':        ['CARRERA LIBRE', 'INTERVALOS', 'FARTLEK', 'TEMPO', 'SERIES', 'TRAIL'],
    'CYCLING':        ['CARRERA LIBRE', 'INTERVALOS', 'TEMPO', 'SERIES', 'FARTLEK'],
    'SWIMMING':       ['CARRERA LIBRE', 'SERIES', 'INTERVALOS', 'TEMPO'],
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

    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);

    const [summary, setSummary] = useState<WodSummary>(initialData?.summary || {
        totalTime: '60:00',
        scoreType: 'REPS',
        scoreLabel: ''
    });

    const [category, setCategory] = useState<WorkoutCategory>(initialData?.category || 'CROSS_TRAINING');

    const [catalog, setCatalog] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeExercisePath, setActiveExercisePath] = useState<{ bId: string, exId: string } | null>(null);
    const [isSavingNew, setIsSavingNew] = useState(false);
    const [activeUnitPath, setActiveUnitPath] = useState<{ bId: string, exId: string } | null>(null);
    const [showBenchmarks, setShowBenchmarks] = useState(false);
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

    const updateWod = (newTitle: string, newBlocks: WodBlock[], newSummary: WodSummary = summary, newDate: string = date, newCategory: WorkoutCategory = category) => {
        onUpdate({ title: newTitle, date: newDate, blocks: newBlocks, summary: newSummary, category: newCategory });
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
        updateWod(title, updated, summary, date, category);
    };

    const removeBlock = (id: string) => {
        const updated = blocks.filter(b => b.id !== id);
        setBlocks(updated);
        updateWod(title, updated, summary, date, category);
    };

    const updateBlock = (id: string, updates: Partial<WodBlock>) => {
        const updated = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
        setBlocks(updated);
        
        let newSummary = { ...summary };
        
        // Auto-sync para Endurance (Sincronizar tiempo y distancia entre bloque y resumen)
        const isEndurance = ['RUNNING', 'CYCLING', 'SWIMMING'].includes(category);
        if (isEndurance && updated.length === 1) {
            const b = updated[0];
            const config = b.config;
            
            if (config.timecap) newSummary.totalTime = config.timecap;
            
            // Si el modo de puntuación es Distancia, heredar la distancia del bloque
            if (newSummary.scoreType === 'DISTANCE' && config.distance) {
                newSummary.scoreLabel = config.distance;
            } else if (newSummary.scoreType === 'TIME' && config.timecap) {
                newSummary.scoreLabel = config.timecap;
            } else if (newSummary.scoreType === 'PACE' && config.pace) {
                newSummary.scoreLabel = config.pace;
            }
            setSummary(newSummary);
        }
        
        updateWod(title, updated, newSummary, date, category);
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
        updateWod(title, updated, summary, date, category);
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
        updateWod(title, updated, summary, date, category);
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
        updateWod(title, updated, summary, date, category);
    };

    const updateSummary = (updates: Partial<WodSummary>) => {
        const newSummary = { ...summary, ...updates };
        setSummary(newSummary);
        updateWod(title, blocks, newSummary, date, category);
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

    const CATEGORIES: { id: WorkoutCategory, label: string, icon: string }[] = [
        { id: 'CROSS_TRAINING', label: 'CROSS TRAINING', icon: '🏋️' },
        { id: 'RUNNING', label: 'RUNNING', icon: '🏃' },
        { id: 'GYM', label: 'GYM / MUSC', icon: '💪' },
        { id: 'OCR', label: 'OCR', icon: '🧗' },
        { id: 'HYROX', label: 'HYROX', icon: '🔥' },
        { id: 'CYCLING', label: 'CYCLING', icon: '🚴' },
        { id: 'SWIMMING', label: 'SWIMMING', icon: '🏊' },
        { id: 'YOGA', label: 'YOGA / MOB', icon: '🧘' },
        { id: 'BOXING', label: 'BOXING', icon: '🥊' }
    ];

    const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
        'TIME': 'TIEMPO (MM:SS)',
        'REPS': 'REPETICIONES',
        'WEIGHT': 'PESO (KG/LBS)',
        'ROUNDS': 'RONDAS',
        'CALORIES': 'CALORÍAS',
        'DISTANCE': 'DISTANCIA (M/KM)',
        'PACE': 'RITMO (MIN/KM)',
        'WATTS': 'POTENCIA (WATTS)',
        'OTHER': 'OTROS',
        'NONE': 'SIN RESULTADO (COMPLETADO)'
    };

    const CATEGORY_SCORE_TYPES: Record<WorkoutCategory, ScoreType[]> = {
        'CROSS_TRAINING': ['TIME', 'REPS', 'WEIGHT', 'ROUNDS', 'CALORIES', 'OTHER', 'NONE'],
        'RUNNING': ['TIME', 'DISTANCE', 'PACE', 'CALORIES', 'OTHER'],
        'GYM': ['WEIGHT', 'REPS', 'OTHER', 'NONE'],
        'OCR': ['TIME', 'OTHER', 'NONE'],
        'HYROX': ['TIME', 'OTHER', 'NONE'],
        'CYCLING': ['TIME', 'DISTANCE', 'WATTS', 'CALORIES', 'OTHER'],
        'SWIMMING': ['TIME', 'DISTANCE', 'OTHER'],
        'YOGA': ['NONE', 'TIME', 'OTHER'],
        'BOXING': ['ROUNDS', 'TIME', 'OTHER']
    };

    const SCORE_PLACEHOLDERS: Record<ScoreType, string> = {
        'TIME': 'EJ: 15:30',
        'REPS': 'EJ: 150 REPS',
        'WEIGHT': 'EJ: 100 KG',
        'ROUNDS': 'EJ: 15 RONDAS',
        'CALORIES': 'EJ: 300 CAL',
        'DISTANCE': 'EJ: 10 KM / 5000 M',
        'PACE': 'EJ: 4:30 MIN/KM',
        'WATTS': 'EJ: 250 WATTS',
        'OTHER': 'ESCRIBE TU RESULTADO',
        'NONE': 'COMPLETADO'
    };

    return (
        <div className="space-y-6">
            {/* Category Selector */}
            <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Selecciona Tipo de Entrenamiento</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                                setCategory(cat.id);
                                let newTitle = title;
                                let newBlocks = blocks;
                                
                                // Autofill if empty
                                const isEmpty = blocks.length === 1 && blocks[0].exercises.length === 1 && blocks[0].exercises[0].name === '';
                                const isDefaultTitle = !title || title.trim() === '' || title === 'WORKOUT OF THE DAY';
                                
                                if (isDefaultTitle) {
                                    if (cat.id === 'RUNNING') newTitle = 'SESIÓN DE RUNNING';
                                    else if (cat.id === 'HYROX') newTitle = 'HYROX TRAINING';
                                    else if (cat.id === 'OCR') newTitle = 'ENTRENO OCR';
                                    else if (cat.id === 'GYM') newTitle = 'MUSCULACIÓN / GYM';
                                    else if (cat.id === 'CYCLING') newTitle = 'SESIÓN DE CICLISMO';
                                    else if (cat.id === 'SWIMMING') newTitle = 'SESIÓN DE NATACIÓN';
                                    else if (cat.id === 'YOGA') newTitle = 'YOGA / MOVILIDAD';
                                    else if (cat.id === 'BOXING') newTitle = 'SESIÓN DE BOXEO';
                                    else newTitle = 'WORKOUT OF THE DAY';
                                    setTitle(newTitle);
                                }

                                if (isEmpty) {
                                    if (cat.id === 'RUNNING') {
                                        newBlocks = [{
                                            ...blocks[0],
                                            title: 'CARRERA',
                                            format: 'CARRERA LIBRE',
                                            config: { distance: '', pace: '', timecap: '' },
                                            exercises: [{ id: 'run1', name: 'Notas / Descripción', reps: '', detail: '' }]
                                        }];
                                    } else if (cat.id === 'GYM') {
                                        newBlocks = [{
                                            ...blocks[0],
                                            title: 'FUERZA',
                                            format: 'FUERZA',
                                            exercises: [{ id: 'gym1', name: 'Ejercicio principal', reps: '4 x 10', detail: '' }]
                                        }];
                                    } else if (cat.id === 'HYROX') {
                                        newBlocks = [{
                                            ...blocks[0],
                                            title: 'SIMULACIÓN',
                                            format: 'FOR TIME',
                                            exercises: [{ id: 'hy1', name: 'Carrera (km)', reps: '1', detail: '' }, { id: 'hy2', name: 'Burpee broad jump (m)', reps: '80', detail: '' }]
                                        }];
                                    }
                                    setBlocks(newBlocks);
                                }

                                // Update score type based on category defaults
                                let newSummary = { ...summary };
                                const availableTypes = CATEGORY_SCORE_TYPES[cat.id];
                                if (!availableTypes.includes(summary.scoreType)) {
                                    newSummary.scoreType = availableTypes[0];
                                    setSummary(newSummary);
                                }

                                // Reset block format if not valid for new category
                                const validFormats = CATEGORY_FORMATS[cat.id];
                                newBlocks = newBlocks.map(b =>
                                    validFormats.includes(b.format) ? b : { ...b, format: validFormats[0], config: {} }
                                );
                                setBlocks(newBlocks);

                                updateWod(newTitle, newBlocks, newSummary, date, cat.id);
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all gap-1.5",
                                category === cat.id
                                    ? "bg-brand-red/10 border-brand-red text-brand-red shadow-glow-sm"
                                    : "bg-black/20 border-white/5 text-gray-500 hover:border-white/20 hover:text-white"
                            )}
                        >
                            <span className="text-xl">{cat.icon}</span>
                            <span className="text-[7px] font-black uppercase tracking-tighter whitespace-nowrap">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Título del WOD</label>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowBenchmarks(!showBenchmarks)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 bg-brand-red/10 border border-brand-red/20 rounded-lg text-[10px] font-black text-brand-red uppercase tracking-wider hover:bg-brand-red hover:text-white transition-all group/btn"
                        >
                            <Trophy className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                            Benchmark
                        </button>

                        <AnimatePresence>
                            {showBenchmarks && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-brand-gray border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden backdrop-blur-2xl"
                                >
                                    <div className="p-3 border-b border-white/5 bg-white/5">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">CROSSFIT BENCHMARKS</p>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {BENCHMARKS.map((bm, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => {
                                                    setTitle(bm.name);
                                                    if (bm.summary) setSummary(bm.summary as any);
                                                    if (bm.blocks) {
                                                        const normalizedBlocks = bm.blocks.map(b => ({
                                                            ...b,
                                                            id: Math.random().toString(36).substring(7),
                                                            exercises: b.exercises.map(ex => ({ ...ex, id: Math.random().toString(36).substring(7) }))
                                                        }));
                                                        setBlocks(normalizedBlocks as any);
                                                        updateWod(bm.name, normalizedBlocks as any, bm.summary as any);
                                                    }
                                                    setShowBenchmarks(false);
                                                }}
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-300 hover:text-white hover:bg-brand-red/10 border-b border-white/5 last:border-0 transition-colors uppercase italic flex items-center justify-between"
                                            >
                                                {bm.name}
                                                <ChevronDown className="w-3 h-3 -rotate-90 opacity-30" />
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                <input
                    type="text"
                    placeholder="TÍTULO DEL WOD (Ej: THE CHIEF, MURPH...)"
                    value={title}
                    onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setTitle(val);
                        updateWod(val, blocks, summary, date);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black italic tracking-tighter text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/50 transition-all uppercase"
                />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Fecha del WOD</label>
                <div className="relative group/date">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-red transition-transform group-hover/date:scale-110 pointer-events-none" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            updateWod(title, blocks, summary, e.target.value);
                        }}
                        onClick={(e) => {
                            try { (e.target as any).showPicker(); } catch (err) { }
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-black text-white focus:outline-none focus:border-brand-red/50 transition-all cursor-pointer"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {blocks.map((block, idx) => (
                    <div key={block.id} className="bg-brand-gray/50 border border-white/10 rounded-[24px]">
                        {/* Block Header */}
                        <div className="p-4 bg-white/5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 w-full">
                                <div className="p-2 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red">
                                    {FORMAT_ICONS[block.format]}
                                </div>
                                <input
                                    className="bg-transparent border-none p-0 text-xs font-black uppercase tracking-widest text-white focus:ring-0 w-full"
                                    value={block.title}
                                    onChange={(e) => updateBlock(block.id, { title: e.target.value.toUpperCase() })}
                                />
                                <button type="button" onClick={() => removeBlock(block.id)} className="sm:hidden text-gray-600 hover:text-brand-red transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="flex flex-col flex-1 sm:flex-none">
                                    <select
                                        className="bg-black/40 border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-red px-3 py-1.5 outline-none focus:border-brand-red/50 transition-all cursor-pointer w-full sm:w-auto"
                                        value={block.format}
                                        onChange={(e) => {
                                            const newFormat = e.target.value as WodFormat;
                                            // Clear irrelevant config when format changes
                                            let newConfig: any = {};
                                            if (newFormat === 'AMRAP') newConfig = { timecap: '20:00' };
                                            else if (newFormat === 'FOR TIME' || newFormat === '21-15-9') newConfig = { timecap: '' };
                                            else if (newFormat === 'ROUNDS FOR TIME') newConfig = { rounds: 5, timecap: '20:00' };
                                            else if (newFormat === 'EMOM' || newFormat === 'DEATH BY') newConfig = { frequency: '1 MIN', minutes: 15 };
                                            else if (newFormat === 'TABATA') newConfig = { rounds: 8, work: '20S', rest: '10S' };
                                            else if (newFormat === 'INTERVALS') newConfig = { rounds: 4, work: '40S', rest: '20S' };
                                            else if (newFormat === 'FUERZA') newConfig = { rounds: 5 };
                                            else if (newFormat === 'LIBRE') newConfig = {};
                                            // Endurance formats
                                            else if (newFormat === 'CARRERA LIBRE') newConfig = { distance: '', pace: '', timecap: '' };
                                            else if (newFormat === 'INTERVALOS') newConfig = { rounds: 6, work: '1 KM', rest: '2:00', pace: '' };
                                            else if (newFormat === 'FARTLEK') newConfig = { timecap: '45:00', distance: '' };
                                            else if (newFormat === 'TEMPO') newConfig = { distance: '5 KM', pace: '' };
                                            else if (newFormat === 'SERIES') newConfig = { rounds: 10, work: '400 M', rest: '1:30', pace: '' };
                                            else if (newFormat === 'TRAIL') newConfig = { distance: '', frequency: '', timecap: '' };
                                            updateBlock(block.id, { format: newFormat, config: newConfig });
                                        }}
                                    >
                                        {CATEGORY_FORMATS[category].map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                    </select>
                                    <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1 text-center">{FORMAT_DESCRIPTIONS[block.format]}</span>
                                </div>

                                <button type="button" onClick={() => removeBlock(block.id)} className="hidden sm:block text-gray-600 hover:text-brand-red transition-colors shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
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
                                {(block.format === 'FOR TIME' || block.format === '21-15-9') && (
                                    <ConfigInput label="TIME CAP (OPT)" value={block.config.timecap || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, timecap: v } })} />
                                )}
                                {block.format === 'ROUNDS FOR TIME' && (
                                    <>
                                        <ConfigInput label="ROUNDS" value={block.config.rounds === undefined ? '' : block.config.rounds.toString()} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: v === '' ? undefined : (parseInt(v) || 0) } })} />
                                        <ConfigInput label="TIME CAP" value={block.config.timecap || '20:00'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, timecap: v } })} />
                                    </>
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
                                {block.format === 'FUERZA' && (
                                    <>
                                        <ConfigInput label="SETS" value={block.config.rounds === undefined ? '' : block.config.rounds.toString()} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: v === '' ? undefined : (parseInt(v) || 0) } })} />
                                        <ConfigInput label="DESCANSOS" value={block.config.rest || '2:00'} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rest: v } })} />
                                    </>
                                )}
                                {block.format === 'LIBRE' && (
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest py-2 px-4 italic opacity-50">Formato libre - Añade ejercicios y detalles sin restricciones</p>
                                )}
                                {/* Endurance formats */}
                                {block.format === 'CARRERA LIBRE' && (
                                    <>
                                        <ConfigInput label="DISTANCIA" value={block.config.distance || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, distance: v } })} placeholder="EJ: 10 KM" />
                                        <ConfigInput label="RITMO OBJ." value={block.config.pace || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, pace: v } })} placeholder="EJ: 4:30 /KM" />
                                        <ConfigInput label="TIEMPO OBJ." value={block.config.timecap || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, timecap: v } })} placeholder="EJ: 45:00" />
                                    </>
                                )}
                                {block.format === 'INTERVALOS' && (
                                    <>
                                        <ConfigInput label="SERIES" value={block.config.rounds === undefined ? '' : block.config.rounds.toString()} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: v === '' ? undefined : (parseInt(v) || 0) } })} placeholder="EJ: 6" />
                                        <ConfigInput label="DISTANCIA" value={block.config.work || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, work: v } })} placeholder="EJ: 1 KM" />
                                        <ConfigInput label="DESCANSO" value={block.config.rest || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rest: v } })} placeholder="EJ: 2:00" />
                                        <ConfigInput label="RITMO OBJ." value={block.config.pace || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, pace: v } })} placeholder="EJ: 4:30 /KM" />
                                    </>
                                )}
                                {block.format === 'FARTLEK' && (
                                    <>
                                        <ConfigInput label="DURACIÓN" value={block.config.timecap || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, timecap: v } })} placeholder="EJ: 45:00" />
                                        <ConfigInput label="DISTANCIA" value={block.config.distance || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, distance: v } })} placeholder="EJ: 8 KM" />
                                    </>
                                )}
                                {block.format === 'TEMPO' && (
                                    <>
                                        <ConfigInput label="DISTANCIA" value={block.config.distance || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, distance: v } })} placeholder="EJ: 5 KM" />
                                        <ConfigInput label="RITMO OBJ." value={block.config.pace || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, pace: v } })} placeholder="EJ: 4:45 /KM" />
                                    </>
                                )}
                                {block.format === 'SERIES' && (
                                    <>
                                        <ConfigInput label="SERIES" value={block.config.rounds === undefined ? '' : block.config.rounds.toString()} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rounds: v === '' ? undefined : (parseInt(v) || 0) } })} placeholder="EJ: 10" />
                                        <ConfigInput label="DISTANCIA" value={block.config.work || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, work: v } })} placeholder="EJ: 400 M" />
                                        <ConfigInput label="DESCANSO" value={block.config.rest || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, rest: v } })} placeholder="EJ: 1:30" />
                                        <ConfigInput label="RITMO OBJ." value={block.config.pace || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, pace: v } })} placeholder="EJ: 1:45 /400M" />
                                    </>
                                )}
                                {block.format === 'TRAIL' && (
                                    <>
                                        <ConfigInput label="DISTANCIA" value={block.config.distance || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, distance: v } })} placeholder="EJ: 20 KM" />
                                        <ConfigInput label="DESNIVEL D+" value={block.config.frequency || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, frequency: v } })} placeholder="EJ: 800 M" />
                                        <ConfigInput label="TIEMPO OBJ." value={block.config.timecap || ''} onChange={(v) => updateBlock(block.id, { config: { ...block.config, timecap: v } })} placeholder="EJ: 2:30:00" />
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
                                            {category !== 'RUNNING' && (
                                                <input
                                                    placeholder="REPS"
                                                    inputMode="decimal"
                                                    className="w-20 sm:w-16 bg-white/5 border border-white/5 rounded-xl px-4 py-3 sm:py-2 text-sm sm:text-xs font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase shrink-0"
                                                    value={ex.reps}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => updateExercise(block.id, ex.id, { reps: e.target.value.toUpperCase() })}
                                                />
                                            )}

                                            <div className="hidden sm:block flex-[3] relative">
                                                <input
                                                    ref={el => { if (el) inputRefs.current[ex.id] = el; }}
                                                    placeholder={category === 'RUNNING' ? "NOTAS / SENSACIONES / CLAVES" : "EJERCICIO"}
                                                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/30 transition-all uppercase"
                                                    value={ex.name}
                                                    onFocus={() => {
                                                        if (category !== 'RUNNING') {
                                                            setActiveExercisePath({ bId: block.id, exId: ex.id });
                                                            setSearchQuery(ex.name);
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        const val = e.target.value.toUpperCase();
                                                        updateExercise(block.id, ex.id, { name: val });
                                                        if (category !== 'RUNNING') {
                                                            setSearchQuery(val);
                                                        }
                                                    }}
                                                />
                                                {category !== 'RUNNING' && (
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
                                                                {!catalog.find(c => c.name.toUpperCase() === searchQuery) && 
                                                                !["NOTAS", "NOTAS / DESCRIPCIÓN", "DESCRIPCIÓN", "COMENTARIOS"].includes(searchQuery.toUpperCase()) && (
                                                                    <button type="button" onClick={() => handleSaveNewExercise(block.id, ex.id, searchQuery)} className="w-full text-left px-4 py-3 text-[9px] font-black text-brand-red bg-brand-red/5 hover:bg-brand-red/10 border-t border-white/5 transition-all flex items-center justify-between uppercase tracking-widest">
                                                                        <span>AGREGAR "{searchQuery}" A LA LIBRERÍA</span>
                                                                        {isSavingNew ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                                                    </button>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                )}
                                            </div>

                                            <div className="flex-1 relative group/unit">
                                                {category !== 'RUNNING' || ['INTERVALOS', 'SERIES'].includes(block.format) ? (
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
                                                ) : null}

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
                    {/* Tiempo Total - Ocultar si es Endurance y solo hay un bloque (redundante) */}
                    {(!['RUNNING', 'CYCLING', 'SWIMMING'].includes(category) || blocks.length > 1) && (
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
                    )}

                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">RESULTADO</span>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-brand-red uppercase tracking-widest outline-none focus:border-brand-red/50 transition-all cursor-pointer h-[54px]"
                            value={summary.scoreType}
                            onChange={(e) => updateSummary({ scoreType: e.target.value as any })}
                        >
                            {CATEGORY_SCORE_TYPES[category].map(type => (
                                <option key={type} value={type}>{SCORE_TYPE_LABELS[type]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">
                            {['RUNNING', 'CYCLING', 'SWIMMING'].includes(category) ? 'META / OBJETIVO' : 'TOTAL'}
                        </span>
                        <input
                            type="text"
                            placeholder={SCORE_PLACEHOLDERS[summary.scoreType]}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-brand-red/50 transition-all uppercase"
                            value={summary.scoreLabel}
                            onChange={(e) => updateSummary({ scoreLabel: e.target.value.toUpperCase() })}
                        />
                    </div>
                </div>

                {['RUNNING', 'CYCLING', 'SWIMMING'].includes(category) && blocks.length === 1 && (
                    <div className="mt-4 p-3 bg-brand-red/10 border border-brand-red/20 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-brand-red uppercase tracking-wider">
                            ✨ El objetivo se sincroniza automáticamente con los datos de tu sesión
                        </p>
                    </div>
                )}

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

function ConfigInput({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
    return (
        <div className="flex flex-col gap-2 min-w-[80px]">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none">{label}</span>
            <input
                inputMode="decimal"
                className="bg-black/20 border border-white/5 rounded-xl text-sm font-black text-brand-red px-4 py-3 focus:ring-0 focus:border-brand-red transition-all w-28 sm:w-24"
                value={value}
                placeholder={placeholder}
                onFocus={(e) => e.target.select()}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
        </div>
    );
}
