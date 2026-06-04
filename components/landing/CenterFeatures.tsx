"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, Building2, Trophy, CheckCircle2 } from "lucide-react";

export default function CenterFeatures() {
  return (
    <motion.div
      key="center-content"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-6 lg:px-12 space-y-32"
    >
      {/* Center Features */}
      <section className="space-y-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-3"
        >
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-4"
        >
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
  );
}
