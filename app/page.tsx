"use client";

import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { 
  Zap, Flame, Trophy, Users, MapPin, Target, Activity, 
  Building2, Calendar, ChevronRight, CheckCircle2 
} from "lucide-react";

export default function UnifiedPremiumLanding() {
  const [activeTab, setActiveTab] = useState<'athlete' | 'center'>('athlete');

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 40, stiffness: 200 });
  const springY = useSpring(mouseY, { damping: 40, stiffness: 200 });
  const heroRotateX = useTransform(springY, [-0.5, 0.5], [4, -4]);
  const heroRotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleHeroMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#030303] text-white selection:bg-brand-red selection:text-white font-outfit overflow-x-hidden relative"
    >
      {/* Global Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-noise opacity-[0.03]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full p-6 md:px-12 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
            <Zap className="text-white fill-white w-5 h-5" />
          </div>
          <span className="font-black text-2xl italic tracking-tighter uppercase hidden sm:block">
            RIVAL <span className="text-brand-red">FIT</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
           <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors">
              Iniciar Sesión
           </Link>
           <Link href="/signup" className="glass px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-colors border-white/10">
              Registrarse
           </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative z-10 min-h-[100svh] flex flex-col justify-center pt-24 pb-16 px-6 lg:px-12"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        {/* Perspective Grid Floor */}
        <div className="absolute bottom-0 inset-x-0 h-[60%] overflow-hidden pointer-events-none">
          <div className="perspective-grid-red" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030303] to-transparent" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#030303] to-transparent" />
        </div>

        {/* Aurora Orbs */}
        <motion.div
          animate={{ scale: [1, 1.35, 1.1, 1], x: [0, 50, -20, 0], y: [0, -35, 10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute top-[8%] right-[3%] w-[550px] h-[550px] rounded-full blur-[140px] pointer-events-none transition-colors duration-1000 ${activeTab === 'athlete' ? 'bg-brand-red/18' : 'bg-brand-orange/18'}`}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
          className="absolute bottom-[25%] left-[3%] w-[320px] h-[320px] rounded-full blur-[100px] bg-white/[0.03] pointer-events-none"
        />

        {/* Split Layout */}
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-12 xl:gap-20 items-center relative z-10">

          {/* LEFT: Typography + CTA */}
          <motion.div
            style={{ rotateX: heroRotateX, rotateY: heroRotateY, transformPerspective: 1200 }}
            className="space-y-8 lg:space-y-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-3 glass px-4 py-2 rounded-full border-white/10">
                <div className="w-2 h-2 rounded-full bg-brand-red shadow-glow animate-pulse" />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80">El Ecosistema Fitness Definitivo</span>
              </div>

              <h1
                className="text-[4.5rem] sm:text-[6rem] md:text-[7rem] lg:text-[7.5rem] xl:text-[9rem] font-black italic tracking-tighter uppercase leading-[0.82]"
                style={{ textShadow: '4px 8px 0 rgba(0,0,0,0.55)' }}
              >
                DOMINA<br />
                TU<br />
                <span
                  className={`inline-block transition-colors duration-500 ${activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange'}`}
                  style={{
                    filter: activeTab === 'athlete'
                      ? 'drop-shadow(0 0 50px rgba(239,68,68,0.9)) drop-shadow(0 0 100px rgba(239,68,68,0.45))'
                      : 'drop-shadow(0 0 50px rgba(255,107,0,0.9)) drop-shadow(0 0 100px rgba(255,107,0,0.45))'
                  }}
                >
                  TERRENO.
                </span>
              </h1>

              <p className="text-base md:text-lg text-white/50 font-medium tracking-wide max-w-lg leading-relaxed">
                La plataforma que unifica a los atletas más competitivos con los centros de alto rendimiento más exclusivos.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/login" className="bg-white text-black px-8 py-4 font-black uppercase tracking-[0.2em] text-xs btn-sport-tech hover:bg-white/90 transition-colors shadow-2xl">
                  <span className="skew-x-[10deg] block">Iniciar Sesión</span>
                </Link>
                <Link href="/signup" className={`text-white px-8 py-4 font-black uppercase tracking-[0.2em] text-xs btn-sport-tech transition-colors shadow-2xl ${activeTab === 'athlete' ? 'bg-brand-red shadow-glow-red hover:bg-brand-accent' : 'bg-brand-orange shadow-glow-orange hover:bg-brand-orange/80'}`}>
                  <span className="skew-x-[10deg] block">Registrarse Gratis</span>
                </Link>
              </div>

              {/* Mobile-only feature hints */}
              <div className="flex flex-col gap-2.5 lg:hidden pt-1">
                {[
                  { icon: Activity, text: "Registra WODs y tus récords personales" },
                  { icon: Trophy, text: "Compite en rankings globales y por box" },
                  { icon: Users, text: "Comunidad activa de atletas" }
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="flex items-center gap-3 text-white/40">
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange'}`} />
                    <span className="text-xs font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

          </motion.div>

          {/* RIGHT: App Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            className="hidden lg:block relative"
          >
            {/* Main card */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              className="glass-dark rounded-[2rem] p-7 shadow-2xl relative overflow-hidden border border-white/10"
              style={{ transform: 'perspective(1400px) rotateY(-8deg) rotateX(4deg)' }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${activeTab === 'athlete' ? 'bg-brand-red' : 'bg-brand-orange'}`}>
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-black italic uppercase text-sm tracking-tight">Leaderboard</div>
                    <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Semana Actual</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">En Vivo</span>
                </div>
              </div>

              {/* Leaderboard entries */}
              <div className="space-y-2.5 mb-6">
                {[
                  { rank: 1, name: "@alex_wod", pts: 145, pct: 95 },
                  { rank: 2, name: "@maria_rx", pts: 128, pct: 84 },
                  { rank: 3, name: "@jose_fit", pts: 112, pct: 73 },
                  { rank: 4, name: "@sara_cf", pts: 96, pct: 63 },
                ].map((entry, i) => (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${i === 0 ? (activeTab === 'athlete' ? 'bg-brand-red/10 border border-brand-red/20' : 'bg-brand-orange/10 border border-brand-orange/20') : 'bg-white/[0.03]'}`}
                  >
                    <span className={`text-xs font-black w-4 text-center ${i === 0 ? (activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange') : 'text-white/25'}`}>
                      {entry.rank}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-black ${i === 0 ? 'text-white' : 'text-white/60'}`}>{entry.name}</span>
                        <span className={`text-xs font-black italic ${i === 0 ? (activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange') : 'text-white/40'}`}>{entry.pts}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${entry.pct}%` }}
                          transition={{ delay: 0.9 + i * 0.1, duration: 0.9, ease: "easeOut" }}
                          className={`h-full rounded-full ${i === 0 ? (activeTab === 'athlete' ? 'bg-gradient-to-r from-brand-red to-red-400' : 'bg-gradient-to-r from-brand-orange to-orange-400') : 'bg-white/15'}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Progress chart */}
              <div className="border-t border-white/5 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/35">Progresión WOD</span>
                  <span className={`text-xs font-black italic ${activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange'}`}>↑ 23% este mes</span>
                </div>
                <div className="flex items-end gap-2 h-14">
                  {[28, 42, 38, 58, 62, 72, 95].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 1.1 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                      className={`flex-1 rounded-t-sm ${i === 6 ? (activeTab === 'athlete' ? 'bg-brand-red shadow-glow-red' : 'bg-brand-orange shadow-glow-orange') : 'bg-white/10'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Inner glow */}
              <div className={`absolute -bottom-12 -right-12 w-52 h-52 rounded-full blur-[70px] opacity-40 ${activeTab === 'athlete' ? 'bg-brand-red/40' : 'bg-brand-orange/40'}`} />
            </motion.div>

          </motion.div>
        </div>

        {/* Unified Toggle Controls */}
        <div className="mt-16 md:mt-20 p-2 glass rounded-[2rem] flex flex-col sm:flex-row gap-2 max-w-2xl w-full mx-auto border-white/10 relative z-20">
          <button
            onClick={() => setActiveTab('athlete')}
            className={`flex-1 py-5 rounded-3xl font-black italic uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-3 ${activeTab === 'athlete' ? 'bg-brand-red text-white shadow-glow-red scale-[1.02]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <Flame className={activeTab === 'athlete' ? 'animate-pulse' : ''} /> Para Atletas
          </button>
          <button
            onClick={() => setActiveTab('center')}
            className={`flex-1 py-5 rounded-3xl font-black italic uppercase tracking-widest text-sm transition-all duration-300 flex items-center justify-center gap-3 ${activeTab === 'center' ? 'bg-brand-orange text-white shadow-glow-orange scale-[1.02]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            <Building2 className={activeTab === 'center' ? 'animate-pulse' : ''} /> Para Centros
          </button>
        </div>
      </section>

      {/* Dynamic Content Section */}
      <div className="relative z-10 w-full min-h-[60vh] pb-32">
         <AnimatePresence mode="wait">
            {activeTab === 'athlete' ? (
               <motion.div 
                 key="athlete-content" 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                 className="max-w-7xl mx-auto px-6 lg:px-12 space-y-32"
               >
                  {/* Athlete Features */}
                  <section className="space-y-14">
                     <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
                       <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                         Todo lo que necesitas.<br />
                         <span className="text-brand-red">En un solo lugar.</span>
                       </h2>
                     </motion.div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {[
                         { num: "01", icon: Activity, title: "Diario de WODs", desc: "Registra marcas, pesos y repeticiones. Analiza tu rendimiento y nunca olvides un PR." },
                         { num: "02", icon: Trophy, title: "Leaderboards", desc: "Ranking global y por box. Compite contra miles de atletas y descubre tu nivel real." },
                         { num: "03", icon: Users, title: "Comunidad", desc: "Feed interactivo. Comparte vídeos, sigue a tus amigos y celebra cada victoria." }
                       ].map((f, i) => (
                         <motion.div
                           key={i}
                           initial={{ opacity: 0, y: 30 }}
                           whileInView={{ opacity: 1, y: 0 }}
                           viewport={{ once: true }}
                           transition={{ delay: i * 0.12 }}
                           className="relative glass-dark border border-white/5 p-8 rounded-3xl group overflow-hidden hover:border-brand-red/30 transition-all duration-500 cursor-default"
                         >
                           <span className="absolute -top-3 -right-1 text-[7rem] font-black italic text-white/[0.04] leading-none select-none pointer-events-none">{f.num}</span>
                           <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                           <div className="w-14 h-14 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red mb-6 group-hover:bg-brand-red group-hover:text-white transition-all duration-300 group-hover:scale-105">
                             <f.icon className="w-6 h-6" />
                           </div>
                           <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-3">{f.title}</h4>
                           <p className="text-white/50 text-sm font-medium leading-relaxed">{f.desc}</p>
                         </motion.div>
                       ))}
                     </div>
                  </section>
                  
                  {/* Visual Athlete Showcase */}
                  <motion.section
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-dark border border-white/10 rounded-[3rem] p-8 lg:p-14 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center gap-12"
                  >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05]"><Zap className="w-72 h-72 text-brand-red" /></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-brand-red/8 rounded-full blur-[80px] pointer-events-none" />
                    <div className="flex-1 space-y-6 relative z-10">
                      <div className="text-[10px] font-black text-brand-red uppercase tracking-widest">Rendimiento en Vivo</div>
                      <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">Analiza.<br />Mejora.<br />Repite.</h2>
                      <p className="text-white/60 font-medium max-w-md leading-relaxed">Tu perfil de atleta centraliza todas tus marcas. Desde la fuerza bruta hasta la resistencia cardiovascular, visualiza tus picos de rendimiento.</p>
                      <Link href="/signup" className="inline-flex items-center gap-2 text-brand-red font-black uppercase text-xs tracking-widest group hover:gap-4 transition-all duration-300">
                        Empezar Gratis <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                    <div className="flex-1 w-full max-w-md bg-black/50 rounded-[2rem] border border-white/10 p-6 relative z-10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black uppercase tracking-wider text-white/70">Progresión Semanal</span>
                        <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Últimas 7 semanas</span>
                      </div>
                      <div className="text-brand-red font-black italic text-2xl mb-6">↑ Récord Personal</div>
                      <div className="flex items-end gap-2 h-32">
                        {[38, 44, 42, 60, 64, 79, 100].map((h, i) => (
                          <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }} className={`flex-1 rounded-t-sm ${i === 6 ? 'bg-brand-red shadow-glow-red' : 'bg-white/15'}`} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-[9px] text-white/20 font-bold">
                        {['S1','S2','S3','S4','S5','S6','Hoy'].map(l => <span key={l}>{l}</span>)}
                      </div>
                    </div>
                  </motion.section>
               </motion.div>
            ) : (
               <motion.div 
                 key="center-content" 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                 className="max-w-7xl mx-auto px-6 lg:px-12 space-y-32"
               >
                  {/* Center Features */}
                  <section className="space-y-14">
                     <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-3">
                       <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                         Gestiona tu centro.<br />
                         <span className="text-brand-orange">Sin fricción.</span>
                       </h2>
                     </motion.div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {[
                         { num: "01", icon: Calendar, title: "Reservas Ágiles", desc: "Gestión de clases, lista de espera y check-ins sin fricción desde el móvil del atleta." },
                         { num: "02", icon: Building2, title: "Gestión de Pagos", desc: "Facturación automatizada, suscripciones recurrentes y control de morosidad integrado." },
                         { num: "03", icon: Trophy, title: "Leaderboards del Box", desc: "Sube entrenamientos diarios y genera rankings exclusivos para tu comunidad." }
                       ].map((f, i) => (
                         <motion.div
                           key={i}
                           initial={{ opacity: 0, y: 30 }}
                           whileInView={{ opacity: 1, y: 0 }}
                           viewport={{ once: true }}
                           transition={{ delay: i * 0.12 }}
                           className="relative glass-dark border border-white/5 p-8 rounded-3xl group overflow-hidden hover:border-brand-orange/30 transition-all duration-500 cursor-default"
                         >
                           <span className="absolute -top-3 -right-1 text-[7rem] font-black italic text-white/[0.04] leading-none select-none pointer-events-none">{f.num}</span>
                           <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-orange/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                           <div className="w-14 h-14 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange mb-6 group-hover:bg-brand-orange group-hover:text-white transition-all duration-300 group-hover:scale-105">
                             <f.icon className="w-6 h-6" />
                           </div>
                           <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-3">{f.title}</h4>
                           <p className="text-white/50 text-sm font-medium leading-relaxed">{f.desc}</p>
                         </motion.div>
                       ))}
                     </div>
                  </section>

                  {/* Pricing Section */}
                  <section className="space-y-16">
                     <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">Planes para <span className="text-brand-orange">Centros</span></h2>
                        <p className="text-white/40 max-w-xl mx-auto text-sm tracking-widest uppercase font-bold">Escala tu negocio con herramientas de nivel élite.</p>
                     </motion.div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {/* Starter Plan */}
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0 }}>
                          <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-8 hover:border-white/15 transition-all duration-300">
                           <div>
                              <h3 className="text-xl font-black uppercase tracking-widest text-white/60 mb-2">Básico</h3>
                              <div className="flex items-end gap-1">
                                 <span className="text-5xl font-black italic text-white">€49</span>
                                 <span className="text-xs text-white/40 uppercase font-bold pb-2">/mes</span>
                              </div>
                           </div>
                           <ul className="space-y-4 text-sm font-medium text-white/70">
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-brand-orange" /> Hasta 100 atletas</li>
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-brand-orange" /> Gestión de clases básica</li>
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-brand-orange" /> Programación de 1 WOD diario</li>
                           </ul>
                           <Link href="/center-signup" className="block w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-center">
                              Empezar Básico
                           </Link>
                          </div>
                        </motion.div>

                        {/* Pro Plan */}
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="relative z-10">
                          <div className="relative glass-dark p-8 rounded-[2.5rem] border-2 border-brand-orange space-y-8 bg-[#050505] overflow-hidden" style={{ boxShadow: '0 0 40px rgba(255,107,0,0.2), 0 0 80px rgba(255,107,0,0.08)' }}>
                           <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-orange to-transparent" />
                           <div className="absolute top-0 right-0 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-brand-orange bg-brand-orange/10 rounded-bl-2xl rounded-tr-[2.5rem]">
                              Más Popular
                           </div>
                           <div>
                              <h3 className="text-2xl font-black uppercase tracking-widest text-brand-orange mb-2">Pro</h3>
                              <div className="flex items-end gap-1">
                                 <span className="text-6xl font-black italic text-white">€99</span>
                                 <span className="text-xs text-white/40 uppercase font-bold pb-2">/mes</span>
                              </div>
                           </div>
                           <ul className="space-y-4 text-sm font-medium text-white/90">
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-orange" /> Atletas Ilimitados</li>
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-orange" /> Leaderboards privados del Box</li>
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-orange" /> Pagos y suscripciones Stripe</li>
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-brand-orange" /> Estadísticas y MRR en vivo</li>
                           </ul>
                           <Link href="/center-signup" className="block w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-brand-orange text-white rounded-xl hover:bg-orange-500 transition-colors text-center" style={{ boxShadow: '0 0 20px rgba(255,107,0,0.4)' }}>
                              Prueba Gratuita 14 Días
                           </Link>
                          </div>
                        </motion.div>

                        {/* Elite Plan */}
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                          <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-8 hover:border-white/15 transition-all duration-300">
                           <div>
                              <h3 className="text-xl font-black uppercase tracking-widest text-white/60 mb-2">Élite</h3>
                              <div className="flex items-end gap-1">
                                 <span className="text-4xl font-black italic text-white leading-tight">A Medida</span>
                              </div>
                           </div>
                           <ul className="space-y-4 text-sm font-medium text-white/70">
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white/40" /> Migración de datos guiada</li>
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white/40" /> Soporte prioritario 24/7</li>
                              <li className="flex items-center gap-3"><CheckCircle2 className="w-4 h-4 text-white/40" /> App marca blanca (Próximamente)</li>
                           </ul>
                           <button className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                              Contactar Ventas
                           </button>
                          </div>
                        </motion.div>
                     </div>
                  </section>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Pre-Footer CTA */}
      <section className="relative z-10 py-28 px-6 lg:px-12 overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-brand-red/8 rounded-full blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center space-y-8 relative z-10"
        >
          <div className="inline-flex items-center gap-3 glass px-4 py-2 rounded-full border-white/10">
            <Zap className="w-3 h-3 text-brand-red" />
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/60">Únete Ahora — Es Gratis</span>
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter leading-[0.85]">
            ¿Listo para<br />
            <span className="text-brand-red" style={{ filter: 'drop-shadow(0 0 40px rgba(239,68,68,0.7))' }}>Dominar?</span>
          </h2>
          <p className="text-white/50 text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Crea tu perfil de atleta, registra tus WODs, compite en rankings y conecta con tu comunidad. Sin tarjeta de crédito.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="bg-brand-red text-white px-10 py-4 font-black uppercase tracking-[0.2em] text-xs btn-sport-tech hover:bg-brand-accent transition-colors" style={{ boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}>
              <span className="skew-x-[10deg] block">Crear Cuenta Gratis</span>
            </Link>
            <Link href="/login" className="glass border border-white/15 text-white px-10 py-4 font-black uppercase tracking-[0.2em] text-xs btn-sport-tech hover:bg-white/10 transition-colors">
              <span className="skew-x-[10deg] block">Ya Tengo Cuenta</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/80 backdrop-blur-xl py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-brand-red/80 rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/25">RIVAL FIT © 2026</span>
          </div>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/25">
            <Link href="/legal/terms" className="hover:text-white/60 transition-colors">Términos</Link>
            <Link href="/legal/privacy" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link href="mailto:soporte@rivalfit.app" className="hover:text-white/60 transition-colors">Soporte</Link>
          </div>
        </div>
      </footer>
    </motion.main>
  );
}
