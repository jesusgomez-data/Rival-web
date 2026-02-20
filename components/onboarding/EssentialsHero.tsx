"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Zap,
    Play,
    Swords,
    Trophy,
    Plus,
    X,
    MessageCircle,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    ArrowRight
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/app/LanguageContext";
import Image from "next/image";
import { clsx } from "clsx";

export default function EssentialsHero() {
    const [isVisible, setIsVisible] = useState(true);
    const [showTutorial, setShowTutorial] = useState(false);
    const { language } = useLanguage();

    if (!isVisible) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-red to-brand-orange p-1 shadow-[0_20px_50px_rgba(239,68,68,0.3)]"
            >
                <div className="bg-black/90 rounded-[31px] p-6 md:p-8 relative overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/20 blur-[100px] -mr-32 -mt-32" />

                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-xl bg-brand-red/20 border border-brand-red/30">
                                <Zap className="w-5 h-5 text-brand-red fill-current" />
                            </div>
                            <h2 className="text-xl font-heading font-black italic tracking-tighter uppercase text-white">
                                {language === 'es' ? 'Guía de Inicio Rápido' : 'Quick Start Guide'}
                            </h2>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4 mb-8">
                            <EssentialItem
                                icon={<Plus className="w-5 h-5" />}
                                title={language === 'es' ? 'Publica' : 'Post'}
                                desc={language === 'es' ? 'Sube tu primer entreno' : 'Log your first workout'}
                                onClick={() => setShowTutorial(true)}
                            />
                            <EssentialItem
                                icon={<Swords className="w-5 h-5" />}
                                title={language === 'es' ? 'Duelo' : 'Duel'}
                                desc={language === 'es' ? 'Reta a un amigo' : 'Challenge a rival'}
                                onClick={() => setShowTutorial(true)}
                            />
                            <EssentialItem
                                icon={<Trophy className="w-5 h-5" />}
                                title={language === 'es' ? 'Leaderboard' : 'Leaderboard'}
                                desc={language === 'es' ? 'Mira tu ranking' : 'Check your global rank'}
                                onClick={() => setShowTutorial(true)}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => setShowTutorial(true)}
                                className="flex-1 bg-brand-red hover:bg-brand-accent text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-glow"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                {language === 'es' ? 'Ver tutorial interactivo' : 'Watch interactive tutorial'}
                            </button>
                            <button className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                                <MessageCircle className="w-4 h-4" />
                                {language === 'es' ? 'Hablar con Soporte' : 'Contact Support'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {showTutorial && (
                    <TutorialModal onClose={() => setShowTutorial(false)} language={language} />
                )}
            </AnimatePresence>
        </>
    );
}

function TutorialModal({ onClose, language }: { onClose: () => void, language: string }) {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: language === 'es' ? 'BIENVENIDO A RIVAL FIT' : 'WELCOME TO RIVAL FIT',
            description: language === 'es'
                ? 'La plataforma definitiva para transformar tu esfuerzo en prestigio. Sigue esta guía para dominar la arena.'
                : 'The ultimate platform to transform your effort into prestige. Follow this guide to master the arena.',
            image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop",
            color: "from-brand-red to-black"
        },
        {
            title: language === 'es' ? 'PUBLICA TUS LOGROS' : 'POST YOUR ACHIEVEMENTS',
            description: language === 'es'
                ? 'Registra tus entrenamientos, sube fotos/videos y comparte tu progreso. ¡Cada sesión te otorga XP!'
                : 'Log your workouts, upload photos/videos and share your progress. Every session earns you XP!',
            image: "https://images.unsplash.com/photo-1541534741688-6078c64b5903?q=80&w=2070&auto=format&fit=crop",
            color: "from-orange-600 to-black"
        },
        {
            title: language === 'es' ? 'DESAFÍA A RIVALES' : 'CHALLENGE RIVALS',
            description: language === 'es'
                ? 'Encuentra a tus amigos y rátalos a duelos de 7 días. El que más entrene, gana los puntos de honor.'
                : 'Find your friends and challenge them to 7-day duels. Whoever trains more wins the honor points.',
            image: "https://images.unsplash.com/photo-1549476464-37392f717551?q=80&w=2070&auto=format&fit=crop",
            color: "from-purple-600 to-black"
        },
        {
            title: language === 'es' ? 'DOMINA EL RANKING' : 'DOMINATE THE RANKING',
            description: language === 'es'
                ? 'Escala desde Recluta hasta General. Tu esfuerzo se refleja en medallas y en el Leaderboard global.'
                : 'Climb from Recruit to General. Your effort is reflected in medals and on the global Leaderboard.',
            image: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?q=80&w=2070&auto=format&fit=crop",
            color: "from-yellow-600 to-black"
        }
    ];

    const next = () => {
        if (step < steps.length - 1) setStep(step + 1);
        else onClose();
    };

    const prev = () => {
        if (step > 0) setStep(step - 1);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-6"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-4xl bg-[#0A0A0A] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col md:flex-row h-[85vh] md:h-auto md:min-h-[500px]"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 p-3 rounded-full bg-black/50 border border-white/10 text-white hover:bg-brand-red transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left side: Content */}
                <div className="flex-1 p-8 md:p-12 flex flex-col justify-center order-2 md:order-1 relative overflow-hidden">
                    {/* Animated background pulse */}
                    <div className={clsx("absolute -bottom-24 -left-24 w-64 h-64 blur-[100px] opacity-20 transition-colors duration-700 bg-gradient-to-br", steps[step].color)} />

                    <div className="relative z-10">
                        <motion.div
                            key={step}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h2 className="text-4xl md:text-5xl font-heading font-black italic uppercase tracking-tighter text-white mb-6 leading-none">
                                {steps[step].title}
                            </h2>
                            <p className="text-lg text-gray-400 font-medium leading-relaxed mb-10 max-w-sm">
                                {steps[step].description}
                            </p>
                        </motion.div>

                        <div className="flex items-center gap-4">
                            {step > 0 && (
                                <button
                                    onClick={prev}
                                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                            )}
                            <button
                                onClick={next}
                                className="flex-1 bg-brand-red hover:bg-brand-accent text-white h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-glow group"
                            >
                                {step === steps.length - 1 ? (
                                    <>
                                        {language === 'es' ? '¡A ENTRENAR!' : 'START TRAINING'}
                                        <CheckCircle2 className="w-5 h-5" />
                                    </>
                                ) : (
                                    <>
                                        {language === 'es' ? 'SIGUIENTE' : 'NEXT'}
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Pagination Dots */}
                        <div className="flex gap-2 mt-10">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={clsx(
                                        "h-1.5 rounded-full transition-all duration-300",
                                        i === step ? "w-8 bg-brand-red" : "w-2 bg-white/10"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right side: Visual (Images) */}
                <div className="flex-1 relative min-h-[250px] md:min-h-full order-1 md:order-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0"
                        >
                            <Image
                                src={steps[step].image}
                                alt="Tutorial"
                                fill
                                className="object-cover"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0A0A0A] via-transparent to-transparent" />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}

function EssentialItem({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-red/30 transition-all group text-left w-full"
        >
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red mb-3 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
            <p className="text-[10px] text-gray-400 font-medium leading-tight uppercase tracking-wider">{desc}</p>
        </button>
    );
}
