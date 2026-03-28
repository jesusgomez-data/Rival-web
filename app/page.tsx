"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Trophy, Activity, Users, Play, BarChart3, 
  Dumbbell, Flame, Check, Star, TrendingUp, Zap, 
  Layout, CalendarCheck, UploadCloud, Building2, 
  ShoppingBag, Globe, Mail, Instagram, Sparkles,
  ChevronRight, Heart, Target, Shield, Globe2,
  DollarSign, Monitor, UserPlus, FileText, Bell, Clock,
  MoreVertical, Calendar, ZapOff, MapPin
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/app/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import DemoModal from "@/components/DemoModal";
import { clsx } from "clsx";

export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [viewMode, setViewMode] = useState<'choice' | 'athlete' | 'business'>('choice');
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-500 overflow-x-hidden bg-noise">
      
      {showVideoModal && <DemoModal onClose={() => setShowVideoModal(false)} />}

      <nav className="fixed w-full z-[100] top-0 pt-4 md:pt-6 px-4 md:px-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto bg-black/40 dark:bg-black/40 light:bg-white/95 backdrop-blur-2xl border border-white/10 dark:border-white/10 light:border-black/5 rounded-2xl md:rounded-3xl px-4 md:px-8 h-18 shadow-2xl transition-all duration-500 hover:border-brand-red/20 group">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <Image src="/logo.svg" alt="Rival" width={40} height={40} className="w-8 h-8 md:w-11 md:h-11 group-hover:rotate-[15deg] transition-transform duration-500" />
              <div className="absolute inset-0 bg-brand-red blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
            </div>
            <span className="font-heading font-black text-xl md:text-3xl tracking-tighter italic text-black dark:text-white uppercase transition-colors">RIVAL<span className="text-brand-red">FIT</span></span>
          </Link>

          <div className="hidden lg:flex items-center gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-foreground">
            <a href="#features" className="hover:text-brand-red transition-all font-black italic">{t.nav.features}</a>
            {viewMode === 'business' ? (
              <button onClick={() => setViewMode('athlete')} className="text-brand-red hover:tracking-[0.3em] transition-all font-black italic uppercase">PARA ATLETAS</button>
            ) : (
              <button onClick={() => setViewMode('business')} className="text-brand-orange hover:tracking-[0.3em] transition-all font-black italic uppercase">{t.nav.forCenters}</button>
            )}
            <Link href="/login" className="hover:text-brand-red transition-all font-black italic">{t.nav.login}</Link>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggle />
            <Link href="/signup" className="relative group">
              <div className="absolute inset-0 bg-brand-red blur-md opacity-50 group-hover:opacity-80 transition-opacity rounded-full" />
              <div className="relative bg-brand-red text-white px-5 md:px-7 py-2 md:py-3.5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest transition-all group-hover:scale-105 active:scale-95 flex items-center gap-2 shadow-glow">
                 {t.nav.join} <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {viewMode === 'choice' ? (
          <motion.div key="choice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="fixed inset-0 z-[110] flex flex-col md:flex-row bg-background overflow-hidden">
             <div className="relative flex-1 group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-border" onClick={() => setViewMode('athlete')}>
              <div className="absolute inset-0 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"><Image src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069" alt="Athlete" fill className="object-cover opacity-60 dark:opacity-40" /></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              <div className="relative h-full flex flex-col items-center justify-center p-8 md:p-12 text-center">
                <Dumbbell className="w-12 h-12 md:w-16 md:h-16 text-brand-red mb-6 mx-auto animate-float" />
                <h2 className="text-4xl md:text-8xl font-heading font-black italic text-foreground leading-none mb-4 uppercase tracking-tighter">ATLETA</h2>
                <div className="mt-8 px-8 py-4 rounded-full border border-border bg-card/10 backdrop-blur-md text-foreground font-black text-[10px] md:text-xs uppercase tracking-widest transition-all group-hover:scale-105 shadow-lg shadow-white/5">Entrar como Atleta_</div>
              </div>
            </div>
            <div className="relative flex-1 group cursor-pointer overflow-hidden" onClick={() => setViewMode('business')}>
              <div className="absolute inset-0 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"><Image src="https://images.unsplash.com/photo-1549476464-37392f717541?q=80&w=2070" alt="Gym" fill className="object-cover opacity-60 dark:opacity-40" /></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
               <div className="relative h-full flex flex-col items-center justify-center p-8 md:p-12 text-center">
                <Building2 className="w-12 h-12 md:w-16 md:h-16 text-brand-orange mb-6 mx-auto animate-float" />
                <h2 className="text-4xl md:text-8xl font-heading font-black italic text-foreground leading-none mb-4 uppercase tracking-tighter">CENTRO</h2>
                <div className="mt-8 px-8 py-4 rounded-full border border-border bg-card/10 backdrop-blur-md text-foreground font-black text-[10px] md:text-xs uppercase tracking-widest transition-all group-hover:scale-105 shadow-lg shadow-white/5">Registrar mi Centro_</div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.main key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
             <button onClick={() => setViewMode(viewMode === 'business' ? 'athlete' : 'business')} className="lg:hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-brand-red text-white px-8 py-4 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2">
                <Zap className="w-3 h-3 fill-white" /> {viewMode === 'business' ? 'MODO ATLETA' : 'MODO CENTRO'}
              </button>

            <section className={clsx("relative min-h-[90vh] md:min-h-screen flex items-center px-4 md:px-6 overflow-hidden transition-all duration-700 pb-20 pt-24 md:pt-32", viewMode === 'business' ? "bg-noise" : "bg-black")}>
              <div className="absolute inset-0 z-0">
                <div className={clsx("absolute inset-0 z-10 transition-colors", viewMode === 'business' ? "bg-background/95" : "bg-black/70")} />
                <video autoPlay loop muted playsInline className={clsx("w-full h-full object-cover transition-opacity", viewMode === 'business' ? "grayscale opacity-5" : "grayscale opacity-40")}>
                  <source src="https://assets.mixkit.co/videos/preview/mixkit-boxer-training-with-a-punching-bag-in-a-dark-gym-40537-large.mp4" type="video/mp4" />
                </video>
              </div>

              <div className="container max-w-7xl mx-auto relative z-30">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 md:gap-24 items-center">
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-2xl text-center lg:text-left">
                    <div className={clsx("inline-flex items-center gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-6 md:mb-10 animate-pulse mx-auto lg:mx-0", viewMode === 'business' ? "text-brand-orange border-brand-orange/20" : "text-brand-red glass-red")}>
                      <Sparkles className="w-3 h-3 md:w-4 md:h-4" /> {viewMode === 'business' ? 'PARTNER ECOSYSTEM 2026' : t.hero.future}
                    </div>
                    <h1 className={clsx("font-heading font-black italic leading-[0.85] tracking-tighter mb-8 md:mb-10 transition-all uppercase", viewMode === 'business' ? "text-5xl md:text-7xl lg:text-8xl text-foreground" : "text-5xl md:text-8xl lg:text-9xl text-white")}>
                      {viewMode === 'business' ? <>GESTIÓN <br className="hidden md:block" /> <span className="text-brand-orange">INTELIGENTE.</span></> : 
                      <>{t.hero.title} <br className="hidden md:block" /> <span className="text-gradient-red drop-shadow-glow">{t.hero.subtitle}</span></>}
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-lg lg:text-xl font-medium max-w-xl mb-10 md:mb-12 border-l-2 md:border-l-4 border-current pl-5 md:pl-8 uppercase tracking-tight mx-auto lg:mx-0">
                        {viewMode === 'business' ? 'Gestiona tu comunidad, centraliza tus pagos y posiciona tu centro frente a miles de atletas competitivos. Todo en un solo ecosistema.' : t.hero.description}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6">
                      <Link href={viewMode === 'business' ? '/center-signup' : '/signup'} className="w-full sm:w-auto relative group">
                        <div className={clsx("absolute inset-0 blur-2xl opacity-40 group-hover:opacity-100 transition-all", viewMode === 'business' ? "bg-brand-orange" : "bg-brand-red")} />
                        <div className={clsx("relative px-8 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-sm md:text-base uppercase tracking-widest flex items-center justify-center gap-4 transition-all hover:scale-105 shadow-glow", viewMode === 'business' ? "bg-brand-orange text-white" : "bg-brand-red text-white")}>
                          {viewMode === 'business' ? 'COMENZAR AHORA' : t.hero.ctaStart} <ArrowRight className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                      </Link>
                      <button onClick={() => setShowVideoModal(true)} className="w-full sm:w-auto glass-dark hover:bg-muted/10 text-foreground px-8 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-sm md:text-base uppercase tracking-widest flex items-center justify-center gap-4 transition-all hover:scale-105 border border-border">VER DEMO</button>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, scale: 0.9, x: 50 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: 1, delay: 0.2 }} className="relative hidden lg:block">
                    {viewMode === 'athlete' ? (
                      <div className="w-full max-w-sm aspect-[9/16] glass-dark rounded-[3.5rem] border-2 border-white/10 overflow-hidden relative group ml-auto shadow-2xl">
                          <Image src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069" alt="App" fill className="object-cover opacity-60" />
                          <div className="absolute inset-0 bg-black/40 p-10 flex flex-col justify-end">
                             <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-full border-2 border-brand-red p-1"><div className="w-full h-full bg-brand-red rounded-full" /></div><div><p className="text-white font-black italic">ALEX STERLING</p><p className="text-brand-red text-[10px] font-bold">RANK #42</p></div></div>
                             <div className="glass-red p-4 rounded-2xl"><p className="text-[10px] uppercase font-bold text-white/40">BACK SQUAT</p><h4 className="text-2xl font-black text-white italic">140<span className="text-sm">KG</span></h4></div>
                          </div>
                      </div>
                    ) : (
                      <div className="relative w-full group">
                         <div className="absolute -inset-10 bg-brand-orange/20 blur-[120px] rounded-full opacity-50 transition-opacity group-hover:opacity-80" />
                         <div className="relative w-full max-w-lg mx-auto glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.4)] backdrop-blur-3xl animate-float">
                            <div className="bg-white/5 px-8 py-5 border-b border-white/5 flex items-center justify-between">
                               <div className="flex gap-2"><div className="w-3 h-3 rounded-full bg-red-500/30" /><div className="w-3 h-3 rounded-full bg-yellow-500/30" /><div className="w-3 h-3 rounded-full bg-green-500/30" /></div>
                               <div className="flex items-center gap-3 px-3 py-1 bg-brand-orange/10 border border-brand-orange/20 rounded-full">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                                  <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest uppercase">RIVAL CMS LIVE</span>
                               </div>
                            </div>
                            
                            <div className="p-10 space-y-10">
                               <div className="grid grid-cols-3 gap-6">
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-white/40"><Users className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-widest">SOCIOS</span></div>
                                     <p className="text-3xl font-heading font-black italic text-white tracking-tighter">1,240</p>
                                     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-brand-orange w-[85%]" /></div>
                                  </div>
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-white/40"><Activity className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-widest">RETENCIÓN</span></div>
                                     <p className="text-3xl font-heading font-black italic text-emerald-400 tracking-tighter">88%</p>
                                     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 w-[92%]" /></div>
                                  </div>
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-white/40"><DollarSign className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-widest">REVENUE</span></div>
                                     <p className="text-3xl font-heading font-black italic text-white tracking-tighter">+12K€</p>
                                     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-white/20 w-[60%]" /></div>
                                  </div>
                               </div>

                               <div className="space-y-6">
                                  <div className="flex justify-between items-center"><h5 className="text-[10px] font-black uppercase text-white/60 tracking-widest italic tracking-widest">PRÓXIMAS CLASES_</h5><MoreVertical className="w-4 h-4 text-white/20" /></div>
                                  <div className="space-y-3">
                                     {[
                                        { t: 'WOD MAÑERO', time: '07:30h', cap: '18/20' },
                                        { t: 'OPEN GYM', time: '11:00h', cap: '5/12' },
                                        { t: 'PRO SERIES', time: '18:00h', cap: '14/15' }
                                     ].map((cl, i) => (
                                       <div key={i} className="flex items-center justify-between p-4 glass rounded-2xl border border-white/5 hover:bg-white/5 transition-all group/item cursor-pointer">
                                          <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-brand-orange group-hover/item:scale-110 transition-transform"><Calendar className="w-4 h-4" /></div>
                                             <div><p className="text-[11px] font-black text-white uppercase tracking-tighter">{cl.t}</p><p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{cl.time}</p></div>
                                          </div>
                                          <div className="text-[9px] font-black text-brand-orange/80 tabular-nums">{cl.cap}</div>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </section>

            <section id="features" className="py-24 md:py-40 bg-background relative overflow-hidden transition-colors duration-500">
               <div className="max-w-7xl mx-auto px-4 md:px-6">
                  <div className="text-center mb-16 md:mb-24">
                     <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 20 }} className={clsx("inline-flex items-center gap-3 px-4 md:px-5 py-2 md:py-2.5 rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mb-6", viewMode === 'business' ? "border-brand-orange/20 text-brand-orange" : "border-border text-muted-foreground")}>
                       {viewMode === 'business' ? 'PLATAFORMA INTEGRADA' : 'ECOSISTEMA ELITE'}
                     </motion.div>
                     <h2 className="text-4xl md:text-7xl lg:text-8xl font-heading font-black italic tracking-tighter uppercase mb-8 text-foreground leading-tight">
                        {viewMode === 'business' ? <>TU CENTRO <span className="text-brand-orange">POTENCIADO.</span></> : <>PARA LOS <span className="text-brand-red text-shadow-red">OBSESIONADOS.</span></>}
                     </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 auto-rows-auto md:auto-rows-[340px]">
                      {viewMode === 'athlete' ? (
                        <>
                          <BentoCard className="md:col-span-8 md:row-span-2 min-h-[400px] md:min-h-0" tag="Social" title="Red Social Vertical" desc="Feed libre de ruido. Comparte tus entrenos con atletas reales."
                            visual={<div className="absolute inset-0 bg-black/40 z-[-1] flex items-center justify-center scale-90 md:scale-100"><div className="relative w-48 h-80 rounded-3xl overflow-hidden border-2 border-white/20 rotate-[-12deg] z-10"><Image src="https://images.unsplash.com/photo-1549476464-37392f717541?q=80&w=2070" fill alt="W1" className="object-cover" /></div><div className="absolute w-48 h-80 rounded-3xl overflow-hidden border-2 border-white/20 rotate-[12deg] translate-x-12"><Image src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070" fill alt="W2" className="object-cover" /></div></div>}
                          />
                          <BentoCard className="md:col-span-4" tag="Logbook" title="Registro Elite" desc="WODs, AMRAPs, EMOMs. Herramientas profesionales." visual={<Dumbbell className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 text-brand-red rotate-45" />} />
                          <BentoCard className="md:col-span-4" tag="Competición" title="Líder Global" desc="Escala en los Leaderboards mundiales cada semana." visual={<Trophy className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 text-yellow-500" />} />
                          <BentoCard className="md:col-span-4" tag="Duelos" title="Batallas 1v1" desc="Desafía a cualquier rival a una batalla de volumen." visual={<Flame className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 text-brand-orange animate-pulse" />} />
                          <BentoCard className="md:col-span-8" tag="IA Analytical" title="Rival Insight" desc="Visualiza tu volumen y estimación de 1RM." visual={<div className="absolute inset-x-12 bottom-0 h-32 flex items-end justify-between gap-1 overflow-hidden">{[30, 60, 45, 90, 70, 100, 40, 80].map((h, i) => <div key={i} className="flex-1 bg-brand-red/40 rounded-t-lg" style={{ height: `${h}%` }} />)}</div>} />
                        </>
                      ) : (
                        <>
                          <BentoCard className="md:col-span-8 md:row-span-2 min-h-[400px] md:min-h-0 overflow-hidden" theme="orange" tag="Visibilidad" title="Gana Visibilidad" desc="Atrae clientes y posiciona tu centro frente a miles de atletas competitivos." 
                            visual={
                               <div className="absolute inset-0 bg-black overflow-hidden">
                                  <div className="absolute inset-0 opacity-20">
                                     <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-brand-orange rounded-full animate-ping shadow-[0_0_20px_white]" />
                                     <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-brand-orange rounded-full animate-ping delay-700 shadow-[0_0_20px_white]" />
                                     <div className="absolute top-3/4 left-1/3 w-1 h-1 bg-brand-orange rounded-full animate-ping delay-1000 shadow-[0_0_20px_white]" />
                                     <div className="absolute top-1/2 left-1/2 w-80 h-80 border border-brand-orange/20 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                     <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] border border-brand-orange/10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse delay-500" />
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                     <div className="relative w-64 h-64 opacity-40">
                                        <Globe2 className="w-full h-full text-brand-orange/20 animate-spin-slow" />
                                     </div>
                                  </div>
                                  <div className="absolute bottom-1/3 left-1/4 flex items-center gap-2 glass-dark p-2 rounded-xl animate-float border border-white/5 active:scale-95 transition-all">
                                     <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center"><Check className="w-3 h-3 text-emerald-500" /></div>
                                     <span className="text-[8px] font-black text-white/60 tracking-widest uppercase">+1,420 ATLETAS</span>
                                  </div>
                                  <div className="absolute top-1/3 right-1/4 flex items-center gap-2 glass-dark p-2 rounded-xl animate-float delay-700 border border-white/5 active:scale-95 transition-all">
                                     <div className="w-6 h-6 rounded-lg bg-brand-orange/20 flex items-center justify-center"><Activity className="w-3 h-3 text-brand-orange" /></div>
                                     <span className="text-[8px] font-black text-white/60 tracking-widest uppercase">VIRAL GROWTH</span>
                                  </div>
                               </div>
                            } 
                          />
                          <BentoCard className="md:col-span-4" theme="orange" tag="Control" title="Gestiona tu Box" desc="Organiza WODs, controla reservas y haz crecer tu comunidad." visual={<CalendarCheck className="absolute -bottom-10 -right-10 w-48 h-48 opacity-20 text-brand-orange" />} />
                          <BentoCard className="md:col-span-4" theme="orange" tag="Insights" title="Analíticas" desc="Analiza el rendimiento y optimiza tus clases basadas en datos." visual={<BarChart3 className="absolute -bottom-10 -right-10 w-48 h-48 opacity-20 text-brand-orange" />} />
                          <BentoCard className="md:col-span-4" theme="orange" tag="Pagos" title="Facturación" desc="Automatiza tus cobros mensuales y suscripciones vía Stripe." visual={<DollarSign className="absolute -bottom-10 -right-10 w-48 h-48 opacity-20 text-brand-orange" />} />
                          <BentoCard className="md:col-span-8" theme="orange" tag="Support" title="Soporte VIP" desc="Importa tus datos fácilmente con asistencia personalizada." visual={<Monitor className="absolute -bottom-10 -right-10 w-64 h-64 opacity-10 text-white" />} />
                        </>
                      )}
                  </div>
               </div>
            </section>

            <section className={clsx("relative py-12 md:py-16 overflow-hidden z-40 transform rotate-[-1deg] scale-[1.05] shadow-2xl transition-colors duration-700", viewMode === 'business' ? "bg-brand-orange" : "bg-brand-red")}>
               <div className="flex animate-marquee-slow whitespace-nowrap items-center font-heading font-black italic text-3xl md:text-5xl uppercase tracking-tighter text-black">
                  {[1, 2, 3, 4].map(set => (
                    <div key={set} className="flex items-center">
                       <span className="mx-8 md:mx-12">{viewMode === 'business' ? 'CENTRO DE MANDO LÍDER' : 'EL FUTURO DEL FITNESS'}</span>
                       <div className="w-3 h-3 rounded-full bg-black mx-6" />
                       <span className="mx-8 md:mx-12">{viewMode === 'business' ? 'PARTNER NETWORK' : 'JOIN THE 1%'}</span>
                       <div className="w-3 h-3 rounded-full bg-black mx-6" />
                    </div>
                  ))}
               </div>
            </section>

            <section id="pricing" className="py-24 md:py-40 bg-background relative flex flex-col items-center justify-center">
               <div className="max-w-4xl w-full px-4 md:px-6 text-center">
                  <motion.div whileInView={{ scale: 1, opacity: 1 }} initial={{ scale: 0.95, opacity: 0 }} className={clsx("p-10 md:p-20 rounded-[3rem] border-2 relative overflow-hidden transition-all", viewMode === 'business' ? "border-brand-orange/30 bg-brand-orange/5 shadow-[0_0_100px_rgba(255,100,0,0.1)]" : "glass-red border-brand-red/40")}>
                    <div className="relative z-10">
                      <div className={clsx("w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-8 shadow-glow", viewMode === 'business' ? "bg-brand-orange" : "bg-brand-red")}><Flame className="w-8 h-8 text-white fill-current" /></div>
                      <h2 className="text-4xl md:text-7xl font-heading font-black italic text-foreground tracking-tighter uppercase mb-6 leading-tight">
                        {viewMode === 'business' ? <>PRECIOS <br/> <span className="text-brand-orange">SOCIOS.</span></> : <>PARA ATLETAS: <br/> <span className="text-brand-red">100% GRATIS.</span></>}
                      </h2>
                      <p className="text-muted-foreground text-sm md:text-xl font-medium max-w-2xl mx-auto mb-10 md:mb-16 uppercase tracking-tight">
                        {viewMode === 'business' ? 'Planes escalables para tu box. Agenda una demo hoy mismo.' : 'Regístrate hoy y domina la arena global.'}
                      </p>
                      <Link href={viewMode === 'business' ? '/center-signup' : '/signup'} className={clsx("w-full sm:w-auto inline-flex items-center justify-center gap-4 px-10 py-5 rounded-2xl md:rounded-3xl font-black text-sm md:text-base uppercase tracking-widest hover:scale-105 shadow-2xl transition-all", viewMode === 'business' ? "bg-brand-orange text-white" : "bg-brand-red text-white")}>
                        {viewMode === 'business' ? 'VER DEMO PERSONALIZADA' : 'EMPEZAR GRATIS'} <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
                      </Link>
                    </div>
                  </motion.div>
               </div>
            </section>

            <footer className="bg-black py-24 md:py-40 border-t border-white/5 relative z-50">
               <div className="max-w-7xl mx-auto px-6 font-bold">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-20 mb-20 text-center md:text-left">
                   <div className="md:col-span-1 flex flex-col items-center md:items-start"><Link href="/" className="flex items-center gap-4 mb-8"><Image src="/logo.svg" alt="Rival" width={44} height={44} className="w-11 h-11" /><span className="font-heading font-black text-3xl tracking-tighter text-white uppercase italic">RIVAL<span className="text-brand-red">FIT</span></span></Link></div>
                   {[ 
                      { t: 'SOLUCIONES', l: ['Arena Feed', 'Leaderboard', 'Coaching'] }, 
                      { t: 'BUSINESS', l: ['Para Centros', 'Partners', 'Developer API'] }, 
                      { t: 'LEGAL', l: ['Privacy', 'Terms', 'Cookies'] } 
                   ].map((g, i) => (
                     <div key={i}><h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-8 italic">{g.t}</h4><ul className="space-y-4">{g.l.map((link, j) => <li key={j} className="text-white/20 hover:text-brand-red text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors">{link}</li>)}</ul></div>))}
                 </div>
                </div>
            </footer>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

function BentoCard({ tag, title, desc, visual, className, theme = 'red' }: any) {
  return (
    <motion.div whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 30 }} viewport={{ once: true }} className={clsx("relative rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-border bg-card/40 backdrop-blur-sm group cursor-pointer transition-all hover:-translate-y-2", className, theme === 'orange' ? "hover:border-brand-orange/40" : "hover:border-brand-red/40")}>
      <div className="absolute inset-0 z-0">{visual}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-80" /></div>
      <div className="absolute inset-x-0 bottom-0 p-8 md:p-12 z-10 w-full">
        <div className={clsx("inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/10 text-[8px] md:text-[9px] font-black uppercase tracking-widest mb-4", theme === 'orange' ? "text-brand-orange" : "text-brand-red")}><Sparkles className="w-3.5 h-3.5" /> {tag}</div>
        <h3 className="text-2xl md:text-3xl font-heading font-black text-foreground italic uppercase tracking-tighter mb-2 leading-none">{title}</h3>
        <p className="text-muted-foreground text-[10px] md:text-sm font-bold uppercase tracking-tight">{desc}</p>
      </div>
    </motion.div>
  );
}
