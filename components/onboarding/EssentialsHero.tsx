"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLanguage } from "@/app/LanguageContext";
import { clsx } from "clsx";
import Image from "next/image";
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
    ArrowRight,
    Home,
    Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import SupportModal from "@/app/dashboard/gyms/SupportModal";

export default function EssentialsHero() {
    const [isVisible, setIsVisible] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const { language } = useLanguage();
    const router = useRouter();

    useEffect(() => {
        const hidden = localStorage.getItem('rival_essentials_hidden');
        if (!hidden) setIsVisible(true);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('rival_essentials_hidden', 'true');
    };

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
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors z-[50]"
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

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            <EssentialItem
                                icon={<Plus className="w-5 h-5" />}
                                title={language === 'es' ? 'Publica' : 'Post'}
                                desc={language === 'es' ? 'Sube tu primer entreno' : 'Log your first workout'}
                                onClick={() => router.push('/dashboard/training')}
                            />
                            <EssentialItem
                                icon={<Swords className="w-5 h-5" />}
                                title={language === 'es' ? 'Duelo' : 'Duel'}
                                desc={language === 'es' ? 'Reta a un amigo' : 'Challenge a rival'}
                                onClick={() => router.push('/dashboard/community')}
                            />
                            <EssentialItem
                                icon={<Trophy className="w-5 h-5" />}
                                title={language === 'es' ? 'Leaderboard' : 'Leaderboard'}
                                desc={language === 'es' ? 'Mira tu ranking' : 'Check your global rank'}
                                onClick={() => router.push('/dashboard/leaderboard')}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => setShowTutorial(true)}
                                className="flex-1 bg-brand-red hover:bg-brand-accent text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-glow"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                {language === 'es' ? 'Ver video tutorial' : 'Watch video tutorial'}
                            </button>
                            <SupportModal
                                trigger={
                                    <button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer">
                                        <MessageCircle className="w-4 h-4" />
                                        {language === 'es' ? 'Hablar con Soporte' : 'Contact Support'}
                                    </button>
                                }
                            />
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
    const [isPlaying, setIsPlaying] = useState(true);

    const steps = [
        {
            title: language === 'es' ? 'BIENVENIDO A RIVAL' : 'WELCOME TO RIVAL',
            description: language === 'es'
                ? 'Donde el sudor se convierte en prestigio. Domina la arena paso a paso.'
                : 'Where sweat turns into prestige. Master the arena step by step.',
            demo: 'welcome'
        },
        {
            title: language === 'es' ? 'PUBLICA TU GLORIA' : 'POST YOUR GLORY',
            description: language === 'es'
                ? 'Registra tus entrenos con fotos y videos. ¡Cada post suma XP para tu rango!'
                : 'Log your workouts with photos and videos. Every post adds XP to your rank!',
            demo: 'post'
        },
        {
            title: language === 'es' ? 'DUELOS DE RIVALES' : 'RIVAL DUELS',
            description: language === 'es'
                ? 'Retar a un amigo es simple. El que sea más consistente durante 7 días gana honor.'
                : 'Challenging a friend is simple. Whoever is more consistent for 7 days wins honor.',
            demo: 'duel'
        },
        {
            title: language === 'es' ? 'LLEGA A LA CIMA' : 'REACH THE TOP',
            description: language === 'es'
                ? 'Tu progreso te hará escalar en el Leaderboard global. ¡Conviértete en leyenda!'
                : 'Your progress will make you climb the global Leaderboard. Become a legend!',
            demo: 'rank'
        }
    ];

    useEffect(() => {
        if (!isPlaying) return;
        const timer = setTimeout(() => {
            if (step < steps.length - 1) setStep(step + 1);
            else setIsPlaying(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, [step, isPlaying]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4"
        >
            <motion.div
                initial={{ scale: 0.9, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 40 }}
                className="w-full max-w-5xl bg-[#0A0A0A] border border-white/10 rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col md:flex-row h-[90vh] md:h-auto md:min-h-[600px]"
            >
                {/* Header for Mobile */}
                <div className="md:hidden p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">TUTORIAL EN VIVO</span>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500"><X className="w-6 h-6" /></button>
                </div>

                {/* Left Side: Content */}
                <div className="flex-[1.2] p-8 md:p-16 flex flex-col justify-between order-2 md:order-1">
                    <div className="space-y-6">
                        <div className="hidden md:flex items-center gap-3 mb-8">
                            <div className="px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] font-black tracking-widest uppercase flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                                RIVAL LIVE TUTORIAL
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <h2 className="text-4xl md:text-6xl font-heading font-black italic uppercase tracking-tighter text-white leading-[0.9]">
                                    {steps[step].title}
                                </h2>
                                <p className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed max-w-md">
                                    {steps[step].description}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="mt-12 space-y-8">
                        {/* Progress */}
                        <div className="flex gap-2">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden"
                                    onClick={() => { setStep(i); setIsPlaying(false); }}
                                >
                                    {i === step && (
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: isPlaying ? 5 : 0.3, ease: "linear" }}
                                            className="h-full bg-brand-red shadow-glow-sm"
                                        />
                                    )}
                                    {i < step && <div className="h-full w-full bg-brand-red/40" />}
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 bg-white text-black h-14 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all shadow-xl"
                            >
                                {language === 'es' ? 'ENTENDIDO' : 'GOT IT'}
                            </button>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all"
                            >
                                {isPlaying ? <X className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Dynamic Demo */}
                <div className="flex-1 relative bg-gradient-to-br from-brand-red/20 via-black to-black border-l border-white/5 overflow-hidden order-1 md:order-2">
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        {/* Simulated Phone Frame */}
                        <div className="w-full max-w-[280px] aspect-[9/19] bg-[#0F0F0F] rounded-[40px] border-[8px] border-[#1A1A1A] shadow-2xl relative overflow-hidden ring-1 ring-white/10 flex flex-col">
                            {/* App Content Simulation */}
                            <div className="flex-1 p-4 space-y-4">
                                <MockAppUI step={step} />
                            </div>

                            {/* Nav Simulation */}
                            <div className="h-16 bg-black/80 backdrop-blur-md border-t border-white/5 flex items-center justify-around px-4">
                                <Home className="w-5 h-5 text-gray-700" />
                                <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center shadow-glow-sm translate-y-[-10px]">
                                    <Plus className="w-5 h-5 text-white" />
                                </div>
                                <Users className="w-5 h-5 text-gray-700" />
                            </div>

                            {/* Simulated Cursor */}
                            <motion.div
                                animate={getCursorAnimation(step)}
                                className="absolute z-50 pointer-events-none"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 backdrop-blur-md flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white shadow-glow" />
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* Background Visuals */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-red/10 blur-[100px] rounded-full" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-orange/5 blur-[100px] rounded-full" />
                </div>

                {/* Close Button Desktop */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 z-[210] p-3 rounded-full bg-black/50 border border-white/10 text-white hover:bg-brand-red transition-all hidden md:flex"
                >
                    <X className="w-6 h-6" />
                </button>
            </motion.div>
        </motion.div>
    );
}

function MockAppUI({ step }: { step: number }) {
    switch (step) {
        case 0: // Welcome
            return (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-red to-brand-orange flex items-center justify-center shadow-glow"
                    >
                        <Zap className="w-10 h-10 text-white fill-current" />
                    </motion.div>
                    <div className="space-y-2">
                        <div className="h-2 w-24 bg-white/10 rounded-full mx-auto" />
                        <div className="h-1.5 w-32 bg-white/5 rounded-full mx-auto" />
                    </div>
                </div>
            );
        case 1: // Post
            return (
                <div className="space-y-4 pt-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800" />
                        <div className="space-y-1">
                            <div className="h-2 w-16 bg-white/20 rounded-full" />
                            <div className="h-1.5 w-12 bg-white/10 rounded-full" />
                        </div>
                    </div>
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 120 }}
                        className="w-full rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 overflow-hidden flex items-center justify-center"
                    >
                        <Image src="https://images.unsplash.com/photo-1541534741688-6078c64b5903?q=80&w=400" alt="post" fill className="object-cover opacity-60" />
                        <Zap className="w-8 h-8 text-brand-red relative z-10" />
                    </motion.div>
                    <div className="space-y-2">
                        <div className="h-1.5 w-full bg-white/5 rounded-full" />
                        <div className="h-1.5 w-3/4 bg-white/5 rounded-full" />
                    </div>
                </div>
            );
        case 2: // Duel
            return (
                <div className="space-y-6 pt-10">
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full border-2 border-brand-red overflow-hidden relative">
                            <img src="https://ui-avatars.com/api/?name=ME&background=000&color=fff" className="w-full h-full object-cover" />
                        </div>
                        <Swords className="w-6 h-6 text-brand-red" />
                        <div className="w-12 h-12 rounded-full border-2 border-gray-700 overflow-hidden relative">
                            <img src="https://ui-avatars.com/api/?name=Rival&background=333&color=fff" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="bg-brand-red/10 border border-brand-red/20 rounded-2xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="h-2 w-12 bg-brand-red/40 rounded-full" />
                            <div className="h-2 w-10 bg-brand-red rounded-full" />
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: "30%" }}
                                animate={{ width: "70%" }}
                                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                                className="h-full bg-brand-red shadow-glow-sm"
                            />
                        </div>
                    </div>
                </div>
            );
        case 3: // Rank
            return (
                <div className="flex flex-col items-center pt-8 space-y-6 text-center">
                    <div className="relative">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className="w-24 h-24 rounded-full border-2 border-dashed border-brand-red/30"
                        />
                        <Trophy className="w-12 h-12 text-brand-red absolute top-1/2 left-1/2 translate-x-[-50%] translate-y-[-50%]" />
                    </div>
                    <div className="space-y-3 w-full px-4">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-[10px] font-black italic text-brand-red">#1</span>
                            <div className="h-2 w-20 bg-white/20 rounded-full" />
                            <span className="text-[10px] font-black text-white">990 XP</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-brand-red/10 rounded-xl border border-brand-red/20">
                            <span className="text-[10px] font-black italic text-brand-red">#2 TU</span>
                            <div className="h-2 w-16 bg-white/40 rounded-full" />
                            <span className="text-[10px] font-black text-white">920 XP</span>
                        </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
}

function getCursorAnimation(step: number) {
    const coords = [
        { x: 140, y: 150 }, // Welcome - middle
        { x: 140, y: 450 }, // Post - center button
        { x: 140, y: 100 }, // Duel - Search (topish)
        { x: 230, y: 450 }, // Rank - Trophy/Leaderboard tab
    ];
    return {
        x: coords[step].x,
        y: coords[step].y,
        scale: [1, 0.8, 1],
        transition: { duration: 1, repeat: Infinity, repeatDelay: 2 }
    };
}

function EssentialItem({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-red/30 transition-all group text-left w-full relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-20 transition-opacity">
                <ChevronRight className="w-4 h-4 text-brand-red" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red mb-3 group-hover:scale-110 group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                {icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
            <p className="text-[10px] text-gray-400 font-medium leading-tight uppercase tracking-wider">{desc}</p>
        </button>
    );
}
