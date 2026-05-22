"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { Zap, Flame, Target, ChevronRight, Activity, Users, Trophy } from "lucide-react";

export default function PremiumLanding() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <main className="min-h-screen bg-[#030303] text-white selection:bg-brand-red selection:text-white font-outfit overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-noise opacity-[0.03]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-red/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-brand-orange/10 rounded-full blur-[150px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col justify-center px-6 lg:px-24">
        <motion.nav 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute top-0 left-0 w-full p-8 flex justify-between items-center"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center shadow-glow">
              <Zap className="text-white fill-white w-5 h-5" />
            </div>
            <span className="font-black text-2xl italic tracking-tighter uppercase">
              RIVAL <span className="text-brand-red">FIT</span>
            </span>
          </div>
          <Link href="/profile" className="glass px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase hover:bg-white/10 transition-colors">
            Acceder
          </Link>
        </motion.nav>

        <div className="max-w-5xl space-y-8 mt-20">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-3 glass px-4 py-2 rounded-full"
          >
            <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.3em] uppercase text-brand-red">Nueva Era del Fitness</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-6xl md:text-8xl lg:text-[140px] font-black italic tracking-tighter leading-[0.85] uppercase"
          >
            Redefine tu <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-brand-orange text-neon-red">
              Potencial.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-xl text-lg text-white/50 font-medium tracking-wide"
          >
            La plataforma definitiva que conecta atletas de élite y centros de alto rendimiento. Registra, compite y domina.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap gap-6 pt-8"
          >
            <Link href="/profile" className="group relative bg-brand-red text-white px-8 py-4 font-black uppercase tracking-[0.2em] text-xs flex items-center gap-4 overflow-hidden btn-sport-tech">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative z-10 skew-x-[10deg]">Empezar Ahora</span>
              <ChevronRight className="relative z-10 w-4 h-4 skew-x-[10deg] group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link href="#features" className="glass px-8 py-4 font-black uppercase tracking-[0.2em] text-xs flex items-center gap-4 hover:bg-white/5 transition-colors btn-sport-tech">
              <span className="skew-x-[10deg]">Descubrir Más</span>
            </Link>
          </motion.div>
        </div>

        {/* Floating elements animation */}
        <motion.div 
          style={{ y, opacity }}
          className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block"
        >
          <div className="relative w-[400px] h-[600px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/20 to-transparent rounded-[2rem] border border-white/10 glass-dark flex flex-col justify-between p-8 transform rotate-3 shadow-glow-red hover:rotate-0 transition-all duration-700">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black tracking-widest text-brand-red uppercase">Rendimiento en vivo</span>
                 <Activity className="w-5 h-5 text-brand-red animate-pulse" />
              </div>
              <div className="space-y-4">
                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1.5, delay: 1 }}
                      className="h-full bg-brand-red"
                    />
                 </div>
                 <div className="flex justify-between text-xs font-black uppercase text-white/50">
                    <span>Carga Semanal</span>
                    <span className="text-white">75%</span>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 px-6 lg:px-24 bg-black/50 backdrop-blur-3xl border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="text-center space-y-6">
             <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase">Ecosistema <span className="text-brand-red">Elite</span></h2>
             <p className="text-white/40 max-w-2xl mx-auto text-sm tracking-widest uppercase font-bold">Todo lo que necesitas para llevar tu entrenamiento al siguiente nivel.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Flame, title: "Diario de WODs", desc: "Registra cada repetición. Analiza tu progreso con gráficos avanzados." },
              { icon: Trophy, title: "Leaderboards", desc: "Compite globalmente. Compara tus marcas con atletas de tu nivel." },
              { icon: Users, title: "Comunidad", desc: "Conecta con centros y atletas. Comparte tus victorias en tiempo real." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="glass-dark p-10 rounded-[2rem] space-y-6 group border border-white/5 hover:border-brand-red/30 transition-colors"
              >
                <div className="w-14 h-14 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red group-hover:scale-110 group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
