"use client";

import { Activity, Users, DollarSign, Calendar, ShoppingBag, Settings, CreditCard, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { getCenterAnalytics } from "../management-actions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import ActivityFeed from "./ActivityFeed";
import TeamChat from "./TeamChat";
import { checkStaffRole } from "../team-actions";

export default function CenterDashboardHome() {
    const params = useParams();
    const id = params.id as string;
    const [analytics, setAnalytics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isKpiExpanded, setIsKpiExpanded] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const data = await getCenterAnalytics(id);
            const { role } = await checkStaffRole(id);
            setAnalytics(data);
            setUserRole(role);
            setLoading(false);
        }
        load();
    }, [id]);

    const currentMonth = analytics.length > 0 ? analytics[analytics.length - 1] : { members: 0, revenue: 0 };
    const prevMonth = analytics.length > 1 ? analytics[analytics.length - 2] : { members: 0, revenue: 0 };

    const memberGrowth = prevMonth.members > 0 ? ((currentMonth.members - prevMonth.members) / prevMonth.members * 100).toFixed(0) : '0';
    const revenueGrowth = prevMonth.revenue > 0 ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(0) : '0';

    const canViewKPIs = userRole === 'owner' || userRole === 'head_coach';

    return (
        <div className="px-2 py-4 sm:p-8 space-y-4 sm:space-y-10 animate-fade-in max-w-7xl mx-auto">

            {/* KPI Section Control (Mobile Only) */}
            {canViewKPIs && (
                <div className="flex lg:hidden items-center justify-between mb-2 px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 italic">Métricas de Negocio</h3>
                    <button
                        onClick={() => setIsKpiExpanded(!isKpiExpanded)}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-red bg-brand-red/10 px-3 py-1.5 rounded-full border border-brand-red/20"
                    >
                        {isKpiExpanded ? 'Contraer' : 'Ver Detalles'}
                        <ChevronDown className={clsx("w-3 h-3 transition-transform", isKpiExpanded ? "rotate-180" : "")} />
                    </button>
                </div>
            )}

            {/* KPI Cards Container */}
            {canViewKPIs && (
                <div className={clsx(
                    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:max-h-none overflow-hidden transition-all duration-500",
                    isKpiExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100"
                )}>
                    <StatCard
                        title="Miembros Activos"
                        value={loading ? '-' : currentMonth.members}
                        subtext={`${memberGrowth}% vs mes anterior`}
                        trend={Number(memberGrowth) >= 0 ? 'up' : 'down'}
                        icon={Users}
                    />
                    <StatCard
                        title="Ingresos (Mes)"
                        value={loading ? '-' : `€${currentMonth.revenue}`}
                        subtext={`${revenueGrowth}% vs mes anterior`}
                        trend={Number(revenueGrowth) >= 0 ? 'up' : 'down'}
                        icon={DollarSign}
                    />
                    <StatCard
                        title="Clases esta Semana"
                        value="15"
                        subtext="3 Próximas"
                        icon={Calendar}
                    />
                    <StatCard
                        title="Ocupación Media"
                        value="78%"
                        subtext="vs 72% semana anterior"
                        trend="up"
                        icon={Activity}
                    />
                </div>
            )}

            {/* Dashboard Layout */}
            <div className={clsx(
                "grid gap-6 sm:gap-8 items-start",
                canViewKPIs ? "lg:grid-cols-3" : "grid-cols-1 md:grid-cols-3"
            )}>
                {/* Main Content Column (Quick Actions + Analytics) */}
                <div className={clsx(
                    "flex flex-col gap-8",
                    canViewKPIs ? "lg:col-span-2" : "md:col-span-2"
                )}>
                    {/* Quick Actions */}
                    <section>
                        <h3 className="text-lg font-bold text-foreground mb-4 font-heading uppercase tracking-widest text-xs opacity-50">Gestión del Centro</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            <QuickAction
                                href={`/dashboard/gyms/${id}/schedule`}
                                icon={Calendar}
                                label="Agenda de Clases"
                                description="Horarios y asistencias"
                            />
                            <QuickAction
                                href={`/dashboard/gyms/${id}/members`}
                                icon={Users}
                                label="Base de Atletas"
                                description="Gestión de socios y altas"
                            />
                            <QuickAction
                                href={`/dashboard/gyms/${id}/memberships`}
                                icon={CreditCard}
                                label="Tarifas y Planes"
                                description="Membresías y suscripciones"
                            />
                            <QuickAction
                                href={`/dashboard/gyms/${id}/store`}
                                icon={ShoppingBag}
                                label="Tienda y Stock"
                                description="Venta de productos y bonos"
                            />
                            <QuickAction
                                href={`/center-owner/centers/${id}/edit`}
                                icon={Settings}
                                label="Configuración"
                                description="Ajustes de perfil y pagos"
                            />
                        </div>
                    </section>

                    {/* Analytics Chart (Owner Only) */}
                    {canViewKPIs && (
                        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col min-h-[420px]">
                            <h3 className="text-lg font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-brand-red" /> Rendimiento del Negocio
                            </h3>
                            <div className="flex-1 w-full relative">
                                {loading ? (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Cargando Analíticas...</div>
                                ) : (
                                    <div className="absolute inset-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                                                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', borderRadius: '12px' }}
                                                    labelStyle={{ color: 'var(--foreground)', fontWeight: 'bold' }}
                                                    itemStyle={{ color: 'var(--foreground)' }}
                                                />
                                                <Line type="monotone" dataKey="revenue" stroke="#DC2626" strokeWidth={3} dot={{ r: 4, fill: "#DC2626" }} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="members" stroke="#2563EB" strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (Side Content) */}
                <div className={clsx(
                    "space-y-8",
                    canViewKPIs ? "lg:col-span-1" : "md:col-span-1 flex flex-col h-full"
                )}>
                    {canViewKPIs ? (
                        /* Owner/Head Coach View: Chat + Activity Stacked */
                        <>
                            <TeamChat centerId={id} />
                            <div>
                                <h3 className="text-lg font-bold text-foreground mb-4">Actividad Reciente</h3>
                                <ActivityFeed centerId={id} />
                            </div>
                        </>
                    ) : (
                        /* Coach View: Activity Feed Expanded */
                        <div className="flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-foreground mb-4">Actividad Reciente</h3>
                            <div className="flex-1 bg-card border border-border rounded-2xl p-1 min-h-[400px]">
                                <ActivityFeed centerId={id} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section (Coach View Only: Team Chat Full Width) */}
            {!canViewKPIs && (
                <div className="w-full animate-fade-in-up">
                    <TeamChat centerId={id} className="h-[600px] w-full" />
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, subtext, icon: Icon, trend }: any) {
    return (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 relative group hover:border-brand-red/30 transition-all overflow-hidden shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red">
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">{title}</span>
                    </div>
                </div>
            </div>

            <h3 className="text-3xl sm:text-4xl font-accent font-bold text-foreground mb-1 tracking-tighter italic">{value}</h3>
            <p className={clsx(
                "text-[10px] sm:text-xs font-bold uppercase tracking-widest",
                trend === 'up' ? 'text-green-500' : 'text-muted-foreground'
            )}>{subtext}</p>
        </div>
    )
}

function QuickAction({ href, icon: Icon, label, description, disabled }: any) {
    if (disabled) {
        return (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-2 opacity-50 cursor-not-allowed">
                <Icon className="w-6 h-6 text-muted-foreground" />
                <span className="font-bold text-muted-foreground text-sm">{label}</span>
            </div>
        )
    }
    return (
        <Link
            href={href}
            className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/30 hover:border-brand-red/20 hover:-translate-y-1 transition-all group relative overflow-hidden shadow-sm"
        >
            {/* Subtle background glow */}
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-brand-red/5 blur-2xl group-hover:bg-brand-red/10 transition-colors" />

            <div className="w-12 h-12 rounded-xl bg-brand-red/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6 text-brand-red" />
            </div>

            <div>
                <span className="font-black text-foreground text-sm sm:text-base block mb-0.5">{label}</span>
                {description && <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none block">{description}</span>}
            </div>
        </Link>
    )
}
