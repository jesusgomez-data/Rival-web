"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Flame, Building2, X, ArrowRight, Activity, Trophy, LogIn, User, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import { getSavedAccounts, switchToAccount, type SavedAccount } from "@/utils/supabase/multi-account";
import WelcomeBackPanel from "@/components/landing/WelcomeBackPanel";



// Lazy load feature sheets to keep bundle light
const AthleteFeatures = dynamic(() => import("@/components/landing/AthleteFeatures"), { ssr: false });
const CenterFeatures = dynamic(() => import("@/components/landing/CenterFeatures"), { ssr: false });

const LIVE_EVENTS = [
    "⚡ Rival Madrid: 24 check-ins en la última hora",
    "🔥 Carlos D. rompió su PR de Clean & Jerk: 140 kg",
    "🏆 Desafío Semanal: 152 WODs completados hoy",
    "💪 María R. subió su Back Squat a 105 kg",
    "👑 Rival Barcelona: Clase de las 19:00 completa",
    "✨ 142 atletas entrenando en vivo ahora mismo"
];

// High-fidelity animated SVG logo component with outline draw on load, sheen laser sweeps, 3D parallax layers, HUD rings, and sparks
function AnimatedLogo({ className = "w-10 h-10", forceHover = false }: { className?: string; forceHover?: boolean }) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    return (
        <motion.div 
            initial="idle"
            whileHover="hover"
            animate={forceHover ? "hover" : "animate"}
            className={`relative group cursor-pointer flex items-center justify-center overflow-visible ${className}`}
        >
            {/* Pulsing Backglow Layers */}
            <div className={`absolute inset-0 bg-brand-red/15 blur-md rounded-lg transition-all duration-500 ${forceHover ? 'bg-brand-red/35 blur-lg' : 'group-hover:bg-brand-red/35 group-hover:blur-lg'}`} />
            <div className={`absolute inset-1 bg-brand-orange/5 blur-sm rounded-lg transition-all duration-500 ${forceHover ? 'bg-brand-orange/20' : 'group-hover:bg-brand-orange/20'}`} />
            
            {/* Rotating Ring 1 (Inner, Clockwise, Dashed HUD) */}
            <motion.div 
                className={`absolute -inset-2 rounded-full border-2 border-dashed border-brand-red/20 transition-opacity duration-500 pointer-events-none ${forceHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            {/* Rotating Ring 2 (Outer, Counter-Clockwise, Solid Neon) */}
            <motion.div 
                className={`absolute -inset-3.5 rounded-full border border-brand-orange/25 transition-opacity duration-500 pointer-events-none ${forceHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                animate={{ rotate: -360, scale: [1, 1.04, 1] }}
                transition={{ 
                    rotate: { duration: 9, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                }}
            />

            {/* Spark Emitter on Hover */}
            <div className="absolute inset-0 pointer-events-none overflow-visible">
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_8px_#EF4444]"
                        initial={{ opacity: 0, x: 0, y: 0, scale: 0.8 }}
                        variants={{
                            hover: {
                                opacity: [0, 1, 1, 0],
                                x: [
                                    0, 
                                    (i - 2) * 14 + (Math.random() - 0.5) * 8,
                                    (i - 2) * 20 + (Math.random() - 0.5) * 12
                                ],
                                y: [0, -20 - Math.random() * 15, -45 - Math.random() * 25],
                                scale: [0.5, 1.3, 0.4],
                                transition: {
                                    duration: 1.3 + Math.random() * 0.7,
                                    repeat: Infinity,
                                    delay: i * 0.12,
                                    ease: "easeOut"
                                }
                            },
                            idle: { opacity: 0, x: 0, y: 0 }
                        }}
                    />
                ))}
            </div>

            <motion.svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 512 512" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="relative z-10 overflow-visible"
                whileHover={{ scale: 1.15, rotate: [0, -4, 4, 0] }}
                transition={{ type: "spring", stiffness: 350, damping: 12 }}
            >
                <defs>
                    {/* Main Brand Red Gradient */}
                    <linearGradient id="logo-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="50%" stopColor="#DC2626" />
                        <stop offset="100%" stopColor="#B91C1C" />
                    </linearGradient>
                    {/* Shadow Dark Red Gradient */}
                    <linearGradient id="logo-grad-shade" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#991B1B" />
                        <stop offset="100%" stopColor="#7F1D1D" />
                    </linearGradient>
                    {/* Glowing Neon Outline Gradient */}
                    <linearGradient id="logo-grad-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="50%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                    {/* Laser Sweep Shine Gradient */}
                    <motion.linearGradient
                        id="laser-sweep"
                        gradientUnits="userSpaceOnUse"
                        x1="-100%" y1="-100%"
                        x2="0%" y2="0%"
                        initial={{ x1: "-100%", y1: "-100%", x2: "0%", y2: "0%" }}
                        variants={{
                            animate: {
                                x1: ["-100%", "200%"],
                                x2: ["0%", "300%"],
                                transition: {
                                    duration: 3.5,
                                    repeat: Infinity,
                                    repeatDelay: 4.5,
                                    ease: "easeInOut"
                                }
                            },
                            hover: {
                                x1: ["-100%", "200%"],
                                x2: ["0%", "300%"],
                                transition: {
                                    duration: 0.9,
                                    repeat: 0,
                                    ease: "easeInOut"
                                }
                            }
                        }}
                    />
                    {/* Neon Blur Filter for Text */}
                    <filter id="neon-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="7" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Main Red Body Group (Parallax: slides up-right on hover) */}
                <motion.g 
                    transform="translate(38.4, -40) scale(0.85)"
                    variants={{
                        idle: { x: 0, y: 0, scale: 1 },
                        hover: { x: 6, y: -6, scale: 1.02 }
                    }}
                    transition={{ type: "spring", stiffness: 250, damping: 15 }}
                >
                    {/* Outline Draw path on mount */}
                    <motion.path 
                        d="M160 100H280C360 100 390 160 390 210C390 280 340 310 290 310H220L280 412H360L290 310H300C340 310 420 280 420 190C420 110 360 70 260 70H130L100 442H180L160 100Z" 
                        stroke="url(#logo-grad-glow)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        initial={{ pathLength: 0, opacity: 1 }}
                        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                        transition={{ duration: 1.4, ease: "easeInOut" }}
                    />
                    {/* Main filled path */}
                    <motion.path 
                        d="M160 100H280C360 100 390 160 390 210C390 280 340 310 290 310H220L280 412H360L290 310H300C340 310 420 280 420 190C420 110 360 70 260 70H130L100 442H180L160 100Z" 
                        fill="url(#logo-grad-main)"
                        initial={{ fillOpacity: 0 }}
                        animate={{ fillOpacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                    />
                    {/* Laser Sweep Shine Overlay */}
                    <motion.path 
                        d="M160 100H280C360 100 390 160 390 210C390 280 340 310 290 310H220L280 412H360L290 310H300C340 310 420 280 420 190C420 110 360 70 260 70H130L100 442H180L160 100Z" 
                        fill="url(#laser-sweep)"
                        style={{ mixBlendMode: "overlay" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                    />
                </motion.g>

                {/* Shadow shading Group (Parallax: slides down-left on hover) */}
                <motion.g 
                    transform="translate(38.4, -40) scale(0.85)"
                    variants={{
                        idle: { x: 0, y: 0, scale: 1 },
                        hover: { x: -4, y: 4, scale: 0.97 }
                    }}
                    transition={{ type: "spring", stiffness: 250, damping: 15 }}
                >
                    <motion.path 
                        d="M160 100L145 310H220L235 100H160Z" 
                        fill="url(#logo-grad-shade)"
                        initial={{ fillOpacity: 0 }}
                        animate={{ fillOpacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
                    />
                </motion.g>

                {/* FIT text with neon flicker on load and dynamic behavior */}
                <motion.text 
                    x="256" 
                    y="460" 
                    fill={isLight ? "#0F172A" : "#FFFFFF"} 
                    fontFamily="'Arial Black', 'Arial Bold', sans-serif" 
                    fontWeight="900" 
                    fontSize="110" 
                    letterSpacing="4" 
                    textAnchor="middle"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.4, 0.2, 1, 0.8, 1], scale: 1 }}
                    variants={{
                        idle: { fill: isLight ? "#0F172A" : "#FFFFFF", filter: "none", scale: 1, y: 0 },
                        hover: { 
                            fill: "#EF4444", 
                            filter: "url(#neon-glow-filter)", 
                            scale: 1.04, 
                            y: 2,
                            opacity: [1, 0.6, 1, 0.8, 1] // Neon flicker glitch on hover
                        }
                    }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                >
                    FIT
                </motion.text>
            </motion.svg>
        </motion.div>
    );
}

function SplashScreen({ onComplete }: { onComplete: () => void }) {
    useEffect(() => {
        // 1.6s: la animación completa del logo + texto (termina ~0.8s) con un
        // instante de presencia, sin volver a los 2.2s que castigaban la carga
        const timer = setTimeout(() => {
            onComplete();
        }, 1600);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center select-none"
        >
            {/* Ambient background glows */}
            <div className="absolute w-[280px] h-[280px] rounded-full blur-[110px] bg-brand-red/25 opacity-70" />
            <div className="absolute w-[200px] h-[200px] rounded-full blur-[90px] bg-brand-orange/15 opacity-50" />

            <div className="relative flex flex-col items-center gap-6">
                {/* Large animated logo with auto hover glow/rings active */}
                <AnimatedLogo className="w-24 h-24 sm:w-28 sm:h-28" forceHover={true} />
                
                {/* Logo Text under */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="flex flex-col items-center mt-3"
                >
                    <span className="font-heading font-black text-xl sm:text-2xl italic tracking-[0.25em] uppercase text-white">
                        RIVAL <span className="text-brand-red">FIT</span>
                    </span>
                    {/* Sporty glowing loader bar */}
                    <div className="w-20 h-[2px] bg-white/10 rounded-full mt-5 overflow-hidden relative">
                        <motion.div 
                            initial={{ left: "-100%" }}
                            animate={{ left: "100%" }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 1.4, 
                                ease: "easeInOut" 
                            }}
                            className="absolute top-0 bottom-0 w-1/2 bg-brand-red shadow-[0_0_8px_#EF4444]"
                        />
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default function UnifiedLanding() {
    const [activeSheet, setActiveSheet] = useState<'athlete' | 'center' | null>(null);
    const [showSplash, setShowSplash] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    // "Continuar como..." — solo para quien YA tiene sesión guardada en este
    // navegador (multi-cuenta: login/page.tsx guarda cada sesión en
    // localStorage al iniciar sesión). Quien no tiene cuenta ve la landing
    // exactamente igual que antes; esto no reemplaza nada para ellos.
    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
    const [accountCenters, setAccountCenters] = useState<Record<string, { id: string; name: string }>>({});
    const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);

    useEffect(() => {
        const accounts = getSavedAccounts();
        if (accounts.length === 0) return;
        setSavedAccounts(accounts);

        // Por cada cuenta guardada, ver si esa persona es dueña de algún
        // centro/box — para poder ofrecer "Entrar a {Nombre del Centro}"
        // además de "Entrar como @usuario".
        (async () => {
            const { data: orgs } = await supabase
                .from('organizations')
                .select('id, name, owner_id')
                .in('owner_id', accounts.map(a => a.userId));
            if (!orgs) return;
            const map: Record<string, { id: string; name: string }> = {};
            for (const org of orgs) {
                map[org.owner_id] = { id: org.id, name: org.name };
            }
            setAccountCenters(map);
        })();
    }, []);

    const handleContinueAs = async (userId: string, destination: 'dashboard' | string) => {
        setSwitchingAccountId(userId);
        try {
            const ok = await switchToAccount(userId);
            if (ok) {
                router.push(destination === 'dashboard' ? '/dashboard' : `/dashboard/gyms/${destination}`);
            } else {
                setSwitchingAccountId(null);
                router.push('/login');
            }
        } catch {
            setSwitchingAccountId(null);
            router.push('/login');
        }
    };

    // Splash solo la primera vez por sesión (volver a la landing = entrada directa)
    useEffect(() => {
        try {
            if (sessionStorage.getItem('rival-splash-seen')) {
                setShowSplash(false);
            } else {
                sessionStorage.setItem('rival-splash-seen', '1');
            }
        } catch { /* modo privado sin storage: splash normal */ }
    }, []);

    // Live Ticker State
    const [tickerIndex, setTickerIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setTickerIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    // Live Database Stats
    const [stats, setStats] = useState<{ athletes: number; centers: number; wods: number } | null>(null);
    useEffect(() => {
        async function fetchStats() {
            try {
                const [{ count: pCount }, { count: oCount }, { count: wCount }] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }),
                    supabase.from('organizations').select('id', { count: 'exact', head: true }),
                    supabase.from('wod_completions').select('id', { count: 'exact', head: true })
                ]);
                setStats({
                    athletes: pCount || 0,
                    centers: oCount || 0,
                    wods: wCount || 0
                });
            } catch (err) {
                console.error("Error fetching landing stats:", err);
            }
        }
        fetchStats();
    }, []);

    // Interactive mouse positioning for global spotlight
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const handleGlobalMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    // Card 3D tilt
    const [cardTilt, setCardTilt] = useState({ rx: 0, ry: 0 });
    const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        setCardTilt({
            rx: -(y / (rect.height / 2)) * 6, // Max 6 degrees rotation
            ry: (x / (rect.width / 2)) * 6,
        });
    };
    const handleCardMouseLeave = () => {
        setCardTilt({ rx: 0, ry: 0 });
    };

    // Mockup 3D tilt
    const [mockupTilt, setMockupTilt] = useState({ rx: 0, ry: 0 });
    const handleMockupMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        setMockupTilt({
            rx: -(y / (rect.height / 2)) * 8, // Max 8 degrees rotation
            ry: (x / (rect.width / 2)) * 8,
        });
    };
    const handleMockupMouseLeave = () => {
        setMockupTilt({ rx: 0, ry: 0 });
    };

    // Check active session for redirect
    useEffect(() => {
        async function checkSession() {
            const { data } = await supabase.auth.getSession();
            if (data.session) router.replace('/dashboard');
        }
        checkSession();
    }, []);

    return (
        <>
            <AnimatePresence mode="wait">
                {showSplash && (
                    <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
                )}
            </AnimatePresence>

            <main 
                onMouseMove={handleGlobalMouseMove}
                className="h-[100svh] w-screen bg-white dark:bg-[#030303] text-slate-900 dark:text-white selection:bg-brand-red selection:text-white font-sans overflow-hidden relative flex flex-col justify-between p-2.5 pt-[max(0.875rem,env(safe-area-inset-top))] xs:p-4 xs:pt-[max(1rem,env(safe-area-inset-top))] sm:p-6 md:p-12"
            >
                {/* Global Tech Background */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-noise opacity-[0.03]" />
                    <div className="absolute inset-0 bg-grid-tech opacity-[0.08]" />
                    {/* Dynamic Mouse Spotlight Glow */}
                    <div 
                        className="absolute inset-0 z-0 transition-opacity duration-500 opacity-80"
                        style={{
                            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(239, 68, 68, 0.08), transparent 80%)`
                        }}
                    />
                    
                    {/* Floating Particles — pseudo-random determinista por índice para
                        que servidor y cliente rendericen idéntico (evita hydration mismatch) */}
                    {Array.from({ length: 15 }).map((_, i) => {
                        const rand = (n: number) => {
                            const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
                            return x - Math.floor(x);
                        };
                        return (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 rounded-full bg-brand-red/25"
                                style={{
                                    top: `${rand(1) * 100}%`,
                                    left: `${rand(2) * 100}%`,
                                }}
                                animate={{
                                    y: [0, -60, 0],
                                    x: [0, rand(3) * 40 - 20, 0],
                                    opacity: [0.1, 0.7, 0.1],
                                    scale: [1, 1.8, 1],
                                }}
                                transition={{
                                    duration: 8 + rand(4) * 10,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: rand(5) * 5,
                                }}
                            />
                        );
                    })}

                    {/* Aurora Glows */}
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, -10, 0] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[10%] right-[10%] w-[350px] h-[350px] rounded-full blur-[120px] bg-brand-red/15"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], x: [0, -20, 0], y: [0, 15, 0] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] rounded-full blur-[100px] bg-brand-orange/10"
                    />
                </div>

                {/* Header */}
                <header className="relative z-10 w-full flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3.5 group text-slate-900 dark:text-white shrink-0">
                        <AnimatedLogo />
                        <span className="font-heading font-black text-xl italic tracking-tighter uppercase whitespace-nowrap">
                            RIVAL <span className="text-brand-red">FIT</span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-6">
                        {/* Hidden on mobile to keep clean */}
                        <div className="hidden sm:flex gap-4">
                            <button 
                                onClick={() => setActiveSheet('athlete')}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-white/55 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Para Atletas
                            </button>
                            <button
                                onClick={() => setActiveSheet('center')}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-white/55 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Para Centros
                            </button>
                            <a
                                href="/demo.html"
                                className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-white/55 dark:hover:text-white transition-colors cursor-pointer"
                            >
                                Demo
                            </a>
                        </div>
                        <Link
                            href="/login"
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-white/80 hover:text-brand-red transition-colors"
                        >
                            <LogIn className="w-3.5 h-3.5" />
                            Iniciar Sesión
                        </Link>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Split Content: Mockup on left (Desktop), Form on right */}
                <div className="relative z-10 flex-1 flex items-center justify-center gap-12 lg:max-w-6xl lg:mx-auto lg:w-full my-auto">
                    
                    {/* Desktop Interactive Mockup (Left Side) */}
                    <div className="hidden lg:flex flex-1 flex-col justify-center relative">
                        <div className="absolute -inset-10 bg-brand-red/5 blur-[100px] rounded-full pointer-events-none" />
                        <motion.div
                            onMouseMove={handleMockupMouseMove}
                            onMouseLeave={handleMockupMouseLeave}
                            style={{
                                transform: `perspective(1000px) rotateX(${mockupTilt.rx}deg) rotateY(${mockupTilt.ry}deg)`,
                                transformStyle: "preserve-3d",
                                transition: "transform 0.15s ease-out",
                            }}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="w-full max-w-lg bg-[#f8fafc]/90 dark:bg-[#050505]/60 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-xl flex min-h-[460px] relative"
                        >
                            {/* Scanning Laser Line Overlay */}
                            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-40 animate-scan pointer-events-none z-20" />
                            
                            {/* Sidebar mini */}
                            <div className="w-12 border-r border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-black/40 flex flex-col items-center py-6 gap-6">
                                <div className="w-6 h-6 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-[8px] font-black text-brand-red italic">RF</div>
                                {[0, 1, 2, 3].map(i => (
                                    <div key={i} className={`w-3 h-3 rounded-sm border ${i === 0 ? 'bg-brand-red border-brand-red shadow-glow-red' : 'border-slate-300 dark:border-white/20'}`} />
                                ))}
                            </div>
                            {/* Mock Content */}
                            <div className="flex-1 p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-[8px] text-brand-red font-black tracking-[0.2em] uppercase italic">ESTADÍSTICAS REALES</div>
                                        <h3 className="text-2xl font-black italic text-slate-900 dark:text-white uppercase tracking-tighter font-heading">TU RENDIMIENTO</h3>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-xs font-black italic text-brand-red shadow-glow-red">JD</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-4 rounded-xl space-y-1">
                                        <div className="text-[7px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">PERSONAL BEST</div>
                                        <div className="text-xl font-black italic text-slate-900 dark:text-white tracking-tighter">125 KG</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-4 rounded-xl space-y-1">
                                        <div className="text-[7px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">RANKING GLOBAL</div>
                                        <div className="text-xl font-black italic text-brand-red tracking-tighter">TOP 30</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 p-5 rounded-xl space-y-4">
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                        <span className="text-slate-500 dark:text-white/40">PROGRESO SEMANAL</span>
                                        <span className="text-brand-red">+12% ESTA SEMANA</span>
                                    </div>
                                    <div className="flex items-end h-20 gap-2">
                                        {[30, 55, 45, 80, 60, 95, 70].map((h, i) => (
                                            <div key={i} className="flex-1 relative h-full flex items-end">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    whileInView={{ height: `${h}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                                    className={`w-full rounded-t-sm ${i === 5
                                                        ? 'bg-brand-red shadow-glow-red'
                                                        : 'bg-gradient-to-t from-brand-red/25 to-brand-red/50 dark:from-white/15 dark:to-brand-red/40'}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-slate-400 dark:text-white/25">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="flex-1 text-center">{d}</span>)}
                                    </div>
                                </div>
                                
                                {/* Live activity ticker inside mockup */}
                                <div className="bg-slate-50/50 dark:bg-white/[0.01] border border-slate-100/50 dark:border-white/[0.03] p-4 rounded-xl space-y-2.5">
                                    <div className="text-[7px] font-black text-slate-400 dark:text-white/30 tracking-widest uppercase">ACTIVIDAD RECIENTE</div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[9px]">
                                            <span className="text-slate-600 dark:text-white/60 font-medium">Completed "Fran" in 3:45</span>
                                            <span className="text-brand-red font-bold">🔥 NUEVO PR</span>
                                        </div>
                                        <div className="h-[1px] bg-slate-100 dark:bg-white/5" />
                                        <div className="flex justify-between items-center text-[9px]">
                                            <span className="text-slate-600 dark:text-white/60 font-medium">Joined "Desafío Sled Push"</span>
                                            <span className="text-slate-400 dark:text-white/30 font-medium">Hace 2h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Authentication Card (Form with 3D perspective and moving border glow) */}
                    <motion.div
                        onMouseMove={handleCardMouseMove}
                        onMouseLeave={handleCardMouseLeave}
                        style={{
                            transform: `perspective(1000px) rotateX(${cardTilt.rx}deg) rotateY(${cardTilt.ry}deg)`,
                            transformStyle: "preserve-3d",
                            transition: "transform 0.1s ease-out",
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative w-full max-w-[480px] sm:max-w-md p-[1.5px] rounded-2xl dark:animate-border-glow bg-slate-200 dark:bg-transparent shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_0_50px_rgba(239,68,68,0.15)]"
                    >
                        {/* Inner content container to mask the rotating conic gradient */}
                        <div className="relative z-10 w-full bg-white dark:bg-[#050505] p-6 xs:p-8 sm:p-10 rounded-3xl flex flex-col justify-center space-y-7 border border-slate-100/50 dark:border-none shadow-2xl">
                            {savedAccounts.length > 0 ? (
                                <WelcomeBackPanel
                                    savedAccounts={savedAccounts}
                                    accountCenters={accountCenters}
                                    switchingAccountId={switchingAccountId}
                                    onContinueAs={handleContinueAs}
                                />
                            ) : (
                            <>
                            {/* Live Activity Ticker (Real-time dynamic feed) */}
                            <div className="w-full bg-slate-50 dark:bg-black/50 border border-slate-100 dark:border-white/5 border-l-2 border-l-brand-red rounded-xl py-3 px-4 flex items-center justify-between overflow-hidden min-h-[44px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.2)]">
                                <div className="flex items-center gap-2 max-w-[90%]">
                                    <span className="flex items-center gap-1 bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-brand-red shrink-0">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-red"></span>
                                        </span>
                                        LIVE
                                    </span>
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={tickerIndex}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.25 }}
                                            className="text-[10px] xs:text-[11px] sm:text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white/70 whitespace-nowrap overflow-hidden text-ellipsis"
                                        >
                                            {LIVE_EVENTS[tickerIndex]}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
                                <Activity className="w-3.5 h-3.5 text-brand-red animate-pulse flex-shrink-0" />
                            </div>

                            <div className="text-center space-y-3 pt-1">
                                <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 px-4 py-1.5 rounded-full">
                                    <Trophy className="w-4 h-4 text-brand-red" />
                                    <span className="text-[10px] xs:text-[11px] sm:text-xs font-black tracking-[0.25em] uppercase text-slate-600 dark:text-white/80">EL ECOSISTEMA FITNESS DEFINITIVO</span>
                                </div>
                                <h1 className="text-4xl xs:text-5xl sm:text-5xl font-heading font-black italic uppercase tracking-tighter leading-none text-gradient-red">
                                    DOMINA TU TERRENO.
                                </h1>
                                <p className="text-xs xs:text-sm sm:text-sm text-slate-500 dark:text-white/45 font-medium leading-normal max-w-xs mx-auto">
                                    Ingresa al instante y conecta con los mejores atletas y centros de alto rendimiento.
                                </p>
                            </div>

                            {/* Propuesta de valor (sin cifras: venden capacidades, no tamaño) */}
                            <div className="grid grid-cols-3 gap-2.5 py-1 text-center">
                                <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-xl py-3 px-1 hover:border-brand-red/20 transition-colors">
                                    <div className="flex items-center justify-center text-brand-red mb-1">
                                        <Flame className="w-4 h-4" />
                                    </div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 leading-tight">WODs con IA</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-xl py-3 px-1 hover:border-brand-orange/20 transition-colors">
                                    <div className="flex items-center justify-center text-brand-orange mb-1">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 leading-tight">Gestión de Boxes</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-xl py-3 px-1 hover:border-yellow-500/20 transition-colors">
                                    <div className="flex items-center justify-center text-yellow-500 mb-1">
                                        <Trophy className="w-4 h-4" />
                                    </div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-600 dark:text-white/70 leading-tight">Gestión de Atletas</div>
                                </div>
                            </div>

                            {/* Primary CTAs — Empezar Gratis & Demo */}
                            <div className="flex gap-3">
                                <Link
                                    href="/signup"
                                    className="flex-1 bg-gradient-to-r from-brand-red to-red-600 hover:from-brand-accent hover:to-red-500 text-white py-3.5 sm:py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs xs:text-sm sm:text-xs btn-sport-tech transition-all shadow-[0_4px_20px_rgba(239,68,68,0.25)] hover:shadow-[0_4px_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 group cursor-pointer hover:scale-[1.02] active:scale-95 duration-300"
                                >
                                    <span className="skew-x-[10deg] block flex items-center gap-1.5">
                                        Empezar Gratis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                </Link>
                                <a
                                    href="/demo.html"
                                    className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:border-brand-red/40 hover:bg-brand-red/5 text-slate-800 dark:text-white py-3.5 sm:py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs xs:text-sm sm:text-xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 duration-300"
                                >
                                    <span className="skew-x-[10deg] block">
                                        Demo ⚡
                                    </span>
                                </a>
                            </div>

                            <div className="text-center">
                                <span className="text-[11px] xs:text-[12px] sm:text-xs font-bold text-slate-500 dark:text-white/40">
                                    ¿Ya tienes cuenta? <Link href="/login" className="text-slate-900 dark:text-white hover:text-brand-red font-black uppercase tracking-widest ml-1 transition-colors">Inicia sesión</Link>
                                </span>
                            </div>

                            {/* Bottom Links & Explores */}
                            <div className="space-y-4 pt-1">
                                <div className="relative flex py-1 items-center">
                                    <div className="flex-grow border-t border-slate-100 dark:border-white/5"></div>
                                    <span className="flex-shrink mx-3 text-[9px] xs:text-[10px] sm:text-xs font-black tracking-widest uppercase">Cuéntame más</span>
                                    <div className="flex-grow border-t border-slate-100 dark:border-white/5"></div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setActiveSheet('athlete')}
                                        className="flex-1 py-4 px-3 rounded-xl border border-brand-red/20 hover:border-brand-red/55 hover:bg-brand-red/5 hover:scale-[1.02] active:scale-95 transition-all text-[11px] xs:text-[12px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 group cursor-pointer text-slate-800 dark:text-white bg-slate-50/50 dark:bg-transparent"
                                    >
                                        <Flame className="w-4 h-4 text-brand-red group-hover:scale-110 transition-transform" /> Soy Atleta
                                    </button>
                                    <button
                                        onClick={() => setActiveSheet('center')}
                                        className="flex-1 py-4 px-3 rounded-xl border border-brand-orange/20 hover:border-brand-orange/55 hover:bg-brand-orange/5 hover:scale-[1.02] active:scale-95 transition-all text-[11px] xs:text-[12px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 group cursor-pointer text-slate-800 dark:text-white bg-slate-50/50 dark:bg-transparent"
                                    >
                                        <Building2 className="w-4 h-4 text-brand-orange group-hover:scale-110 transition-transform" /> Soy Centro
                                    </button>
                                </div>
                            </div>
                            </>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <footer className="relative z-10 w-full text-center py-3 mt-auto border-t border-slate-100 dark:border-white/5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-white/10">RIVAL FIT © 2026</span>
                </footer>

                {/* Slide-up Sheets (Modals) */}
                <AnimatePresence>
                    {activeSheet && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setActiveSheet(null)}
                                className="fixed inset-0 bg-black/80 backdrop-blur-md z-45 cursor-pointer"
                            />
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                                className="fixed inset-x-0 bottom-0 h-[92vh] bg-white dark:bg-[#050505] border-t border-slate-200 dark:border-white/10 rounded-t-[2.5rem] z-50 overflow-hidden flex flex-col text-slate-900 dark:text-white"
                            >
                                <div className="sticky top-0 z-50 flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-white/90 dark:bg-[#050505]/90 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        {activeSheet === 'athlete' ? (
                                            <>
                                                <Flame className="w-5 h-5 text-brand-red animate-pulse" />
                                                <span className="font-heading font-black italic text-lg uppercase tracking-tight">INFORMACIÓN PARA ATLETAS</span>
                                            </>
                                        ) : (
                                            <>
                                                <Building2 className="w-5 h-5 text-brand-orange animate-pulse" />
                                                <span className="font-heading font-black italic text-lg uppercase tracking-tight">SOLUCIONES PARA CENTROS</span>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setActiveSheet(null)}
                                        className="p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto py-12 no-scrollbar">
                                    {activeSheet === 'athlete' ? (
                                        <AthleteFeatures />
                                    ) : (
                                        <CenterFeatures />
                                    )}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </main>
        </>
    );
}
