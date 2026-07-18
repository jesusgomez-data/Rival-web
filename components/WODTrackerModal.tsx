"use client";

/**
 * RIVALFIT - WOD Tracker Modal
 * Modal para registrar el resultado de un WOD, adaptado al tipo de
 * puntuación real configurado por el coach (tiempo, rondas/AMRAP, reps,
 * peso, u otro tipo genérico como calorías/distancia/ritmo/vatios).
 */

import { useState, useEffect, useRef } from "react";
import { X, Dumbbell, Clock, Zap, Loader2, Repeat, Weight, Hash, Users, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchProfilesForTag } from "@/app/dashboard/explore/actions";

interface TaggedProfile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string | null;
}

export type WodScoreType =
  | "TIME" | "ROUNDS" | "REPS" | "WEIGHT"
  | "CALORIES" | "DISTANCE" | "PACE" | "WATTS" | "OTHER" | "NONE";

const GENERIC_SCORE_LABELS: Record<string, string> = {
  CALORIES: "Calorías",
  DISTANCE: "Distancia (m)",
  PACE: "Ritmo",
  WATTS: "Vatios",
  OTHER: "Resultado",
  NONE: "Resultado",
};

interface WODTrackerModalProps {
  wodPostId: string;
  wodTitle: string;
  scoreType?: string; // "TIME" | "ROUNDS" | "REPS" | "WEIGHT" | "CALORIES" | "DISTANCE" | "PACE" | "WATTS" | "OTHER" | "NONE"
  hasTimecap?: boolean; // true cuando algún bloque tiene tope de tiempo (ej. "20 rondas, cap 15min")
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WODTrackerModal({
  wodPostId,
  wodTitle,
  scoreType,
  hasTimecap = false,
  isOpen,
  onClose,
  onSuccess,
}: WODTrackerModalProps) {
  const ST = (scoreType || "ROUNDS").toUpperCase();
  const isTimeScored = ST === "TIME";
  const isRepsScored = ST === "REPS";
  const isWeightScored = ST === "WEIGHT";
  const isRoundsScored = ST === "ROUNDS";
  const isGenericScored = !isTimeScored && !isRepsScored && !isWeightScored && !isRoundsScored;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [rounds, setRounds] = useState("");
  const [totalReps, setTotalReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [scoreValue, setScoreValue] = useState("");
  // Solo aplica cuando isTimeScored && hasTimecap: ¿terminó dentro del tiempo o quedó capado?
  const [finishedInTime, setFinishedInTime] = useState(true);
  const [rx, setRx] = useState(true);
  const [notes, setNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ── Compañero (WOD en pareja) ─────────────────────────────────────────
  const [partner, setPartner] = useState<TaggedProfile | null>(null);
  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerResults, setPartnerResults] = useState<TaggedProfile[]>([]);
  const [searchingPartner, setSearchingPartner] = useState(false);
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const partnerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchExistingCompletion();
    } else {
      // Reset partner search state al cerrar, no al reabrir con datos existentes
      setPartnerQuery("");
      setPartnerResults([]);
      setShowPartnerDropdown(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (partnerSearchTimeout.current) clearTimeout(partnerSearchTimeout.current);
    if (partnerQuery.trim().length < 2) {
      setPartnerResults([]);
      return;
    }
    setSearchingPartner(true);
    partnerSearchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchProfilesForTag(partnerQuery);
        setPartnerResults(results as TaggedProfile[]);
      } catch (e) {
        console.error("Error buscando compañero:", e);
      } finally {
        setSearchingPartner(false);
      }
    }, 300);
    return () => {
      if (partnerSearchTimeout.current) clearTimeout(partnerSearchTimeout.current);
    };
  }, [partnerQuery]);

  const fetchExistingCompletion = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/wod/my-completion?wodPostId=${wodPostId}`);
      const data = await response.json();

      if (data.success && data.completion) {
        const c = data.completion;
        setIsEditing(true);
        setRx(c.rx);
        setNotes(c.notes || "");
        setPartner(c.partner || null);

        if (c.completion_type === "time" && c.completion_time_seconds) {
          const mins = Math.floor(c.completion_time_seconds / 60);
          const secs = c.completion_time_seconds % 60;
          setTimeMinutes(mins.toString());
          setTimeSeconds(secs.toString());
          setFinishedInTime(true);
        } else if (c.completion_type === "rounds" && c.rounds_completed != null) {
          setRounds(c.rounds_completed.toString());
          if (isTimeScored) setFinishedInTime(false);
        } else if (c.completion_type === "reps" && c.total_reps != null) {
          setTotalReps(c.total_reps.toString());
        } else if (c.completion_type === "weight" && c.weight_kg != null) {
          setWeightKg(c.weight_kg.toString());
        } else if (c.completion_type === "score" && c.score != null) {
          setScoreValue(c.score.toString());
        }
      }
    } catch (error) {
      console.error("Error fetching completion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let completionType: string;
      let completionTimeSeconds: number | undefined;
      let roundsCompleted: number | undefined;
      let repsValue: number | undefined;
      let weightValue: number | undefined;
      let scoreNumeric: number | undefined;

      if (isTimeScored && hasTimecap && !finishedInTime) {
        // No terminó dentro del cap: se registra por rondas alcanzadas, no por tiempo.
        completionType = "rounds";
        roundsCompleted = parseFloat(rounds || "0");
      } else if (isTimeScored) {
        completionType = "time";
        completionTimeSeconds = parseInt(timeMinutes || "0") * 60 + parseInt(timeSeconds || "0");
      } else if (isRepsScored) {
        completionType = "reps";
        repsValue = parseInt(totalReps || "0");
      } else if (isWeightScored) {
        completionType = "weight";
        weightValue = parseFloat(weightKg || "0");
      } else if (isRoundsScored) {
        completionType = "rounds";
        roundsCompleted = parseFloat(rounds || "0");
      } else {
        completionType = "score";
        scoreNumeric = parseFloat(scoreValue || "0");
      }

      const response = await fetch("/api/wod/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalWodPostId: wodPostId,
          completionType,
          completionTimeSeconds,
          roundsCompleted,
          totalReps: repsValue,
          weightKg: weightValue,
          score: scoreNumeric,
          rx,
          notes,
          partnerId: partner?.id || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(isEditing ? "¡Resultado actualizado! 🎉" : "¡WOD completado! 🎉");
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
              <p className="text-xs font-bold uppercase tracking-widest">Cargando...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Toggle: solo si es "For Time" con tope de tiempo */}
              {isTimeScored && hasTimecap && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
                    ¿Terminaste dentro del tiempo?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFinishedInTime(true)}
                      className={`p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wide ${
                        finishedInTime
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : "border-white/10 text-gray-400"
                      }`}
                    >
                      Sí, terminé
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinishedInTime(false)}
                      className={`p-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wide ${
                        !finishedInTime
                          ? "border-orange-500 bg-orange-500/10 text-orange-400"
                          : "border-white/10 text-gray-400"
                      }`}
                    >
                      No, quedé capado
                    </button>
                  </div>
                </div>
              )}

              {isTimeScored && (finishedInTime || !hasTimecap) ? (
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
                      <div className="text-xs text-gray-400 text-center mt-1">Minutos</div>
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
                      <div className="text-xs text-gray-400 text-center mt-1">Segundos</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {(isRoundsScored || (isTimeScored && hasTimecap && !finishedInTime)) && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    {isTimeScored ? "Rondas Alcanzadas" : "Rounds Completados"}
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

              {isRepsScored && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Reps Totales
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalReps}
                    onChange={(e) => setTotalReps(e.target.value)}
                    placeholder="Ej: 120"
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-brand-red/50"
                    required
                  />
                </div>
              )}

              {isWeightScored && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Weight className="w-4 h-4" />
                    Peso Total (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="Ej: 100"
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-brand-red/50"
                    required
                  />
                </div>
              )}

              {isGenericScored && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    {GENERIC_SCORE_LABELS[ST] || "Resultado"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={scoreValue}
                    onChange={(e) => setScoreValue(e.target.value)}
                    placeholder="Ej: 100"
                    className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-brand-red/50"
                    required
                  />
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

              {/* Compañero (WOD en pareja) */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Compañero (Opcional)
                </label>
                {partner ? (
                  <div className="flex items-center gap-3 bg-black/30 border border-brand-red/30 rounded-lg p-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0 relative">
                      {partner.avatar_url ? (
                        <img src={partner.avatar_url} alt={partner.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black uppercase">
                          {(partner.full_name || partner.username || "U").substring(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{partner.full_name}</p>
                      <p className="text-gray-500 text-xs truncate">@{partner.username}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPartner(null); setPartnerQuery(""); }}
                      className="p-2 rounded-full text-gray-500 hover:text-brand-red hover:bg-brand-red/10 transition-colors shrink-0"
                      aria-label="Quitar compañero"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={partnerQuery}
                        onChange={(e) => { setPartnerQuery(e.target.value); setShowPartnerDropdown(true); }}
                        onFocus={() => setShowPartnerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowPartnerDropdown(false), 150)}
                        placeholder="Buscar por nombre o @usuario..."
                        className="w-full bg-black/30 border border-white/10 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-brand-red/50"
                      />
                      {searchingPartner && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                      )}
                    </div>
                    {showPartnerDropdown && partnerQuery.trim().length >= 2 && (
                      <div className="absolute z-10 mt-1 w-full bg-[#161616] border border-white/10 rounded-lg overflow-hidden shadow-2xl max-h-56 overflow-y-auto">
                        {partnerResults.length > 0 ? (
                          partnerResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setPartner(p);
                                setPartnerQuery("");
                                setShowPartnerDropdown(false);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0 relative">
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-black uppercase">
                                    {(p.full_name || p.username || "U").substring(0, 2)}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white text-sm font-bold truncate">{p.full_name}</p>
                                <p className="text-gray-500 text-xs truncate">@{p.username}</p>
                              </div>
                            </button>
                          ))
                        ) : !searchingPartner ? (
                          <p className="p-3 text-xs text-gray-500 font-medium">Sin resultados</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
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
                    {isEditing ? "Actualizando..." : "Guardando..."}
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-6 h-6" />
                    {isEditing ? "Actualizar Resultado" : "Guardar Resultado"}
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
