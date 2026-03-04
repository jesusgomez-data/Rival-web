"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Flame, Beef, Wheat, Zap, Plus, Check, X, ChevronUp, ChevronDown, Settings } from "lucide-react";
import clsx from "clsx";
import { getTodayNutrition, updateNutritionLog, getNutritionHistory } from "../wellness-actions";
import { getUserProfile } from "../training/actions";

function calcTDEE(weight: number, heightCm: number, age: number, activityLevel: string) {
    if (!weight || !heightCm) return 2000;
    // Mifflin-St Jeor (average male/female)
    const bmr = 10 * weight + 6.25 * heightCm - 5 * (age || 25) + 5;
    const multiplier = activityLevel === 'sedentary' ? 1.2 : activityLevel === 'light' ? 1.375 : activityLevel === 'moderate' ? 1.55 : activityLevel === 'active' ? 1.725 : 1.9;
    return Math.round(bmr * multiplier);
}

function MacroRing({ value, target, color, label, emoji }: { value: number, target: number, color: string, label: string, emoji: string }) {
    const pct = Math.min((value / (target || 1)) * 100, 100);
    const r = 40, cx = 50, cy = 50;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg">{emoji}</span>
                    <span className="text-sm font-black text-white">{value}<span className="text-[10px] text-gray-500">g</span></span>
                </div>
            </div>
            <div className="text-center">
                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{label}</p>
                <p className="text-[10px] text-gray-600">meta: {target}g</p>
            </div>
        </div>
    );
}

