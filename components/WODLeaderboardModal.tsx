"use client";

/**
 * RIVALFIT - WOD Leaderboard Modal
 * Modal para ver el ranking de un WOD específico
 */

import { useState, useEffect } from "react";
import { X, Trophy, Loader2, Medal, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  completionTimeSeconds?: number;
  roundsCompleted?: number;
  totalReps?: number;
  weightKg?: number;
  score?: number;
  rx: boolean;
  completedAt: string;
}

interface WODLeaderboardModalProps {
  wodPostId: string;
  wodTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WODLeaderboardModal({
  wodPostId,
  wodTitle,
  isOpen,
  onClose,
}: WODLeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "rx">("all");

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, filter]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/wod/leaderboard?wodPostId=${wodPostId}&limit=50&rxOnly=${filter === "rx"}`
      );
      const data = await response.json();

      if (data.success) {
        setLeaderboard(data.leaderboard);
        setStats(data.stats);
        setCreator(data.creator);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatRounds = (rounds?: number) => {
    if (!rounds) return "-";
    return `${rounds} rounds`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#0a0a0a] border border-white/5 rounded-[32px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[14px] font-black text-brand-red uppercase tracking-[0.3em] px-2 truncate">
              Tabla de Resultados
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all group"
            >
              <ChevronUp className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>


          {/* Leaderboard Entries */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 mb-8">
              {leaderboard.map((entry) => (
                <a
                  key={entry.userId}
                  href={`/dashboard/profile/${entry.username}`}
                  className="bg-[#111111] border border-white/5 rounded-[20px] p-3 px-4 flex items-center justify-between group hover:bg-[#161616] hover:border-brand-red/40 transition-all duration-300 gap-3"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Rank Number */}
                    <div className="text-lg font-black italic text-brand-red/90 min-w-[28px] flex-shrink-0">
                      #{entry.rank}
                    </div>

                    {/* Avatar with Minimal Ring */}
                    <div className="w-11 h-11 rounded-full p-[1.5px] bg-white/10 group-hover:bg-brand-red/30 transition-colors flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-black p-[1px]">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-white text-xs font-black">
                            {entry.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[15px] font-black text-white uppercase tracking-tight whitespace-normal leading-tight">
                        {entry.fullName}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-60">
                        @{entry.username}
                      </span>
                    </div>
                  </div>

                  {/* Score / Result - Prominent */}
                  <div className="text-right flex-shrink-0 pl-2">
                    <div className="text-[9px] text-zinc-500 font-black tracking-widest uppercase mb-0.5">
                      {entry.roundsCompleted ? 'Rondas' : 
                       entry.completionTimeSeconds ? 'Tiempo' : 
                       entry.totalReps ? 'Reps' : 
                       entry.weightKg ? 'Peso' : 'Puntaje'}
                    </div>
                    <div className="text-2xl font-black italic text-brand-red leading-none group-hover:scale-110 transition-transform origin-right">
                      {entry.roundsCompleted || 
                       entry.totalReps || 
                       (entry.weightKg ? `${entry.weightKg}kg` : null) ||
                       (entry.completionTimeSeconds ? formatTime(entry.completionTimeSeconds) : entry.score || entry.rank)}
                    </div>
                    {((entry.roundsCompleted || entry.totalReps) && entry.completionTimeSeconds) && (
                       <div className="text-[9px] text-zinc-600 font-black tracking-widest mt-1">
                         {formatTime(entry.completionTimeSeconds)}
                       </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Footer Disclaimer */}
          <div className="pt-8 border-t border-white/5">
             <p className="text-[10px] text-gray-600 font-black text-center uppercase tracking-widest leading-relaxed px-12">
               Los resultados se basan en los reposts públicos realizados en la comunidad.
             </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
