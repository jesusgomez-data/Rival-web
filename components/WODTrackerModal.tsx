"use client";

/**
 * RIVALFIT - WOD Tracker Modal
 * Modal para registrar el resultado de un WOD, adaptado al tipo de
 * puntuación real configurado por el coach (tiempo, rondas/AMRAP, reps,
 * peso, u otro tipo genérico como calorías/distancia/ritmo/vatios).
 */

import { useState, useEffect, useRef } from "react";
import { X, Dumbbell, Clock, Zap, Loader2, Repeat, Weight, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PartnerTagField, { type TaggedProfile } from "@/components/PartnerTagField";

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

// Tipos de resultado que el atleta puede elegir libremente al registrar su
// marca. No se limita al scoreType que configuró el coach al crear el WOD:
// un mismo WOD (ej. "20min AMRAP") puede terminar en tiempo (si lo completas
// antes del cap) o en rondas (si te quedas capado), y formatos como EMOM no
// tienen un único tipo de resultado "correcto". Se ofrecen los 4 tipos
// principales siempre, preseleccionando el que sugiere el coach.
const SELECTABLE_TYPES: { key: "TIME" | "ROUNDS" | "REPS" | "WEIGHT" | "OTHER"; label: string; icon: typeof Clock }[] = [
  { key: "TIME", label: "Tiempo", icon: Clock },
  { key: "ROUNDS", label: "Rondas", icon: Repeat },
  { key: "REPS", label: "Reps", icon: Hash },
  { key: "WEIGHT", label: "Peso", icon: Weight },
  { key: "OTHER", label: "Otro", icon: Zap },
];

function normalizeScoreType(raw?: string | null): "TIME" | "ROUNDS" | "REPS" | "WEIGHT" | "OTHER" {
  const v = (raw || "").toUpperCase();
  if (v === "TIME") return "TIME";
  if (v === "ROUNDS" || v === "AMRAP") return "ROUNDS";
  if (v === "REPS") return "REPS";
  if (v === "WEIGHT") return "WEIGHT";
  return "OTHER";
}

function completionTypeToSelectable(completionType?: string | null): "TIME" | "ROUNDS" | "REPS" | "WEIGHT" | "OTHER" {
  switch (completionType) {
    case "time": return "TIME";
    case "rounds": return "ROUNDS";
    case "reps": return "REPS";
    case "weight": return "WEIGHT";
    default: return "OTHER";
  }
}

interface WODTrackerModalProps {
  wodPostId: string;
  wodTitle: string;
  scoreType?: string; // "TIME" | "ROUNDS" | "REPS" | "WEIGHT" | "CALORIES" | "DISTANCE" | "PACE" | "WATTS" | "OTHER" | "NONE"
  hasTimecap?: boolean; // true cuando algún bloque tiene tope de tiempo (ej. "20 rondas, cap 15min")
  // Compañero ya etiquetado al CREAR el WOD (wod_data.partner). Se usa como
  // valor inicial al registrar un resultado NUEVO, para no obligar a
  // etiquetar dos veces a la misma persona.
  defaultPartner?: TaggedProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WODTrackerModal({
  wodPostId,
  wodTitle,
  scoreType,
  hasTimecap = false,
  defaultPartner = null,
  isOpen,
  onClose,
  onSuccess,
}: WODTrackerModalProps) {
  const suggestedType = normalizeScoreType(scoreType);
  const [selectedType, setSelectedType] = useState<"TIME" | "ROUNDS" | "REPS" | "WEIGHT" | "OTHER">(suggestedType);

  // WODTrackerModal no se desmonta al cerrar (el padre solo deja de pasar
  // isOpen=true), así que el useState de arriba solo capta `scoreType` en el
  // PRIMER render de esta instancia. Si en ese primer render el dato del WOD
  // todavía no había llegado (scoreType undefined), selectedType se quedaba
  // clavado en "OTHER" para siempre, aunque el WOD real fuera de tipo PESO,
  // TIEMPO, etc. Este efecto lo mantiene sincronizado con el prop real cada
  // vez que el modal se abre sin un resultado ya guardado.
  useEffect(() => {
    if (isOpen && !isEditing) {
      setSelectedType(normalizeScoreType(scoreType));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scoreType]);

  const isTimeScored = selectedType === "TIME";
  const isRepsScored = selectedType === "REPS";
  const isWeightScored = selectedType === "WEIGHT";
  const isRoundsScored = selectedType === "ROUNDS";
  const isGenericScored = selectedType === "OTHER";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [rounds, setRounds] = useState("");
  const [totalReps, setTotalReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [scoreValue, setScoreValue] = useState("");
  const [rx, setRx] = useState(true);
  const [notes, setNotes] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // ── Compañero (WOD en pareja) ─────────────────────────────────────────
  const [partner, setPartner] = useState<TaggedProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchExistingCompletion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

        setSelectedType(completionTypeToSelectable(c.completion_type));

        if (c.completion_type === "time" && c.completion_time_seconds) {
          const mins = Math.floor(c.completion_time_seconds / 60);
          const secs = c.completion_time_seconds % 60;
          setTimeMinutes(mins.toString());
          setTimeSeconds(secs.toString());
        } else if (c.completion_type === "rounds" && c.rounds_completed != null) {
          setRounds(c.rounds_completed.toString());
        } else if (c.completion_type === "reps" && c.total_reps != null) {
          setTotalReps(c.total_reps.toString());
        } else if (c.completion_type === "weight" && c.weight_kg != null) {
          setWeightKg(c.weight_kg.toString());
        } else if (c.completion_type === "score" && c.score != null) {
          setScoreValue(c.score.toString());
        }
      } else {
        // Sin resultado previo: formulario limpio, tipo sugerido por el coach
        setIsEditing(false);
        setSelectedType(suggestedType);
        setTimeMinutes(""); setTimeSeconds(""); setRounds("");
        setTotalReps(""); setWeightKg(""); setScoreValue("");
        setRx(true); setNotes(""); setPartner(defaultPartner || null);
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

      if (isTimeScored) {
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
              {/* Selector de tipo de resultado: libre, no depende de lo que configuró
                  el coach. Un mismo WOD (AMRAP con cap, EMOM, etc.) puede terminar
                  registrándose por tiempo, rondas, reps o peso según cómo lo hizo
                  cada atleta. */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">
                  ¿Cómo quieres registrar tu resultado?
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {SELECTABLE_TYPES.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedType(key)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all font-bold text-[10px] uppercase tracking-wide ${
                        selectedType === key
                          ? "border-brand-red bg-brand-red/10 text-brand-red"
                          : "border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {isTimeScored ? (
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

              {isRoundsScored && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
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
                    {GENERIC_SCORE_LABELS[(scoreType || "").toUpperCase()] || "Resultado"}
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

              <PartnerTagField value={partner} onChange={setPartner} />

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
