"use client";

import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
    TrendingUp, Users, DollarSign, Activity, Award, Target,
    ArrowUpRight, ArrowDownRight, BarChart2, RefreshCcw, FileDown,
    Zap, Globe, Shield
} from "lucide-react";
import { useState } from "react";

const COLORS = ['#E11D48', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4'];

function KpiCard({ icon: Icon, label, value, sub, trend, color = 'red' }: any) {
    const colorMap: Record<string, string> = {
        red: 'bg-brand-red/10 text-brand-red border-brand-red/20',
        green: 'bg-green-500/10 text-green-400 border-green-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return (
        <div className="bg-brand-gray border border-white/5 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/10 transition-all">
            <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.red}`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend !== undefined && (
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-black text-white italic">{value}</p>
                {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
            <span className="w-1 h-4 bg-brand-red rounded-full inline-block" />
            {children}
        </h2>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-xs shadow-xl">
            <p className="font-bold text-white mb-2">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('ingreso') ? `€${p.value.toLocaleString()}` : p.value}
                </p>
            ))}
        </div>
    );
};

export default function AnalyticsManager({ centerId, analytics, metrics, centerName }: {
    centerId: string;
    analytics: any;
    metrics: any;
    centerName: string;
}) {
    const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'revenue' | 'classes'>('overview');

    const tabs = [
        { id: 'overview', label: 'Resumen' },
        { id: 'members', label: 'Miembros' },
        { id: 'revenue', label: 'Ingresos' },
        { id: 'classes', label: 'Clases' },
        { id: 'benchmark', label: 'Benchmarking' },
    ] as const;

    const handleGenerateReport = () => {
        alert("Generando informe de rendimiento detallado en PDF... Por favor espera.");
        // In a real app, we would use html2canvas or a server-side PDF generator
    };


    return (
        <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex gap-1 p-1 bg-black/30 rounded-xl border border-white/5 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-brand-red text-white shadow-glow-sm'
                            : 'text-gray-500 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Global Actions */}
            <div className="flex justify-end">
                <button
                    onClick={handleGenerateReport}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    <FileDown className="w-4 h-4 text-brand-red" /> Generar Informe (PDF)
                </button>
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard icon={Users} label="Miembros Activos" value={analytics.activeMembers} sub={`de ${analytics.totalMembers} total`} color="red" />
                        <KpiCard icon={DollarSign} label="Ingresos Mes" value={`€${analytics.thisMonthRevenue?.toLocaleString()}`} sub="ventas registradas" color="green" />
                        <KpiCard icon={Target} label="Retención 3M" value={`${analytics.retentionRate}%`} sub="miembros que siguen activos" color="blue" />
                        <KpiCard icon={Activity} label="Asistencia Semana" value={metrics.weeklyAttendance} sub="asistentes únicos" color="amber" />
                    </div>

                    {/* Revenue + Members 12-month chart */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <SectionTitle>Evolución 12 Meses</SectionTitle>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={analytics.monthlyRevenue}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#E11D48" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                                <Area type="monotone" dataKey="revenue" name="Ingresos (€)" stroke="#E11D48" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                                <Area type="monotone" dataKey="nuevos" name="Altas" stroke="#22c55e" fill="url(#memGrad)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Status + Attendance Heatmap */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                            <SectionTitle>Estado de Membresías</SectionTitle>
                            <div className="flex items-center gap-4">
                                <ResponsiveContainer width="50%" height={160}>
                                    <PieChart>
                                        <Pie data={analytics.statusDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                                            {analytics.statusDistribution.map((entry: any, i: number) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: any) => [v, '']} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-col gap-3 flex-1">
                                    {analytics.statusDistribution.map((s: any) => (
                                        <div key={s.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                                                <span className="text-xs text-gray-400 font-semibold">{s.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-white">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                            <SectionTitle>Asistencia por Día</SectionTitle>
                            <ResponsiveContainer width="100%" height={160}>
                                <BarChart data={analytics.attendanceHeatmap} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" name="Asistencias" fill="#E11D48" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MEMBERS TAB ───────────────────────────────────────────── */}
            {activeTab === 'members' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard icon={Users} label="Total" value={analytics.totalMembers} color="red" />
                        <KpiCard icon={TrendingUp} label="Activos" value={analytics.activeMembers} color="green" />
                        <KpiCard icon={ArrowUpRight} label="Altas Semana" value={metrics.newMembersWeek} sub="nuevos miembros" color="blue" />
                        <KpiCard icon={ArrowDownRight} label="Bajas Semana" value={metrics.cancelledWeek} sub="cancelaciones" color="amber" />
                    </div>

                    {/* Member growth bar chart */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <SectionTitle>Altas vs Bajas por Mes</SectionTitle>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={analytics.monthlyRevenue}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                                <Bar dataKey="nuevos" name="Altas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="bajas" name="Bajas" fill="#E11D48" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Plan distribution */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <SectionTitle>Distribución por Plan</SectionTitle>
                        <div className="flex flex-col lg:flex-row items-center gap-6">
                            <ResponsiveContainer width={200} height={200}>
                                <PieChart>
                                    <Pie data={analytics.planDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {analytics.planDistribution.map((_: any, i: number) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 flex-1 w-full">
                                {analytics.planDistribution.map((p: any, i: number) => (
                                    <div key={p.name} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                            <span className="text-xs text-gray-300 font-semibold truncate">{p.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-white/5 rounded-full h-1.5">
                                                <div className="h-1.5 rounded-full" style={{ width: `${Math.round((p.value / analytics.totalMembers) * 100)}%`, background: COLORS[i % COLORS.length] }} />
                                            </div>
                                            <span className="text-xs font-black text-white w-6 text-right">{p.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Retention rate callout */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 flex items-center gap-4">
                        <div className="p-4 bg-blue-500/20 rounded-2xl">
                            <Target className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tasa de Retención a 3 Meses</p>
                            <p className="text-5xl font-black text-white italic">{analytics.retentionRate}<span className="text-2xl text-gray-400">%</span></p>
                            <p className="text-xs text-gray-500 mt-1">Porcentaje de miembros que siguen activos después de 3 meses desde su alta.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── REVENUE TAB ───────────────────────────────────────────── */}
            {activeTab === 'revenue' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <KpiCard icon={DollarSign} label="Ingresos Totales" value={`€${analytics.totalRevenue?.toLocaleString()}`} color="green" />
                        <KpiCard icon={TrendingUp} label="Este Mes" value={`€${analytics.thisMonthRevenue?.toLocaleString()}`} color="red" />
                        <KpiCard icon={Users} label="Miembros Activos" value={analytics.activeMembers} sub="generando MRR" color="blue" />
                    </div>

                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <SectionTitle>Ingresos por Mes (12 meses)</SectionTitle>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.monthlyRevenue}>
                                <defs>
                                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#E11D48" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Ingresos (€)" stroke="#E11D48" fill="url(#revGrad2)" strokeWidth={2.5} dot={{ fill: '#E11D48', r: 3 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Revenue per plan estimate */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <SectionTitle>Distribución de Planes</SectionTitle>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analytics.planDistribution} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Miembros" fill="#E11D48" radius={[0, 4, 4, 0]}>
                                    {analytics.planDistribution.map((_: any, i: number) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── CLASSES TAB ───────────────────────────────────────────── */}
            {activeTab === 'classes' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <KpiCard icon={Activity} label="Asistencia Semana" value={metrics.weeklyAttendance} sub="asistentes únicos" color="red" />
                        <KpiCard icon={Award} label="Clase Top" value={analytics.classPopularity?.[0]?.name || '—'} sub={`${analytics.classPopularity?.[0]?.attendance || 0} asistencias`} color="amber" />
                        <KpiCard icon={BarChart2} label="Clases Registradas" value={analytics.classPopularity?.length || 0} color="blue" />
                    </div>

                    {/* Class popularity */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <SectionTitle>Clases más Populares</SectionTitle>
                        {analytics.classPopularity?.length > 0 ? (
                            <div className="space-y-3 mt-2">
                                {analytics.classPopularity.map((cls: any, i: number) => (
                                    <div key={cls.name} className="flex items-center gap-3">
                                        <span className="text-xs font-black text-gray-600 w-5 text-right">{i + 1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-bold text-white truncate">{cls.name}</span>
                                                <span className="text-xs font-black text-brand-red ml-2">{cls.attendance}</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full bg-brand-red transition-all"
                                                    style={{ width: `${Math.round((cls.attendance / (analytics.classPopularity[0]?.attendance || 1)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm text-center py-8">Sin datos de asistencia registrados aún.</p>
                        )}
                    </div>

                    {/* Attendance by day of week */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <SectionTitle>Asistencia por Día de la Semana</SectionTitle>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={analytics.attendanceHeatmap} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="Asistencias" radius={[6, 6, 0, 0]}>
                                    {analytics.attendanceHeatmap.map((_: any, i: number) => (
                                        <Cell key={i} fill={i === 0 || i === 6 ? '#374151' : '#E11D48'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── BENCHMARK TAB ─────────────────────────────────────────── */}
            {activeTab === 'benchmark' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-brand-red/10 to-brand-gray border border-brand-red/20 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Globe className="w-40 h-40 text-brand-red" />
                        </div>
                        <div className="relative z-10 max-w-xl">
                            <span className="text-[10px] bg-brand-red text-white px-2 py-0.5 rounded font-black uppercase tracking-widest mb-3 inline-block">Pro Feature</span>
                            <h2 className="text-3xl font-black italic uppercase italic tracking-tighter text-white mb-2">COMPARATIVA DE <span className="text-brand-red">MERCADO.</span></h2>
                            <p className="text-gray-400 text-sm font-medium leading-relaxed">
                                Descubre cómo se posiciona <span className="text-white font-bold">{centerName}</span> frente a la media de centros <span className="text-brand-red font-bold">Rival Fit</span> de tu categoría.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Benchmarking Chart 1: Members */}
                        <div className="bg-brand-gray border border-white/5 rounded-2xl p-6">
                            <SectionTitle>Retención vs Media Nacional</SectionTitle>
                            <div className="h-[220px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Tu Centro', value: analytics.retentionRate },
                                        { name: 'Media Rival', value: 72 },
                                        { name: 'Top 5%', value: 94 },
                                    ]}>
                                        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis hide domain={[0, 100]} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="value" name="Tasa %" radius={[6, 6, 0, 0]}>
                                            <Cell fill="#E11D48" />
                                            <Cell fill="#374151" />
                                            <Cell fill="#22c55e" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center mt-4">
                                Tu retención es un <span className="text-green-500">{((analytics.retentionRate / 72) * 100 - 100).toFixed(1)}%</span> superior a la media.
                            </p>
                        </div>

                        {/* Benchmarking Chart 2: Occupancy */}
                        <div className="bg-brand-gray border border-white/5 rounded-2xl p-6">
                            <SectionTitle>Ocupación de Clases</SectionTitle>
                            <div className="h-[220px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        { time: '07:00', tu: 45, media: 40 },
                                        { time: '10:00', tu: 25, media: 30 },
                                        { time: '14:00', tu: 60, media: 35 },
                                        { time: '18:00', tu: 95, media: 85 },
                                        { time: '20:00', tu: 80, media: 70 },
                                    ]}>
                                        <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis hide />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area itemID='tu' name="Tu Centro" dataKey="tu" stroke="#E11D48" fill="#E11D48" fillOpacity={0.2} strokeWidth={2} />
                                        <Area itemID='media' name="Media" dataKey="media" stroke="#374151" fill="#374151" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center mt-4">
                                Tienes picos de demanda en horas valle (14:00) vs la media.
                            </p>
                        </div>
                    </div>

                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-6">
                        <SectionTitle>Análisis Competitivo</SectionTitle>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            {[
                                { label: 'Ticket Medio', val: '€64', status: 'optimal', icon: DollarSign },
                                { label: 'Engagement App', val: 'Alto', status: 'good', icon: Zap },
                                { label: 'Seguridad / Bajas', val: 'Bajo', status: 'perfect', icon: Shield }
                            ].map((item, i) => (
                                <div key={i} className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-brand-red">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                                        <p className="text-lg font-black text-white italic">{item.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

