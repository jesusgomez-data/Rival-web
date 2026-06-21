'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    Users,
    Building2,
    Zap,
    TrendingUp,
    CreditCard,
    Activity,
    Search,
    Download,
    Filter,
    MoreHorizontal,
    User,
    Flag,
    Plus,
    Trash2,
    Edit2,
    Sun,
    Moon,
    Brain,
} from 'lucide-react';
import {
    getAdminStats,
    getRecentOrganizations,
    getAllUsers,
    deleteUser,
    getBusinessStats,
    logVisit,
    getExportData,
    getAdminAuditLogs,
    getSystemActivity,
    getFinanceStats,
    getApplicationPlans,
    deleteApplicationPlan
} from './actions';
import { getSupportTickets } from './support-actions';
import { getModerationReports, takeModerationAction, deleteModerationReport } from './report-actions';
import { getAds, toggleAd, deleteAd, updateAd } from './ad-actions';
import CreateAdModal from './CreateAdModal';
import EditAdModal from './EditAdModal';
import BroadcastModal from './BroadcastModal';
import TerminalActivity from './TerminalActivity';
import ManagementIntelligence from './ManagementIntelligence';
import ViewAnalytics from './ViewAnalytics';
import { Megaphone, ExternalLink, Eye, MousePointer2, ZapOff, BarChart3, LineChart, Terminal as TerminalIcon } from 'lucide-react';
import SupportInbox from './SupportInbox';
import EditCenterModal from './EditCenterModal';
import EditUserModal from './EditUserModal';
import ReviewReportModal from './ReviewReportModal';
import EditPlanModal from './EditPlanModal';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils'; // Use utils for conditional classes
import { useTheme } from '@/app/ThemeContext';

