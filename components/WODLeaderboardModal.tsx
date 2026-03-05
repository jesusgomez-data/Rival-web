"use client";

/**
 * RIVALFIT - WOD Leaderboard Modal
 * Modal para ver el ranking de un WOD específico
 */

import { useState, useEffect } from "react";
import { X, Trophy, Loader2, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  completionTimeSeconds?: number;
  roundsCompleted?: number;
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
          className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-red/20 rounded-xl">
                <Trophy className="w-6 h-6 text-brand-red" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">Ranking</h2>
                <p className="text-sm text-gray-400">{wodTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-black text-white">
                    {stats.totalCompletions}
                  </div>
                  <div className="text-xs text-gray-400 uppercase">Atletas</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {stats.averageTime
                      ? formatTime(Math.round(stats.averageTime))
                      : stats.averageRounds
                      ? formatRounds(stats.averageRounds)
                      : "-"}
                  </div>
                  <div className="text-xs text-gray-400 uppercase">Promedio</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {Math.round(stats.rxPercentage)}%
                  </div>
                  <div className="text-xs text-gray-400 uppercase">Rx</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                filter === "all"
                  ? "bg-brand-red text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("rx")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                filter === "rx"
                  ? "bg-brand-red text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Solo Rx
            </button>
          </div>

          {/* Leaderboard */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                Sé el primero en completar este WOD
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    entry.rank <= 3
                      ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 flex-shrink-0 text-center">
                    {entry.rank === 1 ? (
                      <Medal className="w-8 h-8 text-yellow-400 mx-auto" />
                    ) : entry.rank === 2 ? (
                      <Medal className="w-7 h-7 text-gray-300 mx-auto" />
                    ) : entry.rank === 3 ? (
                      <Medal className="w-6 h-6 text-orange-400 mx-auto" />
                    ) : (
                      <span className="text-xl font-black text-gray-400">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-red to-orange-600 flex items-center justify-center flex-shrink-0">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {entry.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold truncate">
                      @{entry.username}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {entry.fullName}
                    </div>
                  </div>

                  {/* Result */}
                  <div className="text-right">
                    <div className="text-lg font-black text-white">
                      {entry.completionTimeSeconds
                        ? formatTime(entry.completionTimeSeconds)
                        : entry.roundsCompleted
                        ? formatRounds(entry.roundsCompleted)
                        : "-"}
                    </div>
                    <div className="text-xs">
                      {entry.rx ? (
                        <span className="text-green-400 font-bold">Rx</span>
                      ) : (
                        <span className="text-orange-400 font-bold">Scaled</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
