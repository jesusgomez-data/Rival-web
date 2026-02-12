"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    Dumbbell,
    Trophy,
    Target,
    Activity,
    ChevronRight,
    Check,
    Flame,
    Zap,
    Sword,
    Mountain,
    Calendar,
    Phone
} from "lucide-react";
import { createClient } from '@/utils/supabase/client';

const sports = [
    { id: "cross_training", name: "Cross Training", icon: <Activity className="w-8 h-8" />, desc: "Funcional de alta intensidad" },
    { id: "powerlifting", name: "Powerlifting", icon: <Dumbbell className="w-8 h-8" />, desc: "Fuerza máxima y técnica" },
    { id: "boxing", name: "Boxeo / MMA", icon: <Zap className="w-8 h-8" />, desc: "Combate y cardio explosivo" },
    { id: "bodybuilding", name: "Culturismo", icon: <Flame className="w-8 h-8" />, desc: "Estética y volumen" },
    { id: "hybrid", name: "Hybrid / Running", icon: <Mountain className="w-8 h-8" />, desc: "Resistencia extrema" },
    { id: "other", name: "Otro", icon: <Target className="w-8 h-8" />, desc: "Cualquier otra disciplina" },
];

const levels = [
    { id: "beginner", name: "Principiante", desc: "Menos de 6 meses entrenando" },
    { id: "intermediate", name: "Intermedio", desc: "1-3 años de experiencia" },
    { id: "advanced", name: "Avanzado", desc: "Compites o entrenas +4 años" },
    { id: "pro", name: "Elite", desc: "Profesional del deporte" },
];

const goals = [
    { id: "strength", name: "Ganar Fuerza", icon: <Dumbbell className="w-5 h-5" /> },
    { id: "aesthetics", name: "Estética / Perder Grasa", icon: <Flame className="w-5 h-5" /> },
    { id: "endurance", name: "Resistencia / Cardio", icon: <Mountain className="w-5 h-5" /> },
    { id: "competition", name: "Competición", icon: <Trophy className="w-5 h-5" /> },
    { id: "health", name: "Salud General", icon: <Activity className="w-5 h-5" /> },
];