export default function AdminDashboard() {
    const { theme, toggleTheme } = useTheme();
    const [stats, setStats] = useState<any>({ users: 0, centers: 0, workouts: 0, mrr: 0 });
    const [centers, setCenters] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [ads, setAds] = useState<any[]>([]);
    const [businessStats, setBusinessStats] = useState<any>({ visits: [], churn: [], inactiveUsers: [], topPages: [] });
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [systemActivity, setSystemActivity] = useState<any[]>([]);
    const [financeData, setFinanceData] = useState<any>({ orders: [], sales: [] });
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState<'centers' | 'users' | 'plans' | 'reports' | 'ads' | 'system' | 'analytics'>('centers');
    const [systemSubTab, setSystemSubTab] = useState<'terminal' | 'audit' | 'finance'>('terminal');
    const [reportsSubTab, setReportsSubTab] = useState<'moderation' | 'intelligence'>('moderation');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');

    // Modals
    const [editingCenter, setEditingCenter] = useState<any>(null);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [reviewingReport, setReviewingReport] = useState<any>(null);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [editingAd, setEditingAd] = useState<any>(null);
    const [isCreatingAd, setIsCreatingAd] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const handleAdd = () => {
        if (activeTab === 'plans') setEditingPlan({});
        else if (activeTab === 'ads') setIsCreatingAd(true);
        else if (activeTab === 'centers') alert('Para crear un centro, usa el flujo de registro de Sedes.');
        else if (activeTab === 'users') alert('Para crear un usuario, usa el flujo de registro público.');
        else if (activeTab === 'reports') alert('Los reportes son generados automáticamente por la comunidad.');
        else if (activeTab === 'analytics') alert('Las analíticas se generan automáticamente a partir de la actividad de la app.');
    };

    async function refreshData() {
        const safeCall = async (fn: () => Promise<any>, fallback: any) => {
            try {
                return await fn();
            } catch (err) {
                console.error("Dashboard failed loading some data:", err);
                return fallback;
            }
        };

        const [statsData, centersData, usersData, ticketsData, reportsData, adsData, bizData, auditData, activityData, finData, plansData] = await Promise.all([
            safeCall(getAdminStats, { users: 0, centers: 0, workouts: 0, mrr: 0, visits: 0, recentVisits: 0, churn: 0 }),
            safeCall(getRecentOrganizations, []),
            safeCall(getAllUsers, []),
            safeCall(getSupportTickets, []),
            safeCall(getModerationReports, []),
            safeCall(getAds, []),
            safeCall(getBusinessStats, { visits: [], churn: [], inactiveUsers: [], topPages: [] }),
            safeCall(getAdminAuditLogs, []),
            safeCall(getSystemActivity, []),
            safeCall(getFinanceStats, { orders: [], sales: [] }),
            safeCall(getApplicationPlans, [])
        ]);

        setStats(statsData);
        setCenters(centersData);
        setUsers(usersData || []);
        setTickets(ticketsData || []);
        setReports(reportsData || []);
        setAds(adsData || []);
        setBusinessStats(bizData);
        setAuditLogs(auditData);
        setSystemActivity(activityData);
        setFinanceData(finData);
        setPlans(plansData || []);
    }

    useEffect(() => {
        async function loadData() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                const adminEmails = ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com'];
                const userEmail = user?.email?.toLowerCase().trim();

                if (!user || !userEmail || !adminEmails.includes(userEmail)) {
                    console.warn('[ADMIN] Unauthorized access attempt blocked');
                    window.location.href = '/dashboard';
                    return;
                }

                await refreshData();
                logVisit('/admin', navigator.userAgent);
            } catch (e) {
                console.error("Error loading admin data", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Filter Logic
    const filteredCenters = centers.filter(center => {
        const matchesSearch = center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            center.city?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterPlan === 'all' || center.plan === filterPlan || (filterPlan === 'free' && !center.plan);
        return matchesSearch && matchesFilter;
    });

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        // Simple filter logic for users can be added later if needed (e.g. by tier)
        const matchesFilter = filterPlan === 'all' || user.subscription_tier === filterPlan || (filterPlan === 'free' && !user.subscription_tier);
        return matchesSearch && matchesFilter;
    });

    // Dynamic plans loaded from DB



    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#050505] text-brand-red font-black uppercase tracking-widest animate-pulse transition-colors duration-500">
            Iniciando Protocolo de Mando...
        </div>
    );

    return (
        <div key={theme} className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-red selection:text-white transition-colors duration-300">
            {/* Header */}
            <header className="border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-red flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-heading font-black italic uppercase tracking-tighter text-foreground transition-colors duration-300">Rival <span className="text-brand-red">Fit Command</span></h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Panel de Control Global</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/admin/ai-team"
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red/20 transition-all"
                        >
                            <Brain className="w-4 h-4 text-brand-red" />
                            <span className="text-xs font-black text-brand-red uppercase tracking-widest hidden sm:inline">AI Team</span>
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        </Link>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-all active:scale-95 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10"
                            title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5 text-amber-500 animate-in spin-in-90 duration-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-blue-400 animate-in spin-in-90 duration-500" />
                            )}
                        </button>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                        <span className="text-xs font-mono text-green-500 hidden sm:inline-block italic uppercase">
                            System Online • v2.2 - Intelligence & Broadcast • {theme}
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-12 transition-colors duration-300 min-h-screen">

                {/* KPI Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Ingresos Recurrentes (MRR)"
                        value={`${(stats.mrr || 0).toFixed(2)}€`}
                        trend="+12.5%"
                        icon={CreditCard}
                        color="text-green-500"
                        delay={0}
                    />
                    <KpiCard
                        title="Centros Activos"
                        value={stats.centers}
                        trend="+3 this week"
                        icon={Building2}
                        color="text-brand-red"
                        delay={0.1}
                    />
                    <KpiCard
                        title="Atletas Totales"
                        value={stats.users}
                        trend="+156"
                        icon={Users}
                        color="text-blue-500"
                        delay={0.2}
                    />
                    <KpiCard
                        title="Visitas (Totales)"
                        value={stats.visits || 0}
                        trend={`+${stats.recentVisits || 0} (30d)`}
                        icon={Activity}
                        color="text-yellow-500"
                        delay={0.3}
                    />
                </section>

                {/* Main Dashboard Area */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Column: Management Tables */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Control Bar (Tabs & Filters) */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div className="flex p-1 bg-gray-200 dark:bg-white/5 rounded-xl self-start overflow-x-auto max-w-full transition-colors">
                                <button
                                    onClick={() => setActiveTab('centers')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'centers' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    Centros
                                </button>
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'users' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    Atletas
                                </button>
                                <button
                                    onClick={() => setActiveTab('reports')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'reports' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    Reportes
                                </button>
                                <button
                                    onClick={() => setActiveTab('plans')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'plans' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    Planes
                                </button>
                                <button
                                    onClick={() => setActiveTab('ads')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'ads' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    Publicidad
                                </button>
                                <button
                                    onClick={() => setActiveTab('system')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2",
                                        activeTab === 'system' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    <TerminalIcon className="w-3 h-3" /> System Hub
                                </button>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2",
                                        activeTab === 'analytics' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-black dark:hover:text-white"
                                    )}
                                >
                                    <Eye className="w-3 h-3" /> Analíticas
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                                <div className="relative group flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:border-brand-red outline-none w-full sm:w-48 xl:w-64 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    />
                                </div>
                                <select
                                    value={filterPlan}
                                    onChange={(e) => setFilterPlan(e.target.value)}
                                    className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 focus:border-brand-red outline-none appearance-none cursor-pointer hover:text-black dark:hover:text-white transition-colors w-full sm:w-auto min-w-[140px]"
                                >

                                    <option value="all">Todos los Planes</option>
                                    <option value="free">Free</option>
                                    <option value={activeTab === 'centers' ? 'starter' : 'premium'}>{activeTab === 'centers' ? 'Starter' : 'Premium'}</option>
                                    <option value={activeTab === 'centers' ? 'pro' : 'elite'}>{activeTab === 'centers' ? 'Pro' : 'Elite'}</option>
                                </select>
                            </div>
                        </div>

                        {/* REQUISITION: Enhanced Reports Section */}
                        {activeTab === 'reports' && (
                            <div className="flex gap-4 mb-4">
                                <button
                                    onClick={() => setReportsSubTab('moderation')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-gray-200 dark:ring-white/10",
                                        reportsSubTab === 'moderation' ? "bg-brand-red text-white ring-brand-red" : "bg-white dark:bg-white/5 text-gray-500 hover:text-foreground"
                                    )}
                                >
                                    Moderación
                                </button>
                                <button
                                    onClick={() => setReportsSubTab('intelligence')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-gray-200 dark:ring-white/10 flex items-center gap-2",
                                        reportsSubTab === 'intelligence' ? "bg-blue-600 text-white ring-blue-600" : "bg-white dark:bg-white/5 text-gray-500 hover:text-foreground"
                                    )}
                                >
                                    <BarChart3 className="w-3 h-3" /> Inteligencia de Negocio
                                </button>
                            </div>
                        )}

                        {/* REQUISITION: System Hub Section */}
                        {activeTab === 'system' && (
                            <div className="flex gap-4 mb-4">
                                <button
                                    onClick={() => setSystemSubTab('terminal')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-gray-200 dark:ring-white/10",
                                        systemSubTab === 'terminal' ? "bg-black text-white ring-black" : "bg-white dark:bg-white/5 text-gray-500 hover:text-foreground"
                                    )}
                                >
                                    Server Activity
                                </button>
                                <button
                                    onClick={() => setSystemSubTab('audit')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-gray-200 dark:ring-white/10 flex items-center gap-2",
                                        systemSubTab === 'audit' ? "bg-purple-600 text-white ring-purple-600" : "bg-white dark:bg-white/5 text-gray-500 hover:text-foreground"
                                    )}
                                >
                                    <Shield className="w-3 h-3" /> Audit Logs
                                </button>
                                <button
                                    onClick={() => setSystemSubTab('finance')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ring-1 ring-gray-200 dark:ring-white/10 flex items-center gap-2",
                                        systemSubTab === 'finance' ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white dark:bg-white/5 text-gray-500 hover:text-foreground"
                                    )}
                                >
                                    <CreditCard className="w-3 h-3" /> Transacciones
                                </button>
                            </div>
                        )}

                        {/* DATA TABLE */}
                        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden min-h-[400px] shadow-sm dark:shadow-none transition-colors duration-300">
                            <div className="p-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-bold italic uppercase flex items-center gap-2 text-foreground transition-colors duration-300">
                                    {activeTab === 'centers' ? <Building2 className="w-5 h-5 text-brand-red" /> :
                                        activeTab === 'users' ? <Users className="w-5 h-5 text-brand-red" /> :
                                            activeTab === 'plans' ? <Zap className="w-5 h-5 text-brand-red" /> :
                                                activeTab === 'ads' ? <Megaphone className="w-5 h-5 text-brand-red" /> :
                                                    activeTab === 'reports' && reportsSubTab === 'moderation' ? <Flag className="w-5 h-5 text-brand-red" /> :
                                                        activeTab === 'system' ? <TerminalIcon className="w-5 h-5 text-blue-500" /> :
                                                            activeTab === 'analytics' ? <Eye className="w-5 h-5 text-blue-500" /> :
                                                            <LineChart className="w-5 h-5 text-blue-500" />}
                                    {activeTab === 'centers' ? 'Base de Datos de Centros' :
                                        activeTab === 'users' ? 'Directorio de Atletas' :
                                            activeTab === 'plans' ? 'Configuración de Planes' :
                                                activeTab === 'ads' ? 'Gestión Publicitaria' :
                                                    activeTab === 'reports' && reportsSubTab === 'moderation' ? 'Reportes de Moderación' :
                                                        activeTab === 'system' ? (systemSubTab === 'terminal' ? 'Sistema en Tiempo Real' : systemSubTab === 'audit' ? 'Registro de Auditoría' : 'Control Financiero') :
                                                            activeTab === 'analytics' ? 'Visualizaciones y Visitas' :
                                                            'Inteligencia y Retención'}
                                </h3>
                                <div className="flex items-center gap-4">
                                    {activeTab !== 'analytics' && (
                                    <span className="text-xs font-mono text-gray-500">
                                        {activeTab === 'centers' ? filteredCenters.length :
                                            activeTab === 'users' ? filteredUsers.length :
                                                activeTab === 'plans' ? plans.length :
                                                    activeTab === 'ads' ? ads.length :
                                                        activeTab === 'system' ? (systemSubTab === 'terminal' ? systemActivity.length : systemSubTab === 'audit' ? auditLogs.length : financeData.sales.length) :
                                                            reports.length} REGISTROS
                                    </span>
                                    )}
                                    {(activeTab === 'plans' || activeTab === 'ads') && (
                                        <button
                                            onClick={handleAdd}
                                            className="bg-brand-red hover:bg-brand-accent text-white p-1.5 rounded-lg transition-all shadow-lg active:scale-95"
                                            title={activeTab === 'plans' ? "Crear Nuevo Plan" : "Nuevo Anuncio"}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {activeTab === 'reports' && reportsSubTab === 'intelligence' && (
                                <div className="p-6">
                                    <ManagementIntelligence />
                                </div>
                            )}

                            {activeTab === 'system' && systemSubTab === 'terminal' && (
                                <div className="p-6">
                                    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl overflow-hidden h-[500px] shadow-2xl">
                                        <TerminalActivity activities={systemActivity} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'analytics' && (
                                <div className="p-6">
                                    <ViewAnalytics />
                                </div>
                            )}

                            {((activeTab !== 'reports' || reportsSubTab !== 'intelligence') && (activeTab !== 'system' || systemSubTab !== 'terminal') && activeTab !== 'analytics') && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-gray-500 uppercase bg-gray-50 dark:bg-white/5 font-black tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4">
                                                    {activeTab === 'centers' ? 'Organización' :
                                                        activeTab === 'users' ? 'Usuario' :
                                                            activeTab === 'plans' ? 'Nombre del Plan' :
                                                                activeTab === 'ads' ? 'Título del Anuncio' :
                                                                    activeTab === 'reports' && reportsSubTab === 'intelligence' ? 'Métrica' :
                                                                        activeTab === 'system' && systemSubTab === 'audit' ? 'Acción' :
                                                                            activeTab === 'system' && systemSubTab === 'finance' ? 'Referencia' :
                                                                                'Tipo de Reporte'}
                                                </th>
                                                <th className="px-6 py-4">
                                                    {activeTab === 'centers' || activeTab === 'users' ? 'Plan / Tier' :
                                                        activeTab === 'plans' ? 'Precio' :
                                                            activeTab === 'ads' ? 'Estadísticas' :
                                                                activeTab === 'reports' && reportsSubTab === 'intelligence' ? 'Valor' :
                                                                    activeTab === 'system' && systemSubTab === 'audit' ? 'Target / Admin' :
                                                                        activeTab === 'system' && systemSubTab === 'finance' ? 'Importe' :
                                                                            'Usuario Reportado'}
                                                </th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                            {activeTab === 'centers' ? (
                                                filteredCenters.map((center) => (
                                                    <tr key={center.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4 font-medium">
                                                            <Link href={`/gym/${center.id}`} className="flex items-center gap-3 group/link">
                                                                <div className="w-8 h-8 rounded bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {center.logo_url ? (
                                                                        <Image src={center.logo_url} width={32} height={32} alt={center.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Building2 className="w-4 h-4 text-gray-500" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="text-foreground group-hover/link:text-brand-red transition-colors font-bold">{center.name}</div>
                                                                    <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{center.city || 'N/A'}, {center.country}</div>
                                                                </div>
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <PlanBadge plan={center.plan || 'free'} type="center" />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => setEditingCenter(center)}
                                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : activeTab === 'users' ? (
                                                filteredUsers.map((user) => (
                                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4 font-medium">
                                                            <Link href={user.username ? `/dashboard/profile/${user.username}` : `/dashboard/admin`} className="flex items-center gap-3 group/link">
                                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                                    {user.avatar_url ? (
                                                                        <Image src={user.avatar_url} width={32} height={32} alt={user.full_name || 'U'} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <User className="w-4 h-4 text-gray-500" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="text-foreground group-hover/link:text-brand-red transition-colors font-bold">{user.full_name || 'Usuario'}</div>
                                                                    <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{user.email}</div>
                                                                </div>
                                                            </Link>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <PlanBadge plan={user.subscription_tier || 'free'} type="user" />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => setEditingUser(user)}
                                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                                                >
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${user.full_name || user.email}? Esta acción no se puede deshacer.`)) {
                                                                            try {
                                                                                await deleteUser(user.id);
                                                                                await refreshData();
                                                                                alert('Usuario eliminado correctamente.');
                                                                            } catch (error: any) {
                                                                                alert('Error al eliminar usuario: ' + error.message);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                                                                    title="Eliminar Usuario"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : activeTab === 'plans' ? (
                                                plans.map((plan) => (
                                                    <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4 font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded bg-brand-red/10 flex items-center justify-center shrink-0">
                                                                    <Zap className="w-4 h-4 text-brand-red" />
                                                                </div>
                                                                <div className="text-foreground font-bold">{plan.name}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-brand-red font-black">
                                                            {plan.price}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => setEditingPlan(plan)}
                                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm(`¿Seguro que deseas eliminar el plan ${plan.name}?`)) {
                                                                            try {
                                                                                await deleteApplicationPlan(plan.id);
                                                                                await refreshData();
                                                                            } catch (err: any) {
                                                                                alert('Error al eliminar plan: ' + err.message);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : activeTab === 'ads' ? (
                                                ads.map((ad) => (
                                                    <tr key={ad.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div
                                                                className="flex items-center gap-3 cursor-pointer group/item"
                                                                onClick={() => setEditingAd(ad)}
                                                            >
                                                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-white/10 group-hover/item:border-brand-red transition-colors">
                                                                    <img src={ad.image_url} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-foreground font-bold group-hover/item:text-brand-red transition-colors">{ad.title}</div>
                                                                    <div className="text-[10px] text-gray-500 uppercase">{ad.placement}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-4 text-xs font-mono">
                                                                <div className="flex items-center gap-1 text-blue-500"><Eye className="w-3 h-3" /> {ad.views_count || 0}</div>
                                                                <div className="flex items-center gap-1 text-brand-red"><MousePointer2 className="w-3 h-3" /> {ad.clicks_count || 0}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleAd(ad.id, !ad.is_active).then(refreshData);
                                                                    }}
                                                                    className={cn("p-1.5 rounded-lg transition-colors", ad.is_active ? "text-green-500 hover:bg-green-500/10" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10")}
                                                                >
                                                                    <Zap className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingAd(ad)}
                                                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => { if (confirm('¿Eliminar este anuncio?')) { await deleteAd(ad.id); refreshData(); } }}
                                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : activeTab === 'reports' ? (
                                                reportsSubTab === 'moderation' ? (
                                                    reports.map((report) => (
                                                        <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                            <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                                                    <Flag className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="className text-foreground font-bold">{report.reason}</div>
                                                                    <div className="text-[10px] text-gray-500">Por: {report.reporter?.full_name || 'Alguien'}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-foreground font-mono text-xs">
                                                                ID: {report.target_id?.substring(0, 8)}...
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => setReviewingReport(report)}
                                                                    className="px-3 py-1 bg-brand-red/10 text-brand-red rounded text-[10px] font-black uppercase hover:bg-brand-red hover:text-white transition-all shadow-sm"
                                                                >
                                                                    Revisar
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <>
                                                        {businessStats.topPages.map((page: any, i: number) => (
                                                            <tr key={`page-${i}`} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                                <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                                    <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-black">
                                                                        {i + 1}
                                                                    </div>
                                                                    <div className="text-foreground">Página: {page.path}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-blue-500 font-black">
                                                                    {page.count} VISITAS
                                                                </td>
                                                                <td className="px-6 py-4 text-right text-[10px] text-gray-500 uppercase tracking-widest font-black">Populares</td>
                                                            </tr>
                                                        ))}
                                                        {businessStats.churn.map((log: any, i: number) => (
                                                            <tr key={`churn-${i}`} className="hover:bg-red-500/5 transition-colors">
                                                                <td className="px-6 py-4 font-medium flex items-center gap-3 text-red-500">
                                                                    <ZapOff className="w-4 h-4" />
                                                                    <div>
                                                                        <div className="font-bold">{log.profiles?.full_name || 'Desconocido'}</div>
                                                                        <div className="text-[10px] text-gray-500 uppercase">{log.event_type}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                                        {log.old_tier} → {log.new_tier}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right text-[10px] text-red-500 uppercase font-black">Churn log</td>
                                                            </tr>
                                                        ))}
                                                    </>
                                                )
                                            ) : activeTab === 'system' ? (
                                                systemSubTab === 'terminal' ? (
                                                    null
                                                ) : systemSubTab === 'audit' ? (
                                                    auditLogs.map((log) => (
                                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                            <td className="px-6 py-4 font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                                    <div className="className text-foreground font-bold uppercase text-[11px] tracking-wider">{log.action_type.replace(/_/g, ' ')}</div>
                                                                </div>
                                                                <div className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(log.created_at).toLocaleString()}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-[10px] text-foreground font-bold">{log.target_type}: {log.target_id?.substring(0, 8)}</div>
                                                                <div className="text-[9px] text-purple-600 font-mono">{log.admin?.email}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{JSON.stringify(log.details)}</div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    financeData.sales.map((sale: any) => (
                                                        <tr key={sale.id} className="hover:bg-emerald-500/5 transition-colors">
                                                            <td className="px-6 py-4 font-medium flex items-center gap-3">
                                                                <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-500">
                                                                    <CreditCard className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold">Pago: {sale.organizations?.name}</div>
                                                                    <div className="text-[10px] text-gray-500">{new Date(sale.created_at).toLocaleDateString()}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-emerald-600 font-black">
                                                                +{sale.amount}€
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-[10px] text-gray-400 font-mono">
                                                                S_REF_{sale.id.substring(0, 8)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500 italic">No se encontraron registros en esta sección.</td>
                                                </tr>
                                            )}
                                            {(activeTab === 'centers' ? filteredCenters :
                                                activeTab === 'users' ? filteredUsers :
                                                    activeTab === 'plans' ? plans :
                                                        activeTab === 'ads' ? ads :
                                                            reports).length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                                            No hay registros disponibles en esta sección.
                                                        </td>
                                                    </tr>
                                                )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Support & Tools */}
                    <div className="space-y-6">
                        {/* Revenue/Growth Panel (Simplified Visual) */}
                        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 rounded-3xl p-6 relative overflow-hidden group transition-colors duration-300 shadow-sm dark:shadow-none">
                            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                <TrendingUp className="w-16 h-16 text-brand-red/10" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Crecimiento Mensual</h3>
                            <div className="text-4xl font-heading font-black italic text-foreground mb-6 transition-colors duration-300">
                                +24.5% <span className="text-sm not-italic font-sans text-green-500 font-bold">vs last month</span>
                            </div>
                            <div className="h-24 flex items-end gap-1.5">
                                {[40, 65, 45, 78, 55, 80, 70, 95, 60, 85].map((h, i) => (
                                    <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gray-200 dark:bg-white/10 hover:bg-brand-red transition-colors rounded-t-sm" />
                                ))}
                            </div>
                        </div>

                        {/* Support Inbox */}
                        <div className="h-[450px]">
                            <SupportInbox tickets={tickets} onUpdate={refreshData} />
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsBroadcasting(true)}
                                className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 hover:bg-brand-red hover:text-white dark:hover:text-white hover:border-brand-red transition-all p-4 rounded-3xl flex flex-col items-center justify-center gap-3 group h-32 text-muted-foreground font-bold shadow-sm dark:shadow-none"
                            >
                                <Zap className="w-8 h-8 text-brand-red group-hover:text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover:text-white transition-colors">Broadcast Global</span>
                            </button>
                            <button
                                onClick={async () => {
                                    const type = confirm('¿Exportar base de datos de usuarios?') ? 'users' :
                                        confirm('¿Exportar centros?') ? 'centers' : 'workouts';
                                    try {
                                        const csv = await getExportData(type as any);
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `rival_export_${type}_${new Date().toISOString()}.csv`;
                                        a.click();
                                    } catch (err: any) {
                                        alert('Error al exportar: ' + err.message);
                                    }
                                }}
                                className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 hover:bg-blue-600 hover:text-white dark:hover:text-white hover:border-blue-600 transition-all p-4 rounded-3xl flex flex-col items-center justify-center gap-3 group h-32 text-muted-foreground font-bold shadow-sm dark:shadow-none"
                            >
                                <Download className="w-8 h-8 text-blue-500 group-hover:text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover:text-white transition-colors">Exportar Datos</span>
                            </button>
                        </div>
                    </div>

                </div>
            </main>

            <EditCenterModal
                open={!!editingCenter}
                onClose={() => setEditingCenter(null)}
                center={editingCenter}
                onUpdate={refreshData}
            />

            <EditUserModal
                open={!!editingUser}
                onClose={() => setEditingUser(null)}
                user={editingUser}
                onUpdate={refreshData}
            />

            <EditPlanModal
                open={!!editingPlan}
                onClose={() => setEditingPlan(null)}
                plan={editingPlan}
                onUpdate={refreshData}
            />

            <ReviewReportModal
                open={!!reviewingReport}
                onClose={() => setReviewingReport(null)}
                report={reviewingReport}
                onUpdate={refreshData}
                onAction={async (id, action, type, target) => {
                    await takeModerationAction(id, action, type, target);
                    refreshData();
                }}
            />

            <CreateAdModal
                open={isCreatingAd}
                onClose={() => setIsCreatingAd(false)}
                onUpdate={refreshData}
            />

            <EditAdModal
                open={!!editingAd}
                onClose={() => setEditingAd(null)}
                onUpdate={refreshData}
                ad={editingAd}
            />

            <BroadcastModal
                open={isBroadcasting}
                onClose={() => setIsBroadcasting(false)}
                onSuccess={() => alert('Comunicado enviado con éxito')}
            />
        </div>
    );
}

// Sub-components for cleanliness
const KpiCard = ({ title, value, trend, icon: Icon, color, delay }: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-gray-300 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none"
        >
            <div className={`absolute top-4 right-4 p-2 rounded-lg bg-gray-100 dark:bg-white/5 ${color} opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{title}</h3>
            <div className="text-3xl font-heading font-black italic text-foreground mb-2 transition-colors duration-300">{value}</div>
            <div className={`text-xs font-bold ${color.replace('text-', 'text-opacity-80-')} flex items-center gap-1`}>
                <TrendingUp className="w-3 h-3" /> {trend}
            </div>
        </motion.div>
    );
}

function PlanBadge({ plan, type }: { plan: string, type: 'center' | 'user' }) {
    // Center Plans: free, starter, pro
    // User Plans: free, premium, elite
    const isPaid = plan !== 'free' && plan;

    // Customize colors
    let colorClass = "bg-gray-200 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-500/20";
    if (plan === 'starter' || plan === 'premium') colorClass = "bg-brand-red/10 text-brand-red border-brand-red/20";
    if (plan === 'pro' || plan === 'elite') colorClass = "bg-purple-500/10 text-purple-500 border-purple-500/20";

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-black tracking-wide border ${colorClass}`}>
            {plan || 'Free'}
        </span>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <div className="flex items-center gap-2 text-black dark:text-white transition-colors duration-300">
            <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-gray-400 dark:bg-gray-600'}`} />
            <span className={`${active ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'} font-bold text-xs uppercase tracking-tighter`}>
                {active ? 'Activo' : 'Inactivo'}
            </span>
        </div>
    );
}
