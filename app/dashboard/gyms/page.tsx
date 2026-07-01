"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Building2, MapPin, Users, User, ArrowRight, ArrowLeft, Loader2, Sun, Moon, Search, Check, Rocket, Zap, Shield, Globe, Instagram, Phone, Trash2, LogOut, Megaphone } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../../ThemeContext";
import { getUserOrganizations, createOrganization, searchOrganizations, deleteOrganization, leaveOrganization, getNearbyOrganizations, checkIsAdmin, getAllProfessionals } from "./actions";
import B2BShareCard from "./B2BShareCard";
import CancellationRequestModal from "./CancellationRequestModal";
import { isProfessional, PROFESSIONAL_TYPES, CENTER_TYPES, getTypeLabel, getTypeIcon } from "@/lib/professional-types";

export default function CenterListPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            </div>
        }>
            <CenterListPageContent />
        </Suspense>
    );
}

function ProTypeFilter({ proTypeFilter, setProTypeFilter }: {
    proTypeFilter: string | null
    setProTypeFilter: (v: string | null) => void
}) {
    const [open, setOpen] = useState(false)
    const selected = proTypeFilter ? PROFESSIONAL_TYPES[proTypeFilter] : null

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Always-visible: TODOS + active filter chip */}
            <button
                onClick={() => { setProTypeFilter(null); setOpen(false) }}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${!proTypeFilter ? 'bg-brand-red text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
                Todos
            </button>

            {selected && (
                <button
                    onClick={() => setProTypeFilter(null)}
                    className="px-3.5 py-1.5 rounded-full text-[10px] font-bold bg-brand-red text-white flex items-center gap-1.5 shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                >
                    <span>{selected.icon}</span>
                    {selected.label}
                    <span className="ml-0.5 opacity-70">✕</span>
                </button>
            )}

            {/* Toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all border ${open ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/8 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
                {open ? 'Ocultar' : 'Ver especialidades'}
                <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {/* Expandable grid */}
            {open && (
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {Object.entries(PROFESSIONAL_TYPES).map(([key, { label, icon }]) => (
                        <button
                            key={key}
                            onClick={() => { setProTypeFilter(proTypeFilter === key ? null : key); setOpen(false) }}
                            className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 text-left ${proTypeFilter === key ? 'bg-brand-red text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}`}
                        >
                            <span className="text-base leading-none shrink-0">{icon}</span>
                            <span className="truncate">{label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function CenterListPageContent() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState('free');
    const [showCreate, setShowCreate] = useState(false);
    const [showMarketing, setShowMarketing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [cancellationTarget, setCancellationTarget] = useState<{ id: string; name: string; type: 'gym' | 'professional' } | null>(null);
    const { theme } = useTheme();
    const searchParams = useSearchParams();
    const filterType = searchParams.get('type');
    const isProTab = filterType === 'personal_trainer';

    // Professional sub-filter
    const [proTypeFilter, setProTypeFilter] = useState<string | null>(null);

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // All professionals directory
    const [allProfessionals, setAllProfessionals] = useState<any[]>([]);

    // Geolocation & Nearby Orgs
    const [nearbyOrgs, setNearbyOrgs] = useState<any[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [newOrgLat, setNewOrgLat] = useState<number | null>(null);
    const [newOrgLng, setNewOrgLng] = useState<number | null>(null);
    const [isCapturingLoc, setIsCapturingLoc] = useState(false);
    const [fieldValues, setFieldValues] = useState({
        name: '', city: '', country: '', address: '', zip_code: '',
        type: isProTab ? 'personal_trainer' : 'cross_training',
    });


    const PLANS = [
        {
            id: 'free',
            name: 'Rival Free',
            price: '0€',
            description: 'Para centros que empiezan su legado.',
            icon: <Zap className="w-6 h-6 text-yellow-500" />,
            features: ['Perfil público', 'Hasta 10 clases/semana', 'Hasta 50 miembros', 'Chat básico', 'Check-in manual']
        },
        {
            id: 'starter',
            name: 'Rival Starter',
            price: '49.99€',
            description: 'Lanzamiento: Primeros 50 centros.',
            icon: <Rocket className="w-6 h-6 text-brand-red" />,
            features: ['Todo en Free', 'Clases ilimitadas', 'Sistema de pruebas', 'Tienda básica', 'Google Calendar sync']
        },
        {
            id: 'pro',
            name: 'Rival Pro',
            price: '99.99€',
            description: 'Lanzamiento: Primeros 50 centros.',
            icon: <Shield className="w-6 h-6 text-purple-500" />,
            features: ['Todo en Starter', 'WOD Generator', 'Churn Prediction', 'Benchmarking Competitivo', 'Tienda avanzada']
        }
    ];

    const PT_PLANS = [
        {
            id: 'pt_free',
            name: 'Profesional Basic',
            price: '€0',
            description: 'Gestiona tus primeros alumnos gratis.',
            features: ['Perfil público', 'Hasta 3 alumnos', 'Programación Manual', 'Agenda Básica', 'Pagos Manuales'],
            cta: 'Plan Actual',
            color: 'gray'
        },
        {
            id: 'pt_pro',
            name: 'Profesional Pro',
            price: '€29.99',
            period: '/mes',
            description: 'Para profesionales en crecimiento.',
            features: ['Alumnos ilimitados', 'Programación con IA', 'Pagos integrados (Stripe)', 'Agenda Avanzada', 'Chat directo'],
            cta: 'Mejorar a Pro',
            highlight: true,
            color: 'brand-red'
        },
        {
            id: 'pt_elite',
            name: 'Profesional Elite',
            price: '€59.99',
            period: '/mes',
            description: 'Automatiza tu negocio al 100%.',
            features: ['Todo en Pro', 'App personalizada (PWA)', 'Análisis de retención', 'Soporte prioritario 24/7', 'Web Personalizada'],
            cta: 'Obtener Elite',
            color: 'purple'
        }
    ];

    useEffect(() => {
        loadOrgs();
    }, []);

    // Search Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setIsSearching(true);
                const results = await searchOrganizations(searchTerm);
                const filtered = results.filter(o =>
                    isProTab
                        ? isProfessional(o.center_type) && (!proTypeFilter || o.center_type === proTypeFilter)
                        : !isProfessional(o.center_type)
                );
                setSearchResults(filtered);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchTerm, filterType]);

    async function loadOrgs() {
        const [data, adminStatus] = await Promise.all([
            getUserOrganizations(),
            checkIsAdmin()
        ]);
        setOrgs(data);
        setIsAdmin(adminStatus);
        setLoading(false);
    }

    // Load all professionals when on pro tab
    useEffect(() => {
        if (isProTab) {
            getAllProfessionals(proTypeFilter).then(setAllProfessionals);
        }
    }, [isProTab, proTypeFilter]);

    const requestLocation = (showAlert: boolean = true) => {
        if (!navigator.geolocation) {
           if (showAlert) alert("La geolocalización no está soportada por tu navegador.");
            return;
        }

        setIsLocating(true);
        console.log("📍 Iniciando rastreo de ubicación...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log("✅ Ubicación capturada:", latitude, longitude);
                setUserLocation({ lat: latitude, lng: longitude });
                const nearby = await getNearbyOrganizations(latitude, longitude);
                setNearbyOrgs(nearby);
                setIsLocating(false);
            },
            (error) => {
                console.error("❌ Error al obtener ubicación:", error.code, error.message);
                setIsLocating(false);
                if (showAlert) {
                    if (error.code === error.PERMISSION_DENIED) {
                        alert("Acceso denegado. Aunque el navegador tenga permiso, revisa si la 'Ubicación' está activada en la Configuración de Privacidad de tu sistema (Windows/macOS).");
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        alert("Información de ubicación no disponible. Inténtalo de nuevo en unos momentos.");
                    } else if (error.code === error.TIMEOUT) {
                         alert("La solicitud ha expirado. Asegúrate de tener buena conexión e inténtalo de nuevo.");
                    } else {
                        alert("No pudimos captar tu ubicación. Error: " + error.message);
                    }
                }
            },
            { 
                enableHighAccuracy: true, 
                timeout: 20000, 
                maximumAge: 0 
            }
        );
    };

    useEffect(() => {
        if ("geolocation" in navigator) {
            // Intentar obtener la ubicación en segundo plano al cargar, de forma silenciosa.
            requestLocation(false);
        }
    }, []);

    const captureCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setIsCapturingLoc(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setNewOrgLat(position.coords.latitude);
                setNewOrgLng(position.coords.longitude);
                setIsCapturingLoc(false);
            },
            (error) => {
                setIsCapturingLoc(false);
                if (error.code === error.PERMISSION_DENIED) {
                    alert("No se pudo obtener la ubicación porque el acceso fue denegado. Por favor, actívala en tu navegador.");
                } else if (error.code === error.TIMEOUT) {
                    alert("La solicitud ha expirado. Asegúrate de tener buena señal GPS.");
                } else {
                    alert("No se pudo obtener la ubicación actual.");
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    async function handleCreate(formData: FormData) {
        setIsCreating(true);
        // Ensure plan is included
        formData.append('plan', selectedPlan);
        const res = await createOrganization(formData);
        setIsCreating(false);
        if (res.error) {
            alert(res.error);
        } else {
            setShowCreate(false);
            setStep(1);
            loadOrgs();
        }
    }

    async function handleDelete(id: string, name: string) {
        if (confirm(`¿Estás seguro de que quieres ELIMINAR el centro "${name}"? Esta acción no se puede deshacer.`)) {
            const res = await deleteOrganization(id);
            if (res.error) alert(res.error);
            else loadOrgs();
        }
    }

    async function handleLeave(id: string, name: string) {
        if (confirm(`¿Estás seguro de que quieres desafiliarte de "${name}"?`)) {
            const res = await leaveOrganization(id);
            if (res.error) alert(res.error);
            else loadOrgs();
        }
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center min-h-[50vh] ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
                <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            </div>
        );
    }

    // Theme Classes
    const bgMain = theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';
    const bgCard = theme === 'dark' ? 'bg-brand-gray border-white/5' : 'bg-white border-gray-200 shadow-sm';
    const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const textHeading = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const bgInput = theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-black';

    return (
        <div className={`min-h-screen p-6 transition-colors duration-300 ${bgMain}`}>

            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className={`text-3xl font-heading font-black italic uppercase ${textHeading}`}>
                            {isProTab ? (proTypeFilter ? getTypeLabel(proTypeFilter) : 'Profesionales') : 'Centros'}
                        </h1>
                        <p className={textMuted}>
                            {isProTab
                                ? 'Gestiona tus clientes o descubre nuevos profesionales del sector.'
                                : 'Gestiona tus centros o explora nuevos campos de batalla cercanos.'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 w-fit">
                            <Link
                                href="/dashboard/gyms"
                                onClick={() => setProTypeFilter(null)}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${!isProTab ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                Centros
                            </Link>
                            <Link
                                href="/dashboard/gyms?type=personal_trainer"
                                onClick={() => setProTypeFilter(null)}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${isProTab ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                Profesionales
                            </Link>
                        </div>

                        {/* Professional type filter — collapsed by default */}
                        {isProTab && (
                            <ProTypeFilter
                                proTypeFilter={proTypeFilter}
                                setProTypeFilter={setProTypeFilter}
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className={`relative flex-1 md:w-80 group transition-all focus-within:w-96`}>
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted} group-focus-within:text-brand-red transition-colors`} />
                            <input
                                type="text"
                                placeholder="Buscar gimnasio por nombre o ciudad..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none border transition-all ${bgInput} focus:border-brand-red focus:shadow-[0_0_20px_rgba(220,38,38,0.2)]`}
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-red" />
                            )}
                        </div>

                        {isAdmin && (
                            <button
                                onClick={() => setShowMarketing(true)}
                                className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl border border-white/10 transition-all active:scale-95"
                                title="Generar Post de Marketing"
                            >
                                <Megaphone className="w-5 h-5 text-brand-red" />
                            </button>
                        )}

                        <button
                            onClick={() => { setShowCreate(true); setStep(1); }}
                            className="bg-brand-red hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-glow whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Afiliar</span>
                        </button>
                    </div>
                </div>

                {showMarketing && isAdmin && <B2BShareCard onClose={() => setShowMarketing(false)} isAdmin={isAdmin} />}

                {showCreate && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <div className={`${theme === 'dark' ? 'bg-brand-gray border-white/10' : 'bg-white border-gray-200 shadow-2xl'} border rounded-[32px] max-w-lg w-full relative overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300`}>
                            {/* Progress Guard */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
                                <div
                                    className="h-full bg-brand-red transition-all duration-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                    style={{ width: `${(step / 3) * 100}%` }}
                                />
                            </div>

                            <button
                                onClick={() => { setShowCreate(false); setStep(1); }}
                                className={`absolute top-6 right-8 ${textMuted} hover:text-white transition-colors z-10`}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>

                            <div className="p-6 pt-8">
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-brand-red transition-colors text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Paso {step} de 3</span>
                                    </div>
                                    <h2 className={`text-2xl font-black italic uppercase italic tracking-tight ${textHeading}`}>
                                        {step === 1 && (isProTab ? "Identidad Profesional" : "Identidad del Centro")}
                                        {step === 2 && (isProTab ? "Zona de Operaciones" : "Ubicación e Impacto")}
                                        {step === 3 && (isProTab ? "Tu Plan Profesional" : "Selecciona tu Arsenal")}
                                    </h2>
                                    <p className={textMuted}>
                                        {step === 1 && (isProTab ? "Define tu marca personal y especialidad." : "Cuéntanos sobre tu marca y visión.")}
                                        {step === 2 && (isProTab ? "¿Dónde entrenas a tus alumnos?" : "¿Dónde te encontrarán tus futuros atletas?")}
                                        {step === 3 && (isProTab ? "Elige las herramientas que necesitas." : "Elegir el plan adecuado para el tamaño de tu centro.")}
                                    </p>
                                </div>

                                <form action={handleCreate} className="space-y-6">

                                    {/* STEP 1: IDENTITY */}
                                    {step === 1 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {isProTab ? 'Marca Personal o Nombre Profesional' : 'Nombre del Campo de Batalla'}
                                                </label>
                                                <input name="name" required placeholder={isProTab ? "e.g. Coach David Elite" : "e.g. Iron Forge Cross Training"} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} onChange={(e) => setFieldValues(p => ({ ...p, name: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {isProTab ? 'Tu especialidad (Bio)' : 'Manifiesto / Bio'}
                                                </label>
                                                <textarea name="bio" placeholder={isProTab ? "Cuéntanos en qué te especializas (Fisioterapia, Nutrición, Psicología, Entrenamiento...)" : "Describe la esencia de tu centro..."} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 h-20 resize-none ${bgInput}`} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>Tipo de Perfil</label>
                                                    <select name="type" defaultValue={isProTab ? 'personal_trainer' : 'cross_training'} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 appearance-none ${bgInput}`} onChange={(e) => setFieldValues(p => ({ ...p, type: e.target.value }))}>
                                                        {isProTab ? (
                                                            Object.entries(PROFESSIONAL_TYPES).map(([key, { label, icon }]) => (
                                                                <option key={key} value={key}>{icon} {label}</option>
                                                            ))
                                                        ) : (
                                                            Object.entries(CENTER_TYPES).map(([key, { label, icon }]) => (
                                                                <option key={key} value={key}>{icon} {label}</option>
                                                            ))
                                                        )}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                            {isProTab ? 'Foto Perfil' : 'Logo'}
                                                        </label>
                                                        <div className={`relative group w-full h-14 mt-1 border border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-brand-red transition-colors ${bgInput}`}>
                                                            <Plus className="w-4 h-4 text-gray-500 group-hover:text-brand-red" />
                                                            <input type="file" name="logo" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>Portada</label>
                                                        <div className={`relative group w-full h-14 mt-1 border border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-brand-red transition-colors ${bgInput}`}>
                                                            <Plus className="w-4 h-4 text-gray-500 group-hover:text-brand-red" />
                                                            <input type="file" name="cover" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-4">
                                                <button type="button" onClick={() => setStep(2)} className="w-full bg-brand-red text-white font-black uppercase tracking-[0.2em] py-3 rounded-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                                    Siguiente Paso <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: LOCATION & CONTACT */}
                                    {step === 2 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {isProTab ? 'Gimnasio Base / Dirección' : 'Dirección Física'}
                                                </label>
                                                <input name="address" required placeholder={isProTab ? "Donde realizas tus entrenamientos" : "Calle Principal 123"} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} onChange={(e) => setFieldValues(p => ({ ...p, address: e.target.value }))} />
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-1">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>C. Postal</label>
                                                    <input name="zip_code" required placeholder="28001" className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} onChange={(e) => setFieldValues(p => ({ ...p, zip_code: e.target.value }))} />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>Ciudad</label>
                                                    <input name="city" required placeholder="Madrid" className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} onChange={(e) => setFieldValues(p => ({ ...p, city: e.target.value }))} />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>País</label>
                                                    <input name="country" required placeholder="España" className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} onChange={(e) => setFieldValues(p => ({ ...p, country: e.target.value }))} />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>Teléfono / WhatsApp</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                        <input name="phone" placeholder="+34 600..." className={`w-full rounded-xl pl-12 pr-4 py-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>Instagram</label>
                                                    <div className="relative">
                                                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                        <input name="instagram" placeholder={isProTab ? "@coach_david" : "@centro_gym"} className={`w-full rounded-xl pl-12 pr-4 py-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {isProTab ? 'Sitio Web / Linktree' : 'Sitio Web'}
                                                </label>
                                                <div className="relative">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <input name="website" placeholder="www.centro.com" className={`w-full rounded-xl pl-12 pr-4 py-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                                </div>
                                            </div>

                                            {/* Geolocation capture */}
                                            <div className="space-y-2">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {isProTab ? 'Ubicación Principal (Opcional)' : 'Coordenadas GPS (Opcional)'}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={captureCurrentLocation}
                                                    disabled={isCapturingLoc}
                                                    className={`w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${newOrgLat ? 'border-brand-red text-brand-red bg-brand-red/5' : 'border-white/10 text-gray-400 hover:border-brand-red/30 hover:text-brand-red'}`}
                                                >
                                                    {isCapturingLoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                                    {newOrgLat ? `Ubicación Capturada: ${newOrgLat.toFixed(4)}, ${newOrgLng?.toFixed(4)}` : (isProTab ? "Establecer ubicación de entrenamiento" : "Establecer ubicación actual del centro")}
                                                </button>
                                                <input type="hidden" name="latitude" value={newOrgLat || ""} />
                                                <input type="hidden" name="longitude" value={newOrgLng || ""} />
                                            </div>

                                            {/* Multi-Center Toggle - Hidden for Personal Trainers */}
                                            {filterType !== 'personal_trainer' && (
                                                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                            <Building2 className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black uppercase italic tracking-tighter">Empresa Multi-sede</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">Gestiona múltiples ubicaciones</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" name="is_multi_center" value="true" className="sr-only peer" />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                                    </label>
                                                </div>
                                            )}

                                            <div className="pt-4 flex gap-4">
                                                <button type="button" onClick={() => setStep(1)} className={`flex-1 font-black uppercase tracking-widest py-3 rounded-xl border transition-all ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                    Atrás
                                                </button>
                                                <button type="button" onClick={() => setStep(3)} className="flex-[2] bg-brand-red text-white font-black uppercase tracking-[0.2em] py-3 rounded-xl shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                                    Ver Planes <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: PLAN SELECTION */}
                                    {step === 3 && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                            {/* Hidden inputs carry values from steps 1 & 2 into this FormData */}
                                            <input type="hidden" name="name" value={fieldValues.name} />
                                            <input type="hidden" name="type" value={fieldValues.type} />
                                            <input type="hidden" name="city" value={fieldValues.city} />
                                            <input type="hidden" name="country" value={fieldValues.country} />
                                            <input type="hidden" name="address" value={fieldValues.address} />
                                            <input type="hidden" name="zip_code" value={fieldValues.zip_code} />
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {(isProTab ? PT_PLANS : PLANS).map((p) => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => setSelectedPlan(p.id)}
                                                        className={clsx(
                                                            "relative p-6 rounded-3xl border transition-all cursor-pointer group",
                                                            selectedPlan === p.id
                                                                ? "border-brand-red bg-brand-red/5 scale-[1.02]"
                                                                : "border-white/5 bg-black/20 hover:border-white/20"
                                                        )}
                                                    >
                                                        {selectedPlan === p.id && (
                                                            <div className="absolute -top-3 -right-3 bg-brand-red text-white p-1 rounded-full shadow-glow">
                                                                <Check className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div className="mb-4">{p.icon}</div>
                                                        <h4 className="font-heading font-black italic uppercase text-lg mb-1">{p.name}</h4>
                                                        <p className="text-2xl font-black mb-2">{p.price}<span className="text-[10px] text-gray-500 uppercase">/mes</span></p>
                                                        <ul className="space-y-2">
                                                            {p.features.map(f => (
                                                                <li key={f} className="flex items-start gap-2 text-[10px] text-gray-400 leading-tight">
                                                                    <Check className="w-3 h-3 text-brand-red shrink-0" /> {f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-4 flex gap-4">
                                                <button type="button" onClick={() => setStep(2)} className={`flex-1 font-black uppercase tracking-widest py-3 rounded-xl border transition-all ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                    Atrás
                                                </button>
                                                <button
                                                    disabled={isCreating}
                                                    type="submit"
                                                    className="flex-[2] bg-white text-black font-black uppercase tracking-[0.3em] py-3 rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                                >
                                                    {isCreating ? 'Lanzando...' : 'Lanzar Centro'}
                                                    <Zap className="w-4 h-4 fill-current group-hover:animate-pulse" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                )
                }

                {/* Search Results Section */}
                {
                    searchTerm.length >= 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Search className="w-4 h-4 text-brand-red" />
                                <h2 className={`text-sm font-black uppercase tracking-widest ${textMuted}`}>Resultados de búsqueda</h2>
                            </div>

                            {searchResults.length === 0 && !isSearching ? (
                                <div className={`text-center py-12 border border-dashed rounded-3xl ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                                    <p className={textMuted}>No se encontraron centros que coincidan con "<span className="text-brand-red">{searchTerm}</span>".</p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {searchResults.map((org) => (
                                                        <Link key={org.id} href={isProfessional(org.center_type) ? `/trainer/${org.id}` : `/gym/${org.id}`} className={`group relative rounded-3xl overflow-hidden hover:border-brand-red/30 transition-all shadow-lg hover:shadow-2xl border ${bgCard}`}>
                                            <div className="h-32 bg-gradient-to-br from-gray-800 to-black relative">
                                                {org.cover_photo_url ? (
                                                    <img src={org.cover_photo_url} alt={org.name} className="w-full h-full object-cover opacity-50" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 grayscale"></div>
                                                )}
                                                {isProfessional(org.center_type) && (
                                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-black text-white border border-white/10">
                                                        {getTypeIcon(org.center_type)} {getTypeLabel(org.center_type)}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-6 relative">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center -mt-14 mb-4 relative z-10 overflow-hidden border-2 ${theme === 'dark' ? 'bg-black border-brand-gray' : 'bg-white border-gray-100'}`}>
                                                    {org.logo_url ? (
                                                        <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Building2 className="w-8 h-8 text-gray-500" />
                                                    )}
                                                </div>

                                                <h3 className={`text-xl font-heading font-black italic uppercase mb-2 group-hover:text-brand-red transition-colors ${textHeading}`}>{org.name}</h3>

                                                <div className="space-y-3 mb-6">
                                                    <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                        <MapPin className="w-4 h-4" /> {org.city}, {org.country}
                                                    </div>
                                                </div>

                                                <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-colors text-brand-red`}>
                                                    <span>Ver Perfil Público</span>
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700 to-transparent my-8 opacity-20"></div>
                        </div>
                    )
                }

                {/* My Centers Section */}
                <div className={searchTerm.length >= 2 ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}>
                    <div className="flex items-center gap-2 mb-6">
                        {isProTab ? <User className={`w-4 h-4 ${textMuted}`} /> : <Building2 className={`w-4 h-4 ${textMuted}`} />}
                        <h2 className={`text-sm font-black uppercase tracking-widest ${textMuted}`}>
                            {isProTab ? 'Mis Perfiles Profesionales' : 'Mis Centros'}
                        </h2>
                    </div>

                    {orgs.filter(o => isProTab ? isProfessional(o.center_type) && (!proTypeFilter || o.center_type === proTypeFilter) : !isProfessional(o.center_type)).length === 0 ? (
                        <div className={`text-center py-20 border-2 border-dashed rounded-3xl ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                            {isProTab ? <User className={`w-16 h-16 mx-auto mb-4 ${textMuted}`} /> : <Building2 className={`w-16 h-16 mx-auto mb-4 ${textMuted}`} />}
                            <h3 className={`text-xl font-bold mb-2 ${textHeading}`}>
                                {isProTab ? '¿Eres un profesional?' : '¿Eres dueño de un centro deportivo?'}
                            </h3>
                            <p className={`mb-8 ${textMuted}`}>
                                {isProTab
                                    ? 'Gestiona a tus clientes de forma profesional y automatiza tu servicio con RIVAL.'
                                    : 'Únete a nosotros y lleva el rendimiento de tus atletas al próximo nivel con RIVAL.'}
                            </p>
                            <button
                                onClick={() => { setShowCreate(true); setStep(1); }}
                                className="text-brand-red font-bold uppercase tracking-widest hover:text-white transition-colors"
                            >
                                {isProTab ? 'Empezar ahora' : 'Afiliar ahora'}
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {orgs.filter(o => isProTab ? isProfessional(o.center_type) && (!proTypeFilter || o.center_type === proTypeFilter) : !isProfessional(o.center_type)).map((org) => (
                                <Link key={org.id} href={`/dashboard/gyms/${org.id}`} className={`group relative rounded-3xl overflow-hidden hover:border-brand-red/30 transition-all shadow-lg hover:shadow-2xl border ${bgCard}`}>
                                    <div className="h-32 bg-gradient-to-br from-gray-800 to-black relative">
                                        {org.cover_photo_url ? (
                                            <img src={org.cover_photo_url} alt={org.name} className="w-full h-full object-cover opacity-50" />
                                        ) : (
                                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 grayscale"></div>
                                        )}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center">
                                                <span className="text-[10px] font-black uppercase text-brand-red tracking-widest">{org.user_role === 'owner' ? 'PROPIETARIO' : org.user_role.replace('_', ' ')}</span>
                                            </div>
                                            {org.user_role === 'owner' ? (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); handleDelete(org.id, org.name); }}
                                                    className="p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-gray-400 hover:text-brand-red transition-colors"
                                                    title="Eliminar Centro"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCancellationTarget({
                                                            id: org.id,
                                                            name: org.name,
                                                            type: isProfessional(org.center_type) ? 'professional' : 'gym',
                                                        });
                                                    }}
                                                    className="p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-gray-400 hover:text-red-400 transition-colors"
                                                    title="Solicitar Baja"
                                                >
                                                    <LogOut className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 relative">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center -mt-14 mb-4 relative z-10 overflow-hidden border-2 ${theme === 'dark' ? 'bg-black border-brand-gray' : 'bg-white border-gray-100'}`}>
                                            {org.logo_url ? (
                                                <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-8 h-8 text-gray-500" />
                                            )}
                                        </div>

                                        <h3 className={`text-xl font-heading font-black italic uppercase mb-2 group-hover:text-brand-red transition-colors ${textHeading}`}>{org.name}</h3>

                                        <div className="space-y-3 mb-6">
                                            <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                <MapPin className="w-4 h-4" /> {org.city}, {org.country}
                                            </div>
                                            {!isProfessional(org.center_type) && (
                                                <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                    <Users className="w-4 h-4" /> {org.member_count || 0} Miembros
                                                </div>
                                            )}
                                            {isProfessional(org.center_type) && (
                                                <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                    <Users className="w-4 h-4" /> {org.member_count || 0} Alumnos
                                                </div>
                                            )}
                                        </div>

                                        <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-colors ${theme === 'dark' ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-black'}`}>
                                            <span>Gestionar Panel</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* All Professionals Directory — only on pro tab */}
                {isProTab && searchTerm.length < 2 && proTypeFilter && (
                    <div className="space-y-6 pt-4">

                        {allProfessionals.length === 0 ? (
                            <div className={`text-center py-12 border-2 border-dashed rounded-3xl ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                                <p className={textMuted}>No hay profesionales registrados aún.</p>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {allProfessionals.map((org) => (
                                    <Link key={org.id} href={`/trainer/${org.id}`} className={`group relative rounded-3xl overflow-hidden hover:border-brand-red/30 transition-all shadow-lg hover:shadow-2xl border ${bgCard}`}>
                                        <div className="h-32 bg-gradient-to-br from-gray-800 to-black relative">
                                            {org.cover_photo_url ? (
                                                <img src={org.cover_photo_url} alt={org.name} className="w-full h-full object-cover opacity-60" />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-black opacity-60" />
                                            )}
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-black text-white border border-white/10">
                                                {getTypeIcon(org.center_type)} {getTypeLabel(org.center_type)}
                                            </div>
                                        </div>
                                        <div className="p-6 relative">
                                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center -mt-14 mb-4 relative z-10 overflow-hidden border-2 ${theme === 'dark' ? 'bg-black border-brand-gray' : 'bg-white border-gray-100'}`}>
                                                {org.logo_url ? (
                                                    <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-8 h-8 text-gray-500" />
                                                )}
                                            </div>
                                            <h3 className={`text-xl font-heading font-black italic uppercase mb-1 group-hover:text-brand-red transition-colors ${textHeading}`}>{org.name}</h3>
                                            {org.bio && <p className={`text-[11px] mb-3 line-clamp-2 ${textMuted}`}>{org.bio}</p>}
                                            <div className={`flex items-center gap-2 text-xs mb-4 ${textMuted}`}>
                                                <MapPin className="w-3 h-3" /> {org.city}, {org.country}
                                            </div>
                                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-brand-red">
                                                <span>Ver Perfil</span>
                                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Nearby Centers Section */}
                <div className="space-y-6 pt-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isProTab ? <User className="w-4 h-4 text-brand-red" /> : <MapPin className="w-4 h-4 text-brand-red" />}
                            <h2 className={`text-sm font-black uppercase tracking-widest ${textHeading}`}>
                                {isProTab ? 'Profesionales Cercanos' : 'Centros Cercanos'}
                            </h2>
                        </div>
                        {!userLocation && (
                            <button
                                onClick={() => requestLocation(true)}
                                disabled={isLocating}
                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${theme === 'dark' ? 'border-white/10 hover:bg-brand-red/10 hover:border-brand-red' : 'border-gray-200 hover:bg-brand-red/5 hover:border-brand-red'} ${isLocating ? 'opacity-50' : ''}`}
                            >
                                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                                Activar Geolocalización
                            </button>
                        )}
                    </div>

                    {!userLocation && !isLocating ? (
                        <div className={`text-center py-12 border-2 border-dashed rounded-3xl ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                            <MapPin className={`w-12 h-12 mx-auto mb-4 ${textMuted} opacity-20`} />
                            <p className={`mb-6 ${textMuted}`}>Activa tu ubicación para descubrir los centros más cercanos a ti.</p>
                            <button
                                onClick={() => requestLocation(true)}
                                className="bg-brand-red/10 text-brand-red border border-brand-red/20 px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-brand-red hover:text-white transition-all shadow-glow-sm"
                            >
                                Descubrir Centros
                            </button>
                        </div>
                    ) : isLocating ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <Loader2 className="w-8 h-8 text-brand-red animate-spin mb-4" />
                            <p className={textMuted}>Rastreando coordenadas tácticas...</p>
                        </div>
                    ) : nearbyOrgs.length === 0 ? (
                        <div className={`text-center py-12 border-2 border-dashed rounded-3xl ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                            <p className={textMuted}>No se encontraron centros registrados cerca de tu ubicación actual.</p>
                            <p className={`text-[10px] mt-2 italic ${textMuted}`}>¡Sé el primero en afiliar uno!</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {nearbyOrgs.filter(o => isProTab ? isProfessional(o.center_type) && (!proTypeFilter || o.center_type === proTypeFilter) : !isProfessional(o.center_type)).map((org) => (
                                <Link key={org.id} href={isProfessional(org.center_type) ? `/trainer/${org.id}` : `/gym/${org.id}`} className={`group relative rounded-3xl overflow-hidden hover:border-brand-red/30 transition-all shadow-lg hover:shadow-2xl border ${bgCard}`}>
                                    <div className="h-32 bg-gradient-to-br from-gray-800 to-black relative">
                                        {org.cover_photo_url ? (
                                            <img src={org.cover_photo_url} alt={org.name} className="w-full h-full object-cover opacity-50" />
                                        ) : (
                                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 grayscale"></div>
                                        )}
                                        <div className="absolute top-4 right-4">
                                            <div className="bg-brand-red px-3 py-1 rounded-full text-[10px] font-black text-white shadow-glow-sm flex items-center gap-1">
                                                <MapPin className="w-2.5 h-2.5" />
                                                {org.distance < 1 ? `${(org.distance * 1000).toFixed(0)}m` : `${org.distance.toFixed(1)}km`}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 relative">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center -mt-14 mb-4 relative z-10 overflow-hidden border-2 ${theme === 'dark' ? 'bg-black border-brand-gray' : 'bg-white border-gray-100'}`}>
                                            {org.logo_url ? (
                                                <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-8 h-8 text-gray-500" />
                                            )}
                                        </div>

                                        <h3 className={`text-xl font-heading font-black italic uppercase mb-2 group-hover:text-brand-red transition-colors ${textHeading}`}>{org.name}</h3>

                                        <div className="space-y-3 mb-6">
                                            <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                <MapPin className="w-4 h-4" /> {org.city}, {org.country}
                                            </div>
                                            {!isProfessional(org.center_type) && (
                                                <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                    <Users className="w-4 h-4" /> {org.member_count || 0} Miembros
                                                </div>
                                            )}
                                            {isProfessional(org.center_type) && (
                                                <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                    <Users className="w-4 h-4" /> {org.member_count || 0} Alumnos
                                                </div>
                                            )}
                                        </div>

                                        <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-wider transition-colors text-brand-red`}>
                                            <span>Entrenar Aquí</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {cancellationTarget && (
                <CancellationRequestModal
                    orgId={cancellationTarget.id}
                    orgName={cancellationTarget.name}
                    orgType={cancellationTarget.type}
                    onClose={() => setCancellationTarget(null)}
                    onSuccess={() => { loadOrgs(); setCancellationTarget(null); }}
                />
            )}
        </div>
    );
}
