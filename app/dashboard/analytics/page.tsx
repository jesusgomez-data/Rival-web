"use client";

import { useEffect, useState } from "react";
import { getDetailedAnalytics, getPerformanceStats, getUserProfile } from "../training/actions";
import {
    BarChart2,
    TrendingUp,
    Activity,
    Zap,
    Award,
    Calendar,
    PieChart,
    ChevronRight,
    ArrowUpRight,
    Trophy
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

interface PR {
    created_at: string;
    exercise_name: string;
    weight_kg: number;
}

interface DailyStat {
    total_volume_kg: number;
    max_weight_kg: number;
    effort_rpe: number;
    created_at: string;
}

interface WeeklyStats {
    fatigue: number;
    daily: DailyStat[];
}

interface Stats {
    muscleGroups: Record<string, number>;
    weeklyFreq: number[];
    prHistory: PR[];
    streak: number;
    percentile: number;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            const [detailed, weekly, userProfile] = await Promise.all([
                getDetailedAnalytics(),
                getPerformanceStats(),
                getUserProfile()
            ]);
            setStats(detailed);
            setWeeklyStats(weekly);
            setProfile(userProfile);
            setIsLoading(false);
        }
        loadData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando métricas de rendimiento...</p>
            </div>
        );
    }

    const muscleLabels = Object.keys(stats?.muscleGroups || {});
    const muscleValues = Object.values(stats?.muscleGroups || {}) as number[];
    const maxMuscleVolume = Math.max(...muscleValues, 1);
    const isPremium = profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'elite';

    return (
        <div className="space-y-10 pb-20">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-heading font-black text-white glow-text mb-2 tracking-tighter uppercase italic">Radar de Rendimiento</h1>
                    <p className="text-gray-500 max-w-md">Datos biográficos y de fuerza detallados, extraídos de tus misiones recientes.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-brand-gray border border-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Estado Semanal</p>
                        <div className="flex items-center gap-2">
                            <Zap className={clsx("w-4 h-4", (weeklyStats?.fatigue || 0) > 80 ? "text-brand-red" : "text-green-500")} />
                            <span className="text-xl font-heading font-black text-white">{weeklyStats ? 100 - weeklyStats.fatigue : 0}%</span>
                        </div>
                    </div>
                    <div className="bg-brand-gray border border-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Consistencia</p>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-brand-red" />
                            <span className="text-xl font-heading font-black text-white">{stats?.weeklyFreq[3] || 0}x <span className="text-[10px] text-gray-500">Sem</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    label="Peso Máx (7d)"
                    value={`${Math.max(...(weeklyStats?.daily || []).map(s => s.max_weight_kg || 0), 0).toLocaleString()} kg`}
                    trend="Top"
                    up
                />
                <MetricCard
                    label="Intensidad Prom"
                    value={`RPE ${((weeklyStats?.daily || []).reduce((acc, s) => acc + (s.effort_rpe || 0), 0) / ((weeklyStats?.daily || []).length || 1)).toFixed(1)}`}
                    trend="Estable"
                />
                <MetricCard
                    label="Récords (28d)"
                    value={stats?.prHistory.length || 0}
                    trend={`+${stats?.prHistory.filter(pr => new Date(pr.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length} nuevos`}
                    up
                />
                <MetricCard
                    label="Puntos de Arena"
                    value={`${((weeklyStats?.daily.length || 0) * 150).toLocaleString()}`}
                    trend="Ganados"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-8 relative">

                {/* Free Plan Lock Overlay */}
                {!isPremium && (
                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center rounded-[40px] border border-white/10 h-full">
                        <div className="w-16 h-16 rounded-2xl bg-brand-red/20 flex items-center justify-center mb-4 border border-brand-red/30 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                            <TrendingUp className="w-8 h-8 text-brand-red" />
                        </div>
                        <h3 className="text-2xl font-heading font-black text-white italic uppercase tracking-tighter mb-2">Análiticas Avanzadas</h3>
                        <p className="text-sm text-gray-400 max-w-sm mb-6 font-medium">
                            Desbloquea el análisis de progresión de volumen, distribución muscular y fatiga acumulada con el plan <span className="text-brand-red font-bold">Premium</span> o <span className="text-brand-red font-bold">Élite</span>.
                        </p>
                        <Link href="/dashboard/settings/billing" className="bg-brand-red text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-glow">
                            Mejorar Plan Ahora
                        </Link>
                    </div>
                )}

                {/* Volume Progression Chart */}
                <div className={clsx("lg:col-span-2 bg-brand-gray border border-white/5 rounded-[40px] p-8 relative overflow-hidden group shadow-2xl transition-opacity", !isPremium && "opacity-20 pointer-events-none")}>
                    <div className="absolute -top-10 -right-10 text-white/[0.02] group-hover:text-brand-red/[0.04] transition-colors -rotate-12">
                        <TrendingUp className="w-64 h-64" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-heading font-black text-white mb-10 flex items-center gap-3 uppercase italic tracking-widest">
                            <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center border border-brand-red/20">
                                <Activity className="w-5 h-5 text-brand-red" />
                            </div>
                            Protocolo de Fuerza
                        </h3>

                        {(weeklyStats?.daily || []).length > 0 && Math.max(...((weeklyStats?.daily || []).map(x => x.max_weight_kg) || [0])) > 0 ? (
                            <div className="flex items-end gap-4 h-64 px-4">
                                {(weeklyStats?.daily || []).map((s, i) => {
                                    const maxInChart = Math.max(...((weeklyStats?.daily || []).map(x => x.max_weight_kg) || [1]), 1);
                                    const heightPercent = (s.max_weight_kg / maxInChart) * 100;

                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar relative h-full justify-end">
                                            {/* Tooltip */}
                                            <div className="absolute -top-12 bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all transform translate-y-2 group-hover/bar:translate-y-0 whitespace-nowrap z-20 shadow-xl">
                                                {s.max_weight_kg} KG MÁX
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45" />
                                            </div>

                                            <div
                                                className="w-full bg-gradient-to-t from-brand-red/20 to-brand-red border-x border-t border-brand-red/40 rounded-t-2xl transition-all duration-700 ease-out group-hover/bar:shadow-[0_0_30px_rgba(220,38,38,0.4)] group-hover/bar:from-brand-red/40 group-hover/bar:to-brand-red relative"
                                                style={{ height: `${Math.max(heightPercent, 2)}%` }}
                                            >
                                                {heightPercent > 0 && (
                                                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 rounded-t-2xl" />
                                                )}
                                            </div>

                                            <div className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] group-hover/bar:text-white transition-colors">
                                                {new Date(s.created_at).toLocaleDateString('es-ES', { weekday: 'short' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-black/20">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <TrendingUp className="w-8 h-8 text-gray-700" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Esperando datos de combate</p>
                                <p className="text-[9px] text-gray-600 mt-2 text-center max-w-xs uppercase font-bold tracking-widest leading-relaxed">
                                    Registra tus levantamientos en la sección de entrenamiento para visualizar tu progreso.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Muscle Distribution */}
                <div className={clsx("bg-brand-gray border border-white/5 rounded-[40px] p-8 shadow-2xl transition-opacity", !isPremium && "opacity-20 pointer-events-none")}>
                    <h3 className="text-xl font-heading font-black text-white mb-10 flex items-center gap-3 uppercase italic tracking-widest">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <PieChart className="w-5 h-5 text-blue-500" />
                        </div>
                        Foco Muscular
                    </h3>
                    <div className="space-y-8">
                        {muscleLabels.length > 0 && muscleValues.reduce((a, b) => a + b, 0) > 0 ? muscleLabels.map((label, idx) => {
                            const percentage = Math.round((muscleValues[idx] / muscleValues.reduce((a, b) => a + b, 0)) * 100);
                            return (
                                <div key={label} className="space-y-3 group/item">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 group-hover/item:text-white transition-colors">{label}</span>
                                        <span className="text-xs font-heading font-black text-brand-red">{percentage}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                                        <div
                                            className="h-full bg-gradient-to-r from-brand-red/60 to-brand-red rounded-full shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-1000 ease-out"
                                            style={{ width: `${(muscleValues[idx] / maxMuscleVolume) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="h-full py-16 flex flex-col items-center justify-center opacity-40">
                                <PieChart className="w-12 h-12 mb-4 text-gray-600" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center">Foco sin definir</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PR History & Weekly Frequency */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* PR History */}
                <div className="bg-brand-gray border border-white/5 rounded-[40px] p-8 overflow-hidden relative shadow-2xl">
                    <Trophy className="absolute -right-16 -bottom-16 w-64 h-64 text-brand-red/5 -rotate-12" />
                    <h3 className="text-xl font-heading font-black text-white mb-10 flex items-center gap-3 uppercase italic tracking-widest">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                            <Award className="w-5 h-5 text-yellow-500" />
                        </div>
                        Avances Recientes
                    </h3>
                    <div className="space-y-4 relative z-10">
                        {stats?.prHistory && stats.prHistory.length > 0 ? stats.prHistory.slice(0, 5).map((pr, i) => (
                            <div key={i} className="flex items-center justify-between p-5 bg-black/40 border border-white/5 rounded-3xl hover:border-brand-red/40 hover:bg-brand-red/[0.02] transition-all group">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red border border-brand-red/20 group-hover:bg-brand-red group-hover:text-white transition-all transform group-hover:scale-110">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-base tracking-tight group-hover:text-brand-red transition-colors">{pr.exercise_name}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> {new Date(pr.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-heading font-black text-white">{pr.weight_kg} <span className="text-[10px] text-gray-500 uppercase tracking-tighter">KG</span></p>
                                    <div className="flex items-center gap-1 justify-end mt-1">
                                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-[8px] text-green-500 font-extrabold uppercase tracking-widest">NUEVA MARCA</span>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                                <Award className="w-12 h-12 text-gray-800 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">Sin huellas de poder registradas</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Weekly Frequency */}
                <div className="bg-brand-gray border border-white/5 rounded-[40px] p-8 shadow-2xl">
                    <h3 className="text-xl font-heading font-black text-white mb-10 flex items-center gap-3 uppercase italic tracking-widest">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                            <BarChart2 className="w-5 h-5 text-purple-500" />
                        </div>
                        Frecuencia de Misiones
                    </h3>
                    <div className="flex justify-between items-end h-64 px-6">
                        {stats?.weeklyFreq.map((count: number, i: number) => {
                            const labels = ["S-3", "S-2", "S-1", "ESTA"];
                            const isCurrent = i === 3;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-4 group/freq h-full justify-end">
                                    <div className={clsx(
                                        "text-[10px] font-black transition-all",
                                        isCurrent ? "text-brand-red text-xs scale-110" : "text-gray-500"
                                    )}>{count}x</div>
                                    <div className="w-full max-w-[48px] px-1 h-full flex items-end">
                                        <div
                                            className={clsx(
                                                "w-full rounded-2xl transition-all duration-1000 ease-out relative group-hover/freq:scale-x-110",
                                                isCurrent
                                                    ? "bg-gradient-to-t from-brand-red/40 to-brand-red shadow-[0_0_30px_rgba(220,38,38,0.3)]"
                                                    : "bg-white/5 border border-white/10 group-hover/freq:bg-white/10"
                                            )}
                                            style={{ height: `${Math.max((count / 7) * 100, 4)}%` }}
                                        >
                                            {isCurrent && count > 0 && <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 rounded-t-2xl" />}
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "text-[9px] font-black uppercase tracking-widest transition-colors",
                                        isCurrent ? "text-white" : "text-gray-600"
                                    )}>{labels[i]} <span className="hidden md:inline">SEM</span></div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-12 p-6 bg-white/[0.03] border border-white/5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20 group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs text-white font-black uppercase tracking-widest mb-1">Racha Activa</p>
                                <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                                    {stats?.streak && stats.streak > 0
                                        ? `¡Llevas ${stats.streak} ${stats.streak === 1 ? 'día' : 'días'} operando seguido!`
                                        : 'Sin racha en curso. Inicia hoy.'}
                                    <br />
                                    Rendimiento superior al <span className="text-brand-red">{stats?.percentile || 0}%</span> de la base aérea.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard/training/logs"
                            className="bg-white/5 p-3 rounded-xl text-gray-400 hover:text-white hover:bg-brand-red transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, trend, up }: { label: string, value: string | number, trend: string, up?: boolean }) {
    return (
        <div className="bg-brand-gray border border-white/5 p-6 rounded-3xl group hover:border-brand-red/30 transition-all">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">{label}</p>
            <div className="flex items-end justify-between">
                <h4 className="text-2xl font-heading font-black text-white">{value}</h4>
                <div className={clsx(
                    "flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full",
                    up ? "text-green-500 bg-green-500/10" : "text-gray-400 bg-white/5"
                )}>
                    {up ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
                    {trend}
                </div>
            </div>
        </div>
    )
}
