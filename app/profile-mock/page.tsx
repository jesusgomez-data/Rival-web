"use client";

import { motion } from "framer-motion";
import { Activity, Trophy, Flame, ChevronRight, MapPin, Zap } from "lucide-react";
import Image from "next/image";

export default function PremiumProfileMockup() {
  return (
    <div className="min-h-screen bg-[#020202] text-white font-outfit overflow-x-hidden pb-24">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-brand-red/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-24 space-y-12">
        {/* Profile Header */}
        <section className="glass-dark border border-white/10 rounded-[3rem] p-8 lg:p-12 flex flex-col md:flex-row items-center md:items-start gap-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-64 h-64 text-brand-red" />
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-tr from-brand-red to-brand-orange rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-40 h-40 rounded-full border-4 border-[#020202] overflow-hidden bg-black">
              {/* Mockup image placeholder using Unsplash */}
              <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&h=400&fit=crop" alt="Athlete" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
            </div>
            <div className="absolute bottom-2 right-2 w-8 h-8 bg-brand-red rounded-full flex items-center justify-center border-2 border-[#020202] shadow-glow-red">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
          </div>

          <div className="flex-1 space-y-6 text-center md:text-left relative z-10">
            <div className="space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h1 className="text-5xl font-black italic uppercase tracking-tighter">Alex <span className="text-brand-red">Riviera</span></h1>
                <span className="glass px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-brand-red uppercase border-brand-red/30">Pro</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 text-white/50 text-sm font-bold tracking-widest uppercase">
                <MapPin className="w-4 h-4" />
                <span>Rival Madrid Central</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="glass px-6 py-3 rounded-2xl border-white/5 text-center">
                <div className="text-2xl font-black italic text-white">42</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-white/40">WODs Mes</div>
              </div>
              <div className="glass px-6 py-3 rounded-2xl border-white/5 text-center">
                <div className="text-2xl font-black italic text-brand-red">15</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-white/40">PRs Rotos</div>
              </div>
              <div className="glass px-6 py-3 rounded-2xl border-white/5 text-center">
                <div className="text-2xl font-black italic text-brand-orange">Top 5%</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Ranking Nacional</div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
             <button className="bg-brand-red text-white px-8 py-4 font-black uppercase tracking-[0.2em] text-xs btn-sport-tech hover:bg-brand-accent transition-colors">
               <span className="skew-x-[10deg] block">Editar Perfil</span>
             </button>
             <button className="glass px-8 py-4 font-black uppercase tracking-[0.2em] text-xs text-white hover:bg-white/10 transition-colors btn-sport-tech">
               <span className="skew-x-[10deg] block">Compartir</span>
             </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Feed / Activity */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
               <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                 <Activity className="text-brand-red" />
                 Actividad Reciente
               </h2>
            </div>

            {/* Mock Post */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-dark border border-white/5 rounded-3xl p-6 space-y-6 hover:border-brand-red/30 transition-all duration-300"
            >
               <div className="flex justify-between items-start">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-brand-red/20 flex items-center justify-center font-black italic text-brand-red">AR</div>
                   <div>
                     <h4 className="font-black italic uppercase tracking-tight text-lg">Murph Completado</h4>
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Hace 2 horas • Rx'd</p>
                   </div>
                 </div>
                 <div className="glass px-4 py-2 rounded-xl border-white/10 text-brand-red font-black italic text-xl">
                   38:42
                 </div>
               </div>
               
               <p className="text-white/60 font-inter text-sm leading-relaxed">
                 Un infierno de WOD pero logré bajar mi marca en 2 minutos. El chaleco de 10kg se sintió como 100kg al final. ¡A seguir empujando! 🚀🔥
               </p>

               <div className="flex gap-4">
                 <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded text-white/50">#Murph</span>
                 <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded text-white/50">#HeroWOD</span>
               </div>
            </motion.div>
            
            {/* Mock Post 2 */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="glass-dark border border-white/5 rounded-3xl p-6 space-y-6 hover:border-brand-red/30 transition-all duration-300"
            >
               <div className="flex justify-between items-start">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-brand-red/20 flex items-center justify-center font-black italic text-brand-red">AR</div>
                   <div>
                     <h4 className="font-black italic uppercase tracking-tight text-lg flex items-center gap-2">Nuevo PR <Flame className="w-4 h-4 text-brand-red" /></h4>
                     <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ayer • Snatch</p>
                   </div>
                 </div>
                 <div className="glass px-4 py-2 rounded-xl border-white/10 text-brand-orange font-black italic text-xl">
                   95 KG
                 </div>
               </div>
               
               <div className="w-full h-48 bg-black rounded-2xl border border-white/5 overflow-hidden relative group">
                 <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&h=400&fit=crop" alt="Snatch PR" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-16 h-16 rounded-full bg-brand-red/80 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-glow-red hover:scale-110 transition-transform">
                     <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                   </div>
                 </div>
               </div>
            </motion.div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-8">
            <div className="glass-dark border border-white/10 rounded-3xl p-6 space-y-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 border-b border-white/10 pb-4">
                <Trophy className="text-brand-orange" /> Marcas Personales
              </h3>
              
              <div className="space-y-4">
                {[
                  { name: "Back Squat", weight: "140 kg" },
                  { name: "Deadlift", weight: "185 kg" },
                  { name: "Clean & Jerk", weight: "115 kg" },
                  { name: "Snatch", weight: "95 kg" },
                ].map((pr, i) => (
                  <div key={i} className="flex justify-between items-center group cursor-pointer">
                    <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">{pr.name}</span>
                    <span className="font-black italic text-brand-red">{pr.weight}</span>
                  </div>
                ))}
              </div>
              
              <button className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white border border-white/5 rounded-xl hover:bg-white/5 transition-all">
                Ver todas las marcas
              </button>
            </div>

            <div className="glass-dark border border-brand-red/20 rounded-3xl p-6 space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/20 blur-3xl" />
               <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                 <Flame className="text-brand-red" /> Streak Actual
               </h3>
               <div className="flex items-end gap-2">
                 <span className="text-6xl font-black italic text-white tracking-tighter leading-none">12</span>
                 <span className="text-xs font-black uppercase tracking-widest text-brand-red pb-1">Días Seguidos</span>
               </div>
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed">
                 Estás en el top 10% de atletas más consistentes este mes. ¡No rompas la racha!
               </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
