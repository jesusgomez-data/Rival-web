"use client";

/**
 * RIVALFIT - WOD Generator UI
 * Interfaz para generar entrenamientos con Gemini AI
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Clock,
  Zap,
  TrendingUp,
  Loader2,
  Sparkles,
  Trophy,
  Target,
  X,
} from "lucide-react";
import type { WorkoutType, FitnessLevel, Equipment, GeneratedWOD } from "@/lib/wod-generator";

interface WODGeneratorUIProps {
  onWODGenerated?: (wod: GeneratedWOD) => void;
}

export default function WODGeneratorUI({ onWODGenerated }: WODGeneratorUIProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatedWOD, setGeneratedWOD] = useState<GeneratedWOD | null>(null);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  // Resultado del creador para el ranking
  const [creatorTimeMin, setCreatorTimeMin] = useState("");
  const [creatorTimeSec, setCreatorTimeSec] = useState("");
  const [creatorRounds, setCreatorRounds] = useState("");
  const [creatorRx, setCreatorRx] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Form state
  const [workoutType, setWorkoutType] = useState<WorkoutType>("amrap");
  const [duration, setDuration] = useState(30);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("intermediate");
  const [equipment, setEquipment] = useState<Equipment[]>(["bodyweight"]);

  const workoutTypes: { value: WorkoutType; label: string; description: string }[] = [
    { value: "amrap", label: "AMRAP", description: "As Many Rounds As Possible" },
    { value: "fortime", label: "For Time", description: "Complete lo más rápido posible" },
    { value: "emom", label: "EMOM", description: "Every Minute On the Minute" },
    { value: "tabata", label: "Tabata", description: "20s trabajo / 10s descanso" },
    { value: "chipper", label: "Chipper", description: "Lista larga, 1 ronda" },
    { value: "strength", label: "Strength", description: "Enfoque en fuerza" },
  ];

  const fitnessLevels: { value: FitnessLevel; label: string; icon: string }[] = [
    { value: "beginner", label: "Principiante", icon: "🌱" },
    { value: "intermediate", label: "Intermedio", icon: "⚡" },
    { value: "advanced", label: "Avanzado", icon: "🔥" },
    { value: "elite", label: "Elite", icon: "👑" },
  ];

  const equipmentOptions: { value: Equipment; label: string }[] = [
    { value: "bodyweight", label: "Sin equipo" },
    { value: "dumbbells", label: "Mancuernas" },
    { value: "barbell", label: "Barra" },
    { value: "kettlebell", label: "Kettlebell" },
    { value: "pull_up_bar", label: "Barra de dominadas" },
    { value: "rower", label: "Remo" },
    { value: "bike", label: "Bicicleta" },
    { value: "rope", label: "Cuerda" },
    { value: "box", label: "Cajón" },
  ];

  const toggleEquipment = (eq: Equipment) => {
    if (equipment.includes(eq)) {
      setEquipment(equipment.filter((e) => e !== eq));
    } else {
      setEquipment([...equipment, eq]);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/wod/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutType,
          duration,
          fitnessLevel,
          equipment,
        }),
      });

      const data = await response.json();

      if (response.status === 429 && data.error === "daily_limit") {
        setDailyLimitReached(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Error generando WOD");
      }

      setGeneratedWOD(data.wod);
      onWODGenerated?.(data.wod);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedWOD) return;

    setIsPublishing(true);
    try {
      // Determinar tipo de resultado según el tipo de WOD
      const isForTime = workoutType === "fortime";
      const isAmrap = workoutType === "amrap" || workoutType === "emom" || workoutType === "tabata";

      let creatorResult: Record<string, unknown> | undefined;
      if (isForTime && (creatorTimeMin || creatorTimeSec)) {
        creatorResult = {
          completionType: "time",
          completionTimeSeconds: parseInt(creatorTimeMin || "0") * 60 + parseInt(creatorTimeSec || "0"),
          rx: creatorRx,
        };
      } else if (isAmrap && creatorRounds) {
        // Soporte para formato "8 + 12" (8 rondas + 12 reps) -> se convierte a float 8.12 (o similar para el backend)
        let roundsValue = 0;
        if (typeof creatorRounds === 'string' && creatorRounds.includes('+')) {
          const [r, p] = creatorRounds.split('+').map(s => parseFloat(s.trim()) || 0);
          roundsValue = r + (p / 1000); // Guardamos reps como decimal muy pequeño para no confundir con rondas
        } else {
          roundsValue = parseFloat(creatorRounds as string);
        }

        creatorResult = {
          completionType: "rounds",
          roundsCompleted: roundsValue,
          rx: creatorRx,
        };
      }

      const response = await fetch("/api/wod/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wod: generatedWOD, creatorResult }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error publicando WOD");
      }

      // Cerrar modal y refrescar feed
      setIsOpen(false);
      setGeneratedWOD(null);
      setShowResults(false);
      setCreatorTimeMin("");
      setCreatorTimeSec("");
      setCreatorRounds("");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-6 z-50 bg-gradient-to-r from-brand-red to-orange-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-3 font-bold hover:shadow-brand-red/50 transition-shadow"
      >
        <Sparkles className="w-6 h-6" />
        <span className="hidden sm:inline">Generar WOD</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-red/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-brand-red" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">WOD Generator</h2>
              <p className="text-sm text-gray-400">Powered by Gemini</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {!generatedWOD ? (
          <div className="space-y-6">
            {/* Tipo de Workout */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">
                Tipo de Workout
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {workoutTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setWorkoutType(type.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      workoutType === type.value
                        ? "border-brand-red bg-brand-red/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="font-bold text-white mb-1">{type.label}</div>
                    <div className="text-xs text-gray-400">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duración */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duración: {duration} minutos
              </label>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-red"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>10 min</span>
                <span>30 min</span>
                <span>60 min</span>
              </div>
            </div>

            {/* Nivel de Fitness */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Nivel de Fitness
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fitnessLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setFitnessLevel(level.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      fitnessLevel === level.value
                        ? "border-brand-red bg-brand-red/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="text-2xl mb-1">{level.icon}</div>
                    <div className="text-sm font-bold text-white">{level.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Equipamiento */}
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Equipamiento Disponible
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {equipmentOptions.map((eq) => (
                  <button
                    key={eq.value}
                    onClick={() => toggleEquipment(eq.value)}
                    className={`p-3 rounded-xl border transition-all text-sm font-medium ${
                      equipment.includes(eq.value)
                        ? "border-brand-red bg-brand-red/10 text-white"
                        : "border-white/10 hover:border-white/20 text-gray-400"
                    }`}
                  >
                    {eq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            {dailyLimitReached ? (
              <div className="w-full bg-white/5 border border-white/10 text-gray-500 font-black text-sm py-4 rounded-xl flex items-center justify-center gap-3 cursor-not-allowed">
                <Clock className="w-5 h-5 text-brand-red" />
                Ya generaste tu WOD de hoy · Vuelve mañana 🔒
              </div>
            ) : (
              <motion.button
                onClick={handleGenerate}
                disabled={isGenerating || equipment.length === 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-brand-red to-orange-600 hover:from-brand-accent hover:to-orange-700 text-white font-black text-lg py-4 rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-brand-red/50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generando tu WOD...
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    Generar WOD Ahora
                  </>
                )}
              </motion.button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generated WOD Display */}
            <div className={`bg-gradient-to-br from-brand-red/10 to-orange-600/10 border border-brand-red/30 rounded-2xl p-6 transition-all ${showResults ? 'opacity-40 blur-sm pointer-events-none scale-95' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-8 h-8 text-brand-red" />
                <div>
                  <h3 className="text-2xl font-black text-white">{generatedWOD.title}</h3>
                  <p className="text-sm text-gray-300">{generatedWOD.subtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6 text-[10px] md:text-sm">
                <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  <Target className="w-3.5 h-3.5 text-brand-red" />
                  <span className="text-white font-black uppercase tracking-wider">{workoutType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-white">{generatedWOD.estimatedDuration} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <span className="text-white">{generatedWOD.caloriesBurn} kcal</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span className="text-white capitalize">{generatedWOD.difficulty}</span>
                </div>
              </div>

              {/* Blocks */}
              {generatedWOD.blocks.map((block, idx) => (
                <div key={idx} className="mb-4 last:mb-0">
                  <div className="font-bold text-white mb-2 uppercase text-sm tracking-wider">
                    {block.title}
                  </div>
                  <div className="space-y-1">
                    {block.exercises.map((ex, i) => (
                      <div key={i} className="text-sm text-gray-300">
                        • {ex.reps} {ex.name}
                        {ex.notes && <span className="text-gray-500 text-xs"> ({ex.notes})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Tips */}
              {generatedWOD.tips && generatedWOD.tips.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-sm font-bold text-gray-400 mb-2">💡 TIPS:</div>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {generatedWOD.tips.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Results Input Section - Appears when "Realizar WOD" is clicked */}
            {showResults && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-gray/40 border border-brand-red/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase italic leading-none">Registrar Resultado</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Ingresa tus marcas finales</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {workoutType === 'fortime' ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 px-1">Minutos</label>
                        <input 
                          type="number"
                          value={creatorTimeMin}
                          onChange={(e) => setCreatorTimeMin(e.target.value)}
                          placeholder="00"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-black text-2xl text-center focus:border-brand-red/50 focus:bg-black/60 transition-all outline-none"
                        />
                      </div>
                      <div className="text-2xl font-black text-gray-600 mt-6">:</div>
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 px-1">Segundos</label>
                        <input 
                          type="number"
                          value={creatorTimeSec}
                          onChange={(e) => setCreatorTimeSec(e.target.value)}
                          placeholder="00"
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-black text-2xl text-center focus:border-brand-red/50 focus:bg-black/60 transition-all outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 px-1">Rondas y Repeticiones</label>
                      <input 
                        type="text"
                        value={creatorRounds}
                        onChange={(e) => setCreatorRounds(e.target.value)}
                        placeholder="Ej: 8 + 12"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-black text-2xl text-center focus:border-brand-red/50 focus:bg-black/60 transition-all outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                    <button
                      onClick={() => setCreatorRx(true)}
                      className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-[0.2em] transition-all ${
                        creatorRx ? 'bg-brand-red text-white shadow-glow-sm' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      RX
                    </button>
                    <button
                      onClick={() => setCreatorRx(false)}
                      className={`flex-1 py-3 rounded-lg font-black text-xs uppercase tracking-[0.2em] transition-all ${
                        !creatorRx ? 'bg-brand-red text-white shadow-glow-sm' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      SCALED
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (showResults) {
                    setShowResults(false);
                  } else {
                    setGeneratedWOD(null);
                  }
                }}
                disabled={isPublishing}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showResults ? "Atrás" : "Generar Otro"}
              </button>
              
              {!showResults ? (
                <button
                  onClick={() => setShowResults(true)}
                  className="flex-1 bg-brand-red hover:bg-brand-accent text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-red/30 flex items-center justify-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  Realizar WOD
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || (!creatorTimeMin && !creatorRounds)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    "Finalizar y Publicar"
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
