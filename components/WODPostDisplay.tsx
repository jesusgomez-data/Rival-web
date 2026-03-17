"use client";

/**
 * RIVALFIT - WOD Post Display
 * Componente para renderizar WODs con diseño visual bonito
 */

import { useState } from "react";
import { Clock, Zap, Trophy, Target, ChevronDown, ChevronUp } from "lucide-react";
import type { GeneratedWOD } from "@/lib/wod-generator";
import { WorkoutCategory } from "./training/WodCreator";
import { cn } from "@/lib/utils";

interface ExtendedWOD extends GeneratedWOD {
  category?: WorkoutCategory;
}

interface WODPostDisplayProps {
  wod: ExtendedWOD;
  compact?: boolean;
}

export default function WODPostDisplay({ wod, compact = false }: WODPostDisplayProps) {
  // Estado para expandir/colapsar
  const [isExpanded, setIsExpanded] = useState(false);

  // Validación: si no hay WOD o no tiene blocks, no renderizar
  if (!wod || !wod.blocks || !Array.isArray(wod.blocks)) {
    return null;
  }

  // Mapeo de dificultad a emojis
  const difficultyEmoji: Record<string, string> = {
    beginner: "🌱",
    intermediate: "📊",
    advanced: "🔥",
    elite: "👑",
  };

  // Mapeo de tipo de bloque a emojis
  const blockTypeEmoji: Record<string, string> = {
    warmup: "🏃",
    metcon: "🎯",
    strength: "💪",
    conditioning: "🔥",
    cooldown: "🧘",
  };

  const CATEGORY_STYLES: Record<WorkoutCategory, { color: string, icon: string, gradient: string }> = {
    'CROSS_TRAINING': { color: 'border-brand-red/30', icon: '🏋️', gradient: 'from-brand-red/20 to-orange-600/20' },
    'RUNNING': { color: 'border-blue-600/30', icon: '🏃', gradient: 'from-blue-600/20 to-cyan-500/20' },
    'GYM': { color: 'border-purple-600/30', icon: '💪', gradient: 'from-purple-600/20 to-indigo-500/20' },
    'OCR': { color: 'border-orange-600/30', icon: '🧗', gradient: 'from-orange-600/20 to-yellow-500/20' },
    'HYROX': { color: 'border-red-700/30', icon: '🔥', gradient: 'from-red-700/20 to-orange-600/20' },
    'CYCLING': { color: 'border-green-600/30', icon: '🚴', gradient: 'from-green-600/20 to-emerald-500/20' },
    'SWIMMING': { color: 'border-blue-500/30', icon: '🏊', gradient: 'from-blue-500/20 to-blue-300/20' },
    'YOGA': { color: 'border-teal-500/30', icon: '🧘', gradient: 'from-teal-500/20 to-emerald-400/20' },
    'BOXING': { color: 'border-red-800/30', icon: '🥊', gradient: 'from-red-800/20 to-red-600/20' }
  };

  const currentStyle = CATEGORY_STYLES[wod.category || 'CROSS_TRAINING'];

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className={cn("border-b p-6", currentStyle.gradient, currentStyle.color)}>
        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">{currentStyle.icon}</div>
          <div className="flex-1">
            <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">
              {wod.title}
            </h3>
            {wod.subtitle && (
              <p className="text-gray-300 text-sm">{wod.subtitle}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-white font-bold">{wod.estimatedDuration} min</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-white font-bold">{wod.caloriesBurn} kcal</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg">
            <span className="text-xl">{difficultyEmoji[wod.difficulty] || "📊"}</span>
            <span className="text-white font-bold uppercase">{wod.difficulty}</span>
          </div>
        </div>
      </div>

      {/* Blocks */}
      <div className="p-6 space-y-4">
        {/* Si no está expandido, no mostrar ningún bloque */}
        {isExpanded && wod.blocks.map((block, idx) => {
          // Filtrar warmup/cooldown si es compact
          if (compact && (block.type === "warmup" || block.type === "cooldown")) {
            return null;
          }

          return (
            <div key={`block-${idx}-${block.type}-${block.title}`} className="bg-white/5 rounded-xl p-4 border border-white/10">
              {/* Block Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{blockTypeEmoji[block.type] || "🎯"}</span>
                <h4 className="text-white font-bold uppercase text-sm tracking-wider">
                  {block.title}
                </h4>
                {block.duration && (
                  <span className="ml-auto text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">
                    {block.duration}
                  </span>
                )}
              </div>

              {/* Exercises */}
              <div className="space-y-2">
                {block.exercises && Array.isArray(block.exercises) && block.exercises.map((ex, i) => (
                  <div key={`ex-${idx}-${i}-${ex.name}`} className="flex items-start gap-2 text-gray-200">
                    <span className="text-brand-red font-bold">•</span>
                    <div className="flex-1">
                      <span className="font-medium">
                        {ex.reps && <span className="text-white font-bold">{ex.reps} </span>}
                        {ex.name}
                      </span>
                      {ex.notes && (
                        <span className="text-xs text-gray-400 ml-2">({ex.notes})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Tips */}
        {wod.tips && wod.tips.length > 0 && !compact && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">💡</span>
              <div className="flex-1">
                <h5 className="text-yellow-400 font-bold text-sm mb-2 uppercase">TIP:</h5>
                <p className="text-gray-200 text-sm">{wod.tips[0]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Scaling Options */}
        {wod.scalingOptions && !compact && isExpanded && (
          <div className="border-t border-white/10 pt-4 mt-4">
            <h5 className="text-xs text-gray-400 font-bold uppercase mb-2">Escalado:</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {wod.scalingOptions.beginner && (
                <div className="bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
                  <span className="text-green-400 font-bold">🌱 Principiante:</span>
                  <span className="text-gray-300 ml-1">{wod.scalingOptions.beginner}</span>
                </div>
              )}
              {wod.scalingOptions.advanced && (
                <div className="bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
                  <span className="text-red-400 font-bold">🔥 Avanzado:</span>
                  <span className="text-gray-300 ml-1">{wod.scalingOptions.advanced}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botón Expandir/Colapsar */}
        {!compact && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-4 py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-sm font-bold text-gray-300 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Ver WOD completo
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="bg-black/40 border-t border-white/10 px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Trophy className="w-3 h-3" />
          <span className="uppercase tracking-wider">#WOD #Fitness #RivalFit #AIGenerated</span>
        </div>
      </div>
    </div>
  );
}
