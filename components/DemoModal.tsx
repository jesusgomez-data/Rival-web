"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Building2, Activity, TrendingUp, X, Users, Zap, CheckCircle2 } from "lucide-react";

interface DemoModalProps {
    onClose: () => void;
}

export default function DemoModal({ onClose }: DemoModalProps) {
    const [view, setView] = useState<'athlete' | 'center'>('athlete');
    const router = useRouter();

    const handleCTA = () => {
        if (view === 'athlete') {
            router.push('/signup');
        } else {
            router.push('/center-signup');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center sm:p-4 overflow-hidden" onClick={onClose}>

            {/* Container Principal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="dark-section relative w-full h-full max-h-[95vh] sm:h-[600px] sm:max-h-none sm:w-full sm:max-w-5xl bg-[#0A0A0A] rounded-none sm:rounded-3xl overflow-y-auto overflow-x-hidden shadow-2xl border-0 sm:border border-white/10 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Background Effects (Hexagonal & Glow) */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {/* Dark Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0A0A0A]/80 to-[#0A0A0A]" />

                    {/* Hex Pattern */}
                    <div className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg id='hexagons' fill='%23333' fill-opacity='1' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.18v12.89l11 6.35 11-6.35V17.18L14 10.83l-11 6.35zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.31zM28 15l-12.98-7.5V0h2v6.35L28 12.69v2.3zm0 18.5L15.02 41v8h2v-6.85L28 35.81v-2.31z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
                        }}
                    />

                    {/* Animated Glow Spot */}
                    <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] ${view === 'athlete' ? 'bg-red-600/20' : 'bg-orange-600/20'}`}
                    />
                </div>

                {/* Animated Rings (Energy Circles) */}
                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        className={`w-[600px] h-[600px] border border-dashed rounded-full opacity-20 ${view === 'athlete' ? 'border-red-500' : 'border-orange-500'}`}
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className={`absolute w-[450px] h-[450px] border-2 rounded-full opacity-30 ${view === 'athlete' ? 'border-t-red-500 border-r-transparent border-b-transparent border-l-transparent' : 'border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent'}`}
                    />
                </div>

                {/* Top Bar with Close */}
                <div className="relative z-50 flex justify-between items-center p-6 border-b border-white/5 bg-black/20 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-2xl italic tracking-tighter text-white">RIVAL <span className={view === 'athlete' ? "text-red-500" : "text-orange-500"}>DEMO</span></span>
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-black/40 rounded-full p-1 border border-white/10">
                        <button
                            onClick={() => setView('athlete')}
                            className={`relative px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all overflow-hidden ${view === 'athlete' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                        >
                            {view === 'athlete' && (
                                <motion.div layoutId="activeTab" className="absolute inset-0 bg-red-600 rounded-full" />
                            )}
                            <span className="relative z-10 flex items-center gap-2"><Dumbbell size={14} /> Atleta</span>
                        </button>
                        <button
                            onClick={() => setView('center')}
                            className={`relative px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all overflow-hidden ${view === 'center' ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                        >
                            {view === 'center' && (
                                <motion.div layoutId="activeTab" className="absolute inset-0 bg-orange-600 rounded-full" />
                            )}
                            <span className="relative z-10 flex items-center gap-2"><Building2 size={14} /> Centro</span>
                        </button>
                    </div>

                    <button onClick={onClose} className="text-white/40 hover:text-white hover:rotate-90 transition-all p-2 rounded-full hover:bg-white/10">
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="relative z-40 flex-1 flex items-center justify-center p-6 sm:p-12 pb-24 sm:pb-12">

                    {/* Dynamic Layout */}
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, x: view === 'athlete' ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: view === 'athlete' ? 20 : -20 }}
                        transition={{ duration: 0.4 }}
                        className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                    >
                        {/* Text Content */}
                        <div className="space-y-6 text-left pb-8 lg:pb-0">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${view === 'athlete' ? 'borderColor-red-500/30 text-red-500 bg-red-500/10' : 'borderColor-orange-500/30 text-orange-500 bg-orange-500/10'}`}>
                                {view === 'athlete' ? <Activity size={12} /> : <TrendingUp size={12} />}
                                {view === 'athlete' ? 'Performance Tracking' : 'Business Intelligence'}
                            </div>

                            <h2 className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter leading-[0.9]">
                                {view === 'athlete' ? (
                                    <>TU PROGRESO <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-white">EN TIEMPO REAL.</span></>
                                ) : (
                                    <>TU NEGOCIO <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-white">AUTOMATIZADO.</span></>
                                )}
                            </h2>

                            <p className="text-lg text-white/60 font-medium max-w-md">
                                {view === 'athlete'
                                    ? "Analiza cada levantamiento, compite en leaderboards globales y sigue una programación de clase mundial. Todo en una sola app."
                                    : "Gestiona socios, pagos, reservas y retención con herramientas diseñadas para escalar tu box al siguiente nivel."
                                }
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                {(view === 'athlete' ? [
                                    "Registro de WODs", "Historial de PRs", "Comparativa vs Rivales", "Coach Digital IA"
                                ] : [
                                    "CRM de Socios", "Pagos Automatizados", "Gestión de Clases", "Reportes Financieros"
                                ]).map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                                        <CheckCircle2 size={16} className={view === 'athlete' ? "text-red-500" : "text-orange-500"} />
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleCTA}
                                className={`mt-6 px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white shadow-lg transition-transform active:scale-95 hover:scale-105 ${view === 'athlete' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'}`}
                            >
                                {view === 'athlete' ? 'Empezar Gratis' : 'Registrar Centro'}
                            </button>
                        </div>

                        {/* Visual Content (Cards / Mockups) */}
                        <div className="relative w-full h-full min-h-[300px] flex items-center justify-center pb-8 lg:pb-0">

                            {/* Glassmorphism Card */}
                            <motion.div
                                initial={{ rotate: -5, y: 10 }}
                                animate={{ rotate: 0, y: 0 }}
                                transition={{ duration: 0.8, type: "spring" }}
                                className="relative w-full max-w-sm aspect-[4/5] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 flex flex-col justify-between shadow-2xl overflow-hidden"
                            >
                                {/* Background training image for athlete view */}
                                {view === 'athlete' && (
                                    <div className="absolute inset-0 z-0">
                                        <img
                                            src="https://images.unsplash.com/photo-1541534741688-611c501f116a?q=80&w=800&auto=format&fit=crop"
                                            alt="Training background"
                                            className="w-full h-full object-cover opacity-40"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
                                    </div>
                                )}
                                {/* Header of Card */}
                                <div className="relative z-10 flex justify-between items-center mb-6">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        {view === 'athlete' ? <Users size={20} className="text-red-400" /> : <Building2 size={20} className="text-orange-400" />}
                                    </div>
                                    <div className={`text-xs font-bold uppercase tracking-widest ${view === 'athlete' ? 'text-red-400' : 'text-orange-400'}`}>
                                        {view === 'athlete' ? 'Rival ID' : 'Dashboard'}
                                    </div>
                                </div>

                                {/* Middle Content */}
                                <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                                    {view === 'athlete' ? (
                                        <>
                                            <div className="w-24 h-24 rounded-full border-4 border-red-500/20 p-1">
                                                <div className="w-full h-full bg-gray-600 rounded-full overflow-hidden relative">
                                                    <img
                                                        src="https://images.unsplash.com/photo-1541534741688-611c501f116a?q=80&w=200&auto=format&fit=crop"
                                                        alt="User"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-red-900/40 mix-blend-overlay"></div>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-white">Alex Sterling</h3>
                                                <p className="text-xs text-white/50 uppercase tracking-widest">Cross Athlete</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 w-full mt-4">
                                                <div className="bg-black/30 p-2 rounded-lg">
                                                    <div className="text-xs text-white/40">WODs</div>
                                                    <div className="font-bold text-white">142</div>
                                                </div>
                                                <div className="bg-black/30 p-2 rounded-lg">
                                                    <div className="text-xs text-white/40">PRs</div>
                                                    <div className="font-bold text-brand-neon-green">12</div>
                                                </div>
                                                <div className="bg-black/30 p-2 rounded-lg">
                                                    <div className="text-xs text-white/40">Rank</div>
                                                    <div className="font-bold text-yellow-500">#4</div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-full h-32 bg-black/30 rounded-xl relative overflow-hidden flex items-end p-2 gap-1">
                                                {/* Fake Chart */}
                                                {[40, 60, 45, 70, 55, 80, 65, 90].map((h, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${h}%` }}
                                                        transition={{ delay: i * 0.1, duration: 0.5 }}
                                                        className="flex-1 bg-orange-500/80 rounded-t-sm"
                                                    />
                                                ))}
                                            </div>
                                            <div className="w-full flex justify-between items-end">
                                                <div className="text-left">
                                                    <div className="text-xs text-white/40 uppercase">Ingresos Totales</div>
                                                    <div className="text-2xl font-bold text-white">€14,250</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-brand-neon-green flex items-center gap-1">+12.5% <TrendingUp size={10} /></div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-white/5 p-3 rounded-lg flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500"><Users size={14} /></div>
                                                <div className="text-left flex-1">
                                                    <div className="text-xs text-white/60">Nuevos Socios</div>
                                                    <div className="font-bold text-white">24 registrados hoy</div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>

                            {/* Floating Element Behind */}
                            <div className={`absolute -z-10 top-10 right-10 w-full h-full max-w-xs rounded-3xl border opacity-40 blur-[1px] transform rotate-6 scale-90 ${view === 'athlete' ? 'bg-red-900/20 border-red-500/20' : 'bg-orange-900/20 border-orange-500/20'}`}></div>

                        </div>

                    </motion.div>

                </div>

            </motion.div>
        </div>
    );
}
