"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Save, Loader2, List, Plus, X, Trash2, Edit2, Search, Trophy, MapPin, Timer, Play, Pause, Activity, RefreshCw, Zap } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { saveWorkout, getExercises, getExercisePreviousRecord, getWorkoutDetails, uploadWorkoutMedia } from "../actions";
import { getAiRecommendation, type TrainingPlan } from "../ai-coach";
import { getCenterPost } from "../../gyms/management-actions";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

export default function SessionPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-10 h-10 animate-spin text-brand-red" /></div>}>
            <SessionContent />
        </Suspense>
    );
}

type SportMode = 'gym' | 'running' | 'crossfit' | 'hyrox' | 'calisthenics' | 'ocr' | 'other' | null;

function SessionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const wodId = searchParams.get('wodId');
    const editId = searchParams.get('editId');

    const [sportMode, setSportMode] = useState<SportMode>(null);
    const [isLoadingData, setIsLoadingData] = useState(!!wodId || !!editId);

    // Common State
    const [startTime] = useState(new Date());
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [workoutTitle, setWorkoutTitle] = useState("Sesión de entrenamiento");
    const [locationName, setLocationName] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [shareToArena, setShareToArena] = useState(true);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadWorkoutMedia(formData);
        // @ts-ignore
        if (result.success && result.url) {
            // @ts-ignore
            setImageUrl(result.url);
        } else {
            alert("Error al subir imagen");
        }
        setIsUploading(false);
    };

    const [exercises, setExercises] = useState<any[]>([]);

    // ... logic to pre-fill from recommendation
    useEffect(() => {
        if (searchParams.get('mode') === 'recommendation' && searchParams.get('plan')) {
            try {
                const plan = JSON.parse(decodeURIComponent(searchParams.get('plan')!)) as TrainingPlan;
                setWorkoutTitle(plan.title);
                if (plan.sport === 'gym' && plan.exercises) {
                    setExercises(plan.exercises.map((ex: any) => ({
                        ...ex,
                        sets: ex.sets.map((s: any, i: number) => ({ ...s, order: i + 1, weight: 0, reps: 0, completed: false, isWarmup: false }))
                    })));
                }
                setSportMode(plan.sport);
            } catch (e) { console.error("Error parsing plan", e) }
        }
    }, [searchParams]);

    // Running State
    const [runDistance, setRunDistance] = useState<number>(0); // Meters
    const [runPace, setRunPace] = useState("0:00"); // Min/km

    // CrossFit/Hyrox State
    const [wodType, setWodType] = useState<'fortime' | 'amrap' | 'emom'>('fortime');
    const [roundsCompleted, setRoundsCompleted] = useState(0);
    const [emomTotalTime, setEmomTotalTime] = useState(0); // Minutes

    // Timer Logic
    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setElapsedSeconds(s => s + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [isPaused]);

    // Countdown and Sound Logic
    const playBeep = (freq = 440) => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) { console.warn("Audio not supported or blocked", e) }
    };

    useEffect(() => {
        if (countdown === null) return;
        if (countdown > 0) {
            playBeep(440);
            const t = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(t);
        } else {
            playBeep(880);
            setIsPaused(false);
            setCountdown(null);
        }
    }, [countdown]);

    const toggleTimer = () => {
        if (isPaused && elapsedSeconds === 0 && countdown === null) {
            setCountdown(3);
        } else {
            setIsPaused(!isPaused);
            setCountdown(null);
        }
    };

    const handleManualTimeChange = (val: string) => {
        const parts = val.split(':').reverse();
        let total = 0;
        if (parts[0]) total += parseInt(parts[0]) || 0;
        if (parts[1]) total += (parseInt(parts[1]) || 0) * 60;
        if (parts[2]) total += (parseInt(parts[2]) || 0) * 3600;
        setElapsedSeconds(total);
    };

    // Data Initialization
    useEffect(() => {
        const init = async () => {
            if (editId) {
                const workout = await getWorkoutDetails(editId);
                if (workout) {
                    setShortcutMode(workout.sport_type?.toLowerCase() || 'gym');
                    setWorkoutTitle(workout.title);
                    setElapsedSeconds(workout.duration_seconds || 0);
                    if (workout.exercises) setExercises(workout.exercises);
                }
                setIsLoadingData(false);
            } else if (wodId) {
                const wod = await getCenterPost(wodId);
                if (wod) {
                    setShortcutMode('crossfit'); // WODs usually CrossFit
                    setWorkoutTitle(`WOD: ${new Date(wod.scheduled_for || wod.created_at).toLocaleDateString()}`);
                    setLocationName(wod.organization?.name || "Box Workout");

                    try {
                        const content = JSON.parse(wod.content);
                        const blocks = content.blocks || [];

                        // Flatten blocks and exercises into the session's exercise list
                        const flatterExercises: any[] = [];

                        for (let i = 0; i < blocks.length; i++) {
                            const block = blocks[i];
                            const blockTitle = block.title || block.format || 'Workout';

                            if (block.exercises && block.exercises.length > 0) {
                                for (let j = 0; j < block.exercises.length; j++) {
                                    const ex = block.exercises[j];
                                    const prev = await getExercisePreviousRecord(ex.name) || "---";
                                    flatterExercises.push({
                                        id: `wod-${i}-${j}`,
                                        name: ex.name,
                                        target: `${ex.sets || block.format || ''} ${ex.reps ? 'x ' + ex.reps : ''}`.trim() || block.format || "Custom",
                                        prev,
                                        sets: Array.from({ length: parseInt(ex.sets) || 1 }).map((_, sIdx) => ({
                                            order: sIdx + 1,
                                            weight: parseFloat(ex.value) || 0,
                                            reps: parseInt(ex.reps) || 0,
                                            completed: false
                                        }))
                                    });
                                }
                            } else if (block.content) {
                                // Fallback for text blocks
                                const lines = block.content.split('\n').filter((l: string) => l.trim());
                                for (let j = 0; j < lines.length; j++) {
                                    const line = lines[j];
                                    const prev = await getExercisePreviousRecord(line) || "---";
                                    flatterExercises.push({
                                        id: `wod-${i}-${j}`,
                                        name: line,
                                        target: block.format || "Custom",
                                        prev,
                                        sets: [{ order: 1, weight: 0, reps: 0, completed: false }]
                                    });
                                }
                            } else {
                                // Fallback for empty blocks but with title
                                const prev = await getExercisePreviousRecord(blockTitle) || "---";
                                flatterExercises.push({
                                    id: `wod-${i}`,
                                    name: blockTitle,
                                    target: block.duration || block.format || "Custom",
                                    prev,
                                    sets: [{ order: 1, weight: 0, reps: 0, completed: false }]
                                });
                            }
                        }

                        setExercises(flatterExercises);
                    } catch (e) {
                        console.error("Error parsing WOD content:", e);
                        // Default fallback
                        setWorkoutTitle("Detailed Box Workout");
                    }
                }
                setIsLoadingData(false);
            }
        };
        init();
    }, [wodId, editId]);

    const setShortcutMode = (mode: string) => {
        if (mode.includes('run')) setSportMode('running');
        else if (mode.includes('crossfit')) setSportMode('crossfit');
        else if (mode.includes('hyrox')) setSportMode('hyrox');
        else setSportMode('gym');
    }

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
    };

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            // Calculate pace for running
            let finalPace = "0:00";
            if (sportMode === 'running' && runDistance > 0 && elapsedSeconds > 0) {
                const minPerKm = (elapsedSeconds / 60) / (runDistance / 1000);
                const pMin = Math.floor(minPerKm);
                const pSec = Math.floor((minPerKm - pMin) * 60);
                finalPace = `${pMin}:${pSec < 10 ? '0' + pSec : pSec}`;
            }

            // Capture final time for CrossFit 'fortime'
            const finalTimeStr = formatTime(elapsedSeconds);
            setIsPaused(true);

            const payload = {
                id: editId,
                title: workoutTitle,
                startTime: startTime.toISOString(),
                duration: elapsedSeconds,
                sportType: sportMode === 'gym' ? 'Fitness' : (sportMode === 'running' ? 'Running' : (sportMode === 'hyrox' ? 'Hyrox' : (sportMode === 'calisthenics' ? 'Calistenia' : (sportMode === 'ocr' ? 'OCR' : (sportMode === 'other' ? 'Otros' : 'CrossFit'))))),
                exercises: (sportMode === 'gym' || sportMode === 'crossfit' || sportMode === 'calisthenics' || sportMode === 'ocr' || sportMode === 'other') ? exercises : [],
                metrics: {
                    distance: runDistance,
                    rounds: roundsCompleted,
                    pace: finalPace,
                    type: wodType,
                    time: finalTimeStr,
                    emomTime: emomTotalTime
                },
                locationName,
                imageUrl,
                shareToArena
            };

            const result = await saveWorkout(payload);
            // @ts-ignore
            if (result?.success) {
                router.push('/dashboard/training/logs');
            } else {
                // @ts-ignore
                alert("Error al guardar: " + (result?.error || "Unknown"));
            }
        } catch (e) {
            console.error(e);
        }
        setIsSaving(false);
    };

    if (isLoadingData) return <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-red" /></div>;

    // IMMERSIVE MODE: Full fixed overlay to hide dashboard sidebar/header
    const overlayClasses = "fixed inset-0 z-[100] bg-black text-white overflow-y-auto custom-scrollbar";

    if (!sportMode) {
        return (
            <div className={overlayClasses}>
                <SportSelector onSelect={setSportMode} />
            </div>
        );
    }

    // Dynamic styles based on sport
    const themeColor =
        sportMode === 'running' ? 'text-blue-500' :
            sportMode === 'hyrox' ? 'text-yellow-500' :
                sportMode === 'crossfit' ? 'text-orange-500' :
                    sportMode === 'ocr' ? 'text-emerald-500' :
                        sportMode === 'other' ? 'text-gray-400' :
                            'text-brand-red';

    const bgTheme =
        sportMode === 'running' ? 'bg-blue-500/10 border-blue-500/20' :
            sportMode === 'hyrox' ? 'bg-yellow-500/10 border-yellow-500/20' :
                sportMode === 'crossfit' ? 'bg-orange-500/10 border-orange-500/20' :
                    sportMode === 'ocr' ? 'bg-emerald-500/10 border-emerald-500/20' :
                        sportMode === 'other' ? 'bg-white/5 border-white/10' :
                            'bg-brand-red/10 border-brand-red/20';

    return (
        <div className={overlayClasses}>
            {/* Dynamic Sports Header */}
            <header className={clsx(
                "sticky top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between transition-colors duration-500",
                sportMode === 'running' ? "bg-blue-950/80" :
                    sportMode === 'hyrox' ? "bg-yellow-950/80" :
                        sportMode === 'crossfit' ? "bg-orange-950/80" :
                            sportMode === 'ocr' ? "bg-emerald-950/80" :
                                sportMode === 'other' ? "bg-gray-900/80" :
                                    "bg-[#0a0a0a]/90"
            )}>
                <div className="flex items-center gap-4">
                    <button onClick={() => setSportMode(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={clsx("w-2 h-2 rounded-full animate-pulse", isPaused ? "bg-yellow-500" : "bg-green-500")} />
                            <p className={clsx("text-[10px] font-black uppercase tracking-widest", themeColor)}>{sportMode}</p>
                        </div>
                        <h1 className="text-white font-heading font-black italic text-lg uppercase truncate max-w-[150px] sm:max-w-xs">{workoutTitle}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <input
                            type="text"
                            value={formatTime(elapsedSeconds)}
                            onChange={(e) => handleManualTimeChange(e.target.value)}
                            disabled={!isPaused}
                            className={clsx(
                                "font-mono text-xl font-black bg-transparent text-right outline-none w-24 transition-colors",
                                !isPaused ? themeColor : "text-white/60 focus:text-white"
                            )}
                        />
                        <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest text-right">TIEMPO {isPaused && "(Manual)"}</p>
                    </div>
                    <button
                        onClick={toggleTimer}
                        className={clsx(
                            "p-3 rounded-xl transition-all relative",
                            isPaused ? "bg-white/10 text-white" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                    >
                        {countdown !== null ? (
                            <span className="text-xl font-black text-brand-red animate-ping">{countdown}</span>
                        ) : isPaused ? (
                            <Play className="w-5 h-5 fill-current" />
                        ) : (
                            <Pause className="w-5 h-5 fill-current" />
                        )}
                    </button>
                    <button
                        onClick={handleFinish}
                        disabled={isSaving}
                        className={clsx("text-white p-3 rounded-xl shadow-glow hover:scale-105 active:scale-95 transition-all",
                            sportMode === 'running' ? 'bg-blue-600' :
                                sportMode === 'hyrox' ? 'bg-yellow-600' :
                                    sportMode === 'crossfit' ? 'bg-orange-600' :
                                        sportMode === 'ocr' ? 'bg-emerald-600' :
                                            sportMode === 'other' ? 'bg-gray-600' : 'bg-brand-red'
                        )}
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            <div className="pt-28 px-4 max-w-2xl mx-auto space-y-8">
                <div className="sm:hidden text-center mb-6">
                    <input
                        type="text"
                        value={formatTime(elapsedSeconds)}
                        onChange={(e) => handleManualTimeChange(e.target.value)}
                        disabled={!isPaused}
                        className={clsx(
                            "text-6xl font-mono font-black tracking-tighter bg-transparent text-center outline-none w-full",
                            !isPaused ? themeColor : "text-white/40"
                        )}
                    />
                    <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em]">
                        {countdown !== null ? `INICIO EN ${countdown}...` : isPaused ? "Tiempo (Click para Editar)" : "Tiempo Transcurrido"}
                    </p>
                </div>

                {/* Header for selected format */}
                {(sportMode === 'crossfit' || sportMode === 'ocr') && (
                    <div className="text-center pb-4">
                        <h2 className="text-3xl font-heading font-black italic text-white uppercase tracking-tighter">
                            MODO <span className="text-orange-500">{wodType === 'fortime' ? 'FOR TIME' : wodType.toUpperCase()}</span>
                        </h2>
                        <div className="w-12 h-1 bg-orange-500 mx-auto mt-2 rounded-full" />
                    </div>
                )}

                {/* Specific Views */}
                {(sportMode === 'gym' || sportMode === 'calisthenics') && <GymView exercises={exercises} setExercises={setExercises} />}
                {sportMode === 'running' && <RunningView distance={runDistance} setDistance={setRunDistance} time={elapsedSeconds} />}
                {(sportMode === 'crossfit' || sportMode === 'ocr') && (
                    <CrossFitView
                        rounds={roundsCompleted}
                        setRounds={setRoundsCompleted}
                        type={wodType}
                        setType={setWodType}
                        exercises={exercises}
                        setExercises={setExercises}
                        emomTime={emomTotalTime}
                        setEmomTime={setEmomTotalTime}
                        distance={runDistance}
                        setDistance={setRunDistance}
                        isOCR={sportMode === 'ocr'}
                    />
                )}
                {sportMode === 'other' && <GymView exercises={exercises} setExercises={setExercises} />}
                {sportMode === 'hyrox' && <HyroxView time={elapsedSeconds} exercises={exercises} setExercises={setExercises} />}

                {/* Final Summary Display */}
                <div className="bg-[#111] border border-white/10 rounded-[40px] p-8 space-y-6">
                    <h3 className="text-white font-heading font-black italic text-lg flex items-center gap-2">
                        <Activity className={clsx("w-5 h-5", themeColor)} />
                        RESUMEN DE RESULTADOS
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-4 rounded-2xl">
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">
                                {wodType === 'amrap' ? 'Tiempo Activo' : 'Tiempo Final'}
                            </p>
                            <p className="text-xl font-mono font-black text-white">{formatTime(elapsedSeconds)}</p>
                        </div>
                        {(sportMode === 'crossfit' || sportMode === 'ocr') && wodType === 'amrap' && (
                            <>
                                <div className="bg-white/5 p-6 rounded-[32px] col-span-2 border border-orange-500/20 shadow-glow shadow-orange-500/5">
                                    <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-center">Rondas Completadas</p>
                                    <div className="flex items-center justify-center gap-8">
                                        <button onClick={() => setRoundsCompleted(Math.max(0, roundsCompleted - 1))} className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-2xl font-black transition-all active:scale-95 border border-white/5">-</button>
                                        <div className="text-7xl font-heading font-black italic text-white tabular-nums">{roundsCompleted}</div>
                                        <button onClick={() => setRoundsCompleted(roundsCompleted + 1)} className="w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center text-2xl font-black transition-all active:scale-95 shadow-lg shadow-orange-500/30">+</button>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Duración AMRAP</p>
                                    <p className="text-lg font-black text-white uppercase italic">{emomTotalTime || '---'}' min</p>
                                </div>
                            </>
                        )}
                        {(sportMode === 'crossfit' || sportMode === 'ocr') && wodType === 'emom' && (
                            <div className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Formato EMOM</p>
                                <p className="text-lg font-black text-orange-500 uppercase italic">{emomTotalTime || '---'}' min</p>
                            </div>
                        )}
                        {(sportMode === 'crossfit' || sportMode === 'ocr') && wodType === 'fortime' && (
                            <>
                                <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 col-span-2">
                                    <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">RESULTADO FINAL</p>
                                    <p className="text-4xl font-mono font-black text-white italic">{formatTime(elapsedSeconds)}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Time Cap</p>
                                    <p className="text-lg font-black text-orange-500 uppercase italic">{emomTotalTime || '---'}' min</p>
                                </div>
                            </>
                        )}
                        {sportMode === 'running' && (
                            <div className="bg-white/5 p-4 rounded-2xl">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Distancia</p>
                                <p className="text-xl font-mono font-black text-white">{(runDistance / 1000).toFixed(2)} km</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Common Finish Options */}
                <div className="border-t border-white/5 pt-8 mt-12 bg-white/[0.02] p-6 rounded-[40px] border border-white/5">
                    <h3 className="text-white font-heading font-black italic text-lg mb-6 flex items-center gap-2">
                        <Trophy className={clsx("w-5 h-5", themeColor)} />
                        COMPARTIR VICTORIA
                    </h3>

                    <div className="space-y-6">
                        <button
                            onClick={() => setShareToArena(!shareToArena)}
                            className={clsx(
                                "w-full p-2.5 rounded-2xl border flex items-center gap-3 transition-all group",
                                shareToArena ? bgTheme + " shadow-lg" : "bg-black/40 border-white/5"
                            )}
                        >
                            <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center transition-colors", shareToArena ? "bg-black/20 text-white" : "bg-white/5 text-gray-500")}>
                                <Activity className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1">
                                <p className={clsx("font-black text-[10px] uppercase italic", shareToArena ? "text-white" : "text-gray-500")}>Publicar en Arena</p>
                            </div>
                            <div className={clsx("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", shareToArena ? "border-transparent bg-white text-black" : "border-white/10")}>
                                {shareToArena && <CheckCircle className="w-3 h-3" />}
                            </div>
                        </button>

                        <div>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 ml-2">Evidencia Visual (Opcional)</p>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    accept="image/*,video/*"
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className={clsx(
                                        "w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 shrink-0 transition-all group",
                                        isUploading ? "border-brand-red/50 bg-brand-red/5" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30"
                                    )}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-brand-red group-hover:text-white transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                    )}
                                    <span className="text-[9px] font-black uppercase text-gray-500 group-hover:text-gray-300 transition-colors">{isUploading ? 'Subiendo...' : 'Subir Foto'}</span>
                                </button>

                                {imageUrl && (
                                    <div className="w-24 h-24 rounded-2xl border border-white/20 relative overflow-hidden shrink-0 group animate-in zoom-in duration-300">
                                        <Image src={imageUrl} alt="Preview" fill className="object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                        <button
                                            onClick={() => setImageUrl(null)}
                                            className="absolute top-1 right-1 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-2 left-2">
                                            <p className="text-[8px] font-black uppercase text-white bg-brand-red px-1.5 py-0.5 rounded">Media</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pb-12">
                    <button
                        onClick={handleFinish}
                        className={clsx(
                            "w-full py-6 rounded-[32px] text-white font-heading font-black italic text-2xl uppercase tracking-tighter hover:scale-[1.02] active:scale-95 transition-all shadow-glow flex items-center justify-center gap-3",
                            sportMode === 'running' ? 'bg-blue-600' :
                                sportMode === 'hyrox' ? 'bg-yellow-600' :
                                    sportMode === 'crossfit' ? 'bg-orange-600' :
                                        sportMode === 'ocr' ? 'bg-emerald-600' :
                                            sportMode === 'other' ? 'bg-gray-600' : 'bg-brand-red'
                        )}
                    >
                        <Save className="w-6 h-6" /> FINALIZAR SESIÓN
                    </button>
                </div>
            </div>
        </div>
    );
}

function SportSelector({ onSelect }: { onSelect: (mode: SportMode) => void }) {
    const [selectedSport, setSelectedSport] = useState<SportMode>(null);
    const [view, setView] = useState<'list' | 'options' | 'ai'>('list');
    const [recommendations, setRecommendations] = useState<TrainingPlan[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);
    const router = useRouter();

    const handleSportClick = (mode: SportMode) => {
        setSelectedSport(mode);
        setView('options');
    }

    const fetchRecommendations = async () => {
        if (!selectedSport) return;
        setLoadingAi(true);
        setView('ai');
        // Simulate delay for "AI Analysis"
        await new Promise(r => setTimeout(r, 1500));
        const recs = await getAiRecommendation(selectedSport, 'premium'); // Hardcoded premium check for now/mock
        setRecommendations(recs);
        setLoadingAi(false);
    }

    const startFreestyle = () => {
        onSelect(selectedSport);
    }

    const startPlan = (plan: TrainingPlan) => {
        const cleanPlan = JSON.stringify(plan);
        router.push(`/dashboard/training/session?mode=recommendation&plan=${encodeURIComponent(cleanPlan)}`);
        onSelect(plan.sport);
    }

    if (view === 'options') {
        return (
            <div className="flex flex-col items-center justify-center min-h-full p-6 animate-in zoom-in-95 duration-300">
                <h2 className="text-4xl font-heading font-black italic text-white uppercase mb-8 text-center">¿Cómo quieres <span className="text-brand-red">entrenar</span>?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
                    <button onClick={startFreestyle} className="group p-8 rounded-[32px] bg-[#111] border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Edit2 className="w-32 h-32 text-white" /></div>
                        <h3 className="text-2xl font-black italic text-white uppercase mb-2">Modo Libre</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Registra tu propia sesión manualmente.</p>
                    </button>
                    <button onClick={fetchRecommendations} className="group p-8 rounded-[32px] bg-brand-red border border-brand-red hover:bg-red-600 transition-all text-left relative overflow-hidden shadow-glow">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-32 h-32 text-black" /></div>
                        <h3 className="text-2xl font-black italic text-white uppercase mb-2">Rival Coach</h3>
                        <p className="text-black/60 text-xs font-bold uppercase tracking-wide">Programación avanzada según tus objetivos.</p>
                    </button>
                </div>
                <button onClick={() => setView('list')} className="mt-12 text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">Volver</button>
            </div>
        )
    }

    if (view === 'ai') {
        return (
            <div className="flex flex-col items-center justify-center min-h-full p-6">
                {loadingAi ? (
                    <div className="text-center space-y-6 animate-in fade-in duration-700">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-brand-red/20 rounded-full animate-ping" />
                            <div className="absolute inset-0 border-4 border-t-brand-red rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity className="w-12 h-12 text-brand-red animate-pulse" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-heading font-black italic text-white uppercase animate-pulse">Analizando Perfil...</h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Generando programación óptima</p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full space-y-8 animate-in slide-in-from-bottom-10 duration-500">
                        <div className="text-center">
                            <h2 className="text-3xl font-heading font-black italic text-white uppercase">Recomendaciones <span className="text-brand-red">RIVAL</span></h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">{selectedSport}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {recommendations.map((plan) => (
                                <div key={plan.id} className={clsx(
                                    "relative p-8 rounded-[32px] border transition-all overflow-hidden group",
                                    plan.is_premium ? "bg-gradient-to-br from-[#1a1a1a] to-black border-yellow-500/20 hover:border-yellow-500/50" : "bg-[#111] border-white/10 hover:border-white/30"
                                )}>
                                    {plan.is_premium && (
                                        <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500 text-black text-[10px] font-black uppercase rounded-full">Pro</div>
                                    )}
                                    <h3 className="text-2xl font-heading font-black italic text-white uppercase mb-2">{plan.title}</h3>
                                    <div className="flex gap-4 mb-6">
                                        <span className="text-[10px] font-bold uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">{plan.difficulty}</span>
                                        <span className="text-[10px] font-bold uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">{plan.duration_min} min</span>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">{plan.description}</p>
                                    <button onClick={() => startPlan(plan)} className="w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                                        Comenzar
                                    </button>
                                </div>
                            ))}

                            <div className="p-8 rounded-[32px] border border-white/5 bg-white/[0.02] flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
                                <Trophy className="w-12 h-12 text-gray-600 mb-4" />
                                <h3 className="text-lg font-bold text-white uppercase mb-2">¿Quieres más?</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Desbloquea Rival Pro para programación de élite.</p>
                            </div>
                        </div>
                        <button onClick={() => setView('options')} className="w-full text-center text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mt-8">Cancelar</button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="flex flex-col p-6 min-h-full">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/training" className="p-3 bg-white/5 rounded-full text-white hover:bg-white/10"><ArrowLeft className="w-6 h-6" /></Link>
                <div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nueva Sesión</p>
                    <h1 className="text-2xl md:text-3xl font-heading font-black italic text-white uppercase tracking-tighter">Elige tu <span className="text-brand-red">Combate</span></h1>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto w-full pb-20">
                <SportCard
                    title="Gimnasio"
                    icon={<div className="w-12 h-12 rounded-xl bg-brand-red/20 flex items-center justify-center text-brand-red mb-4"><Activity className="w-6 h-6" /></div>}
                    desc="Musculación y fuerza. Registra series, reps y pesos."
                    onClick={() => handleSportClick('gym')}
                    color="hover:border-brand-red/50"
                    image="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Running"
                    icon={<div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 mb-4"><MapPin className="w-6 h-6" /></div>}
                    desc="Cardio y resistencia. GPS, tiempo y control de ritmo."
                    onClick={() => handleSportClick('running')}
                    color="hover:border-blue-500/50"
                    image="https://images.unsplash.com/photo-1530143311094-34d807799e8f?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="CrossFit"
                    icon={<div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 mb-4"><Timer className="w-6 h-6" /></div>}
                    desc="Alta intensidad. WODs, AMRAP, EMOM y For Time."
                    onClick={() => handleSportClick('crossfit')}
                    color="hover:border-orange-500/50"
                    image="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Hyrox"
                    icon={<div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-500 mb-4"><Trophy className="w-6 h-6" /></div>}
                    desc="Competición híbrida. Carrera + Funcionales."
                    onClick={() => handleSportClick('hyrox')}
                    color="hover:border-yellow-500/50"
                    image="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Calistenia"
                    icon={<div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500 mb-4"><Zap className="w-6 h-6" /></div>}
                    desc="Dominio del peso corporal. Trucos, fuerza y control."
                    onClick={() => handleSportClick('calisthenics')}
                    color="hover:border-purple-500/50"
                    image="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="OCR"
                    icon={<div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-4"><Activity className="w-6 h-6" /></div>}
                    desc="Obstacle Course Racing. Superación de obstáculos y trail."
                    onClick={() => handleSportClick('ocr')}
                    color="hover:border-emerald-500/50"
                    image="https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=600&auto=format&fit=crop"
                />
                <SportCard
                    title="Otros"
                    icon={<div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4"><Plus className="w-6 h-6" /></div>}
                    desc="Cualquier otra actividad o deporte."
                    onClick={() => handleSportClick('other')}
                    color="hover:border-white/30"
                    image="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop"
                />
            </div>
        </div>
    )
}

function SportCard({ title, icon, desc, onClick, color, image }: any) {
    return (
        <button onClick={onClick} className={clsx("text-left group relative h-64 rounded-[32px] border border-white/10 bg-[#111] overflow-hidden transition-all", color)}>
            <div className="absolute inset-0">
                <Image src={image} alt={title} fill className="object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            </div>

            <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8">
                <div className="bg-black/50 backdrop-blur-md p-2 rounded-2xl w-fit border border-white/5 mb-auto self-end opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                    <Plus className="w-6 h-6 text-white" />
                </div>

                {icon}
                <h3 className="text-3xl font-heading font-black italic text-white uppercase mb-2 tracking-tighter">{title}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wide leading-relaxed max-w-[200px]">{desc}</p>
            </div>
        </button>
    )
}

/* ================= SPECIFIC VIEWS ================= */

function RunningView({ distance, setDistance, time }: { distance: number, setDistance: React.Dispatch<React.SetStateAction<number>>, time: number }) {
    const pace = distance > 0 ? (time / 60) / (distance / 1000) : 0;
    const paceMin = Math.floor(pace);
    const paceSec = Math.floor((pace - paceMin) * 60);

    const [gpsActive, setGpsActive] = useState(false);

    // Mock GPS Logic for demo
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gpsActive && !isPausedGlobal) { // Requires passing isPaused state or managing it here
            interval = setInterval(() => {
                // Simulate generic running pace (approx 5:00 min/km = ~3.3 m/s)
                setDistance((d: number) => d + 3.5);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gpsActive, setDistance]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
            {/* GPS & Connectivity Section */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setGpsActive(!gpsActive)}
                    className={clsx(
                        "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all",
                        gpsActive ? "bg-blue-600 border-transparent text-white shadow-lg shadow-blue-900/50" : "bg-[#111] border-white/10 text-gray-400 hover:bg-white/5"
                    )}
                >
                    <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center mb-1", gpsActive ? "bg-white/20" : "bg-white/5")}>
                        {gpsActive ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{gpsActive ? 'GPS ACTIVO' : 'USAR GPS MÓVIL'}</span>
                </button>

                <button
                    className="p-4 rounded-2xl border border-white/10 bg-[#111] flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-white/5 transition-all group relative overflow-hidden"
                    onClick={() => alert("Próximamente: Integraremos Strava, Garmin y Apple Health directamente.")}
                >
                    <div className="flex -space-x-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-orange-500 border-2 border-[#111] flex items-center justify-center text-[8px] font-black text-white">S</div>
                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-[#111] flex items-center justify-center text-[8px] font-black text-white">G</div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">SYNC RELOJ</span>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </button>
            </div>

            {/* Metrics Display */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-[32px] text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-20"><Activity className="w-12 h-12 text-blue-500" /></div>
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2 relative z-10">Ritmo Medio</p>
                    <div className="text-4xl font-mono font-black text-white relative z-10">{paceMin}:{paceSec < 10 ? '0' + paceSec : paceSec} <span className="text-xs text-gray-500">/km</span></div>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] text-center">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Calorías (Est.)</p>
                    <div className="text-4xl font-mono font-black text-white">{(distance * 0.06).toFixed(0)} <span className="text-xs text-gray-500">kcal</span></div>
                </div>
            </div>

            {/* Distance Input/Display */}
            <div className="bg-[#111] border border-white/10 p-8 rounded-[40px] text-center space-y-4">
                <p className="text-gray-500 text-xs font-black uppercase tracking-[0.3em]">Distancia Total</p>
                <div className="flex items-center justify-center gap-2">
                    <input
                        type="number"
                        value={distance === 0 ? '' : Math.floor(distance)}
                        onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        readOnly={gpsActive}
                        className={clsx(
                            "bg-transparent text-center text-7xl font-heading font-black italic text-white outline-none w-full placeholder-white/10 transition-colors",
                            gpsActive && "text-blue-500"
                        )}
                    />
                    <span className="text-xl font-black text-gray-600 mt-8">METROS</span>
                </div>

                {!gpsActive && (
                    <div className="flex justify-center flex-wrap gap-2 pt-4">
                        {[400, 800, 1000, 5000, 10000].map(d => (
                            <button key={d} onClick={() => setDistance(d)} className="px-4 py-2 rounded-full bg-white/5 text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                                {d >= 1000 ? `${d / 1000}km` : `${d}m`}
                            </button>
                        ))}
                    </div>
                )}

                {gpsActive && (
                    <p className="text-xs text-blue-400/60 font-mono animate-pulse">
                        Sátelites conectados. Calculando distancia en tiempo real...
                    </p>
                )}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[10px] text-blue-200 uppercase font-bold tracking-wide leading-relaxed">
                        <strong>Modo Manual vs Automático:</strong>
                    </p>
                    <p className="text-[10px] text-blue-200/60 leading-relaxed">
                        Activa el GPS del móvil para rastreo automático o introduce la distancia manualmente si usas reloj externo.
                    </p>
                </div>
            </div>
        </div>
    )
}

// Helper var for mock
let isPausedGlobal = false;

function CrossFitView({ rounds, setRounds, type, setType, exercises, setExercises, emomTime, setEmomTime, distance, setDistance, isOCR }: any) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const calculatedEmomRounds = useMemo(() => {
        if (type !== 'emom' || emomTime <= 0 || exercises.length === 0) return 0;
        return Math.floor(emomTime / exercises.length);
    }, [type, emomTime, exercises.length]);

    // Load catalog only when modal opens
    useEffect(() => {
        if (showAddModal && catalog.length === 0) {
            getExercises(isOCR ? 'ocr' : 'crossfit').then(setCatalog);
        }
    }, [showAddModal, catalog.length]);

    const filteredCatalog = useMemo(() => {
        if (!searchQuery) return catalog;
        return catalog.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [catalog, searchQuery]);

    const addExercise = async (template: any) => {
        const prev = await getExercisePreviousRecord(template.name) || "-";
        const newEx = {
            id: Math.random().toString(36).substr(2, 9),
            name: template.name,
            target: "-",
            prev: prev,
            sets: [{ order: 1, weight: 0, reps: 0, completed: false }]
        };
        // @ts-ignore
        setExercises([...exercises, newEx]);
        setShowAddModal(false);
    };

    const updateSet = (exIndex: number, setIndex: number, field: string, val: any) => {
        // @ts-ignore
        const copy = [...exercises];
        copy[exIndex].sets[setIndex][field] = val;
        // @ts-ignore
        setExercises(copy);
    };

    const addSet = (exIndex: number) => {
        // @ts-ignore
        const copy = [...exercises];
        const lastSet = copy[exIndex].sets[copy[exIndex].sets.length - 1];
        copy[exIndex].sets.push({
            order: copy[exIndex].sets.length + 1,
            weight: lastSet ? lastSet.weight : 0,
            reps: lastSet ? lastSet.reps : 0,
            completed: false
        });
        // @ts-ignore
        setExercises(copy);
    };

    const removeSet = (exIndex: number, setIndex: number) => {
        // @ts-ignore
        const copy = [...exercises];
        if (copy[exIndex].sets.length > 1) {
            copy[exIndex].sets.splice(setIndex, 1);
        } else {
            // Remove exercise if last set
            copy.splice(exIndex, 1);
        }
        // @ts-ignore
        setExercises(copy);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
            {isOCR && (
                <div className="bg-[#111] border border-emerald-500/20 p-8 rounded-[40px] text-center space-y-4 relative overflow-hidden group shadow-lg shadow-emerald-500/5">
                    <div className="absolute -top-10 -right-10 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <MapPin className="w-64 h-64 text-emerald-500" />
                    </div>

                    <p className="text-emerald-500 text-xs font-black uppercase tracking-[0.3em]">Carrera / Distancia Total (KM)</p>
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <input
                            type="number"
                            step="0.01"
                            value={distance > 0 ? (distance / 1000) : ''}
                            onChange={(e) => setDistance(parseFloat(e.target.value) * 1000 || 0)}
                            placeholder="0.00"
                            className="bg-transparent text-center text-6xl font-heading font-black italic text-white outline-none w-48 placeholder-white/5"
                        />
                        <span className="text-xl font-black text-gray-500 mt-6">KM</span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl inline-block mx-auto">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <RefreshCw className="w-3 h-3" /> {(distance / 1000).toFixed(2)} km recorridos
                        </p>
                    </div>
                </div>
            )}

            {/* Format Selector - Always at top */}
            <div className="grid grid-cols-3 gap-2 bg-[#111] p-1.5 rounded-2xl border border-white/10">
                {['fortime', 'amrap', 'emom'].map(t => (
                    <button
                        key={t}
                        onClick={() => setType(t)}
                        className={clsx(
                            "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            type === t ? "bg-orange-600 text-white shadow-lg" : "text-gray-500 hover:text-white"
                        )}
                    >
                        {t === 'fortime' ? 'For Time' : t.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Mode-Specific Input Area */}
            {type === 'amrap' && (
                <div className="bg-[#111] border border-white/10 p-10 rounded-[40px] text-center space-y-6 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Timer className="w-64 h-64" />
                    </div>

                    <p className="text-orange-500 text-xs font-black uppercase tracking-[0.3em]">Tiempo del AMRAP (min)</p>
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <input
                            type="number"
                            value={emomTime === 0 ? '' : emomTime}
                            onChange={(e) => setEmomTime(parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="bg-transparent text-center text-7xl font-heading font-black italic text-white outline-none w-32 placeholder-white/5"
                        />
                        <span className="text-xl font-black text-gray-500 mt-6">MINUTOS</span>
                    </div>
                </div>
            )}

            {type === 'emom' && (
                <div className="bg-[#111] border border-white/10 p-10 rounded-[40px] text-center space-y-6 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Timer className="w-64 h-64" />
                    </div>

                    <p className="text-orange-500 text-xs font-black uppercase tracking-[0.3em]">Duración EMOM (min)</p>
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <input
                            type="number"
                            value={emomTime === 0 ? '' : emomTime}
                            onChange={(e) => setEmomTime(parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="bg-transparent text-center text-7xl font-heading font-black italic text-white outline-none w-32 placeholder-white/5"
                        />
                        <span className="text-xl font-black text-gray-500 mt-6">MINUTOS</span>
                    </div>
                    {exercises.length > 0 && emomTime > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl inline-block mx-auto animate-in zoom-in-95">
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
                                {calculatedEmomRounds} Rondas detectadas ({exercises.length} ejercicios)
                            </p>
                        </div>
                    )}
                </div>
            )}

            {type === 'fortime' && (
                <div className="bg-[#111] border border-white/10 p-10 rounded-[40px] text-center space-y-6 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <Timer className="w-64 h-64" />
                    </div>

                    <p className="text-orange-500 text-xs font-black uppercase tracking-[0.3em]">Time Cap / Objetivo (min)</p>
                    <div className="flex items-center justify-center gap-4 relative z-10">
                        <input
                            type="number"
                            value={emomTime === 0 ? '' : emomTime}
                            onChange={(e) => setEmomTime(parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="bg-transparent text-center text-7xl font-heading font-black italic text-white outline-none w-32 placeholder-white/5"
                        />
                        <span className="text-xl font-black text-gray-500 mt-6">MINUTOS</span>
                    </div>
                </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6">
                <h3 className="text-white font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-500" /> Notas del WOD
                </h3>
                <textarea
                    placeholder="Escribe aquí tu WOD, pesos utilizados o notas de estrategia..."
                    className="w-full bg-transparent text-gray-300 font-mono text-sm min-h-[100px] outline-none placeholder-white/20 resize-none p-2 border border-transparent focus:border-white/10 rounded-xl transition-all"
                />
            </div>

            {/* Exercises List for CrossFit (Optional Part A/B or Buy-in/Cash-out) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-gray-400 font-black uppercase tracking-widest text-xs">Ejercicios / Movimientos (Opcional)</h3>
                    <button onClick={() => setShowAddModal(true)} className="text-orange-500 text-xs font-bold uppercase hover:bg-orange-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Agregar
                    </button>
                </div>

                {/* @ts-ignore */}
                {exercises.map((ex: any, i: number) => (
                    <div key={ex.id || i} className="bg-[#111] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-white font-heading font-black italic text-xl uppercase tracking-tighter">{ex.name}</h4>
                            </div>
                            <button onClick={() => removeSet(i, 0)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>

                        <div className="space-y-2">
                            {ex.sets.map((set: any, j: number) => (
                                <div key={j} className="flex items-center gap-3">
                                    <span className="text-gray-600 font-mono text-xs w-6">{j + 1}</span>
                                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1.5 flex-1">
                                        <input
                                            type="number"
                                            placeholder={(ex.name.toLowerCase().includes('run') || ex.name.toLowerCase().includes('carrera')) ? "km" : "kg"}
                                            value={set.weight || ''}
                                            onChange={(e) => updateSet(i, j, 'weight', e.target.value)}
                                            className="bg-transparent text-white font-mono text-sm w-full text-center outline-none"
                                        />
                                        <span className="text-gray-600 text-[10px] uppercase">
                                            {(ex.name.toLowerCase().includes('run') || ex.name.toLowerCase().includes('carrera')) ? 'DIST' : 'KG'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1.5 flex-1">
                                        <input
                                            type="number"
                                            placeholder={(ex.name.toLowerCase().includes('run') || ex.name.toLowerCase().includes('carrera')) ? "min" : "reps"}
                                            value={set.reps || ''}
                                            onChange={(e) => updateSet(i, j, 'reps', e.target.value)}
                                            className="bg-transparent text-white font-mono text-sm w-full text-center outline-none"
                                        />
                                        <span className="text-gray-600 text-[10px] uppercase">
                                            {(ex.name.toLowerCase().includes('run') || ex.name.toLowerCase().includes('carrera')) ? 'TIEMPO' : 'REPS'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addSet(i)} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-gray-400 uppercase transition-colors flex items-center justify-center gap-2 mt-2">
                                <Plus className="w-3 h-3" /> Añadir Serie
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Exercise Selector Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
                    <div className="bg-[#111] w-full max-w-lg rounded-[40px] border border-white/10 overflow-hidden h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="p-6 border-b border-white/10 flex items-center gap-4">
                            <Search className="w-5 h-5 text-gray-500" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar ejercicio..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent flex-1 text-white outline-none font-bold uppercase placeholder-gray-600"
                            />
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {searchQuery && filteredCatalog.length === 0 && (
                                <button
                                    onClick={() => addExercise({ name: searchQuery })}
                                    className="w-full text-left p-6 rounded-2xl bg-brand-red/10 border border-brand-red/30 hover:bg-brand-red/20 transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-white font-bold uppercase text-sm">Crear "{searchQuery}"</h4>
                                        <Plus className="w-5 h-5 text-brand-red" />
                                    </div>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">¿No encuentras el ejercicio? Créalo ahora mismo.</p>
                                </button>
                            )}
                            {filteredCatalog.map((ex) => (
                                <button
                                    key={ex.id}
                                    onClick={() => addExercise(ex)}
                                    className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-brand-red/30 transition-all group"
                                >
                                    <h4 className="text-white font-bold uppercase text-sm group-hover:text-brand-red transition-colors">{ex.name}</h4>
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">{ex.muscle_group}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function HyroxView({ time, exercises, setExercises }: { time: number, exercises: any[], setExercises: any }) {
    const [hyroxMode, setHyroxMode] = useState<'race' | 'pft' | 'any'>('race');
    const [initialized, setInitialized] = useState(false);

    // Templates
    const raceTemplate = [
        { name: '1km Run', target: '1000m' }, { name: '1km Ski Erg', target: '1000m' },
        { name: '1km Run', target: '1000m' }, { name: 'Sled Push', target: '50m' },
        { name: '1km Run', target: '1000m' }, { name: 'Sled Pull', target: '50m' },
        { name: '1km Run', target: '1000m' }, { name: 'Burpees Broad Jump', target: '80m' },
        { name: '1km Run', target: '1000m' }, { name: 'Row', target: '1000m' },
        { name: '1km Run', target: '1000m' }, { name: 'Farmers Carry', target: '200m' },
        { name: '1km Run', target: '1000m' }, { name: 'Sandbag Lunges', target: '100m' },
        { name: '1km Run', target: '1000m' }, { name: 'Wall Balls', target: '100 reps' }
    ];

    const pftTemplate = [
        { name: '1km Run', target: '1000m' },
        { name: 'Burpee Broad Jump', target: '50 reps' },
        { name: 'Stationary Lunges', target: '100 reps' },
        { name: 'Row', target: '1000m' },
        { name: 'Wall Balls', target: '30 reps' }
    ];

    // Initialize exercises based on mode
    useEffect(() => {
        if (!initialized && exercises.length === 0) {
            loadTemplate(hyroxMode);
            setInitialized(true);
        }
    }, [hyroxMode, initialized]);

    const loadTemplate = (mode: string) => {
        let template = [];
        if (mode === 'race') template = raceTemplate;
        else if (mode === 'pft') template = pftTemplate;
        else return; // 'any' mode starts empty

        const newExercises = template.map(t => ({
            id: Math.random().toString(36).substr(2, 9),
            name: t.name,
            target: t.target,
            sets: [{ order: 1, weight: 0, reps: 0, completed: false, notes: '' }] // using notes for split time?
        }));
        setExercises(newExercises);
    };

    const toggleStation = (index: number) => {
        const copy = [...exercises];
        if (copy[index] && copy[index].sets[0]) {
            copy[index].sets[0].completed = !copy[index].sets[0].completed;
            // Auto-record split time if completing and time is recorded? 
            // For now just toggle.
            setExercises(copy);
        }
    };

    const updateSplit = (index: number, val: string) => {
        const copy = [...exercises];
        if (copy[index] && copy[index].sets[0]) {
            // We can use the 'reps' field to store numeric split or just 'notes' field for text
            // Let's use specific metadata if possible, but strict typing might prevent it.
            // We'll stick to 'weight' for data value if needed, or just let them complete it.
            // Simplest: Just toggle completion for now as per user request "doy clic y no hace nada".
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-2 bg-[#111] p-1.5 rounded-2xl border border-white/10">
                {['race', 'pft', 'any'].map(m => (
                    <button
                        key={m}
                        onClick={() => { setHyroxMode(m as any); setExercises([]); setInitialized(false); }}
                        className={clsx(
                            "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            hyroxMode === m ? "bg-yellow-500 text-black shadow-lg" : "text-gray-500 hover:text-white"
                        )}
                    >
                        {m === 'any' ? 'Libre / Intervalos' : m.toUpperCase()}
                    </button>
                ))}
            </div>

            {hyroxMode === 'any' ? (
                <div className="mt-4">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-4 px-2">
                        Arma tu propio entrenamiento Hyrox seleccionando los ejercicios.
                    </p>
                    <GymView exercises={exercises} setExercises={setExercises} mode="hyrox" />
                </div>
            ) : (
                <div className="bg-[#111] border border-white/10 p-6 rounded-[32px]">
                    <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-2">
                        {hyroxMode === 'race' ? 'Estaciones Hyrox (Race)' : 'Hyrox PFT'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {exercises.map((ex, i) => {
                            const isCompleted = ex.sets[0]?.completed;
                            const isRun = ex.name.includes('Run');

                            return (
                                <div
                                    key={ex.id || i}
                                    onClick={() => toggleStation(i)}
                                    className={clsx(
                                        "p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer group relative overflow-hidden",
                                        isCompleted
                                            ? (isRun ? "bg-white/10 border-white/20" : "bg-yellow-500/20 border-yellow-500/40")
                                            : (isRun ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-yellow-500/5 border-yellow-500/10 hover:bg-yellow-500/10")
                                    )}
                                >
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs transition-colors",
                                            isCompleted ? "bg-white text-black" : "bg-black/40 text-gray-500"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className={clsx("font-bold text-[10px] uppercase tracking-wide", isRun ? "text-gray-300" : "text-yellow-500")}>
                                                {ex.name}
                                            </p>
                                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">{ex.target}</p>
                                        </div>
                                    </div>

                                    <div className={clsx(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all relative z-10",
                                        isCompleted
                                            ? (isRun ? "border-white bg-white text-black" : "border-yellow-500 bg-yellow-500 text-black")
                                            : "border-white/10 group-hover:border-white/30"
                                    )}>
                                        {isCompleted && <CheckCircle className="w-3.5 h-3.5" />}
                                    </div>

                                    {isCompleted && <div className={clsx("absolute inset-0 opacity-10 z-0", isRun ? "bg-white" : "bg-yellow-500")} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function GymView({ exercises, setExercises, mode = 'gym' }: any) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Load catalog only when modal opens
    useEffect(() => {
        if (showAddModal && catalog.length === 0) {
            getExercises(mode).then(setCatalog);
        }
    }, [showAddModal, catalog.length, mode]);

    const filteredCatalog = useMemo(() => {
        if (!searchQuery) return catalog;
        return catalog.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [catalog, searchQuery]);

    const addExercise = async (template: any) => {
        const prev = await getExercisePreviousRecord(template.name) || "0kg x 0";
        const newEx = {
            id: Math.random().toString(36).substr(2, 9),
            name: template.name,
            target: "3 series x 8-12 reps",
            prev: prev,
            sets: [{ order: 1, weight: 0, reps: 0, completed: false }]
        };
        setExercises([...exercises, newEx]);
        setShowAddModal(false);
    };

    const updateSet = (widthIndex: number, setIndex: number, field: string, val: any) => {
        const copy = [...exercises];
        const s = copy[widthIndex].sets[setIndex];
        // @ts-ignore
        s[field] = val;
        setExercises(copy);
    }

    const toggleSet = (exIdx: number, sIdx: number) => {
        const copy = [...exercises];
        copy[exIdx].sets[sIdx].completed = !copy[exIdx].sets[sIdx].completed;
        setExercises(copy);
    }

    const addSet = (exIdx: number) => {
        const copy = [...exercises];
        const prev = copy[exIdx].sets[copy[exIdx].sets.length - 1] || { weight: 0, reps: 0 };
        copy[exIdx].sets.push({ order: copy[exIdx].sets.length + 1, weight: prev.weight, reps: prev.reps, completed: false });
        setExercises(copy);
    }

    // Simple remove set handler
    const removeSet = (exIdx: number) => {
        const copy = [...exercises];
        if (copy[exIdx].sets.length > 0) {
            copy[exIdx].sets.pop();
            setExercises(copy);
        }
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 fade-in duration-500">
            {exercises.map((ex: any, i: number) => (
                <div key={ex.id} className="bg-[#111] border border-white/5 rounded-[32px] overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-start">
                        <div className="flex-1">
                            <input
                                value={ex.name}
                                onChange={(e) => {
                                    const copy = [...exercises];
                                    copy[i].name = e.target.value;
                                    setExercises(copy);
                                }}
                                className="bg-transparent text-xl font-heading font-black italic text-white uppercase outline-none w-full placeholder-white/20"
                            />
                            <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">{ex.target} • PR: {ex.prev}</p>
                        </div>
                        <button onClick={() => {
                            const copy = exercises.filter((_: any, idx: number) => idx !== i);
                            setExercises(copy);
                        }} className="p-2 text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="p-4 space-y-2">
                        {ex.sets.map((set: any, j: number) => (
                            <div key={j} className={clsx(
                                "grid grid-cols-12 gap-2 p-3 rounded-2xl items-center",
                                set.completed ? "bg-green-500/10 border border-green-500/20" : "bg-white/5 border border-white/5"
                            )}>
                                <div className="col-span-1 text-center font-black text-white/50 text-[10px]">{j + 1}</div>
                                <div className="col-span-4 flex items-center bg-black/40 rounded-xl px-2 border border-transparent focus-within:border-brand-red/50 transition-all">
                                    <input type="number" placeholder="---" className="w-full bg-transparent text-center text-white font-bold py-3 outline-none placeholder-white/5 text-sm"
                                        value={set.weight || ''} onChange={(e) => updateSet(i, j, 'weight', e.target.value === '' ? null : parseFloat(e.target.value))} />
                                    <span className="text-[8px] font-black text-gray-600 uppercase">KG</span>
                                </div>
                                <div className="col-span-4 flex items-center bg-black/40 rounded-xl px-2 border border-transparent focus-within:border-brand-red/50 transition-all">
                                    <input type="number" placeholder="---" className="w-full bg-transparent text-center text-white font-bold py-3 outline-none placeholder-white/5 text-sm"
                                        value={set.reps || ''} onChange={(e) => updateSet(i, j, 'reps', e.target.value === '' ? null : parseFloat(e.target.value))} />
                                    <span className="text-[8px] font-black text-gray-600 uppercase">REPS</span>
                                </div>
                                <div className="col-span-3 flex justify-center">
                                    <button onClick={() => toggleSet(i, j)} className={clsx(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                        set.completed ? "bg-green-500 text-white shadow-lg shadow-green-500/20" : "bg-white/10 text-gray-500 hover:bg-white/20"
                                    )}>
                                        <CheckCircle className="w-5 h-5 fill-current" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2 bg-black/40 flex">
                        <button onClick={() => removeSet(i)} className="flex-1 py-3 text-xs font-black text-gray-600 uppercase tracking-widest hover:text-red-500 hover:bg-red-500/5 rounded-bl-[24px] transition-colors">- Set</button>
                        <div className="w-px bg-white/5 my-2"></div>
                        <button onClick={() => addSet(i)} className="flex-1 py-3 text-xs font-black text-brand-red uppercase tracking-widest hover:bg-brand-red/10 rounded-br-[24px] transition-colors">+ Set</button>
                    </div>
                </div>
            ))}

            <button onClick={() => setShowAddModal(true)} className="w-full py-6 border-2 border-dashed border-white/10 rounded-[32px] text-gray-500 font-black uppercase tracking-[0.2em] hover:border-brand-red/50 hover:text-white hover:bg-white/5 transition-all">
                + Añadir Ejercicio
            </button>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-6 pt-4">
                        <h2 className="text-2xl font-heading font-black italic text-white uppercase">Añadir Movimiento</h2>
                        <button onClick={() => setShowAddModal(false)} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl mb-4 border border-white/10">
                        <input autoFocus type="text" placeholder="Buscar ejercicio, máquina o grupo muscular..." className="w-full bg-transparent text-white font-bold outline-none placeholder-gray-500 text-lg" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pb-10">
                        {searchQuery && filteredCatalog.length === 0 && (
                            <button
                                onClick={() => addExercise({ name: searchQuery })}
                                className="w-full text-left p-6 bg-brand-red/10 rounded-2xl border border-brand-red/30 hover:bg-brand-red/20 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-white font-bold uppercase text-lg">Cargar "{searchQuery}"</h4>
                                    <Plus className="w-6 h-6 text-brand-red" />
                                </div>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Crear ejercicio personalizado ahora.</p>
                            </button>
                        )}
                        {filteredCatalog.map(item => (
                            <button key={item.id} onClick={() => addExercise(item)} className="w-full text-left p-5 bg-[#111] rounded-2xl border border-white/5 hover:border-brand-red hover:bg-white/5 transition-all group">
                                <p className="font-bold text-white uppercase text-lg group-hover:text-brand-red transition-colors">{item.name}</p>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">{item.muscle_group} • {item.category}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
