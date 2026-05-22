"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Zap, Flame, Trophy, Users, MapPin, Target, Activity, 
  Building2, Calendar, ChevronRight, CheckCircle2 
} from "lucide-react";

export default function UnifiedPremiumLanding() {
  const [activeTab, setActiveTab] = useState<'athlete' | 'center'>('athlete');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-[#030303]" />;

  return (
    <main className="min-h-screen bg-[#030303] text-white selection:bg-brand-red selection:text-white font-outfit overflow-x-hidden relative">
      {/* Global Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-noise opacity-[0.03]" />
        <div className={`absolute top-0 right-0 w-[50%] h-[50%] blur-[150px] rounded-full transition-colors duration-1000 ${activeTab === 'athlete' ? 'bg-brand-red/10' : 'bg-brand-orange/10'}`} />
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
      <section className="relative z-10 pt-40 pb-20 px-6 lg:px-12 flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl">
           <div className="inline-flex items-center gap-3 glass px-4 py-2 rounded-full border-white/10">
             <div className="w-2 h-2 rounded-full bg-brand-red shadow-glow animate-pulse" />
             <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/80">El Ecosistema Fitness Definitivo</span>
           </div>
           
           <h1 className="text-6xl md:text-8xl lg:text-9xl font-black italic tracking-tighter uppercase leading-[0.85]">
              DOMINA TU <br/>
              <span className={`text-transparent bg-clip-text transition-colors duration-500 ${activeTab === 'athlete' ? 'bg-gradient-to-r from-brand-red to-white text-neon-red' : 'bg-gradient-to-r from-brand-orange to-white text-neon-orange'}`}>
                 TERRENO.
              </span>
           </h1>
           
           <p className="text-lg md:text-xl text-white/50 font-medium tracking-wide max-w-2xl mx-auto">
              La plataforma que unifica a los atletas más competitivos con los centros de alto rendimiento más exclusivos.
           </p>

           <div className="flex flex-wrap justify-center gap-6 pt-6">
              <Link href="/login" className="bg-white text-black px-10 py-4 font-black uppercase tracking-[0.2em] text-xs btn-sport-tech hover:bg-white/90 transition-colors shadow-2xl">
                 <span className="skew-x-[10deg] block">Iniciar Sesión</span>
              </Link>
              <Link href="/signup" className={`text-white px-10 py-4 font-black uppercase tracking-[0.2em] text-xs btn-sport-tech transition-colors shadow-2xl ${activeTab === 'athlete' ? 'bg-brand-red shadow-glow-red hover:bg-brand-accent' : 'bg-brand-orange shadow-glow-orange hover:bg-brand-orange/80'}`}>
                 <span className="skew-x-[10deg] block">Registrarse Gratis</span>
              </Link>
           </div>
        </motion.div>

        {/* Unified Toggle Controls */}
        <div className="mt-24 p-2 glass rounded-[2rem] flex flex-col sm:flex-row gap-2 max-w-2xl w-full border-white/10 relative z-20">
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
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     {[
                        { icon: Activity, title: "Diario de WODs", desc: "Registra marcas, pesos y repeticiones. Analiza tu rendimiento y nunca olvides un PR." },
                        { icon: Trophy, title: "Leaderboards", desc: "Ranking global y por box. Compite contra miles de atletas y descubre tu nivel real." },
                        { icon: Users, title: "Comunidad", desc: "Feed interactivo. Comparte vídeos, sigue a tus amigos y celebra cada victoria." }
                     ].map((f, i) => (
                        <div key={i} className="glass-dark border border-white/5 p-8 rounded-3xl hover:border-brand-red/30 transition-all duration-300 group">
                           <div className="w-14 h-14 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red mb-6 group-hover:bg-brand-red group-hover:text-white transition-colors">
                              <f.icon className="w-6 h-6" />
                           </div>
                           <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-3">{f.title}</h4>
                           <p className="text-white/50 text-sm font-medium leading-relaxed">{f.desc}</p>
                        </div>
                     ))}
                  </section>
                  
                  {/* Visual Athlete Showcase */}
                  <section className="glass-dark border border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center gap-12">
                     <div className="absolute top-0 right-0 p-8 opacity-10"><Zap className="w-64 h-64 text-brand-red" /></div>
                     <div className="flex-1 space-y-6 relative z-10">
                        <div className="text-[10px] font-black text-brand-red uppercase tracking-widest">Estadísticas en Vivo</div>
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">Analiza. Mejora.<br/>Repite.</h2>
                        <p className="text-white/60 font-medium max-w-md">Tu perfil de atleta centraliza todas tus marcas. Desde la fuerza bruta hasta la resistencia cardiovascular, visualiza tus picos de rendimiento.</p>
                     </div>
                     <div className="flex-1 w-full max-w-md bg-[#050505] rounded-[2rem] border border-white/10 p-6 relative z-10">
                        <div className="flex justify-between items-center mb-6">
                           <span className="font-black italic uppercase">Snatch Progression</span>
                           <span className="text-brand-red font-black italic text-xl">95KG</span>
                        </div>
                        <div className="flex items-end gap-2 h-32">
                            {[40, 45, 45, 60, 65, 80, 95].map((h, i) => (
                               <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className={`flex-1 rounded-t-sm ${i === 6 ? 'bg-brand-red shadow-glow-red' : 'bg-white/20'}`} />
                            ))}
                         </div>
                     </div>
                  </section>
               </motion.div>
            ) : (
               <motion.div 
                 key="center-content" 
                 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
                 className="max-w-7xl mx-auto px-6 lg:px-12 space-y-32"
               >
                  {/* Center Features */}
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     {[
                        { icon: Calendar, title: "Reservas Ágiles", desc: "Gestión de clases, lista de espera y check-ins sin fricción desde el móvil del atleta." },
                        { icon: Building2, title: "Gestión de Pagos", desc: "Facturación automatizada, suscripciones recurrentes y control de morosidad integrado." },
                        { icon: Trophy, title: "Leaderboards del Box", desc: "Sube entrenamientos diarios y genera rankings exclusivos para tu comunidad." }
                     ].map((f, i) => (
                        <div key={i} className="glass-dark border border-white/5 p-8 rounded-3xl hover:border-brand-orange/30 transition-all duration-300 group">
                           <div className="w-14 h-14 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange mb-6 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                              <f.icon className="w-6 h-6" />
                           </div>
                           <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-3">{f.title}</h4>
                           <p className="text-white/50 text-sm font-medium leading-relaxed">{f.desc}</p>
                        </div>
                     ))}
                  </section>

                  {/* Pricing Section (Mandatory for Centers) */}
                  <section className="space-y-16">
                     <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">Planes para <span className="text-brand-orange">Centros</span></h2>
                        <p className="text-white/40 max-w-xl mx-auto text-sm tracking-widest uppercase font-bold">Escala tu negocio con herramientas de nivel élite.</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {/* Starter Plan */}
                        <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-8 opacity-80 hover:opacity-100 transition-opacity">
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
                           <button className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                              Empezar Básico
                           </button>
                        </div>

                        {/* Pro Plan (Highlighted) */}
                        <div className="glass-dark p-8 rounded-[2.5rem] border-2 border-brand-orange shadow-glow-orange space-y-8 relative transform md:scale-105 z-10 bg-[#050505]">
                           <div className="absolute top-0 right-0 glass px-4 py-1 text-[9px] font-black uppercase tracking-widest text-brand-orange bg-brand-orange/10 rounded-bl-2xl rounded-tr-[2.5rem]">
                              Recomendado
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
                           <button className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-brand-orange text-white rounded-xl shadow-glow-orange hover:bg-orange-500 transition-colors">
                              Prueba Gratuita 14 Días
                           </button>
                        </div>

                        {/* Elite Plan */}
                        <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-8 opacity-80 hover:opacity-100 transition-opacity">
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
                     </div>
                  </section>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Futuristic Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/60 backdrop-blur-xl py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-widest text-white/30">
           <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-white/20" />
              <span>RIVAL FIT © 2026. Todos los derechos reservados.</span>
           </div>
           <div className="flex gap-8">
              <Link href="#" className="hover:text-white transition-colors">Términos</Link>
              <Link href="#" className="hover:text-white transition-colors">Privacidad</Link>
              <Link href="#" className="hover:text-white transition-colors">Soporte</Link>
           </div>
        </div>
      </footer>
    </main>
  );
}
