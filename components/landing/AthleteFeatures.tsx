"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, Trophy, Users, Activity, ChevronRight } from "lucide-react";

export default function AthleteFeatures() {
  return (
    <motion.div
      key="athlete-content"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-6 lg:px-12 space-y-32"
    >
      {/* Athlete Features */}
      <section className="space-y-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-3"
        >
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
            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'Hoy'].map(l => <span key={l}>{l}</span>)}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
