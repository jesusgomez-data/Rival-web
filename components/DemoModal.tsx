"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { 
    X, Smartphone, LayoutDashboard, Zap, TrendingUp, 
    Activity, Users, Calendar, ArrowRight, Flame,
    Globe, Shield, BarChart3, Database, Cpu, Target
} from "lucide-react";
import Link from "next/link";

interface DemoModalProps {
    onClose: () => void;
    initialView?: 'athlete' | 'center';
}

export default function DemoModal({ onClose, initialView = 'athlete' }: DemoModalProps) {
    const [view, setView] = useState<'athlete' | 'center'>(initialView);
    const [scrolled, setScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = (e: any) => {
            const top = e.target.scrollTop;
            setScrolled(top > 50);
        };
        const modalContent = document.getElementById('demo-modal-content');
        modalContent?.addEventListener('scroll', handleScroll);
        return () => modalContent?.removeEventListener('scroll', handleScroll);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl">
            {/* Background Tech Layer */}
            <div className="absolute inset-0 z-0 bg-grid-tech opacity-10 pointer-events-none" />
            <div className="absolute inset-0 z-0 scanline opacity-[0.02] pointer-events-none" />

            {/* Navigation Header (Hides on Scroll) */}
            <motion.header 
                initial={{ y: -100 }}
                animate={{ y: scrolled ? -100 : 0 }}
                className="fixed top-0 left-0 right-0 z-[120] p-6 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 transition-all duration-500"
            >
                <div className="flex items-center gap-6">
                    <div className="flex bg-white/5 border border-white/10 p-1 rounded-sm">
                        <button 
                            onClick={() => setView('athlete')}
                            className={`px-4 py-1.5 rounded-sm text-[9px] font-black uppercase transition-all ${view === 'athlete' ? 'bg-brand-red text-white shadow-glow' : 'text-white/30 hover:text-white'}`}
                        >
                            [ ATLETA_SIM ]
                        </button>
                        <button 
                            onClick={() => setView('center')}
                            className={`px-4 py-1.5 rounded-sm text-[9px] font-black uppercase transition-all ${view === 'center' ? 'bg-brand-orange text-white shadow-glow-orange' : 'text-white/30 hover:text-white'}`}
                        >
                            [ CENTRO_DASH ]
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-brand-red hover:border-brand-red group transition-all">
                        <X className="w-5 h-5 text-white group-hover:scale-110" />
                    </button>
                </div>
            </motion.header>

            {/* Floating Close Button (Shows only on Scroll) */}
            <AnimatePresence>
                {scrolled && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 100 }}
                        onClick={onClose}
                        className="fixed bottom-10 right-10 z-[130] w-14 h-14 bg-brand-red text-white rounded-full shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                    >
                        <X className="w-6 h-6 font-bold" />
                    </motion.button>
                )}
            </AnimatePresence>

            <motion.div 
                id="demo-modal-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full h-full overflow-y-auto pt-32 md:pt-40"
            >
                {view === 'athlete' ? (
                    <div className="container mx-auto px-6 pb-20 max-w-4xl space-y-20">
                        {/* Mobile Device Mockup */}
                        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                            <div className="w-full lg:w-[350px] shrink-0">
                                <div className="relative mx-auto border-[10px] border-[#1a1a1a] rounded-[3.5rem] w-[280px] h-[580px] bg-black shadow-3xl overflow-hidden group border-neon-red">
                                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-20" />
                                     
                                     {/* Fake Phone Screen Content */}
                                     <div className="h-full pt-12 pb-6 px-4 bg-dot-grid overflow-y-auto no-scrollbar pointer-events-none select-none">
                                         <div className="space-y-6">
                                             <div className="flex justify-between items-center">
                                                 <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
                                                     <Zap className="w-4 h-4 text-white" />
                                                 </div>
                                                 <Activity className="text-brand-red w-4 h-4 animate-pulse" />
                                             </div>
                                             
                                             <div className="space-y-1">
                                                 <div className="text-[8px] text-white/30 font-black tracking-widest uppercase italic">SIGNAL_DETECTED: RIVAL_001</div>
                                                 <div className="text-2xl font-black italic uppercase leading-tight">ENTRENAR <br /><span className="text-brand-red">AHORA.</span></div>
                                             </div>

                                             <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl relative overflow-hidden group-hover:border-brand-red/30 transition-all">
                                                 <div className="absolute top-0 right-0 p-2 bg-brand-red text-[7px] font-black italic">14 SEP 2026</div>
                                                 <div className="text-[9px] text-brand-red font-black tracking-widest mb-1 italic">MURPH_WARRIOR</div>
                                                 <div className="text-[11px] font-bold text-white/50 mb-4 leading-tight">1600m Run + 100 Pullups + 200 Pushups + 300 Squats</div>
                                                 <div className="w-full py-2.5 bg-brand-red rounded-xl text-center text-[9px] font-black uppercase tracking-[0.2em] shadow-glow">LOG_PERFORMANCE</div>
                                             </div>

                                             <div className="grid grid-cols-2 gap-3">
                                                 <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-1">
                                                     <div className="text-[7px] text-white/20 font-black uppercase tracking-widest">Global_Rank</div>
                                                     <div className="text-base font-black italic text-white leading-none">#1.428</div>
                                                 </div>
                                                 <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-1">
                                                     <div className="text-[7px] text-white/20 font-black uppercase tracking-widest">Efficiency</div>
                                                     <div className="text-base font-black italic text-brand-red leading-none">94.8%</div>
                                                 </div>
                                             </div>

                                             <div className="pt-2">
                                                 <div className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-3 italic underline decoration-brand-red/30">RIVALS_STREAMING_</div>
                                                 <div className="flex gap-3 overflow-x-auto no-scrollbar">
                                                     {[1,2,3,4].map(i => (
                                                         <div key={i} className="w-12 h-12 shrink-0 bg-white/[0.03] rounded-full border border-white/10 flex items-center justify-center">
                                                              <Users className="w-4 h-4 text-white/10" />
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-8 lg:space-y-10 text-center lg:text-left pt-10 lg:pt-0">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center lg:justify-start gap-3">
                                        <Smartphone className="text-brand-red w-4 h-4" />
                                        <span className="text-brand-red font-black uppercase tracking-[0.5em] text-[10px] italic">PERFORMANCE_OS_V.1</span>
                                    </div>
                                    <h3 className="text-4xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none">ARENA <br /><span className="text-brand-red text-neon-red">DYNAMICS.</span></h3>
                                </div>
                                <p className="text-white/40 font-bold uppercase tracking-tight text-sm lg:text-lg leading-relaxed italic max-w-md mx-auto lg:mx-0">
                                    Interfaz optimizada para la acción. Sin fricción, solo datos brutos y competencia pura en tiempo real.
                                </p>
                                <div className="space-y-4 max-w-sm mx-auto lg:mx-0">
                                    {[
                                        { icon: Zap, text: "Sincronización de Carga Táctica" },
                                        { icon: TrendingUp, text: "Visualización de PRs en Tiempo Real" },
                                        { icon: Target, text: "Objetivos Dinámicos Diarios" }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 text-white/60 font-black text-[9px] uppercase tracking-widest border-b border-white/5 pb-4 group">
                                            <item.icon className="text-brand-red w-4 h-4 group-hover:scale-125 transition-transform" />
                                            {item.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="container mx-auto px-6 pb-20 space-y-20 max-w-6xl">
                        {/* Center Dashboard Desktop Style */}
                        <div className="relative w-full aspect-video bg-[#050505] rounded-3xl border border-white/10 shadow-3xl overflow-hidden group">
                             {/* Mac Header */}
                             <div className="h-10 bg-white/[0.03] border-b border-white/5 flex items-center px-6 gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                                 <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                                 <div className="flex-1 text-center font-mono text-[9px] text-white/20 uppercase tracking-widest">RIVAL_CENTERS / COMMAND_CENTER</div>
                             </div>

                             <div className="flex h-[calc(100%-40px)] overflow-hidden">
                                 {/* Sidebar Mini */}
                                 <aside className="w-16 lg:w-48 bg-white/[0.02] border-r border-white/5 p-4 lg:p-6 space-y-8 shrink-0">
                                     <div className="w-8 h-8 bg-brand-orange/20 border border-brand-orange/50 rounded flex items-center justify-center font-black text-brand-orange text-[10px] shadow-glow-orange">RC</div>
                                     <nav className="space-y-4">
                                         {[LayoutDashboard, Calendar, Users, BarChart3, Globe, Database, Cpu].map((Icon, i) => (
                                             <div key={i} className={`flex items-center gap-4 cursor-pointer hover:text-brand-orange transition-colors ${i === 0 ? 'text-brand-orange' : 'text-white/20'}`}>
                                                 <Icon className="w-5 h-5" />
                                                 <span className="hidden lg:block text-[9px] font-black uppercase tracking-widest">SEC_{i}</span>
                                             </div>
                                         ))}
                                     </nav>
                                 </aside>

                                 {/* Dashboard Content */}
                                 <main className="flex-1 p-6 lg:p-12 overflow-y-auto no-scrollbar bg-dot-grid">
                                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                                         <div>
                                             <div className="text-[10px] text-brand-orange font-black uppercase tracking-[0.3em] italic mb-1">MODULE://CENTRO_GESTION</div>
                                             <h4 className="text-3xl font-black italic uppercase tracking-tighter">RED_OPERATIVA</h4>
                                         </div>
                                         <div className="flex gap-4">
                                              <div className="px-4 py-2 border border-white/10 rounded-lg text-[8px] font-black text-white/40 hidden md:block uppercase tracking-widest">DOWNLOAD_LOGS</div>
                                              <div className="px-6 py-2 bg-brand-orange text-white rounded-lg text-[9px] font-black shadow-glow-orange hover:scale-105 transition-all cursor-pointer">+ NUEVO_REGISTRO</div>
                                         </div>
                                     </div>

                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                         {[
                                             { label: "TRÁFICO_ATLETAS", value: "842", trend: "+12.4%", icon: Users },
                                             { label: "LEADS_CONVERTIDOS", value: "14", trend: "+24.8%", color: "text-brand-orange", icon: Activity },
                                             { label: "RENTABILIDAD_SYNC", value: "€42.2K", trend: "+8.2%", icon: BarChart3 }
                                         ].map((item, i) => (
                                             <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl relative group hover:border-brand-orange/30 transition-all">
                                                 <div className="flex justify-between mb-4">
                                                     <div className="text-[8px] font-black text-white/10 uppercase tracking-widest">{item.label}</div>
                                                     <item.icon className="w-4 h-4 text-white/10 group-hover:text-brand-orange transition-colors" />
                                                 </div>
                                                 <div className="text-3xl font-black italic text-white leading-none mb-2">{item.value}</div>
                                                 <div className={`text-[9px] font-black ${item.color || 'text-green-500'} flex items-center gap-2`}>
                                                     <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                     {item.trend} VS_PREV_CYCLE
                                                 </div>
                                             </div>
                                         ))}
                                     </div>

                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                                         <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-6">
                                             <div className="flex justify-between items-center">
                                                 <h5 className="text-[9px] font-black uppercase tracking-widest text-white/40">AGENDA_DINÁMICA</h5>
                                                 <div className="text-[7px] text-white/20 underline cursor-pointer">PROTOCOL_VIEW</div>
                                             </div>
                                             {[1,2,3].map(i => (
                                                 <div key={i} className="flex justify-between items-center pb-4 border-b border-white/5 last:border-0 group">
                                                     <div className="flex items-center gap-4">
                                                          <div className="w-12 h-12 bg-white/5 rounded-lg font-black italic flex items-center justify-center text-[11px] group-hover:bg-brand-orange/20 group-hover:text-brand-orange transition-all">1{i}:00</div>
                                                          <div className="space-y-0.5">
                                                              <div className="text-xs font-black uppercase italic">WOD_AVANZADO_0{i}</div>
                                                              <div className="text-[8px] text-white/30 uppercase font-bold tracking-widest">COMMANDER_JUAN</div>
                                                          </div>
                                                     </div>
                                                     <div className="text-right">
                                                         <div className="text-[10px] font-black text-brand-orange">18/20</div>
                                                         <div className="text-[7px] text-white/20 font-black">CAPACITY</div>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                         <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center border-dashed group hover:border-brand-orange/40 transition-all min-h-[250px]">
                                              <div className="relative">
                                                  <div className="absolute inset-0 bg-brand-orange blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                                                  <div className="relative w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                                      <Cpu className="text-white/20 group-hover:text-brand-orange w-7 h-7" />
                                                  </div>
                                              </div>
                                              <div className="text-[9px] text-white/30 font-black uppercase tracking-[0.2em]">INTEGRACIÓN_SENSORIAL</div>
                                              <div className="text-[7px] text-white/10 mt-3 font-mono">IDLE_WAITING_FOR_METRIC_DATA...</div>
                                         </div>
                                     </div>
                                 </main>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20 pt-20">
                             <div className="space-y-5 p-8 bg-white/[0.01] border border-white/5 rounded-3xl hover:border-brand-orange/20 transition-all">
                                 <div className="w-10 h-10 bg-brand-orange/10 border border-brand-orange/50 rounded-lg flex items-center justify-center">
                                     <LayoutDashboard className="text-brand-orange w-5 h-5" />
                                 </div>
                                 <h4 className="text-xl font-black italic uppercase text-brand-orange">CENTRAL_UNIFIED</h4>
                                 <p className="text-[11px] text-white/40 font-bold uppercase italic leading-relaxed">Nucleo operativo centralizado. Control total de la infraestructura física desde una única terminal cifrada.</p>
                             </div>
                             <div className="space-y-5 p-8 bg-white/[0.01] border border-white/5 rounded-3xl hover:border-brand-orange/20 transition-all">
                                 <div className="w-10 h-10 bg-brand-orange/10 border border-brand-orange/50 rounded-lg flex items-center justify-center">
                                     <Activity className="text-brand-orange w-5 h-5" />
                                 </div>
                                 <h4 className="text-xl font-black italic uppercase text-brand-orange">LEAD_FLOW_A1</h4>
                                 <p className="text-[11px] text-white/40 font-bold uppercase italic leading-relaxed">Sistema de prospección inteligente. Los usuarios de la arena son canalizados mediante algoritmos de proximidad.</p>
                             </div>
                             <div className="space-y-5 p-8 bg-white/[0.01] border border-white/5 rounded-3xl hover:border-brand-orange/20 transition-all">
                                 <div className="w-10 h-10 bg-brand-orange/10 border border-brand-orange/50 rounded-lg flex items-center justify-center">
                                     <Calendar className="text-brand-orange w-5 h-5" />
                                 </div>
                                 <h4 className="text-xl font-black italic uppercase text-brand-orange">AUTO_SETTLE</h4>
                                 <p className="text-[11px] text-white/40 font-bold uppercase italic leading-relaxed">Liquidación automatizada de activos. Transferencias directas programadas cada 168 horas.</p>
                             </div>
                        </div>
                    </div>
                )}

                {/* Tech Footer */}
                <div className="p-12 md:p-16 mt-20 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex flex-col items-center gap-6">
                    <div className="flex gap-4 items-center opacity-30">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                        <div className="w-12 h-px bg-white/20" />
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                    </div>
                    
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] text-center">
                        RIVAL FIT // 2026
                    </p>
                </div>

            </motion.div>
        </div>
    );
}
