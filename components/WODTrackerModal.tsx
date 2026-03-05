"use client";

/**
 * RIVALFIT - WOD Tracker Modal
 * Modal simple para registrar que completaste un WOD
 */

import { useState } from "react";
import { X, Dumbbell, Clock, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WODTrackerModalProps {
  wodPostId: string;
  wodTitle: string;
  wodType: string; // "time", "rounds", etc.
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WODTrackerModal({
  wodPostId,
  wodTitle,
  wodType,
  isOpen,
  onClose,
  onSuccess,
}: WODTrackerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [rounds, setRounds] = useState("");
  const [rx, setRx] = useState(true);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convertir tiempo a segundos
      const completionTimeSeconds =
        wodType === "time"
          ? parseInt(timeMinutes || "0") * 60 + parseInt(timeSeconds || "0")
          : undefined;

      const roundsCompleted =
        wodType === "rounds" ? parseFloat(rounds) : undefined;

      const response = await fetch("/api/wod/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalWodPostId: wodPostId,
          completionType: wodType,
          completionTimeSeconds,
          roundsCompleted,
          rx,
          notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("¡WOD completado! 🎉");
        onSuccess?.();
        onClose();
      } else {
        alert(data.error || "Error al guardar");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al completar WOD");
    } finally {
      setIsSubmitting(false);
    }
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
          className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-red/20 rounded-xl">
                <Dumbbell className="w-6 h-6 text-brand-red" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Registrar WOD</h2>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tiempo o Rounds */}
            {wodType === "time" ? (
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Tiempo Total
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={timeMinutes}
                      onChange={(e) => setTimeMinutes(e.target.value)}
                      placeholder="Min"
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-bold text-center focus:outline-none focus:border-brand-red/50"
                      required
                    />
                    <div className="text-xs text-gray-400 text-center mt-1">
                      Minutos
                    </div>
                  </div>
                  <div className="text-3xl text-gray-600 self-center">:</div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timeSeconds}
                      onChange={(e) => setTimeSeconds(e.target.value)}
                      placeholder="Seg"
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-bold text-center focus:outline-none focus:border-brand-red/50"
                      required
                    />
                    <div className="text-xs text-gray-400 text-center mt-1">
                      Segundos
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Rounds Completados
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={rounds}
                  onChange={(e) => setRounds(e.target.value)}
                  placeholder="Ej: 8.5"
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-brand-red/50"
                  required
                />
                <div className="text-xs text-gray-400 mt-1">
                  Usa decimales para rondas parciales (ej: 8.5)
                </div>
              </div>
            )}

            {/* Rx / Scaled */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
                Modalidad
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRx(true)}
                  className={`p-3 rounded-xl border-2 transition-all font-bold ${
                    rx
                      ? "border-green-500 bg-green-500/10 text-green-400"
                      : "border-white/10 text-gray-400"
                  }`}
                >
                  ⚡ Rx
                </button>
                <button
                  type="button"
                  onClick={() => setRx(false)}
                  className={`p-3 rounded-xl border-2 transition-all font-bold ${
                    !rx
                      ? "border-orange-500 bg-orange-500/10 text-orange-400"
                      : "border-white/10 text-gray-400"
                  }`}
                >
                  🔥 Scaled
                </button>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
                Notas (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Cómo te sentiste? ¿Modificaciones?"
                className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-brand-red/50 resize-none"
                rows={3}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-brand-red to-orange-600 hover:from-brand-accent hover:to-orange-700 text-white font-black text-lg py-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-brand-red/50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Dumbbell className="w-6 h-6" />
                  Guardar Resultado
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
