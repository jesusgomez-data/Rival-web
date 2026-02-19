"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ChevronRight,
    ChevronLeft,
    Flame,
    Trophy,
    Dumbbell,
    Swords,
    Activity,
    CheckCircle2
} from "lucide-react";

interface TourStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    highlightId?: string;
    position?: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "¡BIENVENIDO A LA ARENA!",
        description: "Rival Fit no es solo una app de entrenamiento, es tu campo de batalla personal. Aquí cada gota de sudor cuenta para tu ranking.",
        icon: <Trophy className="w-12 h-12 text-brand-red" />,
        position: "center"
    },
    {
        title: "FEED DE ACTIVIDAD",
        description: "Aquí verás los entrenamientos de tus rivales. Choca esos puños 👊 y comenta para mantener la motivación alta.",
        icon: <Flame className="w-12 h-12 text-orange-500" />,
        highlightId: "activity-feed",
        position: "bottom"
    },
    {
        title: "LOGEA TU PROGRESO",
        description: "Usa el botón '+' para subir tus entrenamientos, fotos y videos. Si no se registra, no ha pasado.",
        icon: <PlusIcon className="w-12 h-12 text-brand-red" />,
        highlightId: "create-post-btn",
        position: "bottom"
    },
    {
        title: "DUELOS 1VS1",
        description: "¿Crees que eres el que más entrena? Desafía a un amigo a un duelo de 7 días y demuestra quién manda.",
        icon: <Swords className="w-12 h-12 text-brand-red" />,
        highlightId: "duels-section",
        position: "left"
    },
    {
        title: "ESTADÍSTICAS REALES",
        description: "Sigue tus rachas, XP y nivel. Escala en el leaderboard y conviértete en parte del 1%.",
        icon: <Activity className="w-12 h-12 text-purple-500" />,
        highlightId: "stats-grid",
        position: "top"
    }
];

function PlusIcon({ className }: { className?: string }) {
    return (
        <div className={`rounded-xl border-2 border-brand-red flex items-center justify-center p-2 bg-brand-red/10 ${className}`}>
            <span className="text-3xl font-black">+</span>
        </div>
    );
}

export default function DashboardTour({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const nextStep = () => {
        if (step < TOUR_STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(onComplete, 500);
    };

    const currentStep = TOUR_STEPS[step];

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={handleComplete}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg bg-card border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden"
                    >
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 blur-3xl -mr-10 -mt-10" />

                        <button
                            onClick={handleComplete}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-gray-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                            <motion.div
                                key={`icon-${step}`}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-2"
                            >
                                {currentStep.icon}
                            </motion.div>

                            <div className="space-y-4">
                                <motion.h2
                                    key={`title-${step}`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="text-2xl sm:text-3xl font-heading font-black italic tracking-tighter uppercase"
                                >
                                    {currentStep.title}
                                </motion.h2>
                                <motion.p
                                    key={`desc-${step}`}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-muted-foreground text-lg leading-relaxed"
                                >
                                    {currentStep.description}
                                </motion.p>
                            </div>

                            {/* Progress Dots */}
                            <div className="flex gap-2">
                                {TOUR_STEPS.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-brand-red shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "w-1.5 bg-white/10"
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="flex items-center gap-4 w-full pt-4">
                                {step > 0 && (
                                    <button
                                        onClick={prevStep}
                                        className="h-14 px-6 rounded-2xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                )}
                                <button
                                    onClick={nextStep}
                                    className="flex-1 h-14 bg-brand-red hover:bg-brand-accent text-white font-black text-lg uppercase tracking-widest rounded-2xl shadow-glow transition-all flex items-center justify-center gap-2 group"
                                >
                                    {step === TOUR_STEPS.length - 1 ? (
                                        <>Entrar Ahora <CheckCircle2 className="w-5 h-5" /></>
                                    ) : (
                                        <>Siguiente <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
