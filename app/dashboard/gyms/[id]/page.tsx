"use client";

import { Activity, Users, DollarSign, Calendar, ShoppingBag, Settings, CreditCard, ChevronDown, Building2, MapPin, UserPlus, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { getCenterAnalytics, getDashboardMetrics } from "../management-actions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import ActivityFeed from "./ActivityFeed";
import TeamChat from "./TeamChat";
import TrainerDashboard from "./TrainerDashboard";
import ProfessionalDashboard from "./ProfessionalDashboard";
import { checkStaffRole } from "../team-actions";
import { getCenterDetails, getOrganizationCenters, createCenter, deleteCenter } from "../actions";
import { isProfessional } from "@/lib/professional-types";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/app/LanguageContext";
import { translations } from "@/utils/i18n";

function DashboardCard({ title, value, icon: Icon, trend, trendValue, subtext, onClick, description, className }: any) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "bg-card border border-border p-6 rounded-2xl flex flex-col justify-between hover:border-brand-red/30 transition-all group cursor-pointer h-full",
                className
            )}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="bg-brand-red/10 p-3 rounded-xl group-hover:bg-brand-red group-hover:text-white transition-colors text-brand-red">
                    <Icon className="w-6 h-6" />
                </div>
                {trendValue !== undefined && (
                    <span className={clsx(
                        "text-xs font-bold px-2 py-1 rounded-full uppercase tracking-widest",
                        Number(trendValue) > 0 ? "bg-green-500/10 text-green-500"
                        : Number(trendValue) < 0 ? "bg-red-500/10 text-red-500"
                        : "bg-muted text-muted-foreground"
                    )}>
                        {Number(trendValue) > 0 ? `+${trendValue}%` : `${trendValue}%`}
                    </span>
                )}
            </div>
            <div>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
                {value !== undefined && <h3 className="text-2xl font-black text-foreground italic">{value}</h3>}
                {description && <h3 className="text-base font-bold text-foreground">{description}</h3>}
                {subtext && <p className="text-xs text-muted-foreground mt-2 font-medium">{subtext}</p>}
            </div>
        </div>
    );
}

