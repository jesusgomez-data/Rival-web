'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Dumbbell, Zap, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DynamicWODGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [workout, setWorkout] = useState<any>(null);
    const [config, setConfig] = useState({
        time: 30,
        equipment: 'full',
        focus: 'full_body'
    });

    const generateWorkout = async () => {
        setIsGenerating(true);
        // Simular llamada a IA
        await new Promise(r => setTimeout(r, 2000));

        const mockWods = [
            {
                title: "RIVAL BLAST 🔥",
                type: "AMRAP 20",
                description: "Máximas rondas posibles en 20 minutos de:",
                exercises: [
                    "20 Kettlebell Swings (24/16kg)",
                    "15 Box Jumps",
                    "10 Burpees over bar",
                    "5 Pull-ups"
                ],
                focus: "Potencia Metabólica",
                rpe: 9
            },
            {
                title: "IRON FLOW 🦾",
                type: "4 Rondas por tiempo",
                description: "Calidad de movimiento y tensión constante:",
                exercises: [
                    "12 Goblet Squats",
                    "12 Dumbbell Rows",
                    "12 Overhead Press",
                    "20 Plank Shoulders Taps"
                ],
                focus: "Fuerza e Hipertrofia",
                rpe: 7
            }
        ];

        setWorkout(mockWods[Math.floor(Math.random() * mockWods.length)]);
        setIsGenerating(false);
    };

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[32px] p-8 border border-white/5 backdrop-blur-xl relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-white/20" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-heading font-black italic uppercase tracking-tight text-white">Generador IA de WODs_</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Personalizado según tu equipo y tiempo</p>
                    </div>
                </div>

                {!workout ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ConfigOption
                                label="Tiempo"
                                icon={<Clock className="w-4 h-4" />}
                                value={config.time}
                                options={[15, 30, 45, 60]}
                                unit="min"
                                onChange={(v: number) => setConfig({ ...config, time: v })}
                            />
                            <ConfigOption
                                label="Equipo"
                                icon={<Dumbbell className="w-4 h-4" />}
                                value={config.equipment}
                                options={['ninguno', 'mancuernas', 'full']}
                                onChange={(v: string) => setConfig({ ...config, equipment: v })}
                            />
                            <ConfigOption
                                label="Enfoque"
                                icon={<Zap className="w-4 h-4" />}
                                value={config.focus}
                                options={['upper', 'lower', 'full_body']}
                                onChange={(v: string) => setConfig({ ...config, focus: v })}
                            />
                        </div>

                        <button
                            onClick={generateWorkout}
                            disabled={isGenerating}
                            className="w-full bg-white text-black font-black uppercase tracking-[0.2em] italic py-4 rounded-2xl text-xs hover:bg-indigo-400 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl group shadow-indigo-500/20"
                        >
                            {isGenerating ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Calculando Secuencia...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                                    Generar Entrenamiento Único
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="text-[10px] font-black italic text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full uppercase">RPE {workout.rpe}/10</span>
                            </div>

                            <h3 className="text-2xl font-heading font-black italic text-white mb-1 uppercase tracking-tighter">{workout.title}</h3>
                            <div className="text-sm font-bold text-indigo-400 mb-4">{workout.type}</div>

                            <p className="text-xs text-gray-400 mb-6 italic">{workout.description}</p>

                            <div className="space-y-3">
                                {workout.exercises.map((ex: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-medium text-gray-200">{ex}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex gap-3">
                                <Link
                                    href="/dashboard/training/session"
                                    className="flex-1 bg-white text-black text-center py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                >
                                    Iniciar Sesión
                                </Link>
                                <button
                                    onClick={() => setWorkout(null)}
                                    className="px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function ConfigOption({ label, icon, value, options, unit, onChange }: any) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
                <div className="text-indigo-400">{icon}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{label}</span>
            </div>
            <div className="flex flex-wrap gap-2">
                {options.map((opt: any) => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={cn(
                            "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            value === opt
                                ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30"
                                : "bg-black/40 border-white/10 text-gray-400 hover:border-white/20"
                        )}
                    >
                        {opt} {unit}
                    </button>
                ))}
            </div>
        </div>
    );
}
