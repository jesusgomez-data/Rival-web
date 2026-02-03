"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User as UserIcon, Loader2, Dumbbell, PlayCircle, BarChart2, Calendar, Activity, TrendingUp, Award, Zap, X, Check, Clock, RotateCcw, Plus, Trophy } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import Image from "next/image";

import { getRecentPRs, getUserProfile, getPerformanceStats, scheduleWorkout, saveWorkout, uploadWorkoutMedia } from "../training/actions";
import { generateCoachResponse } from "./ai-actions";

interface WorkoutExercise {
    name: string;
    sets: string;
    reps: string;
}

interface Workout {
    title: string;
    duration: string;
    intensity: string;
    sportType?: string;
    exercises: WorkoutExercise[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    workout?: Workout | null;
}

export default function CoachPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Bienvenido, Atleta. Soy tu Head Coach Rival. Experto en alto rendimiento y programación deportiva integral. Analizaré tu progreso para diseñar tu estrategia de hoy. ¿En qué disciplina vamos a trabajar?",
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [prs, setPrs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ daily: [], fatigue: 0 });
    const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
    const [isScheduling, setIsScheduling] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Training Session State
    const [isTrainingMode, setIsTrainingMode] = useState(false);
    const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [timer, setTimer] = useState(0);
    const [initialTimer, setInitialTimer] = useState(0);
    const [isTimerPaused, setIsTimerPaused] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [trainingResults, setTrainingResults] = useState<{
        rounds: string;
        weight: string;
        time: string;
        exercises: any[];
    }>({ rounds: "", weight: "", time: "", exercises: [] });
    const [isSaving, setIsSaving] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        async function loadData() {
            const [p, r, s] = await Promise.all([
                getUserProfile(),
                getRecentPRs(),
                getPerformanceStats()
            ]);
            setProfile(p);
            setPrs(r);
            setStats(s);
        }
        loadData();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Timer logic - Effect based for stability
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isTrainingMode && !isTimerPaused && countdown === null && timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        finishWorkout();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTrainingMode, isTimerPaused, countdown, timer]);

    const handleSend = async (customInput?: string) => {
        const messageText = customInput || input;
        if (!messageText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Optimistic UI updates handled above

        try {
            // Intelligent Level Assessment
            const activityCount = stats.daily?.length || 0;
            const prCount = prs?.length || 0;
            const fatigue = stats.fatigue || 0;

            // Calculate a score from 1-10
            let recentActivityScore = 5; // mid
            if (activityCount > 4) recentActivityScore += 2;
            if (prCount > 1) recentActivityScore += 2;
            if (fatigue > 70) recentActivityScore -= 1;
            recentActivityScore = Math.min(Math.max(recentActivityScore, 1), 10);

            // Determine if they are Advanced or Intermediate based on actual data
            let detectedLevel = profile?.level || 'Intermediate';
            if (activityCount >= 5 && prCount >= 2) {
                detectedLevel = 'Advanced';
            } else if (activityCount < 2) {
                detectedLevel = 'Beginner';
            }

            // Call Gemini AI
            const aiResponse = await generateCoachResponse(messageText, {
                level: detectedLevel,
                main_sport: profile?.main_sport || 'General Fitness',
                full_name: profile?.full_name,
                recent_activity_score: recentActivityScore,
                injuries: profile?.injuries
            });

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse.replyText,
                workout: aiResponse.workout
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Fallo del sistema. No se pueden procesar los datos tácticos.",
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const getWorkoutType = (workout: any) => {
        if (!workout) return 'STRENGTH';
        const search = `${workout.title || ""} ${workout.duration || ""}`.toLowerCase();

        if (search.includes('amrap')) return 'AMRAP';
        if (
            search.includes('for time') ||
            search.includes('rft') ||
            search.includes('tiempo') ||
            search.includes('reloj') ||
            search.includes('cap') ||
            search.includes('cronómetro') ||
            search.includes('hyrox') ||
            search.includes('crossfit')
        ) return 'FOR_TIME';
        if (search.includes('emom')) return 'EMOM';
        if (search.includes('tabata')) return 'TABATA';

        // Default to FOR_TIME if duration contains 'min' and it looks like a WOD
        if (search.includes('min') && (workout.intensity === 'Beginner' || workout.intensity === 'Intermediate' || workout.intensity === 'Advanced' || workout.intensity === 'Elite')) {
            return 'FOR_TIME';
        }

        return 'STRENGTH';
    };

    const startTraining = (workout: Workout) => {
        // Clear any existing timers first
        if (timerRef.current) clearInterval(timerRef.current);

        setActiveWorkout(workout);
        setIsTrainingMode(true);
        setCountdown(5);

        // Play start sound (beep)
        const playBeep = (freq: number, duration: number) => {
            try {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = context.createOscillator();
                const gain = context.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, context.currentTime);
                gain.gain.setValueAtTime(0.1, context.currentTime);
                osc.connect(gain);
                gain.connect(context.destination);
                osc.start();
                osc.stop(context.currentTime + duration);
            } catch (e) {
                console.warn("Audio context not available", e);
            }
        };

        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (prev === null) {
                    clearInterval(countdownInterval);
                    return null;
                }
                if (prev > 1) {
                    playBeep(440, 0.1);
                    return prev - 1;
                }
                playBeep(880, 0.3);
                clearInterval(countdownInterval);
                startWorkoutTimer(workout);
                return null;
            });
        }, 1000);

        // Store interval for cleanup if cancelled
        timerRef.current = countdownInterval;
        playBeep(440, 0.1);
    };

    const startWorkoutTimer = (workout: Workout) => {
        // Clear countdown timer ref
        if (timerRef.current) clearInterval(timerRef.current);

        // Parse duration (e.g., "20 min AMRAP" -> 1200 seconds)
        const durationMatch = workout.duration.match(/(\d+)/);
        const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 20;
        const totalSeconds = durationMinutes * 60;
        setTimer(totalSeconds);
        setInitialTimer(totalSeconds);
        setIsTimerPaused(false);
    };

    const finishWorkout = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTimerPaused(true);

        const type = getWorkoutType(activeWorkout);
        const elapsedSeconds = Math.max(0, initialTimer - timer);

        setTrainingResults({
            time: type === 'FOR_TIME' ? formatTime(elapsedSeconds) : "",
            rounds: "",
            weight: "",
            exercises: activeWorkout?.exercises.map(ex => {
                // Pre-fill weight if it's in the name (e.g. "Wall Balls (4kg)")
                const detectedWeight = ex.name.match(/(\d+)kg/i)?.[1] || "";
                return {
                    name: ex.name,
                    weight: detectedWeight,
                    reps: ex.reps.match(/(\d+)/)?.[1] || ""
                };
            }) || []
        });

        setShowResultsModal(true);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSaveResults = async () => {
        setIsSaving(true);
        try {
            // Mapping for saveWorkout
            const sportMapping: Record<string, string> = {
                'crossfit': 'CrossFit',
                'hyrox': 'Hyrox',
                'running': 'Running',
                'calistenia': 'Fitness',
                'gym': 'Fitness'
            };

            const payload = {
                title: activeWorkout?.title || "Sesión Rival AI",
                startTime: new Date(Date.now() - ((initialTimer - timer) * 1000)).toISOString(),
                duration: initialTimer - timer,
                sportType: activeWorkout?.sportType || sportMapping[profile?.main_sport?.toLowerCase()] || 'Fitness',
                exercises: trainingResults.exercises.map(ex => {
                    const weightVal = parseFloat(ex.weight) || 0;
                    const repsVal = parseInt(ex.reps) || 0;

                    return {
                        name: ex.name,
                        sets: [{
                            order: 1,
                            weight: weightVal,
                            reps: repsVal,
                            completed: true
                        }]
                    };
                }),
                metrics: {
                    rounds: parseInt(trainingResults.rounds) || 0,
                    weight: parseFloat(trainingResults.weight) || 0,
                    time: trainingResults.time,
                    type: getWorkoutType(activeWorkout)
                },
                imageUrl: imageUrl,
                shareToArena: true
            };

            const result = await saveWorkout(payload);
            if (result?.success) {
                setShowResultsModal(false);
                setIsTrainingMode(false);
                setActiveWorkout(null);
                setTrainingResults({ rounds: "", weight: "", time: "", exercises: [] });
                setImageUrl(null);
                alert("¡Entrenamiento publicado en tu perfil y en la Arena, Atleta!");
            } else {
                alert("Error al guardar: " + (result?.error || "Error desconocido"));
            }
        } catch (e) {
            console.error(e);
            alert("Error crítico al procesar el entrenamiento.");
        } finally {
            setIsSaving(false);
        }
    };

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



    const handleSchedule = async (workout: Workout) => {
        setIsScheduling(true);
        const today = new Date().toISOString().split('T')[0];
        const res = await scheduleWorkout({
            title: workout.title,
            date: today,
            exercises: workout.exercises
        });
        setIsScheduling(false);
        if (res.success) {
            alert("¡Misión asignada a tu calendario, Atleta!");
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col bg-brand-gray border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                        <Zap className="w-6 h-6 text-white fill-current" />
                    </div>
                    <div>
                        <h2 className="font-heading font-bold text-white text-lg leading-none">Coach Online</h2>
                        <p className="text-xs text-brand-red font-bold uppercase tracking-widest">Rival Assistant</p>
                    </div>
                </div>

                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={clsx("px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'chat' ? "bg-brand-red text-white" : "text-gray-500 hover:text-white")}
                    >
                        Chat
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={clsx("px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'insights' ? "bg-brand-red text-white" : "text-gray-500 hover:text-white")}
                    >
                        Análisis
                    </button>
                </div>
            </div>

            {activeTab === 'chat' ? (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-brand-red/20 scrollbar-track-transparent">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={clsx(
                                    "flex gap-4 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                {/* Avatar */}
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                                    msg.role === 'user' ? "bg-gray-700" : "bg-brand-red"
                                )}>
                                    {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>

                                {/* Content */}
                                <div className="space-y-2">
                                    <div className={clsx(
                                        "p-4 rounded-2xl text-sm leading-relaxed",
                                        msg.role === 'user'
                                            ? "bg-white text-black font-medium rounded-tr-none"
                                            : "bg-black/50 border border-white/10 text-gray-200 rounded-tl-none"
                                    )}>
                                        {msg.content}
                                    </div>

                                    {/* Plan Restriction Overlay for Assistant Messages */}
                                    {msg.role === 'assistant' && profile?.subscription_tier === 'free' && msg.id !== '1' && (
                                        <div className="mt-4 p-6 bg-gradient-to-br from-brand-red/20 to-black border border-brand-red/30 rounded-2xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Bot className="w-5 h-5 text-brand-red" />
                                                <span className="font-bold text-white uppercase italic text-xs">Acceso Restringido</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-4">La asesoría táctica avanzada está reservada para atletas <span className="text-brand-red font-bold">Premium</span> y <span className="text-brand-red font-bold">Élite</span>.</p>
                                            <Link href="/dashboard/settings/billing" className="block text-center bg-brand-red py-2 rounded-lg text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all">
                                                Mejorar Plan
                                            </Link>
                                        </div>
                                    )}

                                    {/* Optional Workout Card Attachment */}
                                    {msg.workout && profile?.subscription_tier !== 'free' && (
                                        <div className="bg-black border border-brand-red/30 rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(220,38,38,0.1)] w-80">
                                            <div className="bg-brand-red/10 p-4 border-b border-brand-red/10 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Dumbbell className="w-4 h-4 text-brand-red" />
                                                    <span className="font-bold text-white text-sm">{msg.workout.title}</span>
                                                </div>
                                                <span className="text-xs bg-brand-red text-white px-2 py-0.5 rounded font-bold uppercase">{msg.workout.duration}</span>
                                            </div>
                                            <div className="p-4 space-y-3">
                                                {msg.workout.exercises.map((ex: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-start text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                        <span className="text-gray-300 font-bold flex-1 pr-4">{ex.name}</span>
                                                        <div className="text-right shrink-0">
                                                            <span className="text-brand-red font-mono font-black">
                                                                {ex.sets && ex.sets !== "---" && ex.sets !== "1" ? (
                                                                    `${ex.sets} x ${ex.reps}`
                                                                ) : (
                                                                    ex.reps
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-3 bg-white/5 border-t border-white/5 grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => msg.workout && startTraining(msg.workout)}
                                                    className="flex items-center justify-center gap-2 bg-white text-black py-2 rounded-lg text-[10px] font-black uppercase transition-colors hover:bg-brand-red hover:text-white"
                                                >
                                                    <PlayCircle className="w-3 h-3" /> Comenzar Ya
                                                </button>
                                                <button
                                                    onClick={() => msg.workout && handleSchedule(msg.workout)}
                                                    disabled={isScheduling}
                                                    className="flex items-center justify-center gap-2 bg-brand-red/20 border border-brand-red/30 text-white py-2 rounded-lg text-[10px] font-black uppercase transition-colors hover:bg-brand-red disabled:opacity-50"
                                                >
                                                    <Calendar className="w-3 h-3" /> Al Calendario
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-4 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-black/50 border border-white/10 text-gray-200 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-brand-red" />
                                    <span className="text-xs text-gray-400">Analizando métricas...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-black/20 border-t border-white/5 pb-4">
                        <QuickAction label="Crossfit" onClick={() => handleSend("Dame un WOD de Crossfit del día. Profesional y exigente.")} />
                        <QuickAction label="Hyrox" onClick={() => handleSend("Dame una sesión de entrenamiento estilo Hyrox.")} />
                        <QuickAction label="Running" onClick={() => handleSend("Dame un plan de Running para hoy.")} />
                        <QuickAction label="Calistenia" onClick={() => handleSend("Entrenamiento de Calistenia para dominio corporal.")} />
                        <QuickAction label="Gym" onClick={() => handleSend("Rutina de Gym (Musculación) completa.")} />
                        <div className="w-px h-6 bg-white/10 mx-2 shrink-0 self-center" />
                        <QuickAction label="Tren Inferior" onClick={() => handleSend("Dame un entrenamiento de piernas")} />
                        <QuickAction label="Empuje (Push)" onClick={() => handleSend("Crea un entrenamiento de pecho, hombros y tríceps")} />
                        <QuickAction label="Tracción (Pull)" onClick={() => handleSend("Entrenamiento de espalda y bíceps")} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-black border-t border-white/10">
                        <div className="relative flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Dile al Coach qué quieres entrenar..."
                                className="w-full bg-brand-gray border border-white/10 text-white placeholder:text-gray-500 text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all"
                            />
                            <button
                                onClick={() => handleSend()}
                                className="absolute right-2 p-2 bg-brand-red rounded-lg text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!input.trim() || isTyping}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="mt-2 text-center">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Rival Coach Online • Performance Protocol 2.5</p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-black/40 relative">
                    {profile?.subscription_tier === 'free' && (
                        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-brand-red/10 flex items-center justify-center mb-6 border border-brand-red/20">
                                <Trophy className="w-10 h-10 text-brand-red" />
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">Desbloquea tu Potencial</h3>
                            <p className="text-sm text-gray-400 max-w-sm mb-8">El análisis avanzado de fatiga, volumen y progresión táctica está reservado para atletas <span className="text-brand-red font-bold">Premium</span> y <span className="text-brand-red font-bold">Elite</span>.</p>
                            <Link href="/dashboard/settings/billing" className="bg-brand-red text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-glow hover:bg-red-600 transition-all">
                                Mejorar Plan Ahora
                            </Link>
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-brand-gray/40 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 text-brand-red/5 group-hover:text-brand-red/10 transition-colors">
                                <BarChart2 className="w-20 h-20" />
                            </div>
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Activity className="w-3 h-3 text-brand-red" /> Progresión de Volumen
                            </h3>

                            <div className="flex items-end gap-2 h-48 mt-4">
                                {stats.daily && stats.daily.length > 0 ? stats.daily.map((s: any, i: number) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar">
                                        <div
                                            className="w-full bg-brand-red/20 border border-brand-red/30 rounded-t-lg transition-all group-hover/bar:bg-brand-red group-hover/bar:shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                            style={{ height: `${Math.min((s.total_volume_kg / 5000) * 100, 100)}%` }}
                                        />
                                        <span className="text-[8px] text-gray-600 font-bold uppercase">{new Date(s.created_at).toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                    </div>
                                )) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px] uppercase font-bold">Sin sesiones registradas esta semana</div>
                                )}
                            </div>
                        </div>



                        <div className="space-y-6">
                            <div className="bg-brand-gray/40 border border-white/5 p-6 rounded-3xl">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Análisis del Coach</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-green-500/10 rounded-lg">
                                            <TrendingUp className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-white font-bold italic uppercase tracking-tight">Consistencia Alta</p>
                                            <p className="text-[10px] text-gray-500">Has alcanzado {stats.daily?.length || 0} zonas de entrenamiento esta semana. El rendimiento es óptimo.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                                            <Award className="w-4 h-4 text-yellow-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-white font-bold italic uppercase tracking-tight">{prs.length} Récords Alcanzados</p>
                                            <p className="text-[10px] text-gray-500">Tus niveles de fuerza están rompiendo límites anteriores. Sigue así.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-brand-red/10 rounded-lg">
                                            <Dumbbell className="w-4 h-4 text-brand-red" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-white font-bold italic uppercase tracking-tight">Pico de Volumen</p>
                                            <p className="text-[10px] text-gray-500">Última sesión alcanzó {stats.daily?.[stats.daily.length - 1]?.total_volume_kg || 0}kg. Intenta un +5% mañana.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-brand-gray/40 border border-white/5 p-6 rounded-3xl">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Protocolo de Fatiga</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className={clsx("text-xs font-black uppercase italic", stats.fatigue > 80 ? "text-brand-red" : stats.fatigue > 50 ? "text-yellow-500" : "text-green-500")}>
                                            {stats.fatigue > 80 ? "RECUPERACIÓN CRÍTICA" : stats.fatigue > 50 ? "ESTRÉS ACUMULADO" : "ESTADO ÓPTIMO"}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-bold">{stats.fatigue}% ACUMULADO</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className={clsx("h-full transition-all duration-1000", stats.fatigue > 80 ? "bg-brand-red" : stats.fatigue > 50 ? "bg-yellow-500" : "bg-green-500")}
                                            style={{ width: `${stats.fatigue}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-relaxed italic">
                                        {stats.fatigue > 80
                                            ? "Comando: Ejecutar protocolo de descanso de 24-48h. El Sistema Nervioso Central está sobrecargado."
                                            : stats.fatigue > 50
                                                ? "Aviso: Intensidad moderada. No intentes un 1RM hoy."
                                                : "Protocolo: Todos los sistemas operativos. Despliega el máximo esfuerzo."}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-brand-red/20 to-black border border-brand-red/10 p-6 rounded-3xl">
                                <h3 className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-2">Siguiente Objetivo</h3>
                                <p className="text-sm text-white font-bold mb-4">Estás a 4 sesiones del nivel Élite.</p>
                                <button className="w-full py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all">
                                    Revelar Estrategia
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Training Overlay */}
            {isTrainingMode && activeWorkout && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 backdrop-blur-xl bg-black/90">
                    <div className="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in duration-300">
                        {countdown !== null ? (
                            <div className="space-y-4 animate-pulse">
                                <h2 className="text-brand-red text-9xl font-black italic">{countdown}</h2>
                                <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-sm">Preparado, Atleta...</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <h2 className="text-white text-3xl font-black italic uppercase tracking-tighter">{activeWorkout.title}</h2>
                                    <div className="inline-block bg-brand-red text-white px-3 py-1 rounded font-black text-xs uppercase tracking-widest">{activeWorkout.intensity}</div>
                                </div>

                                <div className="py-12">
                                    <div className="text-white text-8xl font-mono tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                                        {formatTime(timer)}
                                    </div>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">{activeWorkout.duration}</p>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-4 overflow-y-auto max-h-[30vh] no-scrollbar">
                                    {activeWorkout.exercises.map((ex, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                            <span className="text-white font-bold text-sm">{ex.name}</span>
                                            <span className="text-brand-red font-mono text-xs">{ex.sets} x {ex.reps}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <button
                                        onClick={() => setIsTimerPaused(!isTimerPaused)}
                                        className="flex-1 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-black uppercase text-xs hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isTimerPaused ? <PlayCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                        {isTimerPaused ? "Reanudar" : "Pausar"}
                                    </button>
                                    <button
                                        onClick={() => finishWorkout()}
                                        className="flex-1 py-4 bg-brand-red rounded-2xl text-white font-black uppercase text-xs shadow-[0_10px_20px_rgba(220,38,38,0.3)] hover:scale-[1.02] transition-all"
                                    >
                                        Finalizar
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        if (timerRef.current) clearInterval(timerRef.current);
                                        setIsTrainingMode(false);
                                        setActiveWorkout(null);
                                    }}
                                    className="mt-8 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2 justify-center"
                                >
                                    <X className="w-3 h-3" /> Cancelar Entrenamiento
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {showResultsModal && activeWorkout && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-brand-gray border border-white/10 max-w-sm w-full rounded-3xl p-8 space-y-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-500 mb-2 animate-bounce">
                                <Award className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-white italic uppercase">¡Entreno Finalizado!</h3>
                            <p className="text-sm text-gray-400">Has superado los límites hoy. Registra tu resultado.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                {getWorkoutType(activeWorkout) === 'FOR_TIME' ? (
                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">Tiempo Final</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 12:45"
                                            value={trainingResults.time}
                                            onChange={(e) => setTrainingResults(prev => ({ ...prev, time: e.target.value }))}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-red font-mono text-center text-xl transition-all"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-2">
                                                {getWorkoutType(activeWorkout) === 'AMRAP' ? 'Rondas' : 'Rondas / Reps'}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ej: 12"
                                                value={trainingResults.rounds}
                                                onChange={(e) => setTrainingResults(prev => ({ ...prev, rounds: e.target.value }))}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-brand-red text-center transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Per-Exercise Detail Selection */}
                                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Detalle por Ejercicio</h4>
                                        <span className="text-[8px] text-brand-red font-bold uppercase animate-pulse">Ajusta tus marcas</span>
                                    </div>
                                    {trainingResults.exercises.map((ex, idx) => {
                                        const needsWeight = /kg|peso|weight|mancuerna|barra|dumb|kettle|db|kb|bb/i.test(ex.name);
                                        return (
                                            <div key={idx} className={clsx(
                                                "p-4 rounded-2xl border transition-all space-y-3",
                                                needsWeight ? "bg-brand-red/5 border-brand-red/20 shadow-[0_0_15px_rgba(220,38,38,0.05)]" : "bg-black/30 border-white/5"
                                            )}>
                                                <div className="flex items-center gap-2">
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full", needsWeight ? "bg-brand-red" : "bg-gray-600")}></div>
                                                    <p className="text-xs text-white font-bold uppercase truncate flex-1">{ex.name}</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <label className="text-[8px] text-gray-500 font-black uppercase mb-1 block">Reps / Dist</label>
                                                        <input
                                                            type="text"
                                                            value={ex.reps}
                                                            onChange={(e) => {
                                                                const newExs = [...trainingResults.exercises];
                                                                newExs[idx].reps = e.target.value;
                                                                setTrainingResults(prev => ({ ...prev, exercises: newExs }));
                                                            }}
                                                            className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:border-brand-red outline-none transition-all font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[8px] text-gray-500 font-black uppercase mb-1 block">Peso (kg)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="0"
                                                            value={ex.weight}
                                                            onChange={(e) => {
                                                                const newExs = [...trainingResults.exercises];
                                                                newExs[idx].weight = e.target.value;
                                                                setTrainingResults(prev => ({ ...prev, exercises: newExs }));
                                                            }}
                                                            className={clsx(
                                                                "w-full bg-black/50 border rounded-lg py-2 px-3 text-sm text-white outline-none transition-all font-bold",
                                                                needsWeight ? "border-brand-red/30 focus:border-brand-red" : "border-white/10 focus:border-brand-red"
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div>
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-3">Evidencia de la Misión (Opcional)</label>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    {imageUrl ? (
                                        <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-white/10 group">
                                            <Image src={imageUrl} alt="Resultado" fill className="object-cover" />
                                            <button
                                                onClick={() => setImageUrl(null)}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="w-full h-32 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all"
                                        >
                                            {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-brand-red" /> : <Plus className="w-6 h-6 text-gray-500" />}
                                            <span className="text-[10px] font-black uppercase text-gray-500">Subir mejor momento</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowResultsModal(false);
                                        setIsTrainingMode(false);
                                        setActiveWorkout(null);
                                        setImageUrl(null);
                                    }}
                                    className="flex-1 py-4 bg-white/5 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                >
                                    Omitir
                                </button>
                                <button
                                    onClick={handleSaveResults}
                                    disabled={isSaving || isUploading}
                                    className="flex-1 py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all shadow-[0_10px_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    {isSaving ? "Publicando..." : "Subir al Perfil"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


function QuickAction({ label, onClick }: { label: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="whitespace-nowrap bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-brand-red hover:border-brand-red transition-all"
        >
            {label}
        </button>
    )
}
