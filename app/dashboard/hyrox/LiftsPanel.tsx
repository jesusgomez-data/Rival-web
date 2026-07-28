"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Calculator, Dumbbell, TrendingUp, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import type { MyLift } from "../training/actions";
import { updateLiftRecord, deleteLiftRecord } from "../training/actions";

const QUICK_PERCENTAGES = [50, 60, 70, 75, 80, 85, 90, 95];

function formatDate(iso: string) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function LiftsPanel({ lifts: initialLifts }: { lifts: MyLift[] }) {
    const [lifts, setLifts] = useState(initialLifts);
    const [query, setQuery] = useState('');
    const [openExercise, setOpenExercise] = useState<string | null>(null);
    const [pctInputs, setPctInputs] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editWeight, setEditWeight] = useState('');
    const [editReps, setEditReps] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return lifts;
        return lifts.filter(l => l.exercise_name.toLowerCase().includes(q));
    }, [lifts, query]);

    function startEdit(lift: MyLift) {
        setEditingId(lift.set_id);
        setEditWeight(String(lift.weight_kg));
        setEditReps(String(lift.reps));
        setErrorMsg(null);
    }

    async function handleSaveEdit(lift: MyLift) {
        const weight = parseFloat(editWeight);
        const reps = parseInt(editReps, 10);
        if (!(weight > 0) || !(reps > 0)) {
            setErrorMsg('Peso y repeticiones deben ser mayores que 0.');
            return;
        }
        setBusyId(lift.set_id);
        const res = await updateLiftRecord(lift.set_id, weight, reps);
        setBusyId(null);
        if (res.error) {
            setErrorMsg(res.error);
            return;
        }
        setLifts(prev => prev.map(l => l.set_id === lift.set_id ? { ...l, weight_kg: weight, reps } : l));
        setEditingId(null);
    }

    async function handleDelete(lift: MyLift) {
        if (!confirm(`¿Borrar tu marca de ${lift.exercise_name} (${lift.weight_kg}kg)?`)) return;
        setBusyId(lift.set_id);
        const res = await deleteLiftRecord(lift.set_id);
        setBusyId(null);
        if (res.error) {
            setErrorMsg(res.error);
            return;
        }
        setLifts(prev => prev.filter(l => l.set_id !== lift.set_id));
        setOpenExercise(null);
    }

    return (
        <div className="space-y-4">
            {lifts.length > 0 && (
                <div className="relative">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar ejercicio... (ej: Back Squat)"
                        className="w-full bg-muted/50 border border-border rounded-xl pl-11 pr-4 py-3 text-sm text-foreground outline-none focus:border-brand-red placeholder:text-muted-foreground"
                    />
                </div>
            )}

            {errorMsg && (
                <div className="text-xs font-bold rounded-xl p-3 border bg-red-500/10 border-red-500/30 text-red-400">
                    {errorMsg}
                </div>
            )}

            {lifts.length === 0 ? (
                <div className="text-center py-16 rounded-3xl border border-dashed border-border">
                    <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold text-muted-foreground">Aún no tienes PRs registrados.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Publica un WOD con pesos o registra un entreno y tus marcas aparecerán aquí solas.</p>
                    <Link href="/dashboard" className="inline-flex items-center gap-1 text-brand-red text-xs font-black uppercase tracking-widest mt-4 hover:underline">
                        Ir a publicar un WOD
                    </Link>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-10 rounded-3xl border border-dashed border-border">
                    <p className="text-sm font-bold text-muted-foreground">No hay ningún ejercicio que coincida con "{query}".</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map(lift => {
                        const isOpen = openExercise === lift.exercise_name;
                        const isEditing = editingId === lift.set_id;
                        const isBusy = busyId === lift.set_id;
                        const pctRaw = pctInputs[lift.exercise_name] ?? '80';
                        const pct = parseFloat(pctRaw);
                        const calc = !Number.isNaN(pct) ? Math.round(lift.weight_kg * (pct / 100) * 10) / 10 : null;
                        const date = formatDate(lift.achieved_at);

                        return (
                            <div key={lift.exercise_name} className="bg-muted/50 border border-border rounded-2xl overflow-hidden transition-all">
                                <button
                                    onClick={() => setOpenExercise(isOpen ? null : lift.exercise_name)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-red/10 text-brand-red">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black uppercase tracking-tight text-foreground truncate">{lift.exercise_name}</p>
                                            {date && (
                                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Desde {date}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className="text-xl font-black italic text-foreground">{lift.weight_kg}<span className="text-xs ml-0.5">kg</span></p>
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{lift.reps} rep{lift.reps !== 1 ? 's' : ''}</p>
                                        </div>
                                        <Calculator className={`w-4 h-4 transition-colors ${isOpen ? 'text-brand-red' : 'text-muted-foreground'}`} />
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="px-4 sm:px-5 pb-5 space-y-4 animate-in fade-in border-t border-border pt-4">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editWeight}
                                                    onChange={e => setEditWeight(e.target.value)}
                                                    placeholder="kg"
                                                    className="w-24 bg-background border border-border rounded-lg p-2.5 text-foreground outline-none focus:border-brand-red text-sm text-center font-bold"
                                                />
                                                <span className="text-xs text-muted-foreground font-bold">kg ×</span>
                                                <input
                                                    type="number"
                                                    value={editReps}
                                                    onChange={e => setEditReps(e.target.value)}
                                                    placeholder="reps"
                                                    className="w-20 bg-background border border-border rounded-lg p-2.5 text-foreground outline-none focus:border-brand-red text-sm text-center font-bold"
                                                />
                                                <span className="text-xs text-muted-foreground font-bold">reps</span>
                                                <div className="ml-auto flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleSaveEdit(lift)}
                                                        disabled={isBusy}
                                                        className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 transition-all disabled:opacity-50"
                                                    >
                                                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-2 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => startEdit(lift)}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground hover:border-brand-red/40 transition-all text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" /> Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lift)}
                                                    disabled={isBusy}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                                >
                                                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Borrar
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 border-t border-border pt-4">
                                            <input
                                                type="number"
                                                value={pctRaw}
                                                onChange={e => setPctInputs(prev => ({ ...prev, [lift.exercise_name]: e.target.value }))}
                                                className="w-20 bg-background border border-border rounded-lg p-2.5 text-foreground outline-none focus:border-brand-red text-sm text-center font-bold"
                                            />
                                            <span className="text-sm font-bold text-muted-foreground">% de tu PR es</span>
                                            <span className="text-xl font-black italic text-brand-red ml-auto">
                                                {calc != null ? `${calc} kg` : '—'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {QUICK_PERCENTAGES.map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => setPctInputs(prev => ({ ...prev, [lift.exercise_name]: String(p) }))}
                                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${pctRaw === String(p) ? 'bg-brand-red border-brand-red text-white' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}
                                                >
                                                    {p}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
