"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User as UserIcon, Loader2, Dumbbell, PlayCircle, BarChart2, Calendar, Activity, TrendingUp, Award, Zap, X, Check, Clock, Trophy } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { getRecentPRs, getUserProfile, getPerformanceStats, scheduleWorkout } from "../training/actions";
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
    description?: string; // Full formatted WOD description
    exercises: WorkoutExercise[];
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    workout?: Workout | null;
}

export default function CoachPage() {
    const router = useRouter();
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

        try {
            const activityCount = stats.daily?.length || 0;
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

    const startTraining = (workout: Workout) => {
        const workoutData = encodeURIComponent(JSON.stringify(workout));
        router.push(`/dashboard/training/session?mode=ai-coach&workout=${workoutData}`);
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
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                                    msg.role === 'user' ? "bg-gray-700" : "bg-brand-red"
                                )}>
                                    {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>

                                <div className="space-y-2">
                                    <div className={clsx(
                                        "p-4 rounded-2xl text-sm leading-relaxed",
                                        msg.role === 'user'
                                            ? "bg-white text-black font-medium rounded-tr-none"
                                            : "bg-black/50 border border-white/10 text-gray-200 rounded-tl-none"
                                    )}>
                                        {msg.content}
                                    </div>

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

                                    {msg.workout && profile?.subscription_tier !== 'free' && (
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
                            <p className="text-sm text-gray-400 max-w-sm mb-8">El análisis avanzado está reservado para atletas Premium.</p>
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
