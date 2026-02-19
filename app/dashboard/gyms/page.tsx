"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Building2, MapPin, Users, User, ArrowRight, ArrowLeft, Loader2, Sun, Moon, Search, Check, Rocket, Zap, Shield, Globe, Instagram, Phone, Trash2, LogOut } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../../ThemeContext";
import { getUserOrganizations, createOrganization, searchOrganizations, deleteOrganization, leaveOrganization, getNearbyOrganizations } from "./actions";

export default function CenterListPage() {
    const [orgs, setOrgs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState('free');
    const [showCreate, setShowCreate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const { theme } = useTheme();
    const searchParams = useSearchParams();
    const filterType = searchParams.get('type');

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Geolocation & Nearby Orgs
    const [nearbyOrgs, setNearbyOrgs] = useState<any[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [newOrgLat, setNewOrgLat] = useState<number | null>(null);
    const [newOrgLng, setNewOrgLng] = useState<number | null>(null);
    const [isCapturingLoc, setIsCapturingLoc] = useState(false);


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
            name: 'Trainer Basic',
            price: '0€',
            description: 'Gestiona tus primeros alumnos gratis.',
            icon: <Zap className="w-6 h-6 text-yellow-500" />,
            features: ['Perfil público entrenador', 'Hasta 3 alumnos', 'Programación Manual', 'Agenda Básica']
        },
        {
            id: 'pt_pro',
            name: 'Trainer Pro',
            price: '29.99€',
            description: 'Para entrenadores en crecimiento.',
            icon: <Rocket className="w-6 h-6 text-brand-red" />,
            features: ['Alumnos ilimitados', 'Programación con IA', 'Pagos integrados (Stripe)', 'Agenda Avanzada', 'Chat directo']
        },
        {
            id: 'pt_elite',
            name: 'Trainer Elite',
            price: '59.99€',
            description: 'Automatiza tu negocio al 100%.',
            icon: <Shield className="w-6 h-6 text-purple-500" />,
            features: ['Todo en Pro', 'App personalizada (PWA)', 'Análisis de retención', 'Soporte prioritario 24/7']
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
                setSearchResults(results);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [searchTerm]);

    async function loadOrgs() {
        const data = await getUserOrganizations();
        setOrgs(data);
        setLoading(false);
    }

    const requestLocation = () => {
        if (!navigator.geolocation) {
            alert("La geolocalización no está soportada por tu navegador.");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ lat: latitude, lng: longitude });
                const nearby = await getNearbyOrganizations(latitude, longitude);
                setNearbyOrgs(nearby);
                setIsLocating(false);
            },
            (error) => {
                console.error("Error obtaining location:", error);
                setIsLocating(false);
                alert("No pudimos obtener tu ubicación. Por favor, asegúrate de dar permisos de geolocalización.");
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        if ("geolocation" in navigator) {
            requestLocation();
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
            () => {
                setIsCapturingLoc(false);
                alert("No se pudo obtener la ubicación actual.");
            }
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
                            {filterType === 'personal_trainer' ? 'Entrenadores' : 'Centros'}
                        </h1>
                        <p className={textMuted}>
                            {filterType === 'personal_trainer'
                                ? 'Gestiona tus alumnos o descubre nuevos entrenadores personales.'
                                : 'Gestiona tus centros o explora nuevos campos de batalla cercanos.'}
                        </p>
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

                        <button
                            onClick={() => { setShowCreate(true); setStep(1); }}
                            className="bg-brand-red hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-glow whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Afiliar</span>
                        </button>
                    </div>
                </div>

                {showCreate && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                        <div className={`${theme === 'dark' ? 'bg-brand-gray border-white/10' : 'bg-white border-gray-200 shadow-2xl'} border rounded-[32px] max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 duration-300`}>
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
                                        {step === 1 && (filterType === 'personal_trainer' ? "Identidad Profesional" : "Identidad del Centro")}
                                        {step === 2 && (filterType === 'personal_trainer' ? "Zona de Operaciones" : "Ubicación e Impacto")}
                                        {step === 3 && (filterType === 'personal_trainer' ? "Tu Plan de Entrenador" : "Selecciona tu Arsenal")}
                                    </h2>
                                    <p className={textMuted}>
                                        {step === 1 && (filterType === 'personal_trainer' ? "Define tu marca personal y especialidad." : "Cuéntanos sobre tu marca y visión.")}
                                        {step === 2 && (filterType === 'personal_trainer' ? "¿Dónde entrenas a tus alumnos?" : "¿Dónde te encontrarán tus futuros atletas?")}
                                        {step === 3 && (filterType === 'personal_trainer' ? "Elige las herramientas que necesitas." : "Elegir el plan adecuado para el tamaño de tu centro.")}
                                    </p>
                                </div>

                                <form action={handleCreate} className="space-y-6">

                                    {/* STEP 1: IDENTITY */}
                                    {step === 1 && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {filterType === 'personal_trainer' ? 'Marca Personal o Nombre Profesional' : 'Nombre del Campo de Batalla'}
                                                </label>
                                                <input name="name" required placeholder={filterType === 'personal_trainer' ? "e.g. Coach David Elite" : "e.g. Iron Forge Cross Training"} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {filterType === 'personal_trainer' ? 'Tu especialidad (Bio)' : 'Manifiesto / Bio'}
                                                </label>
                                                <textarea name="bio" placeholder={filterType === 'personal_trainer' ? "Cuéntanos en qué te especializas (CrossFit, Powerlifting, Nutrición...)" : "Describe la esencia de tu centro..."} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 h-20 resize-none ${bgInput}`} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>Tipo de Perfil</label>
                                                    <select name="type" defaultValue={filterType === 'personal_trainer' ? 'personal_trainer' : 'cross_training'} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 appearance-none ${bgInput}`}>
                                                        {filterType === 'personal_trainer' ? (
                                                            <option value="personal_trainer">Entrenador Personal</option>
                                                        ) : (
                                                            <>
                                                                <option value="cross_training">Box de Cross Training</option>
                                                                <option value="gym">Gimnasio Comercial</option>
                                                                <option value="studio">Estudio Personal</option>
                                                                <option value="personal_trainer">Entrenador Personal</option>
                                                                <option value="club">Club Deportivo</option>
                                                                <option value="other">Otro</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                            {filterType === 'personal_trainer' ? 'Foto Perfil' : 'Logo'}
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
                                                    {filterType === 'personal_trainer' ? 'Gimnasio Base / Dirección' : 'Dirección Física'}
                                                </label>
                                                <input name="address" required placeholder={filterType === 'personal_trainer' ? "Donde realizas tus entrenamientos" : "Calle Principal 123"} className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-1">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>C. Postal</label>
                                                    <input name="zip_code" required placeholder="28001" className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>Ciudad</label>
                                                    <input name="city" required placeholder="Madrid" className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>País</label>
                                                    <input name="country" required placeholder="España" className={`w-full rounded-xl p-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
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
                                                        <input name="instagram" placeholder={filterType === 'personal_trainer' ? "@coach_david" : "@centro_gym"} className={`w-full rounded-xl pl-12 pr-4 py-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {filterType === 'personal_trainer' ? 'Sitio Web / Linktree' : 'Sitio Web'}
                                                </label>
                                                <div className="relative">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <input name="website" placeholder="www.centro.com" className={`w-full rounded-xl pl-12 pr-4 py-3 focus:border-brand-red outline-none border mt-1 ${bgInput}`} />
                                                </div>
                                            </div>

                                            {/* Geolocation capture */}
                                            <div className="space-y-2">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${textMuted}`}>
                                                    {filterType === 'personal_trainer' ? 'Ubicación Principal (Opcional)' : 'Coordenadas GPS (Opcional)'}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={captureCurrentLocation}
                                                    disabled={isCapturingLoc}
                                                    className={`w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-all ${newOrgLat ? 'border-brand-red text-brand-red bg-brand-red/5' : 'border-white/10 text-gray-400 hover:border-brand-red/30 hover:text-brand-red'}`}
                                                >
                                                    {isCapturingLoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                                                    {newOrgLat ? `Ubicación Capturada: ${newOrgLat.toFixed(4)}, ${newOrgLng?.toFixed(4)}` : (filterType === 'personal_trainer' ? "Establecer ubicación de entrenamiento" : "Establecer ubicación actual del centro")}
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
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {(filterType === 'personal_trainer' ? PT_PLANS : PLANS).map((p) => (
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
                                        <Link key={org.id} href={`/gym/${org.id}`} className={`group relative rounded-3xl overflow-hidden hover:border-brand-red/30 transition-all shadow-lg hover:shadow-2xl border ${bgCard}`}>
                                            <div className="h-32 bg-gradient-to-br from-gray-800 to-black relative">
                                                {org.cover_photo_url ? (
                                                    <img src={org.cover_photo_url} alt={org.name} className="w-full h-full object-cover opacity-50" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 grayscale"></div>
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
                        {filterType === 'personal_trainer' ? <User className={`w-4 h-4 ${textMuted}`} /> : <Building2 className={`w-4 h-4 ${textMuted}`} />}
                        <h2 className={`text-sm font-black uppercase tracking-widest ${textMuted}`}>
                            {filterType === 'personal_trainer' ? 'Mis Perfiles de Entrenador' : 'Mis Centros'}
                        </h2>
                    </div>

                    {orgs.filter(o => !filterType || o.center_type === filterType).length === 0 ? (
                        <div className={`text-center py-20 border-2 border-dashed rounded-3xl ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                            {filterType === 'personal_trainer' ? <User className={`w-16 h-16 mx-auto mb-4 ${textMuted}`} /> : <Building2 className={`w-16 h-16 mx-auto mb-4 ${textMuted}`} />}
                            <h3 className={`text-xl font-bold mb-2 ${textHeading}`}>
                                {filterType === 'personal_trainer' ? '¿Eres entrenador personal?' : '¿Eres dueño de un centro deportivo?'}
                            </h3>
                            <p className={`mb-8 ${textMuted}`}>
                                {filterType === 'personal_trainer'
                                    ? 'Gestiona a tus alumnos de forma profesional y automatiza su programación con RIVAL.'
                                    : 'Únete a nosotros y lleva el rendimiento de tus atletas al próximo nivel con RIVAL.'}
                            </p>
                            <button
                                onClick={() => { setShowCreate(true); setStep(1); }}
                                className="text-brand-red font-bold uppercase tracking-widest hover:text-white transition-colors"
                            >
                                {filterType === 'personal_trainer' ? 'Empezar ahora' : 'Afiliar ahora'}
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {orgs.filter(o => !filterType || o.center_type === filterType).map((org) => (
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
                                                    onClick={(e) => { e.preventDefault(); handleLeave(org.id, org.name); }}
                                                    className="p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-gray-400 hover:text-brand-red transition-colors"
                                                    title="Desafiliarse"
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
                                            <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                <Users className="w-4 h-4" /> {org.member_count || 0} Miembros
                                            </div>
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

                {/* Nearby Centers Section */}
                <div className="space-y-6 pt-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {filterType === 'personal_trainer' ? <User className="w-4 h-4 text-brand-red" /> : <MapPin className="w-4 h-4 text-brand-red" />}
                            <h2 className={`text-sm font-black uppercase tracking-widest ${textHeading}`}>
                                {filterType === 'personal_trainer' ? 'Entrenadores Cercanos' : 'Centros Cercanos'}
                            </h2>
                        </div>
                        {!userLocation && (
                            <button
                                onClick={requestLocation}
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
                                onClick={requestLocation}
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
                            {nearbyOrgs.filter(o => !filterType || o.center_type === filterType).map((org) => (
                                <Link key={org.id} href={`/gym/${org.id}`} className={`group relative rounded-3xl overflow-hidden hover:border-brand-red/30 transition-all shadow-lg hover:shadow-2xl border ${bgCard}`}>
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
                                            <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                                                <Users className="w-4 h-4" /> {org.member_count || 0} Miembros
                                            </div>
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
            </div >
        </div >
    );
}
