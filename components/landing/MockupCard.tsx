"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface MockupCardProps {
  activeTab: 'athlete' | 'center';
}

export default function MockupCard({ activeTab }: MockupCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
      className="relative"
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
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500 ${activeTab === 'athlete' ? 'bg-brand-red' : 'bg-brand-orange'}`}>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ${i === 0 ? (activeTab === 'athlete' ? 'bg-brand-red/10 border border-brand-red/20' : 'bg-brand-orange/10 border border-brand-orange/20') : 'bg-white/[0.03]'}`}
            >
              <span className={`text-xs font-black w-4 text-center transition-colors duration-300 ${i === 0 ? (activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange') : 'text-white/25'}`}>
                {entry.rank}
              </span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-black ${i === 0 ? 'text-white' : 'text-white/60'}`}>{entry.name}</span>
                  <span className={`text-xs font-black italic transition-colors duration-300 ${i === 0 ? (activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange') : 'text-white/40'}`}>{entry.pts}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${entry.pct}%` }}
                    transition={{ delay: 0.9 + i * 0.1, duration: 0.9, ease: "easeOut" }}
                    className={`h-full rounded-full transition-all duration-500 ${i === 0 ? (activeTab === 'athlete' ? 'bg-gradient-to-r from-brand-red to-red-400' : 'bg-gradient-to-r from-brand-orange to-orange-400') : 'bg-white/15'}`}
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
            <span className={`text-xs font-black italic transition-colors duration-300 ${activeTab === 'athlete' ? 'text-brand-red' : 'text-brand-orange'}`}>↑ 23% este mes</span>
          </div>
          <div className="flex items-end gap-2 h-14">
            {[28, 42, 38, 58, 62, 72, 95].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 1.1 + i * 0.08, duration: 0.7, ease: "easeOut" }}
                className={`flex-1 rounded-t-sm transition-all duration-500 ${i === 6 ? (activeTab === 'athlete' ? 'bg-brand-red shadow-glow-red' : 'bg-brand-orange shadow-glow-orange') : 'bg-white/10'}`}
              />
            ))}
          </div>
        </div>

        {/* Inner glow */}
        <div className={`absolute -bottom-12 -right-12 w-52 h-52 rounded-full blur-[70px] opacity-40 transition-colors duration-500 ${activeTab === 'athlete' ? 'bg-brand-red/40' : 'bg-brand-orange/40'}`} />
      </motion.div>
    </motion.div>
  );
}
