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
    Edit2
} from 'lucide-react';
import { getAdminStats, getRecentOrganizations, getAllUsers } from './actions';
import { getSupportTickets } from './support-actions';
import { getModerationReports, takeModerationAction } from './report-actions';
import { getAds, toggleAd, deleteAd, updateAd } from './ad-actions';
import CreateAdModal from './CreateAdModal';
import EditAdModal from './EditAdModal';
import { Megaphone, ExternalLink, Eye, MousePointer2 } from 'lucide-react';
import SupportInbox from './SupportInbox';
import EditCenterModal from './EditCenterModal';
import EditUserModal from './EditUserModal';
import ReviewReportModal from './ReviewReportModal';
import EditPlanModal from './EditPlanModal';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils'; // Use utils for conditional classes

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>({ users: 0, centers: 0, workouts: 0, mrr: 0 });
    const [centers, setCenters] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState<'centers' | 'users' | 'plans' | 'reports' | 'ads'>('centers');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPlan, setFilterPlan] = useState('all');

    // Modals
    const [editingCenter, setEditingCenter] = useState<any>(null);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [reviewingReport, setReviewingReport] = useState<any>(null);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [editingAd, setEditingAd] = useState<any>(null);
    const [isCreatingAd, setIsCreatingAd] = useState(false);

    const handleAdd = () => {
        if (activeTab === 'plans') setEditingPlan({});
        else if (activeTab === 'ads') setIsCreatingAd(true);
        else if (activeTab === 'centers') alert('Para crear un centro, usa el flujo de registro de Sedes.');
        else if (activeTab === 'users') alert('Para crear un usuario, usa el flujo de registro público.');
        else if (activeTab === 'reports') alert('Los reportes son generados automáticamente por la comunidad.');
    };

    async function refreshData() {
        const [statsData, centersData, usersData, ticketsData, reportsData, adsData] = await Promise.all([
            getAdminStats(),
            getRecentOrganizations(),
            getAllUsers(),
            getSupportTickets(),
            getModerationReports(),
            getAds()
        ]);
        setStats(statsData);
        setCenters(centersData);
        setUsers(usersData || []);
        setTickets(ticketsData || []);
        setReports(reportsData || []);
        setAds(adsData || []);
    }

    useEffect(() => {
        async function loadData() {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                const adminEmails = ['gomezsantiagojesus@icloud.com', 'jesusgomez.s@hotmail.com'];
                if (!user || !adminEmails.includes(user.email || '')) {
                    window.location.href = '/dashboard';
                    return;
                }

                await refreshData();
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

    // Mock Data for new tabs (In real app, fetch from DB)
    const mockPlans = [
        { id: 1, name: 'Starter (Centro)', price: '49.99€', features: 'Hasta 50 miembros, 10 clases/sem', type: 'center', planKey: 'starter' },
        { id: 2, name: 'Pro (Centro)', price: '99.99€', features: 'Ilimitado, WOD Generator', type: 'center', planKey: 'pro' },
        { id: 3, name: 'Premium (Atleta)', price: '4.99€', features: 'Sin anuncios, Analíticas Pro', type: 'user', planKey: 'premium' },
        { id: 4, name: 'Elite (Atleta)', price: '9.99€', features: 'Coach 1-a-1, Acceso Global', type: 'user', planKey: 'elite' },
    ];



    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black text-brand-red font-black uppercase tracking-widest animate-pulse">
            Iniciando Protocolo de Mando...
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand-red selection:text-black">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-red flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-heading font-black italic uppercase tracking-tighter">Rival <span className="text-brand-red">Command</span></h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Panel de Control Global</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                        <span className="text-xs font-mono text-green-500">SYSTEM ONLINE</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-12">

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
                        title="Entrenamientos"
                        value={stats.workouts}
                        trend="+1.2k"
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
                            <div className="flex p-1 bg-white/5 rounded-xl self-start overflow-x-auto max-w-full no-scrollbar">
                                <button
                                    onClick={() => setActiveTab('centers')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'centers' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    Centros
                                </button>
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'users' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    Atletas
                                </button>
                                <button
                                    onClick={() => setActiveTab('plans')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'plans' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    Planes
                                </button>
                                <button
                                    onClick={() => setActiveTab('ads')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'ads' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    Publicidad
                                </button>
                                <button
                                    onClick={() => setActiveTab('reports')}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                                        activeTab === 'reports' ? "bg-brand-red text-white shadow-lg" : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    Reportes
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                                <div className="relative group flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-[#0a0a0a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-brand-red outline-none w-full sm:w-48 xl:w-64 transition-all"
                                    />
                                </div>
                                <select
                                    value={filterPlan}
                                    onChange={(e) => setFilterPlan(e.target.value)}
                                    className="bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-400 focus:border-brand-red outline-none appearance-none cursor-pointer hover:text-white transition-colors w-full sm:w-auto min-w-[140px]"
                                >
                                    <option value="all">Todos los Planes</option>
                                    <option value="free">Free</option>
                                    <option value={activeTab === 'centers' ? 'starter' : 'premium'}>{activeTab === 'centers' ? 'Starter' : 'Premium'}</option>
                                    <option value={activeTab === 'centers' ? 'pro' : 'elite'}>{activeTab === 'centers' ? 'Pro' : 'Elite'}</option>
                                </select>
                            </div>
                        </div>

                        {/* DATA TABLE */}
                        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden min-h-[400px]">
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-lg font-bold italic uppercase flex items-center gap-2">
                                    {activeTab === 'centers' ? <Building2 className="w-5 h-5 text-brand-red" /> :
                                        activeTab === 'users' ? <Users className="w-5 h-5 text-brand-red" /> :
                                            activeTab === 'plans' ? <Zap className="w-5 h-5 text-brand-red" /> :
                                                activeTab === 'ads' ? <Megaphone className="w-5 h-5 text-brand-red" /> :
                                                    <Flag className="w-5 h-5 text-brand-red" />}
                                    {activeTab === 'centers' ? 'Base de Datos de Centros' :
                                        activeTab === 'users' ? 'Directorio de Atletas' :
                                            activeTab === 'plans' ? 'Configuración de Planes' :
                                                activeTab === 'ads' ? 'Gestión Publicitaria' :
                                                    'Reportes de Moderación'}
                                </h3>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-mono text-gray-500">
                                        {activeTab === 'centers' ? filteredCenters.length :
                                            activeTab === 'users' ? filteredUsers.length :
                                                activeTab === 'plans' ? mockPlans.length :
                                                    activeTab === 'ads' ? ads.length :
                                                        reports.length} REGISTROS
                                    </span>
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

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] text-gray-500 uppercase bg-white/5 font-black tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">
                                                {activeTab === 'centers' ? 'Organización' :
                                                    activeTab === 'users' ? 'Usuario' :
                                                        activeTab === 'plans' ? 'Nombre del Plan' :
                                                            activeTab === 'ads' ? 'Título del Anuncio' :
                                                                'Tipo de Reporte'}
                                            </th>
                                            <th className="px-6 py-4">
                                                {activeTab === 'centers' || activeTab === 'users' ? 'Plan / Tier' :
                                                    activeTab === 'plans' ? 'Precio' :
                                                        activeTab === 'ads' ? 'Estadísticas' :
                                                            'Usuario Reportado'}
                                            </th>
                                            <th className="px-6 py-4">
                                                {activeTab === 'reports' ? 'Objetivo' : 'Estado'}
                                            </th>
                                            <th className="px-6 py-4">
                                                {activeTab === 'centers' ? 'Ingresos' :
                                                    activeTab === 'users' ? 'Nivel' :
                                                        activeTab === 'ads' ? 'Fecha Creación' :
                                                            activeTab === 'plans' ? 'Características' :
                                                                'Fecha'}
                                            </th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {activeTab === 'centers' ? (
                                            filteredCenters.map((center) => (
                                                <tr key={center.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4 font-medium">
                                                        <Link href={`/gym/${center.id}`} className="flex items-center gap-3 group/link">
                                                            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                                {center.logo_url ? (
                                                                    <Image src={center.logo_url} width={32} height={32} alt={center.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Building2 className="w-4 h-4 text-gray-500" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-white group-hover/link:text-brand-red transition-colors font-bold">{center.name}</div>
                                                                <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{center.city || 'N/A'}, {center.country}</div>
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <PlanBadge plan={center.plan || 'free'} type="center" />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge active={true} />
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-300 font-mono">
                                                        {center.plan === 'pro' ? '99.99€' : center.plan === 'starter' ? '49.99€' : '0.00€'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setEditingCenter(center)}
                                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : activeTab === 'users' ? (
                                            filteredUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4 font-medium">
                                                        <Link href={`/dashboard/profile/${user.username || user.id}`} className="flex items-center gap-3 group/link">
                                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                                {user.avatar_url ? (
                                                                    <Image src={user.avatar_url} width={32} height={32} alt={user.full_name || 'U'} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User className="w-4 h-4 text-gray-500" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="text-white group-hover/link:text-brand-red transition-colors font-bold">{user.full_name || 'Usuario'}</div>
                                                                <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{user.email}</div>
                                                            </div>
                                                        </Link>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <PlanBadge plan={user.subscription_tier || 'free'} type="user" />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge active={true} />
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-300 font-mono text-xs">
                                                        Lvl {user.level || '1'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setEditingUser(user)}
                                                            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                                                        >
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : activeTab === 'plans' ? (
                                            mockPlans.map((plan) => (
                                                <tr key={plan.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4 font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded bg-brand-red/10 flex items-center justify-center shrink-0">
                                                                <Zap className="w-4 h-4 text-brand-red" />
                                                            </div>
                                                            <div className="text-white font-bold">{plan.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-brand-red font-black">
                                                        {plan.price}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <StatusBadge active={true} />
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                                        {plan.features}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setEditingPlan(plan)}
                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => { if (confirm('¿Seguro que deseas eliminar este plan?')) alert('Plan eliminado (Simulado)'); }}
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
                                                <tr key={ad.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div
                                                            className="flex items-center gap-3 cursor-pointer group/item"
                                                            onClick={() => setEditingAd(ad)}
                                                        >
                                                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10 group-hover/item:border-brand-red transition-colors">
                                                                <img src={ad.image_url} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-white leading-none mb-1 group-hover/item:text-brand-red transition-colors">{ad.title}</div>
                                                                <div className="text-[10px] text-gray-500 uppercase font-black truncate max-w-[150px]">{ad.description}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-[10px] text-gray-400 flex items-center gap-1.5"><Eye className="w-3 h-3" /> {ad.views_count} vistas</div>
                                                            <div className="text-[10px] text-gray-400 flex items-center gap-1.5"><MousePointer2 className="w-3 h-3" /> {ad.clicks_count} clics</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleAd(ad.id, ad.is_active).then(refreshData);
                                                            }}
                                                            title={ad.is_active ? "Pausar" : "Activar"}
                                                            className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all",
                                                                ad.is_active ? "bg-green-500 text-black hover:bg-yellow-500" : "bg-white/10 text-gray-500 hover:text-white hover:bg-white/20"
                                                            )}
                                                        >
                                                            {ad.is_active ? 'Activo' : 'Pausado'}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 text-[10px] font-mono text-gray-500">
                                                        {new Date(ad.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setEditingAd(ad)}
                                                                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            {ad.link_url && (
                                                                <a href={ad.link_url} target="_blank" className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => { if (confirm('Eliiminar anuncio?')) deleteAd(ad.id).then(refreshData) }}
                                                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            reports.map((report) => (
                                                <tr key={report.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-4 font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                report.severity === 'high' ? "bg-red-500 animate-ping" : "bg-yellow-500"
                                                            )} />
                                                            <div className="text-white font-bold">{report.type}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-300">
                                                        @{report.user}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                            report.status === 'Pending' ? "bg-yellow-500/20 text-yellow-500" : "bg-green-500/20 text-green-500"
                                                        )}>
                                                            {report.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 text-xs text-mono uppercase tracking-tighter">
                                                        {report.target} · {report.date}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setReviewingReport(report)}
                                                            className="bg-white/5 hover:bg-brand-red px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Revisar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        {(activeTab === 'centers' ? filteredCenters :
                                            activeTab === 'users' ? filteredUsers :
                                                activeTab === 'plans' ? mockPlans :
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
                        </div>
                    </div>

                    {/* Right Column: Support & Tools */}
                    <div className="space-y-6">
                        {/* Revenue/Growth Panel (Simplified Visual) */}
                        <div className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                <TrendingUp className="w-16 h-16 text-brand-red/10" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Crecimiento Mensual</h3>
                            <div className="text-4xl font-heading font-black italic text-white mb-6">
                                +24.5% <span className="text-sm not-italic font-sans text-green-500 font-bold">vs last month</span>
                            </div>
                            <div className="h-24 flex items-end gap-1.5">
                                {[40, 65, 45, 78, 55, 80, 70, 95, 60, 85].map((h, i) => (
                                    <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-white/10 hover:bg-brand-red transition-colors rounded-t-sm" />
                                ))}
                            </div>
                        </div>

                        {/* Support Inbox */}
                        <div className="h-[450px]">
                            <SupportInbox tickets={tickets} />
                        </div>

                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button className="bg-[#0a0a0a] border border-white/5 hover:bg-brand-red hover:text-white hover:border-brand-red transition-all p-4 rounded-3xl flex flex-col items-center justify-center gap-3 group h-32">
                                <Zap className="w-8 h-8 text-brand-red group-hover:text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Broadcast Global</span>
                            </button>
                            <button className="bg-[#0a0a0a] border border-white/5 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all p-4 rounded-3xl flex flex-col items-center justify-center gap-3 group h-32">
                                <Download className="w-8 h-8 text-blue-500 group-hover:text-white" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Exportar Datos</span>
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
                onUpdate={() => { }} // Simulated update
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
        </div>
    );
}

// Sub-components for cleanliness
function KpiCard({ title, value, trend, icon: Icon, color, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors"
        >
            <div className={`absolute top-4 right-4 p-2 rounded-lg bg-white/5 ${color} opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all`}>
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">{title}</h3>
            <div className="text-3xl font-heading font-black italic text-white mb-2">{value}</div>
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
    let colorClass = "bg-gray-500/10 text-gray-400 border-gray-500/20";
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
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-gray-500'}`} />
            <span className={`${active ? 'text-green-500' : 'text-gray-500'} font-bold text-xs`}>
                {active ? 'Active' : 'Inactive'}
            </span>
        </div>
    );
}