export default function OnboardingPage() {
    const [step, setStep] = useState(1);
    const [data, setData] = useState({
        sport: "",
        level: "",
        goals: [] as string[],
        birthDate: "",
        phone: "",
    });
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Also check if they already have onboarding completed (not in this component, but good for data)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('birth_date, phone')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setData(prev => ({
                        ...prev,
                        birthDate: profile.birth_date || prev.birthDate,
                        phone: profile.phone || prev.phone,
                    }));
                }
            }
        };
        fetchProfile();
    }, []);

    const totalSteps = 4;

    const nextStep = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    const handleSportSelect = (id: string) => {
        setData({ ...data, sport: id });
        setTimeout(nextStep, 300);
    };

    const handleLevelSelect = (id: string) => {
        setData({ ...data, level: id });
        setTimeout(nextStep, 300);
    };

    const handleGoalToggle = (id: string) => {
        const newGoals = data.goals.includes(id)
            ? data.goals.filter((g) => g !== id)
            : [...data.goals, id];
        setData({ ...data, goals: newGoals });
    };

    const handleFinish = async () => {
        if (!data.birthDate) {
            alert('Por favor ingresa tu fecha de nacimiento');
            return;
        }

        // Save to database
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            await supabase
                .from('profiles')
                .update({
                    birth_date: data.birthDate,
                    phone: data.phone || null,
                })
                .eq('id', user.id);
        }

        router.push("/dashboard");
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden relative">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-red/10 blur-[120px] rounded-full" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-brand-neon-orange/10 blur-[120px] rounded-full" />
            </div>

            <div className="max-w-4xl w-full z-10">
                {/* Progress Bar */}
                <div className="flex justify-between items-center mb-12">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((s) => (
                            <div
                                key={s}
                                className={`h-1.5 rounded-full transition-all duration-500 ${s <= step ? "w-12 bg-brand-red shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "w-6 bg-border"
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Paso {step} de {totalSteps}
                    </span>
                </div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-heading font-black mb-4 tracking-tight italic">
                                    ¿CUÁL ES TU <span className="text-brand-red">ARENA?</span>
                                </h1>
                                <p className="text-muted-foreground text-lg">Selecciona tu disciplina principal para personalizar tu ranking.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sports.map((sport) => (
                                    <button
                                        key={sport.id}
                                        onClick={() => handleSportSelect(sport.id)}
                                        className={`p-6 rounded-2xl border text-left transition-all group relative overflow-hidden ${data.sport === sport.id
                                            ? "border-brand-red bg-brand-red/5 ring-1 ring-brand-red"
                                            : "border-border hover:border-brand-red/50 bg-card hover:bg-card/50"
                                            }`}
                                    >
                                        <div className={`mb-4 transition-colors ${data.sport === sport.id ? "text-brand-red" : "text-muted-foreground group-hover:text-brand-red"}`}>
                                            {sport.icon}
                                        </div>
                                        <h3 className="font-bold text-xl mb-1">{sport.name}</h3>
                                        <p className="text-xs text-muted-foreground">{sport.desc}</p>
                                        {data.sport === sport.id && (
                                            <div className="absolute top-4 right-4 text-brand-red">
                                                <Check className="w-5 h-5" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-heading font-black mb-4 tracking-tight italic">
                                    ¿CUÁL ES TU <span className="text-brand-neon-orange">NIVEL?</span>
                                </h1>
                                <p className="text-muted-foreground text-lg">No te mientas. La honestidad es el primer paso hacia la grandeza.</p>
                            </div>

                            <div className="space-y-4">
                                {levels.map((level) => (
                                    <button
                                        key={level.id}
                                        onClick={() => handleLevelSelect(level.id)}
                                        className={`w-full p-6 rounded-2xl border text-left transition-all flex items-center justify-between group ${data.level === level.id
                                            ? "border-brand-neon-orange bg-brand-neon-orange/5 ring-1 ring-brand-neon-orange"
                                            : "border-border hover:border-brand-neon-orange/50 bg-card"
                                            }`}
                                    >
                                        <div>
                                            <h3 className="font-bold text-xl mb-1">{level.name}</h3>
                                            <p className="text-sm text-muted-foreground">{level.desc}</p>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${data.level === level.id ? "border-brand-neon-orange bg-brand-neon-orange text-black" : "border-border group-hover:border-brand-neon-orange/50"
                                            }`}>
                                            {data.level === level.id ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-heading font-black mb-4 tracking-tight italic">
                                    DEFINE TUS <span className="text-brand-neon-green">OBJETIVOS.</span>
                                </h1>
                                <p className="text-muted-foreground text-lg">¿Qué es lo que realmente te mueve cada mañana?</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {goals.map((goal) => (
                                    <button
                                        key={goal.id}
                                        onClick={() => handleGoalToggle(goal.id)}
                                        className={`p-5 rounded-2xl border transition-all flex items-center gap-4 ${data.goals.includes(goal.id)
                                            ? "border-brand-neon-green bg-brand-neon-green/5 ring-1 ring-brand-neon-green"
                                            : "border-border hover:border-brand-neon-green/50 bg-card"
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${data.goals.includes(goal.id) ? "bg-brand-neon-green text-black" : "bg-muted text-muted-foreground"
                                            }`}>
                                            {goal.icon}
                                        </div>
                                        <span className="font-bold text-lg flex-1 text-left">{goal.name}</span>
                                        {data.goals.includes(goal.id) && (
                                            <Check className="w-6 h-6 text-brand-neon-green" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-8">
                                <button
                                    onClick={nextStep}
                                    disabled={data.goals.length === 0}
                                    className="w-full py-5 rounded-2xl bg-white text-black font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    CONTINUAR <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-heading font-black mb-4 tracking-tight italic">
                                    COMPLETA TU <span className="text-brand-red">PERFIL.</span>
                                </h1>
                                <p className="text-muted-foreground text-lg">Necesitamos algunos datos para personalizar tu experiencia.</p>
                            </div>

                            <div className="space-y-6">
                                {/* Fecha de Nacimiento (Obligatorio) */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        <Calendar className="w-4 h-4 text-brand-red" />
                                        Fecha de Nacimiento <span className="text-brand-red">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={data.birthDate}
                                        onChange={(e) => setData({ ...data, birthDate: e.target.value })}
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full p-4 rounded-2xl border border-border bg-card text-foreground outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Usaremos tu edad para estadísticas y te felicitaremos en tu cumpleaños 🎂
                                    </p>
                                </div>

                                {/* Teléfono (Opcional) */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        Número de Teléfono <span className="text-muted-foreground text-xs font-normal">(Opcional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData({ ...data, phone: e.target.value })}
                                        placeholder="+34 600 000 000"
                                        className="w-full p-4 rounded-2xl border border-border bg-card text-foreground outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all placeholder:text-muted-foreground"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Te ayudará a gestionar tu membresía en el gimnasio
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8">
                                <button
                                    onClick={handleFinish}
                                    disabled={!data.birthDate}
                                    className="w-full py-5 rounded-2xl bg-white text-black font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    COMPLETAR <Sword className="w-6 h-6" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Floating Visual Accent */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
                <Activity className="w-3 h-3" /> Tu progreso comienza ahora
            </div>
        </div>
    );
}
