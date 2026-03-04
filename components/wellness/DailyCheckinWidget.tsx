"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Battery, Zap, Heart, Brain, X, Check, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { saveCheckin } from "@/app/dashboard/wellness-actions";

const MOODS = [
    { key: 'great', label: '🔥 En racha', color: 'text-green-400' },
    { key: 'good', label: '💪 Bien', color: 'text-blue-400' },
    { key: 'ok', label: '😐 Regular', color: 'text-yellow-400' },
    { key: 'tired', label: '😴 Cansado', color: 'text-orange-400' },
    { key: 'bad', label: '😣 Mal', color: 'text-red-400' },
];

const MUSCLE_GROUPS = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Glúteos', 'Cardio'];

interface Props { existingCheckin: any; onComplete?: (score: number) => void; }

export default function DailyCheckinWidget({ existingCheckin, onComplete }: Props) {
    const [isOpen, setIsOpen] = useState(!existingCheckin);
    const [step, setStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [done, setDone] = useState(!!existingCheckin);
    const [form, setForm] = useState({
        energy_level: 7,
        sleep_hours: 7,
        sleep_quality: 3,
        muscle_soreness: 2,
        motivation: 8,
        stress_level: 3,
        mood: 'good',
        sore_muscles: [] as string[],
        notes: '',
    });

    const toggleMuscle = (m: string) => {
        setForm(f => ({ ...f, sore_muscles: f.sore_muscles.includes(m) ? f.sore_muscles.filter(x => x !== m) : [...f.sore_muscles, m] }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await saveCheckin(form);
        setIsSaving(false);
        setDone(true);
        setIsOpen(false);
        if (res.success && onComplete) onComplete(res.recoveryScore);
    };

    const recoveryScore = Math.round(
        (form.energy_level / 10) * 30 + (form.sleep_quality / 5) * 25 +
        (Math.min(form.sleep_hours, 10) / 10) * 15 +
        ((5 - form.muscle_soreness) / 5) * 20 + ((10 - form.stress_level) / 10) * 10
    );

    const scoreColor = recoveryScore >= 75 ? 'text-green-400' : recoveryScore >= 50 ? 'text-yellow-400' : 'text-red-400';
    const scoreLabel = recoveryScore >= 75 ? '🔥 Listo para destruir' : recoveryScore >= 50 ? '✅ Entrena con moderación' : '⚠️ Considera descansar';

    if (done && existingCheckin) {
        const score = existingCheckin.recovery_score || recoveryScore;
        const sc = score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
        return (
            <div className="bg-black/40 border border-white/5 rounded-[1.5rem] p-5 flex items-center gap-4">
                <div className={clsx("text-3xl font-heading font-black w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center", sc)}>
                    {score}
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Recovery Score de Hoy</p>
                    <p className={clsx("font-bold text-sm", sc)}>{score >= 75 ? '🔥 Listo para destruir' : score >= 50 ? '✅ Entrena moderado' : '⚠️ Considera descansar'}</p>
                </div>
                <div className="ml-auto text-gray-600 text-[10px] font-bold uppercase">Registrado ✓</div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <button onClick={() => setIsOpen(true)}
                className="w-full bg-black/40 border border-white/5 rounded-[1.5rem] p-5 flex items-center gap-4 hover:border-brand-red/30 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red group-hover:bg-brand-red/20 transition-all">
                    <Heart className="w-5 h-5" />
                </div>
                <div className="text-left">
                    <p className="font-bold text-white text-sm">Check-in Diario</p>
                    <p className="text-[10px] text-gray-500">¿Cómo está tu cuerpo hoy? · 1 min</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
            </button>
        );
    }

    const steps = [
        { title: 'Energía y Estado', icon: <Battery className="w-5 h-5" /> },
        { title: 'Sueño', icon: <Moon className="w-5 h-5" /> },
        { title: 'Recuperación', icon: <Zap className="w-5 h-5" /> },
        { title: 'Resumen', icon: <Brain className="w-5 h-5" /> },
    ];

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
                <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                    className="bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-6 w-full max-w-md">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Paso {step + 1} de {steps.length}</p>
                            <h3 className="text-xl font-heading font-black text-white uppercase italic flex items-center gap-2">
                                {steps[step].icon} {steps[step].title}
                            </h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Progress */}
                    <div className="flex gap-1.5 mb-6">
                        {steps.map((_, i) => <div key={i} className={clsx("h-1 flex-1 rounded-full transition-all", i <= step ? "bg-brand-red" : "bg-white/10")} />)}
                    </div>

                    {/* Step 0: Energy & Mood */}
                    {step === 0 && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-3">Nivel de energía: <span className="text-brand-red font-black">{form.energy_level}/10</span></p>
                                <input type="range" min="1" max="10" value={form.energy_level} onChange={e => setForm(f => ({ ...f, energy_level: parseInt(e.target.value) }))}
                                    className="w-full accent-red-500" />
                                <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>Agotado</span><span>Bestia</span></div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-3">Motivación: <span className="text-brand-red font-black">{form.motivation}/10</span></p>
                                <input type="range" min="1" max="10" value={form.motivation} onChange={e => setForm(f => ({ ...f, motivation: parseInt(e.target.value) }))}
                                    className="w-full accent-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-3">Estado de ánimo:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {MOODS.map(m => (
                                        <button key={m.key} onClick={() => setForm(f => ({ ...f, mood: m.key }))}
                                            className={clsx("py-2 px-3 rounded-xl text-sm font-bold border-2 transition-all",
                                                form.mood === m.key ? "border-brand-red bg-brand-red/10 text-white" : "border-white/10 text-gray-400 hover:border-white/20")}>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Sleep */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-3">Horas de sueño: <span className="text-brand-red font-black">{form.sleep_hours}h</span></p>
                                <input type="range" min="3" max="12" step="0.5" value={form.sleep_hours} onChange={e => setForm(f => ({ ...f, sleep_hours: parseFloat(e.target.value) }))}
                                    className="w-full accent-red-500" />
                                <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>3h</span><span>12h</span></div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-3">Calidad del sueño: <span className="text-brand-red font-black">{form.sleep_quality}/5</span></p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button key={n} onClick={() => setForm(f => ({ ...f, sleep_quality: n }))}
                                            className={clsx("flex-1 h-10 rounded-xl text-lg transition-all border-2",
                                                form.sleep_quality >= n ? "border-brand-red bg-brand-red/10" : "border-white/10 hover:border-white/20")}>
                                            {n <= 2 ? '😴' : n <= 4 ? '😊' : '🌟'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Recovery */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-3">Estrés: <span className="text-brand-red font-black">{form.stress_level}/10</span></p>
                                <input type="range" min="1" max="10" value={form.stress_level} onChange={e => setForm(f => ({ ...f, stress_level: parseInt(e.target.value) }))}
                                    className="w-full accent-red-500" />
                                <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>Zen</span><span>Estresado</span></div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-2">Dolor muscular: <span className="text-brand-red font-black">{form.muscle_soreness}/5</span></p>
                                <input type="range" min="1" max="5" value={form.muscle_soreness} onChange={e => setForm(f => ({ ...f, muscle_soreness: parseInt(e.target.value) }))}
                                    className="w-full accent-red-500" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-bold mb-2">Grupos musculares afectados:</p>
                                <div className="flex flex-wrap gap-2">
                                    {MUSCLE_GROUPS.map(m => (
                                        <button key={m} onClick={() => toggleMuscle(m)}
                                            className={clsx("px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                                form.sore_muscles.includes(m) ? "border-brand-red bg-brand-red/10 text-red-400" : "border-white/10 text-gray-500 hover:border-white/20")}>
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Summary */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">Tu Recovery Score</p>
                                <motion.p initial={{ scale: 0.5 }} animate={{ scale: 1 }} className={clsx("text-7xl font-heading font-black", scoreColor)}>
                                    {recoveryScore}
                                </motion.p>
                                <p className={clsx("text-sm font-bold mt-2", scoreColor)}>{scoreLabel}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                {[
                                    { label: 'Energía', val: form.energy_level, max: 10 },
                                    { label: 'Sueño', val: form.sleep_hours, max: 10, suffix: 'h' },
                                    { label: 'Motivación', val: form.motivation, max: 10 },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 rounded-2xl p-3">
                                        <p className="text-[9px] text-gray-600 font-black uppercase">{s.label}</p>
                                        <p className="text-xl font-black text-white">{s.val}{s.suffix || ''}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-3 mt-6">
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 border border-white/10 rounded-2xl text-sm font-black text-gray-400 hover:text-white transition-all">
                                ← Atrás
                            </button>
                        )}
                        {step < steps.length - 1 ? (
                            <button onClick={() => setStep(s => s + 1)} className="flex-1 bg-brand-red text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all">
                                Siguiente →
                            </button>
                        ) : (
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-brand-red text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                Guardar Check-in
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
