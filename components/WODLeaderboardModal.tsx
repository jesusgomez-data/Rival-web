"use client";

/**
 * RIVALFIT - WOD Leaderboard Modal
 * Modal para ver el ranking de un WOD específico
 */

import { useState, useEffect } from "react";
import { X, Trophy, Loader2, Medal, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/app/ThemeContext";
import clsx from "clsx";

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

  const { theme } = useTheme();

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
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className={clsx(
            "border rounded-[40px] p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto scrollbar-hide shadow-2xl relative",
            theme === 'dark' ? "bg-[#0a0a0a] border-white/5" : "bg-white border-gray-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-[12px] font-black text-brand-red uppercase tracking-[0.4em] mb-1">
                TOP SEÑALES
              </h2>
              <h3 className={clsx(
                "text-2xl font-heading font-black italic uppercase tracking-tighter",
                theme === 'dark' ? "text-white" : "text-black"
              )}>
                Ranking Comunitario
              </h3>
            </div>
            <button
              onClick={onClose}
              className={clsx(
                "p-3 rounded-2xl transition-all group border",
                theme === 'dark' ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-gray-50 border-gray-100 hover:bg-gray-100"
              )}
            >
              <X className={clsx("w-5 h-5", theme === 'dark' ? "text-gray-400 group-hover:text-white" : "text-gray-500 group-hover:text-black")} />
            </button>
          </div>

          {/* Leaderboard Entries */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando Radar...</p>
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-3 mb-10">
              {leaderboard.map((entry) => (
                <a
                  key={entry.userId}
                  href={`/dashboard/profile/${entry.username}`}
                  className={clsx(
                    "border rounded-3xl p-4 flex items-center justify-between group transition-all duration-300 gap-4",
                    theme === 'dark' 
                      ? "bg-[#111111] border-white/5 hover:bg-[#161616] hover:border-brand-red/30" 
                      : "bg-[#f8f9fa] border-gray-100 hover:bg-white hover:border-brand-red/20 shadow-sm hover:shadow-md"
                  )}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Rank Number */}
                    <div className="text-xl font-heading font-black italic text-brand-red min-w-[32px] flex-shrink-0 text-center">
                      #{entry.rank}
                    </div>

                    {/* Avatar */}
                    <div className={clsx(
                      "w-12 h-12 rounded-full p-0.5 transition-all flex-shrink-0 bg-gradient-to-tr",
                      entry.rank === 1 ? "from-yellow-400 to-orange-500" : "from-gray-300 to-gray-500"
                    )}>
                      <div className="w-full h-full rounded-full overflow-hidden bg-black relative">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black uppercase">
                            {entry.username.substring(0, 2)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={clsx(
                        "text-[14px] font-black uppercase tracking-tight leading-none mb-1",
                        theme === 'dark' ? "text-white" : "text-gray-900"
                      )}>
                        {entry.fullName}
                      </span>
                      <span className="text-[9px] text-brand-red font-black uppercase tracking-widest opacity-70">
                        @{entry.username}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0 pl-2">
                    <div className="text-[8px] text-gray-500 font-bold tracking-[0.2em] uppercase mb-0.5">
                      {entry.roundsCompleted ? 'ROUNDS' : 
                       entry.completionTimeSeconds ? 'TIEMPO' : 
                       entry.totalReps ? 'REPS' : 
                       entry.weightKg ? 'PESO' : 'RESULTADO'}
                    </div>
                    <div className="text-2xl font-heading font-black italic text-brand-red leading-none group-hover:scale-105 transition-transform origin-right">
                      {entry.roundsCompleted || 
                       entry.totalReps || 
                       (entry.weightKg ? `${entry.weightKg}KG` : null) ||
                       (entry.completionTimeSeconds ? formatTime(entry.completionTimeSeconds) : entry.score || entry.rank)}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                <Trophy className="w-8 h-8 text-gray-700" />
              </div>
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest italic">Aún no hay resultados para este WOD</p>
            </div>
          )}

          {/* Footer */}
          <div className={clsx(
            "pt-6 border-t",
            theme === 'dark' ? "border-white/5" : "border-gray-100"
          )}>
             <p className="text-[9px] text-gray-500 font-bold text-center uppercase tracking-[0.2em] leading-relaxed max-w-xs mx-auto">
               Los resultados se basan en los reportes públicos de la comunidad Rival Fit.
             </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
