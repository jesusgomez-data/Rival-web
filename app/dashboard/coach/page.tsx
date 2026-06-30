"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User as UserIcon, Loader2, Dumbbell, PlayCircle, BarChart2, Calendar, Activity, TrendingUp, Award, Zap, X, Check, Clock, Trophy, RefreshCw } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { getRecentPRs, getUserProfile, getPerformanceStats, scheduleWorkout } from "../training/actions";
import { generateCoachResponse } from "./ai-actions";
import { publishCoachWorkoutToFeed } from "./coach-actions";

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
    description?: string; // Full formatted WOD description
    exercises: WorkoutExercise[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    workout?: Workout | null;
    sentAt?: Date;
}

export default function CoachPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Bienvenido, Atleta. Soy tu Head Coach Rival. Experto en alto rendimiento y programación deportiva integral. Analizaré tu progreso para diseñar tu estrategia de hoy. ¿En qué disciplina vamos a trabajar?",
            sentAt: new Date(),
        }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [prs, setPrs] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ daily: [], fatigue: 0 });
    const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
    const [isScheduling, setIsScheduling] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
    const [dailyLimitReached, setDailyLimitReached] = useState(false);
    const [datePickerFor, setDatePickerFor] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const formatTime = (date?: Date) => {
        if (!date) return '';
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'ahora';
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

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

    const [loadingStep, setLoadingStep] = useState("Analizando métricas...");

    const handleSend = async (customInput?: string) => {
        const messageText = customInput || input;
        if (!messageText.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            sentAt: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);
        setLoadingStep("Conectando con CG Rival...");

        try {
            // ... (keep stats scoring logic)
            setTimeout(() => setLoadingStep("Sincronizando modelos tácticos..."), 2000);
            setTimeout(() => setLoadingStep("Generando programación personalizada..."), 6000);

            const activityCount = stats.daily?.length || 0;
            // ... (keep prCount, fatigue logic)
            const prCount = prs?.length || 0;
            const fatigue = stats.fatigue || 0;

            let recentActivityScore = 5;
            if (activityCount > 4) recentActivityScore += 2;
            if (prCount > 1) recentActivityScore += 2;
            if (fatigue > 70) recentActivityScore -= 1;
            recentActivityScore = Math.min(Math.max(recentActivityScore, 1), 10);

            let detectedLevel = profile?.level || 'Intermediate';
            if (activityCount >= 5 && prCount >= 2) {
                detectedLevel = 'Advanced';
            } else if (activityCount < 2) {
                detectedLevel = 'Beginner';
            }

            // Prepare history for AI
            const history = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const aiResponse = await generateCoachResponse(messageText, {
                level: detectedLevel,
                main_sport: profile?.main_sport || 'General Fitness',
                full_name: profile?.full_name,
                recent_activity_score: recentActivityScore,
                injuries: profile?.injuries,
                is_colaborador: profile?.is_colaborador,
                prs_summary: prs ? prs.slice(0, 5).map((pr:any) => `${pr.movement_name}: ${pr.weight_kg}kg`).join(', ') : '',
                stats_summary: `Fatiga: ${fatigue}%, Ejercicios recientes: ${activityCount}`
            }, history);

            if (aiResponse.dailyLimitReached) {
                setDailyLimitReached(true);
            }

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiResponse.replyText,
                workout: aiResponse.workout,
                sentAt: new Date(),
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Atleta, la línea está saturada. Inténtalo de nuevo o usa el Protocolo de Emergencia.",
                sentAt: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const startTraining = (workout: Workout) => {
        const workoutData = encodeURIComponent(JSON.stringify(workout));
        router.push(`/dashboard/training/session?mode=ai-coach&workout=${workoutData}`);
    };

    const handleSchedule = async (workout: Workout) => {
        setIsScheduling(true);
        const res = await scheduleWorkout({
            title: workout.title,
            date: selectedDate,
            exercises: workout.exercises
        });
        setIsScheduling(false);
        setDatePickerFor(null);
        if (res.success) {
            const dateFormatted = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long'
            });
            setScheduleSuccess(`✅ Entreno guardado para el ${dateFormatted}`);
            setTimeout(() => setScheduleSuccess(null), 4000);
        }
    };

    const handlePublish = async (workout: Workout) => {
        setIsPublishing(true);
        const res = await publishCoachWorkoutToFeed(workout);
        setIsPublishing(false);
        if (!res.error) {
            setScheduleSuccess('🔥 WOD publicado en tu feed');
            setTimeout(() => setScheduleSuccess(null), 3000);
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

                <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 gap-1">
                    <button
                        onClick={() => {
                            setMessages([{
                                id: '1',
                                role: 'assistant',
                                content: "Sesión reiniciada. Estoy listo para una nueva programación. ¿Cuál es el objetivo de hoy?",
                                sentAt: new Date(),
                            }]);
                        }}
                        className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white"
                        title="Reiniciar Chat"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    <div className="w-px h-4 bg-white/10 self-center mx-1" />
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
                                    "flex gap-3 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-lg",
                                    msg.role === 'user' ? "bg-gray-700" : "bg-brand-red shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                                )}>
                                    {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>

                                <div className="space-y-1">
                                    <div className={clsx(
                                        "p-4 rounded-2xl text-sm leading-relaxed shadow-md",
                                        msg.role === 'user'
                                            ? "bg-white text-black font-medium rounded-tr-none shadow-white/5"
                                            : "bg-black/60 border border-white/10 text-gray-200 rounded-tl-none shadow-black/40"
                                    )}>
                                        {msg.content}
                                    </div>
                                    {msg.sentAt && (
                                        <p className={clsx("text-[10px] text-gray-600 px-1", msg.role === 'user' ? "text-right" : "")}>
                                            {formatTime(msg.sentAt)}
                                        </p>
                                    )}

                                    {msg.workout && (
                                        <div className="bg-black border border-brand-red/30 rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(220,38,38,0.1)] max-w-md">
                                            <div className="bg-brand-red/10 p-4 border-b border-brand-red/10 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Dumbbell className="w-4 h-4 text-brand-red" />
                                                    <span className="font-bold text-white text-sm">{msg.workout.title}</span>
                                                </div>
                                                <span className="text-xs bg-brand-red text-white px-2 py-0.5 rounded font-bold uppercase">{msg.workout.duration}</span>
                                            </div>

                                            {/* Full WOD Description with Formatting */}
                                            {(msg.workout as any).description ? (
                                                <div className="p-4 bg-black/40">
                                                    <pre className="text-xs text-gray-200 font-mono leading-relaxed whitespace-pre-wrap font-bold">
                                                        {(msg.workout as any).description}
                                                    </pre>
                                                </div>
                                            ) : (
                                                /* Fallback to exercise list if no description */
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
                                            )}

                                            {/* Date picker (inline, shown when calendar button is clicked) */}
                                            {datePickerFor === msg.id ? (
                                                <div className="p-3 bg-black/50 border-t border-white/5 space-y-2">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3 text-brand-red" /> ¿Para qué día?
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="date"
                                                            value={selectedDate}
                                                            min={new Date().toISOString().split('T')[0]}
                                                            onChange={e => setSelectedDate(e.target.value)}
                                                            className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brand-red/50 [color-scheme:dark]"
                                                        />
                                                        <button
                                                            onClick={() => msg.workout && handleSchedule(msg.workout)}
                                                            disabled={isScheduling}
                                                            className="bg-brand-red text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {isScheduling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                        </button>
                                                        <button
                                                            onClick={() => setDatePickerFor(null)}
                                                            className="bg-white/5 text-gray-400 px-3 py-2 rounded-lg hover:bg-white/10"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-3 bg-white/5 border-t border-white/5 grid grid-cols-3 gap-2">
                                                    <button
                                                        onClick={() => msg.workout && startTraining(msg.workout)}
                                                        className="flex items-center justify-center gap-1.5 bg-white text-black py-2 rounded-lg text-[10px] font-black uppercase transition-colors hover:bg-brand-red hover:text-white"
                                                    >
                                                        <PlayCircle className="w-3 h-3" /> Comenzar
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setDatePickerFor(msg.id);
                                                            setSelectedDate(new Date().toISOString().split('T')[0]);
                                                        }}
                                                        className="flex items-center justify-center gap-1.5 bg-brand-red/20 border border-brand-red/30 text-white py-2 rounded-lg text-[10px] font-black uppercase transition-colors hover:bg-brand-red"
                                                    >
                                                        <Calendar className="w-3 h-3" /> Agendar
                                                    </button>
                                                    <button
                                                        onClick={() => msg.workout && handlePublish(msg.workout)}
                                                        disabled={isPublishing}
                                                        className="flex items-center justify-center gap-1.5 bg-white/10 border border-white/10 text-white py-2 rounded-lg text-[10px] font-black uppercase transition-colors hover:bg-white/20 disabled:opacity-50"
                                                    >
                                                        {isPublishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                                                        WOD
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex gap-3 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-brand-red shadow-[0_0_12px_rgba(220,38,38,0.4)] flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-black/60 border border-white/10 rounded-2xl rounded-tl-none px-5 py-4 flex flex-col gap-1">
                                    {/* 3 bouncing dots — WhatsApp/iMessage style */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-brand-red animate-bounce [animation-delay:0ms]" />
                                        <span className="w-2 h-2 rounded-full bg-brand-red animate-bounce [animation-delay:150ms]" />
                                        <span className="w-2 h-2 rounded-full bg-brand-red animate-bounce [animation-delay:300ms]" />
                                    </div>
                                    <span className="text-[10px] text-gray-500">{loadingStep}</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Toast de éxito al agendar */}
                    {scheduleSuccess && (
                        <div className="mx-4 mb-2 flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold px-4 py-2 rounded-xl animate-pulse">
                            <Check className="w-3 h-3 shrink-0" />
                            {scheduleSuccess}
                        </div>
                    )}

                    {/* Quick Actions - hidden when limit reached */}
                    {!dailyLimitReached && (
                        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-black/20 border-t border-white/5 pb-4">
                            <QuickAction label="Cross Training" onClick={() => handleSend("Dame un WOD de Cross Training del día. Profesional y exigente.")} />
                            <QuickAction label="OCR" onClick={() => handleSend("Dame un entrenamiento de OCR. Incluye carrera y obstáculos técnicos.")} />
                            <QuickAction label="Hybrid" onClick={() => handleSend("Dame una sesión de entrenamiento estilo Hybrid.")} />
                            <QuickAction label="Running" onClick={() => handleSend("Dame un plan de Running para hoy.")} />
                            <QuickAction label="Calistenia" onClick={() => handleSend("Entrenamiento de Calistenia para dominio corporal.")} />
                            <QuickAction label="Gym" onClick={() => handleSend("Rutina de Gym (Musculación) completa.")} />
                            <div className="w-px h-6 bg-white/10 mx-2 shrink-0 self-center" />
                            <QuickAction label="Tren Inferior" onClick={() => handleSend("Dame un entrenamiento de piernas")} />
                            <QuickAction label="Empuje (Push)" onClick={() => handleSend("Crea un entrenamiento de pecho, hombros y tríceps")} />
                            <QuickAction label="Tracción (Pull)" onClick={() => handleSend("Entrenamiento de espalda y bíceps")} />
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 bg-black border-t border-white/10">
                        {dailyLimitReached ? (
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                <Clock className="w-4 h-4 text-brand-red shrink-0" />
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex-1">
                                    Misión del día completada · Vuelve mañana
                                </p>
                                <span className="text-[10px] font-black text-brand-red uppercase tracking-widest">🔒 1/día</span>
                            </div>
                        ) : (
                            <div className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && !isTyping) {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    placeholder="Dile al Coach qué quieres entrenar..."
                                    disabled={isTyping}
                                    className="w-full bg-brand-gray border border-white/10 text-white placeholder:text-gray-600 text-sm rounded-xl py-3 pl-4 pr-14 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/30 transition-all disabled:opacity-50"
                                />
                                <button
                                    onClick={() => handleSend()}
                                    className={clsx(
                                        "absolute right-2 p-2.5 rounded-xl text-white transition-all duration-200",
                                        input.trim() && !isTyping
                                            ? "bg-brand-red hover:bg-red-600 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                                            : "bg-white/5 cursor-not-allowed opacity-40"
                                    )}
                                    disabled={!input.trim() || isTyping}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-black/40 relative">
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
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px] uppercase font-bold">Sin sesiones registradas</div>
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
                                            <p className="text-[10px] text-gray-500">Rendimiento óptimo esta semana.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-yellow-500/10 rounded-lg">
                                            <Award className="w-4 h-4 text-yellow-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-white font-bold italic uppercase tracking-tight">{prs.length} Récords Alcanzados</p>
                                            <p className="text-[10px] text-gray-500">Tus niveles de fuerza están rompiendo límites.</p>
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
                                </div>
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
