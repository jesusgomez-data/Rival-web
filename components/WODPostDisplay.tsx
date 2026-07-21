"use client";

/**
 * RIVALFIT - WOD Post Display
 * Componente para renderizar WODs con diseño visual bonito
 */

import { useState } from "react";
import { Clock, Zap, Trophy, Target, ChevronDown, ChevronUp, Users } from "lucide-react";
import type { GeneratedWOD } from "@/lib/wod-types";
import { WorkoutCategory } from "./training/WodCreator";
import type { TaggedProfile } from "./PartnerTagField";
import { cn } from "@/lib/utils";

interface ExtendedWOD extends GeneratedWOD {
  category?: WorkoutCategory;
  partner?: TaggedProfile | null;
}

interface WODPostDisplayProps {
  wod: ExtendedWOD;
  compact?: boolean;
  // compact ya fuerza los bloques siempre visibles sin botón de
  // expandir/colapsar (pensado para vistas de resumen). En el feed
  // queremos SEGUIR filtrando warmup/cooldown (lo que da `compact`) pero
  // que la tarjeta arranque colapsada y el usuario pueda abrirla/cerrarla.
  collapsible?: boolean;
}

export default function WODPostDisplay({ wod, compact = false, collapsible = false }: WODPostDisplayProps) {
  // Estado para expandir/colapsar
  const [isExpanded, setIsExpanded] = useState(!collapsible);

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

  // --- RENDERIZADO ESTILO RUNNING / STRAVA ---
  if (wod.category === 'RUNNING') {
    return (
      <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl keep-all dark-section font-sans relative group">
        {/* Grid Background Mockup */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* Header Strava Style */}
        <div className="relative p-8 z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-red shadow-[0_0_10px_rgba(255,46,46,0.5)] animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">GPS TRACKING ACTIVE</span>
            </div>
            <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">SESSION ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
            </div>
          </div>
          
          <div className="mb-10">
            <h3 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none mb-2 group-hover:text-brand-red transition-colors">
                {wod.title}
            </h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em]">{wod.subtitle || 'Outdoor Running Session'}</p>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-10 mb-10 border-y border-white/5 py-10 relative">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Distancia Total</span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-5xl font-black text-white leading-none tracking-tighter">
                    {wod.blocks[0]?.config?.distance?.split(' ')[0] || '--'}
                </span>
                <span className="text-lg font-black text-brand-red italic uppercase">KM</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Ritmo de Carrera</span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-5xl font-black text-white leading-none tracking-tighter">
                    {wod.blocks[0]?.config?.pace || '--'}
                </span>
                <span className="text-lg font-black text-brand-red italic uppercase text-sm">/KM</span>
              </div>
            </div>

            <div className="space-y-2 col-span-2 lg:col-span-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Tiempo en Movimiento</span>
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-5xl font-black text-white leading-none tracking-tighter">
                    {wod.estimatedDuration || '--'}
                </span>
                <span className="text-lg font-black text-brand-red italic uppercase">MIN</span>
              </div>
            </div>
          </div>

          {/* Details / Blocks */}
          <div className="space-y-8">
            {wod.blocks.map((block, bIdx) => (
              <div key={bIdx} className="space-y-5">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-brand-red bg-brand-red/10 border border-brand-red/20 px-3 py-1 rounded-sm uppercase italic tracking-[0.2em]">{block.title}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-brand-red/20 to-transparent" />
                </div>

                <div className="grid gap-3">
                    {block.exercises && block.exercises.map((ex: any, eIdx) => {
                    // Distintas herramientas de creación de WOD guardan estos dos
                    // datos con nombres de campo diferentes — se aceptan ambos
                    // para no perder el peso/objetivo ni la nota del ejercicio.
                    const noteText = ex.notes || ex.note;
                    const weightText = ex.detail || ex.value;
                    const weightUnit = ex.unit || ex.weightUnit || '';
                    return (
                    <div key={eIdx} className="bg-white/[0.03] border border-white/5 rounded-[22px] p-8 hover:bg-white/[0.05] transition-all hover:border-white/10 group/row">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <p className="text-lg font-black text-white group-hover/row:text-brand-red transition-colors uppercase italic tracking-tight">{ex.name}</p>
                                {noteText && <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-md">{noteText}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {weightText && (
                                    <div className="bg-brand-red/10 border border-brand-red/20 px-4 py-2 rounded-xl">
                                        <span className="text-xs font-black text-brand-red uppercase italic">{weightText}{weightUnit}</span>
                                    </div>
                                )}
                                {ex.reps && (
                                    <div className="bg-black border border-white/10 px-4 py-2 rounded-xl">
                                        <span className="text-xs font-black text-white/50 uppercase italic">{ex.reps}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Stats */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5 bg-gradient-to-b from-transparent to-black/50 -mx-8 px-8 pb-4">
            <div className="flex gap-10">
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Kcal Quemadas</span>
                    <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-brand-red" />
                        <span className="text-xs font-black text-gray-300 italic tracking-tighter">{wod.caloriesBurn} KCAL</span>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Intensidad</span>
                    <div className="flex items-center gap-2">
                        <Trophy className="w-3 h-3 text-brand-yellow" />
                        <span className="text-xs font-black text-gray-300 italic uppercase tracking-tighter">{wod.difficulty}</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1">
                <span className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">Official Performance Data</span>
                <div className="flex items-center gap-2">
                    <Target className="w-3 h-3 text-brand-red/40" />
                    <span className="text-[10px] font-black text-gray-600 tracking-[0.1em] italic">RIVALFIT HIGH-PERFORMANCE UNIT</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERIZADO ESTÁNDAR (CROSSFIT, HYROX, ETC) ---
  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden keep-all dark-section">
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
            {wod.partner && (
              <p className="text-xs text-brand-red font-bold flex items-center gap-1 mt-1">
                <Users className="w-3 h-3" /> Con @{wod.partner.username}
              </p>
            )}
          </div>
        </div>

        {/* Stats — WODs antiguos (o generados antes de que el coach guardase
            estos campos) pueden no tener estimatedDuration/caloriesBurn/
            difficulty. Antes se mostraba la unidad igualmente ("min", "kcal")
            con el número en blanco; ahora esa píldora se oculta si no hay dato. */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {wod.estimatedDuration != null && (
            <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-white font-bold">{wod.estimatedDuration} min</span>
            </div>
          )}
          {wod.caloriesBurn != null && (
            <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-white font-bold">{wod.caloriesBurn} kcal</span>
            </div>
          )}
          {wod.difficulty && (
          <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg">
            <span className="text-xl">{difficultyEmoji[wod.difficulty] || "📊"}</span>
            <span className="text-white font-bold uppercase">{wod.difficulty}</span>
          </div>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="p-6 space-y-4">
        {/* Si no está expandido o es compact (y no colapsable), mostrar bloques */}
        {(isExpanded || (compact && !collapsible)) && wod.blocks.map((block, idx) => {
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
                {block.exercises && Array.isArray(block.exercises) && block.exercises.map((ex: any, i) => {
                  const noteText = ex.notes || ex.note;
                  const weightText = ex.detail || ex.value;
                  const weightUnit = ex.unit || ex.weightUnit || '';
                  return (
                  <div key={`ex-${idx}-${i}-${ex.name}`} className="flex items-start gap-2 text-gray-200">
                    <span className="text-brand-red font-bold">•</span>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        {ex.reps && <span className="text-white font-bold shrink-0">{ex.reps}</span>}
                        <span className="font-medium">{ex.name}</span>
                        {weightText && <span className="text-brand-red font-bold text-xs">{weightText}{weightUnit}</span>}
                      </div>
                      {noteText && (
                        <p className="text-xs text-gray-500 mt-0.5">{noteText}</p>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Tips */}
        {wod.tips && wod.tips.length > 0 && (!compact || collapsible) && isExpanded && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">💡</span>
              <div className="flex-1">
                <h5 className="text-yellow-400 font-bold text-sm mb-2 uppercase">TIP DE ENTRENAMIENTO:</h5>
                <p className="text-gray-200 text-sm">{wod.tips[0]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Botón Expandir/Colapsar */}
        {(!compact || collapsible) && (
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
