"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scale, TrendingDown, Camera, Plus, CheckCircle,
    Activity, Target, Ruler, BarChart2, Zap, X, Check,
    ArrowUpRight, ArrowDownRight, AlertCircle, RefreshCw
} from "lucide-react";
import clsx from "clsx";
import {
    logBodyStats, getBodyStatsHistory, getLatestBodyStats,
    uploadBodyPhoto, getUserGoals, createGoal
} from "../wellness-actions";
import Image from "next/image";
import { getUserProfile } from "../training/actions";

const MUSCLE_GROUPS = [
    { key: 'chest_cm',    label: 'Pecho',    icon: '💪' },
    { key: 'waist_cm',    label: 'Cintura',  icon: '⚡' },
    { key: 'hips_cm',     label: 'Caderas',  icon: '🔥' },
    { key: 'bicep_cm',    label: 'Bíceps',   icon: '💪' },
    { key: 'thigh_cm',    label: 'Muslo',    icon: '🦵' },
    { key: 'calf_cm',     label: 'Gemelo',   icon: '🦵' },
    { key: 'shoulder_cm', label: 'Hombros',  icon: '🏋️' },
    { key: 'neck_cm',     label: 'Cuello',   icon: '🤜' },
];

function calcBMI(weight: number, heightCm: number) {
    if (!weight || !heightCm) return null;
    return (weight / Math.pow(heightCm / 100, 2)).toFixed(1);
}

