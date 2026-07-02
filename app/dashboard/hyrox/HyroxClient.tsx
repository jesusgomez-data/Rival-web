"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X, Trash2, Trophy, Timer, Flag, ChevronDown, ChevronUp, Loader2, TrendingDown, ArrowLeft, Medal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { HYROX_SEGMENTS, HYROX_CATEGORIES, secondsToClock, parseClock, formatDelta } from "@/lib/hyrox";
import { saveHyroxResult, deleteHyroxResult } from "./actions";

interface HyroxResult {
    id: string;
    performed_at: string;
    category: string;
    is_official: boolean;
    total_seconds: number;
    splits: Record<string, number>;
    notes: string | null;
    created_at: string;
}

export default function HyroxClient({ initialResults }: { initialResults: HyroxResult[] }) {
    const [results, setResults] = useState<HyroxResult[]>(initialResults);
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // ── Form state ──────────────────────────────────────────────
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('open');
    const [isOfficial, setIsOfficial] = useState(false);
    const [notes, setNotes] = useState('');
    const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});

    const parsedSplits = useMemo(() => {
        const out: Record<string, number | null> = {};
        HYROX_SEGMENTS.forEach(seg => { out[seg.key] = parseClock(splitInputs[seg.key] || ''); });
        return out;
    }, [splitInputs]);

    const liveTotal = useMemo(() => {
        const vals = Object.values(parsedSplits);
        if (vals.some(v => v == null)) return null;
        return (vals as number[]).reduce((a, b) => a + b, 0);
    }, [parsedSplits]);

    // ── Bests ───────────────────────────────────────────────────
    const bestTotal = useMemo(() => {
        if (results.length === 0) return null;
        return results.reduce((best, r) => (r.total_seconds < best.total_seconds ? r : best), results[0]);
    }, [results]);

    // Mejor tiempo por segmento entre todos los resultados
    const segmentBests = useMemo(() => {
        const bests: Record<string, number> = {};
        results.forEach(r => {
            HYROX_SEGMENTS.forEach(seg => {
                const v = r.splits?.[seg.key];
                if (typeof v === 'number' && v > 0 && (bests[seg.key] == null || v < bests[seg.key])) {
                    bests[seg.key] = v;
                }
            });
        });
        return bests;
    }, [results]);

    // Mejor por segmento EXCLUYENDO un resultado (para comparar ese resultado contra el resto)
    function segmentBestsExcluding(excludeId: string): Record<string, number> {
        const bests: Record<string, number> = {};
        results.filter(r => r.id !== excludeId).forEach(r => {
            HYROX_SEGMENTS.forEach(seg => {
                const v = r.splits?.[seg.key];
                if (typeof v === 'number' && v > 0 && (bests[seg.key] == null || v < bests[seg.key])) {
                    bests[seg.key] = v;
                }
            });
        });
        return bests;
    }

    const chartData = useMemo(() => {
        return [...results]
            .sort((a, b) => a.performed_at.localeCompare(b.performed_at))
            .map(r => ({
                date: new Date(r.performed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                minutos: Math.round(r.total_seconds / 6) / 10,
                oficial: r.is_official
            }));
    }, [results]);

    // ── Handlers ────────────────────────────────────────────────
    function flash(msg: string, isError = false) {
        if (isError) { setErrorMsg(msg); setSuccessMsg(null); }
        else { setSuccessMsg(msg); setErrorMsg(null); }
        setTimeout(() => { setErrorMsg(null); setSuccessMsg(null); }, 5000);
    }

    async function handleSave() {
        const invalid = HYROX_SEGMENTS.filter(seg => parsedSplits[seg.key] == null);
        if (invalid.length > 0) {
            flash(`Revisa el formato de tiempo (mm:ss) en: ${invalid.slice(0, 3).map(s => s.shortLabel).join(', ')}${invalid.length > 3 ? '…' : ''}`, true);
            return;
        }

        setIsSaving(true);
        const splits: Record<string, number> = {};
        HYROX_SEGMENTS.forEach(seg => { splits[seg.key] = parsedSplits[seg.key] as number; });

        const res = await saveHyroxResult({
            performed_at: date,
            category,
            is_official: isOfficial,
            splits,
            notes
        });
        setIsSaving(false);

        if (res.error) {
            flash(res.error, true);
            return;
        }

        if (res.result) {
            setResults(prev => [res.result as HyroxResult, ...prev]);
            setExpandedId((res.result as HyroxResult).id);
        }
        setShowForm(false);
        setSplitInputs({});
        setNotes('');
        setIsOfficial(false);
        flash(bestTotal && res.result && (res.result as HyroxResult).total_seconds < bestTotal.total_seconds
            ? '¡NUEVO RÉCORD PERSONAL! 🏆 Simulacro guardado.'
            : '¡Simulacro guardado! Revisa tus splits abajo.');
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este resultado? Esta acción no se puede deshacer.')) return;
        setDeletingId(id);
        const res = await deleteHyroxResult(id);
        setDeletingId(null);
        if (res.error) {
            flash(res.error, true);
        } else {
            setResults(prev => prev.filter(r => r.id !== id));
            flash('Resultado eliminado.');
        }
    }

    const inputCls = "w-full bg-background border border-border rounded-xl p-3 text-foreground outline-none focus:border-brand-red text-sm";

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-foreground transition-colors text-xs mb-2">
                        <ArrowLeft className="w-4 h-4" /> Inicio
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-foreground">
                        HYROX <span className="text-brand-red">Race Center</span>
                    </h1>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                        8 Runs · 8 Estaciones · Splits y PRs por segmento
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setErrorMsg(null); }}
                    className={`${showForm ? 'bg-muted text-muted-foreground border border-border' : 'bg-brand-red text-white shadow-lg hover:bg-red-600'} py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95`}
                >
                    {showForm ? (<><X className="w-4 h-4" /> Cerrar</>) : (<><Plus className="w-4 h-4" /> Nuevo Simulacro</>)}
                </button>
            </div>

            {/* Feedback */}
            {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl p-4 animate-in fade-in">{errorMsg}</div>
            )}
            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold rounded-xl p-4 animate-in fade-in">{successMsg}</div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center">
                    <Trophy className="w-4 h-4 text-brand-red mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black italic text-foreground">{bestTotal ? secondsToClock(bestTotal.total_seconds) : '—'}</p>
                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Mejor Marca</p>
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center">
                    <Flag className="w-4 h-4 text-brand-red mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black italic text-foreground">{results.length}</p>
                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Simulacros</p>
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center">
                    <Timer className="w-4 h-4 text-brand-red mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black italic text-foreground">{results[0] ? secondsToClock(results[0].total_seconds) : '—'}</p>
                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Último</p>
                </div>
            </div>

            {/* New Simulation Form */}
            {showForm && (
                <div className="bg-muted/50 border border-border rounded-3xl p-5 sm:p-8 space-y-6 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-black italic uppercase text-foreground">Registrar Simulacro / Carrera</h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fecha</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Categoría</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                                {HYROX_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tipo</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setIsOfficial(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${!isOfficial ? 'bg-brand-red border-brand-red text-white' : 'bg-background border-border text-muted-foreground'}`}>Simulacro</button>
                                <button type="button" onClick={() => setIsOfficial(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isOfficial ? 'bg-amber-500 border-amber-500 text-black' : 'bg-background border-border text-muted-foreground'}`}>Carrera Oficial</button>
                            </div>
                        </div>
                    </div>

                    {/* 16 Splits */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Splits — formato mm:ss (ej: 4:35)</p>
                            <p className="text-xs font-black italic text-foreground">
                                Total: <span className={liveTotal ? 'text-brand-red' : 'text-muted-foreground'}>{liveTotal ? secondsToClock(liveTotal) : '—'}</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {HYROX_SEGMENTS.map((seg, i) => {
                                const val = splitInputs[seg.key] || '';
                                const invalid = val.trim() !== '' && parseClock(val) == null;
                                const best = segmentBests[seg.key];
                                return (
                                    <div key={seg.key} className={`rounded-xl p-2.5 border ${seg.type === 'run' ? 'bg-background/60 border-border' : 'bg-brand-red/5 border-brand-red/15'}`}>
                                        <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1 truncate" title={seg.label}>
                                            <span className="text-brand-red mr-1">{i + 1}.</span>{seg.shortLabel}
                                        </label>
                                        <input
                                            inputMode="numeric"
                                            placeholder="mm:ss"
                                            value={val}
                                            onChange={e => setSplitInputs(prev => ({ ...prev, [seg.key]: e.target.value }))}
                                            className={`w-full bg-background border rounded-lg p-2 text-foreground outline-none text-sm text-center font-bold ${invalid ? 'border-red-500' : 'border-border focus:border-brand-red'}`}
                                        />
                                        {best != null && (
                                            <p className="text-[8px] text-muted-foreground mt-1 text-center">PR: {secondsToClock(best)}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Notas (pesos, sensaciones, estrategia...)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ej: Sled a 152kg, wall balls sin pausas hasta 60..." className={inputCls} />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-brand-red hover:bg-red-600 disabled:opacity-60 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl"
                    >
                        {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>) : 'Guardar Resultado'}
                    </button>
                </div>
            )}

            {/* Evolution Chart */}
            {chartData.length >= 2 && (
                <div className="bg-muted/50 border border-border rounded-3xl p-5 sm:p-6">
                    <h3 className="text-sm font-black italic uppercase text-foreground mb-4 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-brand-red" /> Evolución del Tiempo Total (min)
                    </h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#888' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#888' }} domain={['dataMin - 3', 'dataMax + 3']} />
                                <Tooltip
                                    contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                                    formatter={(v: any) => [`${v} min`, 'Tiempo']}
                                />
                                <Line type="monotone" dataKey="minutos" stroke="#E11D48" strokeWidth={2.5} dot={{ fill: '#E11D48', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Station PRs */}
            {results.length > 0 && (
                <div className="bg-muted/50 border border-border rounded-3xl p-5 sm:p-6">
                    <h3 className="text-sm font-black italic uppercase text-foreground mb-4 flex items-center gap-2">
                        <Medal className="w-4 h-4 text-brand-red" /> PRs por Estación
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {HYROX_SEGMENTS.filter(s => s.type === 'station').map(seg => (
                            <div key={seg.key} className="bg-background/60 border border-border rounded-xl p-3 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground truncate" title={seg.label}>{seg.shortLabel}</p>
                                <p className="text-lg font-black italic text-foreground mt-1">{secondsToClock(segmentBests[seg.key])}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* History */}
            <div className="space-y-3">
                <h3 className="text-sm font-black italic uppercase text-foreground">Historial</h3>
                {results.length === 0 ? (
                    <div className="text-center py-16 rounded-3xl border border-dashed border-border">
                        <Flag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold text-muted-foreground">Aún no tienes simulacros registrados.</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Registra tu primer simulacro para empezar a comparar splits.</p>
                    </div>
                ) : (
                    results.map(r => {
                        const isExpanded = expandedId === r.id;
                        const isPR = bestTotal?.id === r.id;
                        const bests = isExpanded ? segmentBestsExcluding(r.id) : {};
                        return (
                            <div key={r.id} className={`bg-muted/50 border rounded-2xl overflow-hidden transition-all ${isPR ? 'border-amber-500/40' : 'border-border'}`}>
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${r.is_official ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-red/10 text-brand-red'}`}>
                                            {r.is_official ? <Trophy className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xl font-black italic text-foreground">{secondsToClock(r.total_seconds)}</p>
                                                {isPR && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">PR</span>}
                                                <span className="bg-background border border-border text-muted-foreground text-[8px] font-black uppercase px-2 py-0.5 rounded-full">{r.category}</span>
                                                {r.is_official && <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Oficial</span>}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                                                {new Date(r.performed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                                </button>

                                {isExpanded && (
                                    <div className="px-4 sm:px-5 pb-5 space-y-4 animate-in fade-in">
                                        {/* Splits table with delta vs best-of-others */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {HYROX_SEGMENTS.map((seg, i) => {
                                                const v = r.splits?.[seg.key];
                                                const best = bests[seg.key];
                                                const delta = (typeof v === 'number' && best != null) ? v - best : null;
                                                return (
                                                    <div key={seg.key} className={`flex items-center justify-between rounded-lg px-3 py-2 ${seg.type === 'run' ? 'bg-background/50' : 'bg-brand-red/5'}`}>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                                            <span className="text-brand-red mr-1.5">{i + 1}</span>{seg.label}
                                                        </span>
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-xs font-black text-foreground">{secondsToClock(v)}</span>
                                                            {delta != null && delta !== 0 && (
                                                                <span className={`text-[9px] font-black ${delta < 0 ? 'text-green-500' : 'text-red-400'}`}>{formatDelta(delta)}</span>
                                                            )}
                                                            {delta != null && delta <= 0 && (
                                                                <span className="text-[8px] bg-green-500/10 text-green-500 font-black uppercase px-1.5 py-0.5 rounded">PR</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[9px] text-muted-foreground italic">Δ comparado con tu mejor split en el resto de simulacros. Verde = mejoras tu marca.</p>

                                        {r.notes && (
                                            <div className="bg-background/50 border border-border rounded-xl p-3">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Notas</p>
                                                <p className="text-xs text-foreground/80">{r.notes}</p>
                                            </div>
                                        )}

                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                disabled={deletingId === r.id}
                                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
