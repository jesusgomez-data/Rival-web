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
        // Simular llamada a IA siguiendo CROSSFIT_WOD_SYSTEM.md
        await new Promise(r => setTimeout(r, 2500));

        const professionalWods = [
            {
                title: "ARENA BLITZ ⚡",
                blocks: [
                    {
                        id: "b1",
                        title: "PILLAR STRENGTH",
                        format: "EMOM",
                        config: { frequency: "1 MIN", minutes: 12 },
                        content: "Alternate between exercises every minute",
                        exercises: [
                            { name: "Back Squat", reps: "8-10 reps", detail: "65-70% 1RM" },
                            { name: "Strict Press", reps: "10-12 reps", detail: "RPE 8" }
                        ]
                    },
                    {
                        id: "b2",
                        title: "METCON",
                        format: "AMRAP",
                        config: { timecap: "15:00" },
                        content: "As many rounds as possible in 15 mins",
                        exercises: [
                            { name: "Kettlebell Swings", reps: "20 reps", detail: "24/16kg" },
                            { name: "Box Jumps", reps: "15 reps", detail: "24/20\"" },
                            { name: "Burpees", reps: "10 reps", detail: "Standard" }
                        ]
                    }
                ],
                summary: {
                    totalTime: "40:00",
                    scoreType: "REPS",
                    scoreLabel: "TOTAL REPS"
                },
                rpe: 8,
                focus: "Power & Capacity"
            },
            {
                title: "GRIZZLY ENDURANCE 🐻",
                blocks: [
                    {
                        id: "b1",
                        title: "THE ENGINE",
                        format: "FOR TIME",
                        config: { timecap: "25:00" },
                        content: "Complete all work as fast as possible",
                        exercises: [
                            { name: "Row", reps: "1000m", detail: "Moderate Pace" },
                            { name: "Thrusters", reps: "50 reps", detail: "43/30kg" },
                            { name: "Pull-ups", reps: "50 reps", detail: "Kipping" },
                            { name: "Row", reps: "1000m", detail: "Max Effort" }
                        ]
                    }
                ],
                summary: {
                    totalTime: "35:00",
                    scoreType: "TIME",
                    scoreLabel: "FINISH TIME"
                },
                rpe: 9,
                focus: "Lactate Threshold"
            }
        ];

        setWorkout(professionalWods[Math.floor(Math.random() * professionalWods.length)]);
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
                            <div className="text-[10px] font-black tracking-widest text-indigo-400 mb-6 uppercase border-b border-white/5 pb-2">
                                FOCUS: {workout.focus} | TOTAL TIME: {workout.summary.totalTime}
                            </div>

                            <div className="space-y-6">
                                {workout.blocks.map((block: any, i: number) => (
                                    <div key={block.id} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-1 bg-white/5 rounded-md text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                                                {block.format}
                                            </div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest">{block.title}</h4>
                                            {block.config?.timecap && <span className="text-[8px] font-bold text-gray-500 ml-auto">CAP: {block.config.timecap}</span>}
                                        </div>
                                        <div className="space-y-2 pl-4 border-l border-white/5 ml-1">
                                            {block.exercises.map((ex: any, ei: number) => (
                                                <div key={ei} className="flex justify-between items-center group/ex transition-all">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black text-gray-700">0{ei + 1}</span>
                                                        <span className="text-xs font-bold text-gray-300 group-hover/ex:text-white">{ex.name}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] font-black text-indigo-400 tracking-tighter italic">{ex.reps}</span>
                                                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{ex.detail}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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
