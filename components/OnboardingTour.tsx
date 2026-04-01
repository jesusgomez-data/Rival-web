"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Rocket, Trophy, Video, MessageSquare, MapPin } from "lucide-react";

const STEPS = [
    {
        title: "¡BIENVENIDO A LA ARENA!",
        description: "Rival Fit es tu centro de mando para el alto rendimiento. Vamos a enseñarte cómo dominar la plataforma.",
        icon: Rocket,
        color: "text-brand-red"
    },
    {
        title: "EDITOR DE VIDEO PRO",
        description: "Crea contenido de impacto. Recorta tus WODs y añade overlays con tus marcas (KG, RPE) para Instagram y TikTok.",
        icon: Video,
        color: "text-blue-500"
    },
    {
        title: "RANKING GLOBAL",
        description: "Compite en los leaderboards nacionales. Sube tus resultados y escala posiciones en la Liga Diamante.",
        icon: Trophy,
        color: "text-yellow-500"
    },
    {
        title: "RADAR DE BOXES",
        description: "Encuentra centros oficiales Rival en el mapa. Registra tu asistencia y sincroniza tus marcas al instante.",
        icon: MapPin,
        color: "text-green-500"
    },
    {
        title: "MENSAJERÍA TÁCTICA",
        description: "Conecta con otros atletas, crea grupos de entrenamiento y desafía a tus rivales directamente.",
        icon: MessageSquare,
        color: "text-purple-500"
    }
];

export default function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasCompleted = localStorage.getItem("rival_tour_completed");
        if (!hasCompleted) {
            setIsVisible(true);
        }
    }, []);

    const handleComplete = () => {
        localStorage.setItem("rival_tour_completed", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    const StepIcon = STEPS[currentStep].icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl"
                >
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                        <motion.div 
                            className="h-full bg-brand-red"
                            initial={{ width: "0%" }}
                            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                        />
                    </div>

                    <button 
                        onClick={handleComplete}
                        className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="p-10 space-y-8">
                        <div className="flex justify-center">
                            <div className={`w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center ${STEPS[currentStep].color}`}>
                                <StepIcon className="w-12 h-12" />
                            </div>
                        </div>

                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">
                                {STEPS[currentStep].title}
                            </h3>
                            <p className="text-white/60 text-lg font-medium leading-relaxed italic">
                                {STEPS[currentStep].description}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <div className="flex gap-2">
                                {STEPS.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentStep ? "bg-brand-red w-4" : "bg-white/10"}`} 
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3">
                                {currentStep > 0 && (
                                    <button
                                        onClick={() => setCurrentStep(prev => prev - 1)}
                                        className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => {
                                        if (currentStep === STEPS.length - 1) {
                                            handleComplete();
                                        } else {
                                            setCurrentStep(prev => prev + 1);
                                        }
                                    }}
                                    className="px-8 py-4 bg-brand-red rounded-2xl text-white font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-brand-red/80 transition-all shadow-glow-red"
                                >
                                    {currentStep === STEPS.length - 1 ? "EMPEZAR AHORA" : "SIGUIENTE"}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