export default function CenterDashboardHome() {
    const params = useParams();
    const id = params.id as string;
    const [analytics, setAnalytics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isKpiExpanded, setIsKpiExpanded] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const [centerDetails, setCenterDetails] = useState<any>(null);
    const [centers, setCenters] = useState<any[]>([]);
    const [showAddCenter, setShowAddCenter] = useState(false);
    const [isCreatingCenter, setIsCreatingCenter] = useState(false);
    const [metrics, setMetrics] = useState<any>(null);
    const { language } = useLanguage();
    const t = translations[language];
    useEffect(() => {
        setIsMounted(true);
        async function load() {
            const [analyticalData, metricData, { role }, details, centerList] = await Promise.all([
                getCenterAnalytics(id),
                getDashboardMetrics(id),
                checkStaffRole(id),
                getCenterDetails(id),
                getOrganizationCenters(id)
            ]);

            setAnalytics(analyticalData);
            setMetrics(metricData);
            setUserRole(role);
            setCenterDetails(details);
            setCenters(centerList);

            setLoading(false);

            // WKWebView (Safari/Capacitor) a veces no repinta tras esta tanda de
            // setState — el contenido queda listo en el DOM pero la pantalla
            // sigue mostrando el spinner hasta que el usuario toca algo. Mismo
            // truco que useBlackScreenFix en dashboard/layout.tsx: forzar un
            // reflow con un cambio de opacidad de un frame.
            if (typeof document !== 'undefined') {
                document.body.style.opacity = '0.99';
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        document.body.style.opacity = '';
                    });
                });
            }
        }
        load();
    }, [id]);

    async function handleAddCenter(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsCreatingCenter(true);
        const formData = new FormData(e.currentTarget);
        const res = await createCenter(id, formData);
        setIsCreatingCenter(false);

        if (res.error) {
            window.dispatchEvent(new CustomEvent('center-toast', { detail: { message: res.error, type: 'error' } }));
        } else {
            setShowAddCenter(false);
            const updatedCenters = await getOrganizationCenters(id);
            setCenters(updatedCenters);
        }
    }

    async function handleDeleteCenter(centerId: string, centerName: string) {
        if (!window.confirm(`¿Eliminar la sede "${centerName}"? Esta acción no se puede deshacer.`)) return;

        const res = await deleteCenter(id, centerId);
        if (res.error) {
            window.dispatchEvent(new CustomEvent('center-toast', { detail: { message: res.error, type: 'error' } }));
        } else {
            const updatedCenters = await getOrganizationCenters(id);
            setCenters(updatedCenters);
        }
    }

    const currentMonth = analytics.length > 0 ? analytics[analytics.length - 1] : { members: 0, revenue: 0 };
    const prevMonth = analytics.length > 1 ? analytics[analytics.length - 2] : { members: 0, revenue: 0 };

    const memberGrowth = prevMonth.members > 0 ? ((currentMonth.members - prevMonth.members) / prevMonth.members * 100).toFixed(0) : '0';
    const revenueGrowth = prevMonth.revenue > 0 ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue * 100).toFixed(0) : '0';

    const canViewKPIs = userRole === 'owner' || userRole === 'head_coach';

    if (loading && !centerDetails) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isProfessional(centerDetails?.center_type)) {
        return (
            <ProfessionalDashboard
                id={id}
                centerDetails={centerDetails}
                userRole={userRole}
            />
        );
    }

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
                    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 lg:max-h-none overflow-hidden transition-all duration-500",
                    isKpiExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100"
                )}>
                    <StatCard loading={loading} title="Miembros Activos"
                        value={metrics?.totalActive ?? currentMonth.members}
                        subtext={`${memberGrowth}% vs mes anterior`}
                        trend={Number(memberGrowth) > 0 ? 'up' : Number(memberGrowth) < 0 ? 'down' : 'neutral'}
                        icon={Users}
                    />
                    <StatCard loading={loading} title="Ingresos (Mes)"
                        value={`€${(currentMonth.revenue || 0).toLocaleString('es-ES')}`}
                        subtext={`${revenueGrowth}% vs mes anterior`}
                        trend={Number(revenueGrowth) > 0 ? 'up' : Number(revenueGrowth) < 0 ? 'down' : 'neutral'}
                        icon={DollarSign}
                    />
                    <StatCard loading={loading} title="Asistencia (Semana)"
                        value={metrics?.weeklyAttendance ?? 0}
                        subtext="Atletas únicos esta semana"
                        trend={metrics?.weeklyAttendance > 0 ? 'up' : 'neutral'}
                        icon={Activity}
                    />
                    <StatCard loading={loading} title="Nuevas Altas"
                        value={metrics?.newMembersMonth ?? 0}
                        subtext={`${metrics?.newMembersWeek ?? 0} esta semana`}
                        trend={metrics?.newMembersMonth > 0 ? 'up' : 'neutral'}
                        icon={UserPlus}
                    />
                    <StatCard loading={loading} title="Bajas (Mes)"
                        value={metrics?.cancelledMonth ?? 0}
                        subtext={`${metrics?.cancelledWeek ?? 0} esta semana`}
                        trend={metrics?.cancelledMonth > 0 ? 'down' : 'neutral'}
                        icon={UserMinus}
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
                        <h3 className="text-lg font-bold text-foreground mb-4 font-heading uppercase tracking-widest text-xs opacity-50">
                            {centerDetails?.center_type === 'personal_trainer' ? 'Gestión Personal' : 'Gestión del Centro'}
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            <QuickAction
                                href={`/dashboard/gyms/${id}/schedule`}
                                icon={Calendar}
                                label={centerDetails?.center_type === 'personal_trainer' ? 'Reserva de Citas' : 'Agenda de Clases'}
                                description={centerDetails?.center_type === 'personal_trainer' ? 'Gestionar sesiones alumnos' : 'Horarios y asistencias'}
                            />
                            <QuickAction
                                href={`/dashboard/gyms/${id}/members`}
                                icon={Users}
                                label={centerDetails?.center_type === 'personal_trainer' ? 'Mis Alumnos' : 'Base de Atletas'}
                                description={centerDetails?.center_type === 'personal_trainer' ? 'Gestión de clientes y fichas' : 'Gestión de socios y altas'}
                            />
                            {centerDetails?.center_type === 'personal_trainer' && (
                                <QuickAction
                                    href={`/dashboard/gyms/${id}/programming`}
                                    icon={Activity}
                                    label="Programación"
                                    description="Crear rutinas para alumnos"
                                />
                            )}
                            <QuickAction
                                href={`/dashboard/gyms/${id}/memberships`}
                                icon={CreditCard}
                                label="Tarifas y Planes"
                                description="Membresías y suscripciones"
                            />
                            <QuickAction
                                href={`/dashboard/gyms/${id}/store`}
                                icon={ShoppingBag}
                                label="Tienda y Pagos"
                                description="Venta de servicios y bonos"
                            />
                            <QuickAction
                                href={`/center-owner/centers/${id}/edit`}
                                icon={Settings}
                                label="Configuración"
                                description="Ajustes de perfil y pagos"
                            />
                            {centerDetails?.center_type !== 'personal_trainer' && (
                                <QuickAction
                                    icon={Building2}
                                    label="Registrar Sede"
                                    description="Añadir nueva ubicación"
                                    onClick={() => setShowAddCenter(true)}
                                />
                            )}
                        </div>
                    </section>

                    {/* MULTI-CENTER SECTION - Only visible if there are sedes to list */}
                    {canViewKPIs && centers.length > 0 && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-foreground font-heading uppercase tracking-widest text-xs opacity-50 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-purple-500" /> Sedes de la Empresa
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Array.isArray(centers) && centers.map((center) => (
                                    <div
                                        key={center.id}
                                        className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between group hover:border-purple-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                {center.logo_url ? (
                                                    <img src={center.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <MapPin className="w-5 h-5" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase italic italic">{center.name}</h4>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {center.city}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/dashboard/gyms/${id}/sedes/${center.id}`}
                                                className="text-[10px] font-black uppercase tracking-widest p-2 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-purple-400"
                                            >
                                                Gestionar
                                            </Link>
                                            {userRole === 'owner' && (
                                                <button
                                                    onClick={() => handleDeleteCenter(center.id, center.name)}
                                                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-500"
                                                    title="Eliminar Sede"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Analytics Chart (Owner Only) */}
                    {canViewKPIs && (
                        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col min-h-[420px] relative overflow-hidden group">
                            {/* ... (existing chart code) ... */}
                            <h3 className="text-lg font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2 relative z-10">
                                <Activity className="w-5 h-5 text-brand-red" /> Rendimiento del Negocio
                            </h3>

                            {/* Free Plan Restriction Overlay */}
                            {(centerDetails?.plan || 'free') === 'free' && (
                                <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-brand-red/10 flex items-center justify-center mb-4 border border-brand-red/20">
                                        <Activity className="w-8 h-8 text-brand-red" />
                                    </div>
                                    <h3 className="text-xl font-heading font-black text-foreground italic uppercase tracking-tighter mb-2">
                                        Métricas Avanzadas
                                    </h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mb-6 font-medium">
                                        Desbloquea el análisis detallado de ingresos y crecimiento con el plan <span className="text-brand-red font-bold">Starter</span> o <span className="text-brand-red font-bold">Pro</span>.
                                    </p>
                                    <Link
                                        href={`/dashboard/gyms/${id}/settings/billing`}
                                        className="bg-brand-red text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-glow"
                                    >
                                        Ver Planes
                                    </Link>
                                </div>
                            )}

                            <div className={clsx("flex-1 w-full relative transition-opacity", (centerDetails?.plan || 'free') === 'free' ? "opacity-20 pointer-events-none" : "opacity-100")}>
                                {loading ? (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Cargando Analíticas...</div>
                                ) : (
                                    <div className="absolute inset-0">
                                        {isMounted && (
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
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Activity Feed for Coaches (Below Quick Actions) */}
                    {!canViewKPIs && (
                        <div className="flex flex-col">
                            <h3 className="text-lg font-bold text-foreground mb-4 font-heading uppercase tracking-widest text-xs opacity-50">
                                Actividad Reciente
                            </h3>
                            <div className="bg-card border border-border rounded-2xl p-1 min-h-[400px]">
                                <ActivityFeed centerId={id} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (Side Content) */}
                <div className={clsx(
                    "lg:col-span-1 space-y-8 flex flex-col h-full"
                )}>
                    {userRole && ['owner', 'head_coach', 'coach'].includes(userRole) && (
                        <TeamChat centerId={id} />
                    )}

                    {canViewKPIs && (
                        <div className="flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-foreground mb-4 font-heading uppercase tracking-widest text-xs opacity-50">
                                Actividad Reciente
                            </h3>
                            <div className="flex-1 bg-card border border-border rounded-2xl p-1 min-h-[400px]">
                                <ActivityFeed centerId={id} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal para Añadir Sede */}
            {showAddCenter && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-[40px] max-w-lg w-full p-8 relative animate-in zoom-in-95 duration-300">
                        <button onClick={() => setShowAddCenter(false)} className="absolute top-6 right-8 text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronDown className="w-6 h-6 rotate-180" />
                        </button>

                        <div className="mb-8">
                            <h2 className="text-3xl font-black italic uppercase italic tracking-tight text-foreground">Nueva Sede</h2>
                            <p className="text-muted-foreground text-sm">Añade una nueva ubicación a tu red de centros.</p>
                        </div>

                        <form onSubmit={handleAddCenter} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre de la Sede</label>
                                <input name="name" required placeholder="e.g. Rival North" className="w-full bg-background border border-border rounded-xl p-4 outline-none focus:border-purple-500 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ciudad</label>
                                    <input name="city" required placeholder="Madrid" className="w-full bg-background border border-border rounded-xl p-4 outline-none focus:border-purple-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">País</label>
                                    <input name="country" required placeholder="España" className="w-full bg-background border border-border rounded-xl p-4 outline-none focus:border-purple-500 transition-all" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dirección</label>
                                <input name="address" required placeholder="Calle Ejemplo 123" className="w-full bg-background border border-border rounded-xl p-4 outline-none focus:border-purple-500 transition-all" />
                            </div>
                            <div className="pt-4">
                                <button
                                    disabled={isCreatingCenter}
                                    type="submit"
                                    className="w-full bg-purple-500 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {isCreatingCenter ? 'Creando...' : 'Añadir Sede'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, subtext, icon: Icon, trend, loading }: any) {
    if (loading) return (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="h-3 w-24 bg-muted rounded-full" />
            </div>
            <div className="h-10 w-20 bg-muted rounded-lg mb-2" />
            <div className="h-3 w-32 bg-muted rounded-full" />
        </div>
    );
    return (
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 relative group hover:border-brand-red/30 transition-all overflow-hidden shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red">
                        <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">{title}</span>
                </div>
                <div className={clsx(
                    "w-2 h-2 rounded-full mt-1",
                    trend === 'up' ? 'bg-green-500' : trend === 'down' ? 'bg-red-500' : 'bg-muted-foreground/30'
                )} />
            </div>
            <h3 className="text-3xl sm:text-4xl font-accent font-bold text-foreground mb-1 tracking-tighter italic">{value}</h3>
            <p className={clsx(
                "text-[10px] sm:text-xs font-bold uppercase tracking-widest",
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            )}>{subtext}</p>
        </div>
    );
}

function QuickAction({ href, icon: Icon, label, description, disabled, onClick }: any) {
    if (disabled) {
        return (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-2 opacity-50 cursor-not-allowed">
                <Icon className="w-6 h-6 text-muted-foreground" />
                <span className="font-bold text-muted-foreground text-sm">{label}</span>
            </div>
        )
    }

    const content = (
        <>
            {/* Subtle background glow */}
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-brand-red/5 blur-2xl group-hover:bg-brand-red/10 transition-colors" />

            <div className="w-12 h-12 rounded-xl bg-brand-red/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6 text-brand-red" />
            </div>

            <div>
                <span className="font-black text-foreground text-sm sm:text-base block mb-0.5">{label}</span>
                {description && <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none block">{description}</span>}
            </div>
        </>
    );

    if (onClick) {
        return (
            <button
                onClick={onClick}
                className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/30 hover:border-brand-red/20 hover:-translate-y-1 transition-all group relative overflow-hidden shadow-sm"
            >
                {content}
            </button>
        )
    }
    return (
        <Link
            href={href}
            className="bg-card border border-border rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/30 hover:border-brand-red/20 hover:-translate-y-1 transition-all group relative overflow-hidden shadow-sm"
        >
            {content}
        </Link>
    )
}
