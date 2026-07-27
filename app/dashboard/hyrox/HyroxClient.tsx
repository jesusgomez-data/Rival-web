"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X, Trash2, Trophy, Timer, Flag, ChevronDown, ChevronUp, Loader2, TrendingDown, ArrowLeft, Medal, Settings2, Dumbbell } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { HYROX_SEGMENTS, HYROX_CATEGORIES, secondsToClock, parseClock, formatDelta, type CompetitionTemplate, type HyroxSegment } from "@/lib/hyrox";
import { saveRaceResult, deleteRaceResult, adminCreateCompetition } from "./actions";
import type { MyLift } from "../training/actions";
import LiftsPanel from "./LiftsPanel";

interface RaceResult {
    id: string;
    competition_slug: string;
    performed_at: string;
    category: string;
    is_official: boolean;
    total_seconds: number;
    splits: Record<string, number>;
    segments_snapshot?: HyroxSegment[] | null;
    notes: string | null;
    created_at: string;
}

export default function HyroxClient({ initialResults, competitions, isAdmin, initialLifts }: {
    initialResults: RaceResult[];
    competitions: CompetitionTemplate[];
    isAdmin: boolean;
    initialLifts: MyLift[];
}) {
    const [activeTab, setActiveTab] = useState<'lifts' | 'races'>('lifts');
    const [results, setResults] = useState<RaceResult[]>(initialResults);
    const [activeSlug, setActiveSlug] = useState(competitions[0]?.slug || 'hyrox');
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // ── Admin: crear competencia ────────────────────────────────
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [newCompName, setNewCompName] = useState('');
    const [newCompDesc, setNewCompDesc] = useState('');
    const [newSegments, setNewSegments] = useState<{ label: string; type: 'run' | 'station' }[]>([
        { label: '', type: 'station' },
        { label: '', type: 'station' },
    ]);
    const [newCompCategories, setNewCompCategories] = useState('');
    const [isCreatingComp, setIsCreatingComp] = useState(false);

    // ── Form state ──────────────────────────────────────────────
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('open');
    const [isOfficial, setIsOfficial] = useState(false);
    const [notes, setNotes] = useState('');
    const [splitInputs, setSplitInputs] = useState<Record<string, string>>({});

    const activeComp = competitions.find(c => c.slug === activeSlug) || competitions[0];
    const segments: HyroxSegment[] = activeComp?.segments || HYROX_SEGMENTS;
    const compCategories = (activeComp?.categories && activeComp.categories.length > 0)
        ? activeComp.categories
        : HYROX_CATEGORIES;
    const categoryLabel = (val: string) =>
        compCategories.find(c => c.value === val)?.label || val;
    const compResults = useMemo(
        () => results.filter(r => (r.competition_slug || 'hyrox') === activeSlug),
        [results, activeSlug]
    );

    const segmentsForResult = (r: RaceResult): HyroxSegment[] =>
        (r.segments_snapshot && r.segments_snapshot.length > 0)
            ? r.segments_snapshot
            : ((r.competition_slug || 'hyrox') === 'hyrox' ? HYROX_SEGMENTS : segments);

    const parsedSplits = useMemo(() => {
        const out: Record<string, number | null> = {};
        segments.forEach(seg => { out[seg.key] = parseClock(splitInputs[seg.key] || ''); });
        return out;
    }, [splitInputs, segments]);

    const liveTotal = useMemo(() => {
        const vals = Object.values(parsedSplits);
        if (vals.some(v => v == null)) return null;
        return (vals as number[]).reduce((a, b) => a + b, 0);
    }, [parsedSplits]);

    // ── Bests (de la competencia activa) ────────────────────────
    const bestTotal = useMemo(() => {
        if (compResults.length === 0) return null;
        return compResults.reduce((best, r) => (r.total_seconds < best.total_seconds ? r : best), compResults[0]);
    }, [compResults]);

    const segmentBests = useMemo(() => {
        const bests: Record<string, number> = {};
        compResults.forEach(r => {
            segments.forEach(seg => {
                const v = r.splits?.[seg.key];
                if (typeof v === 'number' && v > 0 && (bests[seg.key] == null || v < bests[seg.key])) {
                    bests[seg.key] = v;
                }
            });
        });
        return bests;
    }, [compResults, segments]);

    function segmentBestsExcluding(excludeId: string): Record<string, number> {
        const bests: Record<string, number> = {};
        compResults.filter(r => r.id !== excludeId).forEach(r => {
            segmentsForResult(r).forEach(seg => {
                const v = r.splits?.[seg.key];
                if (typeof v === 'number' && v > 0 && (bests[seg.key] == null || v < bests[seg.key])) {
                    bests[seg.key] = v;
                }
            });
        });
        return bests;
    }

    const chartData = useMemo(() => {
        return [...compResults]
            .sort((a, b) => a.performed_at.localeCompare(b.performed_at))
            .map(r => ({
                date: new Date(r.performed_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
                minutos: Math.round(r.total_seconds / 6) / 10,
            }));
    }, [compResults]);

    // ── Handlers ────────────────────────────────────────────────
    function flash(msg: string, isError = false) {
        if (isError) { setErrorMsg(msg); setSuccessMsg(null); }
        else { setSuccessMsg(msg); setErrorMsg(null); }
        setTimeout(() => { setErrorMsg(null); setSuccessMsg(null); }, 5000);
    }

    function switchCompetition(slug: string) {
        setActiveSlug(slug);
        setSplitInputs({});
        setShowForm(false);
        setExpandedId(null);
        // Cada competencia tiene sus categorías: arrancar en la primera
        const comp = competitions.find(c => c.slug === slug);
        const cats = (comp?.categories && comp.categories.length > 0) ? comp.categories : HYROX_CATEGORIES;
        setCategory(cats[0].value);
    }

    async function handleSave() {
        const invalid = segments.filter(seg => parsedSplits[seg.key] == null);
        if (invalid.length > 0) {
            flash(`Revisa el formato de tiempo (mm:ss) en: ${invalid.slice(0, 3).map(s => s.shortLabel).join(', ')}${invalid.length > 3 ? '…' : ''}`, true);
            return;
        }

        setIsSaving(true);
        const splits: Record<string, number> = {};
        segments.forEach(seg => { splits[seg.key] = parsedSplits[seg.key] as number; });

        const res = await saveRaceResult({
            competition_slug: activeSlug,
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
            setResults(prev => [{ ...(res.result as RaceResult), competition_slug: activeSlug }, ...prev]);
            setExpandedId((res.result as RaceResult).id);
        }
        setShowForm(false);
        setSplitInputs({});
        setNotes('');
        setIsOfficial(false);
        flash(bestTotal && res.result && (res.result as RaceResult).total_seconds < bestTotal.total_seconds
            ? '¡NUEVO RÉCORD PERSONAL! 🏆 Marca guardada.'
            : '¡Marca guardada! Revisa tus splits abajo.');
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar este resultado? Esta acción no se puede deshacer.')) return;
        setDeletingId(id);
        const res = await deleteRaceResult(id);
        setDeletingId(null);
        if (res.error) {
            flash(res.error, true);
        } else {
            setResults(prev => prev.filter(r => r.id !== id));
            flash('Resultado eliminado.');
        }
    }

    async function handleCreateCompetition() {
        setIsCreatingComp(true);
        const res = await adminCreateCompetition({
            name: newCompName,
            description: newCompDesc,
            segments: newSegments,
            categories: newCompCategories.split(',').map(c => c.trim()).filter(Boolean),
        });
        setIsCreatingComp(false);

        if (res.error) {
            flash(res.error, true);
            return;
        }
        setShowAdminModal(false);
        flash(`Competencia "${newCompName}" creada. Recargando...`);
        setTimeout(() => window.location.reload(), 800);
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
                        MIS <span className="text-brand-red">MARCAS</span>
                    </h1>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                        {activeTab === 'lifts'
                            ? 'Tus PRs de levantamiento, siempre a mano'
                            : (activeComp?.description || 'Splits y PRs por segmento en cada competencia')}
                    </p>
                </div>
                {activeTab === 'races' && (
                    <button
                        onClick={() => { setShowForm(!showForm); setErrorMsg(null); }}
                        className={`${showForm ? 'bg-muted text-muted-foreground border border-border' : 'bg-brand-red text-white shadow-lg hover:bg-red-600'} py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95`}
                    >
                        {showForm ? (<><X className="w-4 h-4" /> Cerrar</>) : (<><Plus className="w-4 h-4" /> Nueva Marca</>)}
                    </button>
                )}
            </div>

            {/* Pestañas: Levantamientos vs Carreras */}
            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => setActiveTab('lifts')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'lifts' ? 'border-brand-red text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Dumbbell className="w-4 h-4" /> Levantamientos
                </button>
                <button
                    onClick={() => setActiveTab('races')}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'races' ? 'border-brand-red text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Flag className="w-4 h-4" /> Carreras
                </button>
            </div>

            {activeTab === 'lifts' && <LiftsPanel lifts={initialLifts} />}

            {activeTab === 'races' && (
            <>
            {/* Selector de competencia */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {competitions.map(c => (
                    <button
                        key={c.slug}
                        onClick={() => switchCompetition(c.slug)}
                        className={`shrink-0 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all ${activeSlug === c.slug
                            ? 'bg-brand-red border-brand-red text-white shadow-[0_4px_15px_rgba(220,38,38,0.35)]'
                            : 'bg-muted/50 border-border text-muted-foreground hover:text-foreground'}`}
                    >
                        {c.name}
                    </button>
                ))}
                {isAdmin && (
                    <button
                        onClick={() => setShowAdminModal(true)}
                        className="shrink-0 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-dashed border-brand-red/40 text-brand-red hover:bg-brand-red/10 transition-all flex items-center gap-1.5"
                        title="Crear competencia (solo admin)"
                    >
                        <Settings2 className="w-3.5 h-3.5" /> Nueva Competencia
                    </button>
                )}
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
                    <p className="text-xl sm:text-2xl font-black italic text-foreground">{compResults.length}</p>
                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Registros</p>
                </div>
                <div className="bg-muted/50 border border-border rounded-2xl p-4 text-center">
                    <Timer className="w-4 h-4 text-brand-red mx-auto mb-1" />
                    <p className="text-xl sm:text-2xl font-black italic text-foreground">{compResults[0] ? secondsToClock(compResults[0].total_seconds) : '—'}</p>
                    <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">Último</p>
                </div>
            </div>

            {/* Formulario de nueva marca */}
            {showForm && (
                <div className="bg-muted/50 border border-border rounded-3xl p-5 sm:p-8 space-y-6 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-black italic uppercase text-foreground">Registrar Marca · {activeComp?.name}</h2>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fecha</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Categoría</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                                {compCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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

                    {/* Splits dinámicos según competencia */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Splits — formato mm:ss (ej: 4:35)</p>
                            <p className="text-xs font-black italic text-foreground">
                                Total: <span className={liveTotal ? 'text-brand-red' : 'text-muted-foreground'}>{liveTotal ? secondsToClock(liveTotal) : '—'}</span>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {segments.map((seg, i) => {
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
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ej: Sled a 152kg, sin pausas hasta el final..." className={inputCls} />
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-brand-red hover:bg-red-600 disabled:opacity-60 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl"
                    >
                        {isSaving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>) : 'Guardar Marca'}
                    </button>
                </div>
            )}

            {/* Evolución */}
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

            {/* PRs por estación */}
            {compResults.length > 0 && (
                <div className="bg-muted/50 border border-border rounded-3xl p-5 sm:p-6">
                    <h3 className="text-sm font-black italic uppercase text-foreground mb-4 flex items-center gap-2">
                        <Medal className="w-4 h-4 text-brand-red" /> PRs por Estación
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        {segments.filter(s => s.type === 'station').map(seg => (
                            <div key={seg.key} className="bg-background/60 border border-border rounded-xl p-3 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground truncate" title={seg.label}>{seg.shortLabel}</p>
                                <p className="text-lg font-black italic text-foreground mt-1">{secondsToClock(segmentBests[seg.key])}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historial */}
            <div className="space-y-3">
                <h3 className="text-sm font-black italic uppercase text-foreground">Historial · {activeComp?.name}</h3>
                {compResults.length === 0 ? (
                    <div className="text-center py-16 rounded-3xl border border-dashed border-border">
                        <Flag className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold text-muted-foreground">Aún no tienes marcas de {activeComp?.name}.</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Registra tu primera marca para empezar a comparar splits.</p>
                    </div>
                ) : (
                    compResults.map(r => {
                        const isExpanded = expandedId === r.id;
                        const isPR = bestTotal?.id === r.id;
                        const rSegments = segmentsForResult(r);
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
                                                <span className="bg-background border border-border text-muted-foreground text-[8px] font-black uppercase px-2 py-0.5 rounded-full">{categoryLabel(r.category)}</span>
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {rSegments.map((seg, i) => {
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
                                        <p className="text-[9px] text-muted-foreground italic">Δ comparado con tu mejor split en el resto de registros. Verde = mejoras tu marca.</p>

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
            </>
            )}

            {/* Modal admin: crear competencia */}
            {showAdminModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 w-full max-w-lg my-8 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-black italic uppercase text-foreground">Nueva Competencia</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Solo administrador · visible para todos los atletas</p>
                            </div>
                            <button onClick={() => setShowAdminModal(false)} className="bg-muted p-2 rounded-full text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Nombre</label>
                                <input value={newCompName} onChange={e => setNewCompName(e.target.value)} placeholder="Ej: DEKA FIT, ATHX Games..." className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Descripción (opcional)</label>
                                <input value={newCompDesc} onChange={e => setNewCompDesc(e.target.value)} placeholder="Ej: 10 zonas + 10 runs de 500m" className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Categorías (separadas por coma)</label>
                                <input value={newCompCategories} onChange={e => setNewCompCategories(e.target.value)} placeholder="Ej: Elite, Open, Parejas, Age Group" className={inputCls} />
                                <p className="text-[9px] text-muted-foreground mt-1">Si lo dejas vacío se usarán las de HYROX (Open, Pro, Doubles, Relay).</p>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Segmentos (en orden de carrera)</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                    {newSegments.map((seg, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <span className="text-[10px] font-black text-brand-red w-5 shrink-0">{i + 1}.</span>
                                            <input
                                                value={seg.label}
                                                onChange={e => setNewSegments(prev => prev.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
                                                placeholder="Ej: 500m Row"
                                                className="flex-1 bg-background border border-border rounded-lg p-2.5 text-foreground outline-none focus:border-brand-red text-xs"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setNewSegments(prev => prev.map((s, j) => j === i ? { ...s, type: s.type === 'run' ? 'station' : 'run' } : s))}
                                                className={`shrink-0 px-3 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${seg.type === 'run' ? 'bg-background border-border text-muted-foreground' : 'bg-brand-red/10 border-brand-red/30 text-brand-red'}`}
                                                title="Alternar entre carrera y estación"
                                            >
                                                {seg.type === 'run' ? 'Run' : 'Estación'}
                                            </button>
                                            {newSegments.length > 2 && (
                                                <button type="button" onClick={() => setNewSegments(prev => prev.filter((_, j) => j !== i))} className="shrink-0 text-muted-foreground hover:text-red-500 p-1">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setNewSegments(prev => [...prev, { label: '', type: 'station' }])}
                                    className="mt-2 w-full py-2.5 rounded-xl border border-dashed border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-brand-red/40 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Añadir segmento
                                </button>
                            </div>

                            <button
                                onClick={handleCreateCompetition}
                                disabled={isCreatingComp}
                                className="w-full bg-brand-red hover:bg-red-600 disabled:opacity-60 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl"
                            >
                                {isCreatingComp ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>) : 'Crear Competencia'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