function Toast({ message, type, onClose }: { message: string; type: 'error' | 'success'; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className={clsx(
                "fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm max-w-xs text-center",
                type === 'error' ? "bg-red-500/90 text-white" : "bg-green-500/90 text-white"
            )}
        >
            {type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            {message}
        </motion.div>
    );
}

export default function BodyStatsPage() {
    const [history, setHistory]         = useState<any[]>([]);
    const [latest, setLatest]           = useState<any>(null);
    const [profile, setProfile]         = useState<any>(null);
    const [isLoading, setIsLoading]     = useState(true);
    const [loadError, setLoadError]     = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [activeTab, setActiveTab]     = useState<'weight' | 'measurements' | 'photos' | 'goals'>('weight');
    const [isSaving, setIsSaving]       = useState(false);
    const [goals, setGoals]             = useState<any[]>([]);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [toast, setToast]             = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const [form, setForm] = useState<any>({
        weight_kg: '', body_fat_pct: '',
        chest_cm: '', waist_cm: '', hips_cm: '', bicep_cm: '',
        thigh_cm: '', calf_cm: '', shoulder_cm: '', neck_cm: '', notes: ''
    });
    const [goalForm, setGoalForm] = useState({ title: '', target_value: '', unit: 'kg', target_date: '' });
    const fileRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [detailEntry, setDetailEntry] = useState<any>(null);

    const showToast = (message: string, type: 'error' | 'success') => setToast({ message, type });

    const load = useCallback(async () => {
        setIsLoading(true);
        setLoadError(false);
        try {
            const [hist, lat, prof, goalsData] = await Promise.all([
                getBodyStatsHistory(60),
                getLatestBodyStats(),
                getUserProfile(),
                getUserGoals()
            ]);
            setHistory(hist || []);
            setLatest(lat);
            setProfile(prof);
            setGoals(goalsData || []);
        } catch (err) {
            console.error('Body stats load error:', err);
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        // Validate at least one field filled
        const hasValue = Object.entries(form).some(([k, v]) => k !== 'notes' && v !== '');
        if (!hasValue) {
            showToast('Introduce al menos un dato para guardar.', 'error');
            return;
        }
        setIsSaving(true);
        const payload: any = {};
        Object.entries(form).forEach(([k, v]) => {
            if (v !== '') payload[k] = k === 'notes' ? v : parseFloat(v as string);
        });
        const result = await logBodyStats(payload);
        if (result?.error) {
            showToast(`Error al guardar: ${result.error}`, 'error');
            setIsSaving(false);
            return;
        }
        const [hist, lat] = await Promise.all([getBodyStatsHistory(60), getLatestBodyStats()]);
        setHistory(hist || []);
        setLatest(lat);
        setIsSaving(false);
        setShowLogModal(false);
        setForm({ weight_kg: '', body_fat_pct: '', chest_cm: '', waist_cm: '', hips_cm: '', bicep_cm: '', thigh_cm: '', calf_cm: '', shoulder_cm: '', neck_cm: '', notes: '' });
        showToast('Medición guardada ✓', 'success');
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        const res = await uploadBodyPhoto(fd);
        if (res.error || !res.url) {
            showToast(`Error al subir foto: ${res.error || 'desconocido'}`, 'error');
            setIsUploading(false);
            return;
        }
        const saveResult = await logBodyStats({ photo_url: res.url });
        if (saveResult?.error) {
            showToast(`Error al guardar foto: ${saveResult.error}`, 'error');
        } else {
            const [hist, lat] = await Promise.all([getBodyStatsHistory(60), getLatestBodyStats()]);
            setHistory(hist || []);
            setLatest(lat);
            showToast('Foto de progreso subida ✓', 'success');
        }
        setIsUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSaveGoal = async () => {
        if (!goalForm.title || !goalForm.target_value) return;
        const result = await createGoal({
            goal_type: 'weight',
            ...goalForm,
            target_value: parseFloat(goalForm.target_value)
        });
        if ((result as any)?.error) {
            showToast('Error al crear objetivo', 'error');
            return;
        }
        setGoals(await getUserGoals());
        setShowGoalModal(false);
        showToast('Objetivo creado ✓', 'success');
    };

    const weightHistory = history.filter(h => h.weight_kg).reverse();
    const minW = Math.min(...weightHistory.map(h => h.weight_kg), 999);
    const maxW = Math.max(...weightHistory.map(h => h.weight_kg), 0);
    const weightRange = (maxW - minW) || 1;
    const bmi = calcBMI(latest?.weight_kg, profile?.height_cm);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
            <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Cargando estadísticas...</p>
        </div>
    );

    if (loadError) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
            <AlertCircle className="w-14 h-14 text-brand-red/40" />
            <div>
                <p className="text-white font-black text-lg uppercase tracking-tight">Error al cargar los datos</p>
                <p className="text-white/30 text-sm mt-1">Es posible que la tabla body_stats no esté creada en Supabase.<br/>Ejecuta el archivo <code className="text-brand-red">SETUP_BODY_STATS.sql</code></p>
            </div>
            <button onClick={load} className="flex items-center gap-2 bg-brand-red text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest">
                <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
        </div>
    );

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto">
            {/* Toast */}
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </AnimatePresence>

            {/* Entry Detail Modal */}
            <AnimatePresence>
                {detailEntry && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
                        onClick={() => setDetailEntry(null)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-black uppercase tracking-widest text-sm">
                                    {new Date(detailEntry.recorded_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <button onClick={() => setDetailEntry(null)} className="text-gray-500 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Peso', value: detailEntry.weight_kg, unit: 'kg' },
                                    { label: 'Grasa', value: detailEntry.body_fat_pct, unit: '%' },
                                    { label: 'Pecho', value: detailEntry.chest_cm, unit: 'cm' },
                                    { label: 'Cintura', value: detailEntry.waist_cm, unit: 'cm' },
                                    { label: 'Caderas', value: detailEntry.hips_cm, unit: 'cm' },
                                    { label: 'Bíceps', value: detailEntry.bicep_cm, unit: 'cm' },
                                    { label: 'Muslo', value: detailEntry.thigh_cm, unit: 'cm' },
                                    { label: 'Hombros', value: detailEntry.shoulder_cm, unit: 'cm' },
                                ].filter(f => f.value != null).map(f => (
                                    <div key={f.label} className="bg-white/5 rounded-2xl p-3">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{f.label}</p>
                                        <p className="text-lg font-heading font-black text-white mt-0.5">{f.value} <span className="text-xs text-gray-500">{f.unit}</span></p>
                                    </div>
                                ))}
                            </div>
                            {detailEntry.notes && (
                                <p className="text-xs text-gray-400 border-t border-white/5 pt-3">{detailEntry.notes}</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-heading font-black text-white tracking-tighter uppercase italic">Body Stats</h1>
                    <p className="text-gray-500 text-sm mt-1">Progreso físico real. Sin filtros, sin excusas.</p>
                </div>
                <button
                    onClick={() => setShowLogModal(true)}
                    className="flex items-center gap-2 bg-brand-red text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                >
                    <Plus className="w-4 h-4" /> Registrar Medición
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Peso Actual',       value: latest?.weight_kg    ? `${latest.weight_kg} kg`    : '—', icon: <Scale className="w-5 h-5" />,    color: 'text-blue-400'   },
                    { label: 'Grasa Corporal',    value: latest?.body_fat_pct ? `${latest.body_fat_pct}%`  : '—', icon: <Activity className="w-5 h-5" />,  color: 'text-orange-400' },
                    { label: 'BMI',               value: bmi || '—',                                              icon: <BarChart2 className="w-5 h-5" />, color: 'text-green-400'  },
                    { label: 'Datos registrados', value: history.length.toString(),                               icon: <Zap className="w-5 h-5" />,        color: 'text-purple-400' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="bg-black/40 border border-white/5 rounded-[1.5rem] p-5"
                    >
                        <div className={`${stat.color} mb-3`}>{stat.icon}</div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-2xl font-heading font-black text-white">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                {(['weight', 'measurements', 'photos', 'goals'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            activeTab === tab ? "bg-brand-red text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]" : "text-gray-500 hover:text-white"
                        )}
                    >
                        {tab === 'weight' ? '⚖️ Peso' : tab === 'measurements' ? '📏 Medidas' : tab === 'photos' ? '📸 Fotos' : '🎯 Metas'}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* WEIGHT TAB */}
                {activeTab === 'weight' && (
                    <motion.div key="weight" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-black/40 border border-white/5 rounded-[2rem] p-8">
                        <h3 className="text-lg font-heading font-black text-white uppercase italic tracking-widest mb-8 flex items-center gap-3">
                            <TrendingDown className="w-5 h-5 text-brand-red" /> Evolución de Peso
                        </h3>
                        {weightHistory.length >= 2 ? (
                            <div className="flex items-end gap-2 h-48">
                                {weightHistory.slice(-20).map((p, i) => {
                                    const h = ((p.weight_kg - minW) / weightRange) * 80 + 10;
                                    const isLast = i === weightHistory.slice(-20).length - 1;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                                            <div className={clsx("w-full rounded-t-xl transition-all group-hover:opacity-80", isLast ? "bg-brand-red shadow-[0_0_12px_rgba(220,38,38,0.4)]" : "bg-white/10")}
                                                style={{ height: `${h}%` }} title={`${p.weight_kg} kg`} />
                                            <span className="text-[8px] text-gray-600 font-bold">
                                                {new Date(p.recorded_at).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl gap-3">
                                <Scale className="w-12 h-12 text-gray-700" />
                                <p className="text-gray-500 text-sm font-bold text-center px-4">
                                    {history.length === 0
                                        ? 'Registra tu primer pesaje para comenzar'
                                        : 'Registra al menos 2 pesajes para ver la gráfica'}
                                </p>
                                <button onClick={() => setShowLogModal(true)} className="text-brand-red text-xs font-black uppercase tracking-widest underline">
                                    Registrar ahora →
                                </button>
                            </div>
                        )}
                        <div className="mt-6 space-y-3">
                            {history.length === 0 ? (
                                <p className="text-center text-white/20 text-sm font-bold py-4">Sin registros aún</p>
                            ) : history.slice(0, 10).map((entry, i) => (
                                <button
                                    key={i}
                                    onClick={() => setDetailEntry(entry)}
                                    className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-brand-red/30 hover:bg-white/5 transition-all text-left"
                                >
                                    <div>
                                        <p className="text-white font-bold text-sm capitalize">
                                            {new Date(entry.recorded_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                            {entry.weight_kg && `${entry.weight_kg} kg`}
                                            {entry.body_fat_pct && ` · ${entry.body_fat_pct}% grasa`}
                                            {!entry.weight_kg && !entry.body_fat_pct && 'Medidas registradas'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {i > 0 && history[i - 1]?.weight_kg && entry.weight_kg && (
                                            <span className={clsx("text-sm font-black flex items-center gap-1",
                                                entry.weight_kg < history[i - 1].weight_kg ? "text-green-500" : "text-red-400")}>
                                                {entry.weight_kg < history[i - 1].weight_kg
                                                    ? <ArrowDownRight className="w-4 h-4" />
                                                    : <ArrowUpRight className="w-4 h-4" />}
                                                {Math.abs(entry.weight_kg - history[i - 1].weight_kg).toFixed(1)} kg
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-600 font-bold">Ver →</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* MEASUREMENTS TAB */}
                {activeTab === 'measurements' && (
                    <motion.div key="measurements" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {!latest ? (
                            <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-white/5 rounded-[2rem] gap-4">
                                <Ruler className="w-12 h-12 text-gray-700" />
                                <p className="text-gray-500 text-sm font-bold text-center">Registra tus primeras medidas</p>
                                <button onClick={() => setShowLogModal(true)} className="bg-brand-red text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest">
                                    Añadir medidas
                                </button>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {MUSCLE_GROUPS.map(mg => (
                                    <div key={mg.key} className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-brand-red/20 transition-all">
                                        <p className="text-2xl mb-2">{mg.icon}</p>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{mg.label}</p>
                                        <p className="text-2xl font-heading font-black text-white mt-1">
                                            {latest[mg.key] ? `${latest[mg.key]} cm` : '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => setShowLogModal(true)}
                            className="mt-6 w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-400 hover:text-white hover:border-brand-red/30 transition-all font-bold text-sm flex items-center justify-center gap-2"
                        >
                            <Ruler className="w-4 h-4" /> Actualizar medidas
                        </button>
                    </motion.div>
                )}

                {/* PHOTOS TAB */}
                {activeTab === 'photos' && (
                    <motion.div key="photos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {/* Upload button */}
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-brand-red/40 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-white transition-all"
                            >
                                {isUploading
                                    ? <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                                    : <><Camera className="w-8 h-8" /><span className="text-xs font-bold">Subir foto</span></>
                                }
                            </button>
                            {/* Photos */}
                            {history.filter(h => h.photo_url).length === 0 && (
                                <div className="col-span-3 flex flex-col items-center justify-center py-12 text-center gap-2">
                                    <Camera className="w-10 h-10 text-gray-700" />
                                    <p className="text-gray-500 text-sm font-bold">Sin fotos de progreso todavía</p>
                                    <p className="text-gray-700 text-xs">Sube tu primera foto para ver tu evolución</p>
                                </div>
                            )}
                            {history.filter(h => h.photo_url).map((entry, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden relative group border border-white/5">
                                    <Image src={entry.photo_url} alt="Progress" fill className="object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                                        <p className="text-[10px] text-white font-bold text-center">
                                            {new Date(entry.recorded_at).toLocaleDateString('es-ES')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* GOALS TAB */}
                {activeTab === 'goals' && (
                    <motion.div key="goals" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        {goals.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-[2rem] gap-4">
                                <Target className="w-12 h-12 text-gray-700" />
                                <p className="text-gray-500 text-sm font-bold text-center">Sin objetivos todavía. ¡Crea uno!</p>
                            </div>
                        )}
                        {goals.map(goal => {
                            const pct = Math.min(((goal.current_value || 0) / goal.target_value) * 100, 100);
                            return (
                                <div key={goal.id} className={clsx("bg-black/40 border rounded-2xl p-5", goal.is_completed ? "border-green-500/30" : "border-white/5")}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-bold text-white">{goal.title}</p>
                                            <p className="text-xs text-gray-500">{goal.current_value || 0} / {goal.target_value} {goal.unit}</p>
                                        </div>
                                        {goal.is_completed && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                            className={clsx("h-full rounded-full", goal.is_completed ? "bg-green-500" : "bg-brand-red")}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-2 font-bold">{pct.toFixed(0)}% completado</p>
                                </div>
                            );
                        })}
                        <button
                            onClick={() => setShowGoalModal(true)}
                            className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-400 hover:text-white hover:border-brand-red/30 transition-all font-bold text-sm flex items-center justify-center gap-2"
                        >
                            <Target className="w-4 h-4" /> Añadir objetivo
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Log Modal ── */}
            <AnimatePresence>
                {showLogModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowLogModal(false)}
                    >
                        <motion.div
                            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-heading font-black text-white uppercase italic">Registrar Medición</h3>
                                <button onClick={() => setShowLogModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { key: 'weight_kg',    label: 'Peso (kg)',  placeholder: '75.5' },
                                        { key: 'body_fat_pct', label: 'Grasa (%)', placeholder: '18'   },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1.5">{f.label}</label>
                                            <input
                                                type="number" step="0.1" placeholder={f.placeholder}
                                                value={form[f.key]}
                                                onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-brand-red focus:outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-3">Medidas (cm)</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {MUSCLE_GROUPS.map(mg => (
                                            <div key={mg.key} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2">
                                                <span>{mg.icon}</span>
                                                <div className="flex-1">
                                                    <p className="text-[9px] text-gray-600 font-black uppercase">{mg.label}</p>
                                                    <input
                                                        type="number" step="0.5" placeholder="—"
                                                        value={form[mg.key]}
                                                        onChange={e => setForm((p: any) => ({ ...p, [mg.key]: e.target.value }))}
                                                        className="w-full bg-transparent text-white font-bold text-sm focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Notas (opcional)"
                                    value={form.notes}
                                    onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-red focus:outline-none resize-none"
                                    rows={2}
                                />
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSaving
                                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        : <Check className="w-4 h-4" />
                                    }
                                    Guardar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Goal Modal ── */}
            <AnimatePresence>
                {showGoalModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setShowGoalModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#0f0f0f] border border-white/10 rounded-[2rem] p-6 w-full max-w-md"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-heading font-black text-white uppercase italic">Nuevo Objetivo</h3>
                                <button onClick={() => setShowGoalModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { key: 'title',        label: 'Título',         placeholder: 'Llegar a 75 kg', type: 'text'   },
                                    { key: 'target_value', label: 'Valor objetivo', placeholder: '75',             type: 'number' },
                                    { key: 'unit',         label: 'Unidad',         placeholder: 'kg',             type: 'text'   },
                                    { key: 'target_date',  label: 'Fecha límite',   placeholder: '',               type: 'date'   },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1.5">{f.label}</label>
                                        <input
                                            type={f.type} placeholder={f.placeholder}
                                            value={(goalForm as any)[f.key]}
                                            onChange={e => setGoalForm(p => ({ ...p, [f.key]: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:border-brand-red focus:outline-none"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={handleSaveGoal}
                                    className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all"
                                >
                                    Crear Objetivo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
