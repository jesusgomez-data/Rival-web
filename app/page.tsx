"use client";

import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Activity, TrendingUp, Users, Zap, CheckCircle2,
    ArrowRight, Globe, Shield, Rocket, Flame,
    LayoutDashboard, MessageCircle, Calendar,
    Cpu, Target, BarChart, ZapOff
} from "lucide-react";
import DemoModal from "@/components/DemoModal";
import { useLanguage } from "./LanguageContext";
import { translations } from "@/utils/i18n";
import Image from "next/image";

export default function LandingPage() {
    const [viewMode, setViewMode] = useState<'choice' | 'athlete' | 'business'>('choice');
    const [isMounted, setIsMounted] = useState(false);
    const [showDemo, setShowDemo] = useState(false);
    const [demoType, setDemoType] = useState<'athlete' | 'center'>('athlete');
    const { language, setLanguage } = useLanguage();
    const t = translations[language];

    // Scroll state for hiding navbar
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < 50) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="min-h-screen bg-black" />;

    return (
        <main className="min-h-screen bg-[#050505] text-white selection:bg-brand-red selection:text-white overflow-x-hidden font-outfit relative">

            {/* Tech Background Layers */}
            <div className="fixed inset-0 z-0 bg-grid-tech opacity-20 pointer-events-none" />
            <div className="fixed inset-0 z-0 bg-noise opacity-5 pointer-events-none" />
            <div className="fixed inset-0 z-0 scanline opacity-[0.03] pointer-events-none" />

            {/* Navigation */}
            <motion.nav 
                initial={{ y: 0 }}
                animate={{ y: isVisible ? 0 : -100 }}
                transition={{ duration: 0.3 }}
                className="fixed top-0 left-0 right-0 z-50 p-4 md:px-12 md:py-8 flex justify-between items-center bg-transparent backdrop-blur-md border-b border-white/[0.03]"
            >
                <div className="flex items-center gap-12">
                    <button
                        onClick={() => setViewMode('choice')}
                        className="group flex items-center gap-3 transition-all"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand-red blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="relative w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                                <Zap className="text-white fill-white w-6 h-6" />
                            </div>
                        </div>
                        <span className="font-heading font-black text-2xl italic tracking-tighter uppercase text-white hidden sm:inline-block">
                            RIVAL <span className="text-brand-red">FIT</span>
                        </span>
                    </button>

                    <div className="hidden lg:flex items-center gap-10">
                        <button onClick={() => setViewMode('athlete')} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em] ${viewMode === 'athlete' ? 'text-brand-red' : 'text-white/30 hover:text-white'}`}>[ ÁREA ATLETA ]</button>
                        <button onClick={() => setViewMode('business')} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:tracking-[0.4em] ${viewMode === 'business' ? 'text-brand-orange' : 'text-white/30 hover:text-white'}`}>[ CENTROS PRO ]</button>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8">
                    {/* Language Switcher Tech Style */}
                    <div className="hidden xs:flex bg-white/5 border border-white/10 rounded-sm overflow-hidden">
                        <button
                            onClick={() => setLanguage('es')}
                            className={`px-3 py-1 text-[9px] font-black transition-all ${language === 'es' ? 'bg-brand-red text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            ES
                        </button>
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1 text-[9px] font-black transition-all ${language === 'en' ? 'bg-brand-red text-white' : 'text-white/30 hover:text-white/60'}`}
                        >
                            EN
                        </button>
                    </div>

                    <Link
                        href="/login"
                        id="login-button"
                        className="relative group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-brand-red translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <div className="relative border border-brand-red/50 px-6 py-2.5 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] group-hover:text-white transition-colors">
                            INICIAR SESIÓN
                        </div>
                    </Link>
                </div>
            </motion.nav>

            <AnimatePresence mode="wait">
                {viewMode === 'choice' && <ChoiceView key="choice" onSelect={setViewMode} />}
                {viewMode === 'athlete' && <AthleteLanding key="athlete" onGoBack={() => setViewMode('choice')} onOpenDemo={() => { setDemoType('athlete'); setShowDemo(true); }} />}
                {viewMode === 'business' && <BusinessLanding key="business" onGoBack={() => setViewMode('choice')} onOpenDemo={() => { setDemoType('center'); setShowDemo(true); }} />}
            </AnimatePresence>

            {/* Futuristic Tech Footer */}
            <footer className="relative z-10 py-12 border-t border-white/[0.03] bg-black/40 backdrop-blur-md">
                <div className="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-8 text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                    <div className="flex items-center gap-4">
                        <Zap className="text-brand-red w-3 h-3" />
                        <span className="italic">RIVAL FIT © 2026</span>
                    </div>
                    <div className="flex gap-10">
                        <Link href="/legal/notice" className="text-white/30 hover:text-white transition-all">LEGAL</Link>
                        <Link href="/legal/privacy" className="text-white/30 hover:text-white transition-all">PRIVACIDAD</Link>
                        <Link href="/legal/support" className="text-white/30 hover:text-white transition-all">SOPORTE</Link>
                        <Link href="/legal/terms" className="text-white/30 hover:text-white transition-all">TERMINOS</Link>
                    </div>
                    <div className="italic flex items-center gap-2">
                        <Globe className="w-3 h-3" /> COMUNIDAD GLOBAL
                    </div>
                </div>
            </footer>

            {/* Global Demo Modal */}
            <AnimatePresence>
                {showDemo && (
                    <DemoModal
                        initialView={demoType}
                        onClose={() => setShowDemo(false)}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}

function ChoiceView({ onSelect }: { onSelect: (mode: 'athlete' | 'business') => void }) {
    return (
        <div className="relative h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-black">
            {/* Athlete Half */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onSelect('athlete')}
                className="group relative flex-1 h-1/2 lg:h-full cursor-pointer overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5 transition-all duration-700 ease-in-out"
                whileHover={{ flex: 1.8 }}
            >
                <div className="absolute inset-0 z-0 bg-[#030303]">
                    <motion.img
                        src="/assets/athlete-choice.png"
                        alt="Athlete"
                        className="w-full h-full object-cover opacity-30 grayscale scale-110 transition-all duration-1000 group-hover:grayscale-0 group-hover:opacity-60"
                        whileHover={{ scale: 1 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none transition-all group-hover:from-brand-red/10" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-end lg:justify-end p-8 lg:p-20 space-y-4 lg:space-y-6 pb-16 lg:pb-20">
                    <h2 className="text-4xl lg:text-[100px] font-black italic uppercase tracking-tighter leading-[0.85] text-white">
                        SOY <br /><span className="text-brand-red">ATLETA.</span>
                    </h2>
                    <p className="max-w-xs lg:max-w-md text-white/70 font-medium font-inter tracking-wide text-sm lg:text-base leading-relaxed">
                        Registra tus entrenamientos, compite en leaderboards globales y conecta con tu comunidad.
                    </p>
                    <div className="flex items-center gap-4 text-white font-black uppercase tracking-[0.3em] text-[10px] pt-4 group-hover:translate-x-4 transition-transform font-outfit">
                        <span className="w-12 h-px bg-brand-red" /> ACCEDER A MI PERFIL
                    </div>
                </div>
            </motion.div>

            {/* Business Half */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => onSelect('business')}
                className="group relative flex-1 h-1/2 lg:h-full cursor-pointer overflow-hidden transition-all duration-700 ease-in-out"
                whileHover={{ flex: 1.8 }}
            >
                <div className="absolute inset-0 z-0 bg-[#030303]">
                    <motion.img
                        src="/assets/center-choice.png"
                        alt="Gym"
                        className="w-full h-full object-cover opacity-30 grayscale scale-110 transition-all duration-1000 group-hover:grayscale-0 group-hover:opacity-60"
                        whileHover={{ scale: 1 }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-l from-black via-black/60 to-transparent pointer-events-none transition-all group-hover:from-brand-orange/10" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-end lg:justify-end items-end p-8 lg:p-20 space-y-4 lg:space-y-6 text-right pb-16 lg:pb-20">
                    <h2 className="text-4xl lg:text-[100px] font-black italic uppercase tracking-tighter leading-[0.85] text-white">
                        SOY <br /><span className="text-brand-orange">CENTRO.</span>
                    </h2>
                    <p className="max-w-xs lg:max-w-md text-white/70 font-medium font-inter tracking-wide text-sm lg:text-base leading-relaxed">
                        Gestiona tu box, monitorea métricas en tiempo real y potencia tu marca.
                    </p>
                    <div className="flex items-center gap-4 text-white font-black uppercase tracking-[0.3em] text-[10px] pt-4 group-hover:-translate-x-4 transition-transform font-outfit">
                        GESTIONAR MI CENTRO <span className="w-12 h-px bg-brand-orange" />
                    </div>
                </div>
            </motion.div>

            {/* Mobile Footer Links */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-8 lg:hidden">
                <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors">LOGIN</Link>
                <Link href="/signup" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors">SIGNUP</Link>
            </div>
        </div>
    );
}

function AthleteLanding({ onGoBack, onOpenDemo }: { onGoBack: () => void, onOpenDemo: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="pt-32 pb-20 space-y-32 lg:space-y-48"
        >
            {/* Athlete Hero */}
            <section className="container mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
                <div className="space-y-8 lg:space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Flame className="text-brand-red w-5 h-5 animate-pulse" />
                            <span className="text-brand-red font-black uppercase tracking-[0.4em] text-[10px]">SUPERA TU AYER</span>
                        </div>
                        <h1 className="text-6xl lg:text-[140px] font-black italic uppercase tracking-tighter leading-[0.8] text-white font-outfit">
                            TU ARENA. <br /><span className="text-brand-red text-neon-red">TU RIVAL.</span>
                        </h1>
                    </div>
                    <p className="max-w-xl text-lg lg:text-2xl text-white/70 font-medium font-inter tracking-tight leading-relaxed">
                        La red social definitiva para atletas. Registra tus WODs, compite en los leaderboards globales y conecta con centros de élite.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                        <Link href="/signup" className="group relative px-10 py-5 bg-brand-red text-white flex items-center justify-center gap-4 overflow-hidden transition-all active:scale-95 shadow-2xl shadow-brand-red/20">
                            <span className="relative z-10 font-black uppercase tracking-[0.3em] text-[10px]">EMPEZAR_AHORA</span>
                            <Zap className="relative z-10 w-4 h-4 fill-white" />
                        </Link>
                        <button
                            onClick={onOpenDemo}
                            className="px-10 py-5 border border-white/10 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-4 group"
                        >
                            <span>VER_APP_EN_VIVO</span>
                            <div className="w-2 h-2 rounded-full bg-brand-red group-hover:animate-ping" />
                        </button>
                    </div>
                </div>

                {/* HTML/CSS-Based App Dashboard Mockup (ATHLETE RED VERSION) */}
                <div className="relative group">
                    <div className="absolute -inset-10 bg-brand-red/5 blur-[120px] rounded-full" />
                    <motion.div
                        whileHover={{ rotateY: 3, rotateX: -3 }}
                        className="relative z-10 w-full max-w-lg mx-auto bg-[#030303] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex min-h-[450px]"
                    >
                        {/* Athlete Sidebar Mini */}
                        <div className="w-12 border-r border-white/5 bg-black/40 flex flex-col items-center py-6 gap-6">
                            <div className="w-6 h-6 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-[8px] font-black text-brand-red italic">A</div>
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`w-3 h-3 rounded-sm border ${i === 0 ? 'bg-brand-red border-brand-red' : 'border-white/20'}`} />
                            ))}
                        </div>

                        {/* Athlete Content Area */}
                        <div className="flex-1 p-6 lg:p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="text-[8px] text-brand-red font-black tracking-[0.2em] uppercase italic">ESTADÍSTICAS REALES</div>
                                    <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">TU RENDIMIENTO</h3>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-xs font-black italic text-brand-red shadow-glow-red">JD</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl space-y-2">
                                    <div className="text-[7px] font-black text-white/30 uppercase tracking-widest">PERSONAL BEST</div>
                                    <div className="text-2xl font-black italic text-white tracking-tighter">125 KG</div>
                                </div>
                                <div className="bg-[#0a0a0a] border border-white/5 p-4 rounded-xl space-y-2">
                                    <div className="text-[7px] font-black text-white/30 uppercase tracking-widest">RANKING GLOBAL</div>
                                    <div className="text-2xl font-black italic text-brand-red tracking-tighter">TOP 30</div>
                                </div>
                            </div>

                            {/* Performance Stream */}
                            <div className="bg-[#0a0a0a] border border-white/5 p-5 rounded-xl space-y-4">
                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                    <span className="text-white/40">PROGRESO SEMANAL</span>
                                    <span className="text-brand-red">+12% ESTA SEMANA</span>
                                </div>
                                <div className="flex items-end h-24 gap-1.5">
                                    {[30, 50, 40, 80, 60, 90, 70].map((h, i) => (
                                        <div key={i} className="flex-1 relative group/bar">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${h}%` }}
                                                className={`w-full rounded-t-sm transition-all ${i === 5 ? 'bg-brand-red shadow-glow-red' : 'bg-white/10 group-hover/bar:bg-white/20'}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <div className="flex gap-4">
                                        <div className="space-y-0.5">
                                            <div className="text-[6px] font-black text-white/20 uppercase">STREAK ACTUAL</div>
                                            <div className="text-[10px] font-black italic text-white">14 DÍAS</div>
                                        </div>
                                        <div className="space-y-0.5 border-l border-white/5 pl-4">
                                            <div className="text-[6px] font-black text-white/20 uppercase">WODS TOTALES</div>
                                            <div className="text-[10px] font-black italic text-white">+42</div>
                                        </div>
                                    </div>
                                    <Zap className="w-4 h-4 text-brand-red" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Main Features Grid: Detail and Utility */}
            <section className="container mx-auto px-6 lg:px-12 space-y-24">
                <div className="text-center space-y-6 max-w-3xl mx-auto">
                    <h2 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter">EL ECOSISTEMA <span className="text-brand-red">DEFINITIVO.</span></h2>
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs lg:text-sm">Rival Fit no es solo una app, es tu diario de batalla, tu comunidad y tu radar de entrenamiento sincronizado en una sola interfaz de alto rendimiento.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {[
                        {
                            title: "DIARIO DE ENTRENAMIENTO",
                            icon: Activity,
                            desc: "Documenta cada repetición y cada gramo. Nuestro sistema de registro está diseñado para la máxima velocidad durante el box.",
                            tags: ["Wods", "PRs", "Récords"]
                        },
                        {
                            title: "MAPA DE GIMNASIOS",
                            icon: Globe,
                            desc: "Encuentra centros oficiales Rival Fit en cualquier ciudad. Haz check-in y entrena como un local estés donde estés.",
                            tags: ["Mapa", "Check-in", "Boxes"]
                        },
                        {
                            title: "RANKING MUNDIAL",
                            icon: TrendingUp,
                            desc: "Compite en rankings diarios. Filtra por edad, peso o categoría y descubre tu posición real en la comunidad.",
                            tags: ["Ranking", "Niveles", "Comunidad"]
                        },
                        {
                            title: "CONEXIÓN SOCIAL",
                            icon: MessageCircle,
                            desc: "Sigue a tus rivales, comenta sus logros y mantén la motivación alta con un feed diseñado para atletas.",
                            tags: ["Muro", "Mensajes", "Comunidad"]
                        },
                        {
                            title: "HISTORIAS EN VIVO",
                            icon: Zap,
                            desc: "Comparte tus momentos más intensos del día. Historias de 24 horas para mostrar tu esfuerzo diario.",
                            tags: ["Vídeo", "Momentos", "24h"]
                        },
                        {
                            title: "ANÁLISIS DE PROGRESO",
                            icon: Target,
                            desc: "Visualiza tu evolución con gráficos de volumen, intensidad y frecuencia. Datos reales para mejorar tus resultados.",
                            tags: ["Progreso", "Gráficos", "Evolución"]
                        }
                    ].map((item, i) => (
                        <div key={i} className="group relative bg-[#050505] border border-white/5 p-8 lg:p-10 rounded-[2rem] hover:border-brand-red/30 transition-all duration-500 overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                <item.icon className="w-20 h-20 text-brand-red" />
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div className="w-12 h-12 bg-brand-red/10 border border-brand-red/20 rounded-xl flex items-center justify-center text-brand-red">
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white group-hover:text-brand-red transition-colors">{item.title}</h4>
                                    <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest leading-relaxed italic">{item.desc}</p>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    {item.tags.map(tag => (
                                        <span key={tag} className="text-[7px] font-black text-white/20 border border-white/10 px-2 py-1 rounded bg-white/[0.02] uppercase tracking-[0.2em]">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Interactive Demo Section: Feed */}
            <section className="container mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="order-2 lg:order-1 relative">
                    {/* HTML Phone Mockup: High-Fi Feed Preview */}
                    <div className="w-[300px] h-[620px] mx-auto bg-black border-[10px] border-white/5 rounded-[3.5rem] shadow-[0_0_100px_rgba(255,0,0,0.15)] relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-black rounded-b-2xl z-40 border-x border-b border-white/5" />
                        <div className="flex-1 overflow-y-auto p-4 pt-12 space-y-6 scrollbar-hide">
                            <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex-shrink-0 w-14 h-14 rounded-full border-2 border-brand-red p-1 bg-black shadow-glow-red/20 opacity-80 group">
                                        <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-[8px] font-black text-brand-red">U{i}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-[#050505] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                                <div className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-[10px] font-black italic text-brand-red">R</div>
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-black italic text-white leading-none">RIVAL_USER_92</div>
                                        <div className="text-[7px] font-bold text-white/30 uppercase tracking-widest">Hace 4m • BOX_VERIFICADO</div>
                                    </div>
                                </div>
                                <div className="aspect-[4/5] bg-[#0a0a0a] flex flex-col items-center justify-center border-y border-white/5 relative overflow-hidden group">
                                    <Flame className="w-16 h-16 text-brand-red/20 animate-pulse" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                                        <div className="space-y-2">
                                            <div className="flex gap-2 items-center">
                                                <Zap className="w-3 h-3 text-brand-red fill-brand-red" />
                                                <span className="text-[11px] font-black italic uppercase text-white shadow-glow-red">PR: 125 kg MURPH</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="px-2 py-1 bg-white/5 rounded text-[7px] font-black text-white/60 uppercase">#COMPETIR</div>
                                                <div className="px-2 py-1 bg-white/5 rounded text-[7px] font-black text-white/60 uppercase">#BOX_RIVAL</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-brand-red" /><span className="text-[10px] font-black tracking-tighter">1.2K</span></div>
                                        <div className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4 text-white/20" /><span className="text-[10px] font-black tracking-tighter">84</span></div>
                                    </div>
                                    <BarChart className="w-4 h-4 text-white/40" />
                                </div>
                            </div>
                        </div>
                        <div className="h-20 border-t border-white/5 bg-black/80 backdrop-blur-md flex justify-around items-center px-4 pb-2">
                            <LayoutDashboard className="w-5 h-5 text-brand-red" />
                            <Users className="w-5 h-5 text-white/20" />
                            <div className="w-12 h-12 rounded-full bg-brand-red flex items-center justify-center shadow-glow-red -mt-10 border-4 border-black group active:scale-90 transition-all"><Zap className="w-6 h-6 text-white fill-white" /></div>
                            <Globe className="w-5 h-5 text-white/20" />
                            <Target className="w-5 h-5 text-white/20" />
                        </div>
                    </div>
                </div>

                <div className="order-1 lg:order-2 space-y-12">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-brand-red" />)}
                        </div>
                        <h2 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.85]">
                            CONEXIÓN <br /> <span className="text-brand-red">SIN FILTROS.</span>
                        </h2>
                        <p className="max-w-xl text-white/40 font-bold uppercase tracking-widest text-sm leading-relaxed italic">
                            La red social que te impulsa a ser mejor. Conecta con otros atletas, comparte tus entrenamientos y mantén el fuego encendido con una comunidad que entiende tu esfuerzo.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {[
                            { title: "SINCRO_TOTAL", detail: "Todo tu historial de entrenamiento en el bolsillo, accesible y analizado." },
                            { title: "LOGROS_RIVAL", detail: "Gana insignias por tus hitos y desbloquea reconocimiento en la comunidad." },
                            { title: "SEGURIDAD", detail: "Control total sobre quién ve tu progreso y tus datos de rendimiento." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-6 items-start group">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg group-hover:border-brand-red transition-all">
                                    <CheckCircle2 className="w-5 h-5 text-brand-red" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-black italic uppercase tracking-widest text-white">{item.title}</h4>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em] leading-relaxed italic max-w-sm">{item.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Ranking & Discovery Section */}
            <section className="container mx-auto px-6 lg:px-12 bg-white/[0.02] border border-white/5 rounded-[4rem] py-20 lg:py-32 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-red/5 blur-[120px] rounded-full translate-x-1/2" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <h2 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] text-white">
                                EXPLORA <br /><span className="text-brand-red text-neon-red">BOXES RIVAL.</span>
                            </h2>
                            <p className="max-w-xl text-lg text-white/40 font-bold uppercase tracking-tight leading-relaxed italic">
                                Encuentra gimnasios colaboradores en el radar global. Registra tus entrenamientos directamente en los centros verificados y sincroniza tu perfil instantáneamente con el sistema del box.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link href="/signup" className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-[10px] hover:bg-brand-red hover:text-white transition-all italic flex items-center gap-4 group shadow-xl">
                                <Globe className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" /> LOCALIZAR_BOXES
                            </Link>
                            <Link href="/signup" className="px-10 py-5 border border-white/20 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all italic">REGISTRARME_GRATIS</Link>
                        </div>
                    </div>

                    <div className="relative bg-[#050505] border border-white/10 p-6 lg:p-10 rounded-[2.5rem] shadow-3xl">
                        {/* Mock Leaderboard for real info (COMMAND CENTER STYLE) */}
                        <div className="space-y-8">
                            <div className="flex justify-between items-end border-b border-white/5 pb-6">
                                <div className="space-y-1">
                                    <div className="text-[8px] text-brand-red font-black tracking-widest uppercase italic border-l-2 border-brand-red pl-2">DATABASE_QUERY // LIGA_DIAMANTE</div>
                                    <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">LEADERBOARD_NACIONAL</h3>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse mb-1" />
                            </div>
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex justify-between items-center p-5 bg-white/[0.03] border border-white/5 rounded-2xl group hover:border-brand-red/30 transition-all">
                                        <div className="flex items-center gap-6">
                                            <span className="text-sm font-black italic text-brand-red/40 group-hover:text-brand-red transition-colors">0{i}</span>
                                            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-black">ATH{i}</div>
                                            <span className="text-xs font-black uppercase italic tracking-widest text-white/80">USUARIO_RIVAL_{i}42</span>
                                        </div>
                                        <span className="text-lg font-black italic text-brand-red tracking-tighter">{1200 - i * 45} EXP</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center px-2 pt-4 opacity-20">
                                <span className="text-[7px] font-black uppercase tracking-[0.5em] text-white">RANKING_SISTEMA_V.4.2</span>
                                <span className="text-[7px] font-black uppercase tracking-[0.5em] text-white">UPTIME: 99.9%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </motion.div>
    );
}

function BusinessLanding({ onGoBack, onOpenDemo }: { onGoBack: () => void, onOpenDemo: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="pt-32 pb-20 space-y-32 lg:space-y-48"
        >
            {/* Business Hero */}
            <section className="container mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
                <div className="order-2 lg:order-1 relative">
                    <div className="absolute -inset-4 bg-brand-orange/10 blur-[100px] rounded-full group-hover:bg-brand-orange/20 transition-all" />
                    <motion.div
                        whileHover={{ rotateY: -3, rotateX: 3 }}
                        className="relative z-10 w-full bg-[#030303] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex min-h-[500px]"
                    >
                        {/* Real Sidebar Mockup */}
                        <div className="w-16 border-r border-white/5 bg-black/40 flex flex-col items-center py-6 gap-8">
                            <div className="w-8 h-8 bg-brand-orange/20 border border-brand-orange/40 rounded flex items-center justify-center text-[10px] font-black text-brand-orange italic">RC</div>
                            <div className="flex flex-col gap-6">
                                {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="flex flex-col items-center gap-1 opacity-20 hover:opacity-100 transition-opacity">
                                        <div className={`w-4 h-4 rounded-sm border ${i === 0 ? 'bg-brand-orange border-brand-orange' : 'border-white/40'}`} />
                                        <span className="text-[6px] font-black text-white/40 uppercase">SEC_{i}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Dashboard Area */}
                        <div className="flex-1 p-6 lg:p-10 space-y-8 bg-dot-grid-sm">
                            {/* Real Header Layout */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="text-[9px] text-brand-orange font-black tracking-[0.3em] uppercase italic">MODULE://CENTRO_GESTION</div>
                                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter">RED_OPERATIVA</h3>
                                </div>
                                <div className="flex gap-3">
                                    <div className="hidden sm:flex px-4 py-2 border border-white/10 rounded bg-white/[0.02] text-[8px] font-black text-white/40 uppercase tracking-widest items-center">DOWNLOAD_LOGS</div>
                                    <div className="px-4 py-2 bg-brand-orange rounded text-[8px] font-black text-white uppercase tracking-widest flex items-center shadow-glow-orange">+ NUEVO_REGISTRO</div>
                                </div>
                            </div>

                            {/* Triple Stat Stream */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'TRÁFICO_ATLETAS', val: '842', trend: '+12.4% VS_PREV_CYCLE' },
                                    { label: 'LEADS_CONVERTIDOS', val: '14', trend: '+24.8% VS_PREV_CYCLE' },
                                    { label: 'RENTABILIDAD_SYNC', val: '€42.2K', trend: '+8.2% VS_PREV_CYCLE' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl space-y-4 hover:border-brand-orange/30 transition-all group">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{stat.label}</span>
                                            <TrendingUp className="w-3 h-3 text-white/10 group-hover:text-brand-orange transition-colors" />
                                        </div>
                                        <div className="text-4xl font-black italic text-white tracking-tighter">{stat.val}</div>
                                        <div className="text-[8px] font-black text-brand-orange flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                                            {stat.trend}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Agenda Mockup */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                                <div className="space-y-4 bg-black/40 border border-white/5 p-6 rounded-2xl">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-white/40">AGENDA_DINÁMICA</span>
                                        <span className="text-brand-orange opacity-40">PROTOCOL_VIEW</span>
                                    </div>
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[11px] font-black text-white italic">{10 + i}:00</span>
                                                    <div className="space-y-0.5">
                                                        <div className="text-[10px] font-black text-white uppercase tracking-tight">WOD_AVANZADO_0{i}</div>
                                                        <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest">COMMANDER_JUAN</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[9px] font-black text-brand-orange uppercase">18/20</div>
                                                    <div className="text-[7px] font-bold text-white/20 uppercase">CAPACITY</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="hidden lg:flex flex-col items-center justify-center border border-white/5 bg-[#080808] rounded-2xl border-dashed opacity-40">
                                    <Cpu className="w-10 h-10 text-white/10 mb-4" />
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">INTEGRACIÓN_SENSORIAL</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="order-1 lg:order-2 space-y-8 lg:space-y-10 group">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Rocket className="text-brand-orange w-4 h-4 group-hover:rotate-12 transition-transform" />
                            <span className="text-brand-orange font-black uppercase tracking-[0.5em] text-[10px]">REVOLUCIÓN_EN_TU_NEGOCIO</span>
                        </div>
                        <h1 className="text-6xl lg:text-[140px] font-black italic uppercase tracking-tighter leading-[0.8] text-white font-outfit">
                            POTENCIA <br /><span className="text-brand-orange shadow-glow-orange">TU BOX.</span>
                        </h1>
                    </div>
                    <p className="max-w-xl text-lg lg:text-2xl text-white/70 font-medium font-inter tracking-tight leading-relaxed">
                        La herramienta definitiva para la gestión de centros deportivos. CRM integrado, gestión de cuotas automática y visibilidad global para atraer más atletas.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                        <Link href="/center-signup" className="group relative px-10 py-5 bg-brand-orange text-white flex items-center justify-center gap-4 overflow-hidden shadow-2xl shadow-brand-orange/20 transition-all active:scale-95">
                            <span className="relative font-black uppercase tracking-[0.3em] text-[10px]">REGISTRAR_MI_CENTRO</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={onOpenDemo}
                            className="px-10 py-5 border border-white/10 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white/5 transition-all flex items-center justify-center gap-4 group"
                        >
                            <span className="relative z-10">EXPLORAR_DASHBOARD</span>
                            <div className="relative z-10 w-2 h-2 rounded-full bg-brand-orange group-hover:animate-ping" />
                        </button>
                    </div>

                    {/* Corrected Center Stats */}
                    <div className="flex gap-12 pt-8 border-t border-white/5">
                        <motion.div whileHover={{ y: -5 }} className="space-y-1">
                            <div className="text-2xl font-black italic">+100</div>
                            <div className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Centros Activos</div>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} className="space-y-1 border-x border-white/5 px-12">
                            <div className="text-2xl font-black italic">98%</div>
                            <div className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Satisfechos</div>
                        </motion.div>
                        <motion.div whileHover={{ y: -5 }} className="space-y-1">
                            <div className="text-2xl font-black italic">24/7</div>
                            <div className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Soporte_Rival</div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Business Features */}
            <section className="container mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 group relative overflow-hidden bg-white/[0.02] border border-white/5 p-8 lg:p-12 rounded-3xl hover:border-brand-orange/30 transition-all">
                        <Shield className="text-brand-orange w-10 h-10 mb-6 group-hover:scale-110 transition-transform" />
                        <h4 className="text-3xl font-black italic uppercase mb-4 tracking-tighter text-brand-orange">GESTIÓN <br /> SEGURA</h4>
                        <p className="text-white/40 font-bold uppercase text-[10px] tracking-[0.2em] leading-relaxed">Control total sobre los perfiles de tus atletas, sus suscripciones y sus progresos. Datos protegidos y accesibles solo para ti y tu equipo.</p>
                        <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-brand-orange/30">BUSINESS_READY</div>
                    </div>
                    {[
                        { title: "CRM INTEGRADO", icon: Users, desc: "Gestiona altas, bajas y pagos recurrentes de forma automática y sin errores." },
                        { title: "VISIBILIDAD", icon: Globe, desc: "Tu centro aparecerá en el radar global de Rival Fit, atrayendo a nuevos atletas locales." },
                    ].map((item, i) => (
                        <div key={i} className="group relative overflow-hidden bg-white/[0.02] border border-white/5 p-8 rounded-3xl hover:border-brand-orange/30 transition-all">
                            <item.icon className="text-brand-orange w-8 h-8 mb-6" />
                            <h4 className="text-xl font-black italic uppercase mb-2">{item.title}</h4>
                            <p className="text-white/30 font-bold uppercase text-[9px] tracking-widest leading-relaxed">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                    <div className="md:col-span-2 group relative overflow-hidden bg-white/[0.02] border border-white/5 p-8 lg:p-12 rounded-3xl hover:border-brand-orange/30 transition-all flex items-center justify-between">
                        <div className="space-y-4 max-w-sm">
                            <h4 className="text-xl font-black italic uppercase text-brand-orange">PAGOS_AUTOMÁTICOS</h4>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">Olvídate de perseguir pagos. Liquidaciones semanalmente directamente a tu cuenta bancaria.</p>
                        </div>
                        <BarChart className="text-brand-orange w-16 h-16 opacity-10 group-hover:opacity-40 transition-opacity" />
                    </div>
                    <div className="md:col-span-2 group relative overflow-hidden bg-white/[0.02] border border-white/5 p-8 lg:p-12 rounded-3xl hover:border-brand-orange/30 transition-all flex items-center justify-between">
                        <div className="space-y-4 max-w-sm">
                            <h4 className="text-xl font-black italic uppercase text-brand-orange">RADAR_RIVAL</h4>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">Potencia la marca de tu gimnasio dentro de la comunidad de atletas más activa.</p>
                        </div>
                        <Globe className="text-brand-orange w-16 h-16 opacity-10 group-hover:opacity-40 transition-opacity" />
                    </div>
                </div>
            </section>
        </motion.div>
    );
}