export default function NutritionPage() {
    const [log, setLog] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activityLevel, setActivityLevel] = useState('moderate');
    const [macroForm, setMacroForm] = useState({ calories: '', protein: '', carbs: '', fat: '', water: '' });
    const [targetForm, setTargetForm] = useState({ calories: '', protein: '', carbs: '', fat: '', water: '2500' });

    useEffect(() => {
        async function load() {
            const [todayLog, hist, prof] = await Promise.all([getTodayNutrition(), getNutritionHistory(30), getUserProfile()]);
            setLog(todayLog);
            setHistory(hist);
            setProfile(prof);
            if (todayLog) {
                setMacroForm({ calories: todayLog.actual_calories?.toString() || '', protein: todayLog.actual_protein_g?.toString() || '', carbs: todayLog.actual_carbs_g?.toString() || '', fat: todayLog.actual_fat_g?.toString() || '', water: todayLog.actual_water_ml?.toString() || '' });
                setTargetForm({ calories: todayLog.target_calories?.toString() || '', protein: todayLog.target_protein_g?.toString() || '', carbs: todayLog.target_carbs_g?.toString() || '', fat: todayLog.target_fat_g?.toString() || '', water: todayLog.target_water_ml?.toString() || '2500' });
            }
            setIsLoading(false);
        }
        load();
    }, []);

    const suggestedTDEE = profile ? calcTDEE(profile.weight_kg || 75, profile.height_cm || 175, 25, activityLevel) : 2000;
    const suggestedProtein = Math.round((profile?.weight_kg || 75) * 2.2);
    const targets = { calories: parseInt(targetForm.calories) || suggestedTDEE, protein: parseInt(targetForm.protein) || suggestedProtein, carbs: parseInt(targetForm.carbs) || Math.round(suggestedTDEE * 0.45 / 4), fat: parseInt(targetForm.fat) || Math.round(suggestedTDEE * 0.25 / 9), water: parseInt(targetForm.water) || 2500 };
    const actuals = { calories: log?.actual_calories || 0, protein: log?.actual_protein_g || 0, carbs: log?.actual_carbs_g || 0, fat: log?.actual_fat_g || 0, water: log?.actual_water_ml || 0 };

    const handleSaveActuals = async () => {
        setIsSaving(true);
        await updateNutritionLog({
            actual_calories: parseInt(macroForm.calories) || 0,
            actual_protein_g: parseInt(macroForm.protein) || 0,
            actual_carbs_g: parseInt(macroForm.carbs) || 0,
            actual_fat_g: parseInt(macroForm.fat) || 0,
            actual_water_ml: parseInt(macroForm.water) || 0,
            target_calories: targets.calories,
            target_protein_g: targets.protein,
            target_carbs_g: targets.carbs,
            target_fat_g: targets.fat,
            target_water_ml: targets.water,
        });
        const todayLog = await getTodayNutrition();
        setLog(todayLog);
        setIsSaving(false);
        setShowLogModal(false);
    };

    const handleSaveTargets = async () => {
        setIsSaving(true);
        await updateNutritionLog({
            target_calories: parseInt(targetForm.calories) || suggestedTDEE,
            target_protein_g: parseInt(targetForm.protein) || suggestedProtein,
            target_carbs_g: parseInt(targetForm.carbs) || 0,
            target_fat_g: parseInt(targetForm.fat) || 0,
            target_water_ml: parseInt(targetForm.water) || 2500,
        });
        const todayLog = await getTodayNutrition();
        setLog(todayLog);
        setIsSaving(false);
        setShowSetupModal(false);
    };

    const waterGlasses = Math.floor(actuals.water / 250);
    const totalGlasses = Math.ceil(targets.water / 250);
    const caloriesLeft = targets.calories - actuals.calories;
    const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-heading font-black text-white tracking-tighter uppercase italic">Nutrición</h1>
                    <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowSetupModal(true)} className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-4 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all">
                        <Settings className="w-4 h-4" /> Metas
                    </button>
                    <button onClick={() => setShowLogModal(true)} className="flex items-center gap-2 bg-brand-red text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                        <Plus className="w-4 h-4" /> Registrar
                    </button>
                </div>
            </div>

            {/* Calorie Hero */}
            <div className="bg-gradient-to-br from-brand-red/10 via-black/40 to-black/40 border border-brand-red/20 rounded-[2rem] p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.06)_0%,transparent_70%)]" />
                <div className="relative z-10">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-2">Calorías</p>
                    <div className="flex items-end justify-center gap-4 mb-4">
                        <div className="text-right">
                            <p className="text-6xl font-heading font-black text-white">{actuals.calories.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 font-bold">consumidas</p>
                        </div>
                        <div className="text-gray-600 text-2xl font-black mb-2">/</div>
                        <div className="text-left">
                            <p className="text-3xl font-heading font-black text-gray-400">{targets.calories.toLocaleString()}</p>
                            <p className="text-xs text-gray-600 font-bold">meta</p>
                        </div>
                    </div>
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden mx-auto max-w-md mb-3">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((actuals.calories / targets.calories) * 100, 100)}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                            className={clsx("h-full rounded-full", actuals.calories > targets.calories ? "bg-red-500" : "bg-brand-red")} />
                    </div>
                    <p className={clsx("text-sm font-black", caloriesLeft > 0 ? "text-green-400" : "text-red-400")}>
                        {caloriesLeft > 0 ? `${caloriesLeft} kcal restantes` : `${Math.abs(caloriesLeft)} kcal por encima del objetivo`}
                    </p>
                </div>
            </div>

            {/* Macros */}
            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
                <h3 className="text-lg font-heading font-black text-white uppercase italic tracking-widest mb-8 flex items-center gap-3">
                    <Beef className="w-5 h-5 text-brand-red" /> Macronutrientes
                </h3>
                <div className="flex justify-around">
                    <MacroRing value={actuals.protein} target={targets.protein} color="#ef4444" label="Proteína" emoji="🥩" />
                    <MacroRing value={actuals.carbs} target={targets.carbs} color="#f59e0b" label="Carbohidratos" emoji="🌾" />
                    <MacroRing value={actuals.fat} target={targets.fat} color="#8b5cf6" label="Grasas" emoji="🥑" />
                </div>
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    {[
                        { label: 'Proteína', val: actuals.protein, target: targets.protein, cal: actuals.protein * 4, color: 'text-red-400' },
                        { label: 'Carbs', val: actuals.carbs, target: targets.carbs, cal: actuals.carbs * 4, color: 'text-yellow-400' },
                        { label: 'Grasas', val: actuals.fat, target: targets.fat, cal: actuals.fat * 9, color: 'text-purple-400' },
                    ].map(m => (
                        <div key={m.label} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${m.color} mb-1`}>{m.label}</p>
                            <p className="text-xl font-heading font-black text-white">{m.val}g</p>
                            <p className="text-[10px] text-gray-600">{m.cal} kcal</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Water Tracker */}
            <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
                <h3 className="text-lg font-heading font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-3">
                    <Droplets className="w-5 h-5 text-blue-400" /> Hidratación
                </h3>
                <div className="flex flex-wrap gap-3 mb-4">
                    {Array.from({ length: totalGlasses }).map((_, i) => (
                        <button key={i} onClick={async () => {
                            const newWater = Math.min((i + 1) * 250, targets.water);
                            await updateNutritionLog({ actual_water_ml: newWater });
                            setLog((l: any) => ({ ...l, actual_water_ml: newWater }));
                        }} className={clsx("w-10 h-12 rounded-xl border-2 flex items-center justify-center text-lg transition-all hover:scale-110",
                            i < waterGlasses ? "border-blue-400 bg-blue-400/20 text-blue-400" : "border-white/10 text-gray-700 hover:border-blue-400/40")}>
                            💧
                        </button>
                    ))}
                </div>
                <p className="text-sm text-gray-500 font-bold">{actuals.water}ml / {targets.water}ml · {waterGlasses} vasos</p>
            </div>

            {/* 7-Day History */}
            {history.length > 0 && (
                <div className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
                    <h3 className="text-lg font-heading font-black text-white uppercase italic tracking-widest mb-6">Historial — 7 días</h3>
                    <div className="space-y-3">
                        {history.slice(0, 7).map((day, i) => {
                            const pct = Math.min(((day.actual_calories || 0) / (day.target_calories || 2000)) * 100, 100);
                            return (
                                <div key={i} className="flex items-center gap-4">
                                    <span className="text-xs text-gray-500 w-16 shrink-0 font-bold">{new Date(day.log_date).toLocaleDateString('es', { weekday: 'short', day: 'numeric' })}</span>
                                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-red rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-400 font-black w-20 text-right shrink-0">{day.actual_calories || 0} kcal</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Log Modal */}
            <AnimatePresence>
                {showLogModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowLogModal(false)}>
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-6 w-full max-w-md">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-heading font-black text-white uppercase italic">Registrar Macros</h3>
                                <button onClick={() => setShowLogModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { key: 'calories', label: 'Calorías', emoji: '🔥', unit: 'kcal' },
                                    { key: 'protein', label: 'Proteína', emoji: '🥩', unit: 'g' },
                                    { key: 'carbs', label: 'Carbohidratos', emoji: '🌾', unit: 'g' },
                                    { key: 'fat', label: 'Grasas', emoji: '🥑', unit: 'g' },
                                    { key: 'water', label: 'Agua', emoji: '💧', unit: 'ml' },
                                ].map(f => (
                                    <div key={f.key} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
                                        <span className="text-xl">{f.emoji}</span>
                                        <div className="flex-1">
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{f.label}</p>
                                            <input type="number" placeholder="0" value={(macroForm as any)[f.key]}
                                                onChange={e => setMacroForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full bg-transparent text-white font-black text-lg focus:outline-none" />
                                        </div>
                                        <span className="text-xs text-gray-600 font-bold">{f.unit}</span>
                                    </div>
                                ))}
                                <button onClick={handleSaveActuals} disabled={isSaving}
                                    className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                    Guardar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Setup Modal */}
            <AnimatePresence>
                {showSetupModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowSetupModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-heading font-black text-white uppercase italic">Configurar Metas</h3>
                                <button onClick={() => setShowSetupModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="mb-4 p-4 bg-brand-red/10 border border-brand-red/20 rounded-2xl">
                                <p className="text-xs text-gray-400 mb-2 font-bold">TDEE sugerido:</p>
                                <p className="text-2xl font-black text-brand-red">{suggestedTDEE} kcal</p>
                                <p className="text-[10px] text-gray-500 mt-1">Proteína sugerida: {suggestedProtein}g (2.2g/kg)</p>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { key: 'calories', label: '🔥 Calorías objetivo', placeholder: suggestedTDEE.toString() },
                                    { key: 'protein', label: '🥩 Proteína (g)', placeholder: suggestedProtein.toString() },
                                    { key: 'carbs', label: '🌾 Carbohidratos (g)', placeholder: Math.round(suggestedTDEE * 0.45 / 4).toString() },
                                    { key: 'fat', label: '🥑 Grasas (g)', placeholder: Math.round(suggestedTDEE * 0.25 / 9).toString() },
                                    { key: 'water', label: '💧 Agua (ml)', placeholder: '2500' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">{f.label}</label>
                                        <input type="number" placeholder={f.placeholder} value={(targetForm as any)[f.key]}
                                            onChange={e => setTargetForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-brand-red focus:outline-none" />
                                    </div>
                                ))}
                                <button onClick={handleSaveTargets} disabled={isSaving}
                                    className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                    Guardar Metas
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
