'use client';

import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
    X, Download, Building2, Calendar, CreditCard, ShoppingBag,
    ArrowUpRight, Users, Activity, TrendingUp, DollarSign, RefreshCw,
    Brain, MessageCircle, Trophy, Dumbbell, Zap, Bot
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface B2BShareCardProps {
    onClose: () => void;
    isAdmin: boolean;
}

// Antes solo existía UNA composición fija (siempre el mismo titular, los
// mismos callouts, los mismos datos) — cada descarga era literalmente la
// misma imagen. El botón "Actualizar" recorre estas variantes: mismo
// template premium, pero un ángulo de venta distinto de la plataforma
// cada vez, para poder publicar contenido fresco sin repetir siempre lo
// mismo.
const VARIANTS = [
    {
        brand: 'MANAGEMENT',
        headline: <>Control total <br /><span className="text-brand-red">de tu centro deportivo</span></>,
        tagline: 'Gestión • Reservas • Pagos • Tienda',
        callout1: { icon: Building2, title: 'Gestión Centros', sub: 'Control administrativo integral' },
        callout2: { icon: CreditCard, title: 'Pagos y Tienda', sub: 'Automatización de suscripciones' },
        stats: [
            { label: 'Ingresos (Mes)', val: '€12,840', icon: DollarSign },
            { label: 'Miembros', val: '248', icon: Users },
            { label: 'Asistencia', val: '86%', icon: Activity },
            { label: 'Crecimiento', val: '+14%', icon: TrendingUp },
        ],
        panelIcon: ShoppingBag,
        panelLabel: 'Punto de Venta Activo',
        panelValue: 'Tienda Online',
        panel2Icon: Calendar,
        panel2Label: 'Próximas Clases',
        panel2Value: '12 Reservas',
        cta: 'EMPIEZA TU LEGADO',
    },
    {
        brand: 'AI COACH',
        headline: <>Un coach de IA <br /><span className="text-brand-red">para cada atleta</span></>,
        tagline: 'WODs • Programación • Feedback 24/7',
        callout1: { icon: Brain, title: 'WOD Generator IA', sub: 'Entrenos a medida en segundos' },
        callout2: { icon: MessageCircle, title: 'Chat Con Tu Coach', sub: 'Dudas resueltas al instante' },
        stats: [
            { label: 'WODs Generados', val: '1,240', icon: Dumbbell },
            { label: 'Atletas Activos', val: '248', icon: Users },
            { label: 'Satisfacción', val: '97%', icon: Activity },
            { label: 'Retención', val: '+22%', icon: TrendingUp },
        ],
        panelIcon: Bot,
        panelLabel: 'Asistente Activo',
        panelValue: 'IA 24/7',
        panel2Icon: Trophy,
        panel2Label: 'Récords Este Mes',
        panel2Value: '38 PRs',
        cta: 'PRUÉBALO GRATIS',
    },
    {
        brand: 'COMUNIDAD',
        headline: <>Tu comunidad <br /><span className="text-brand-red">entrenando junta</span></>,
        tagline: 'Rankings • Retos • Duelos • Social',
        callout1: { icon: Trophy, title: 'Ranking Comunitario', sub: 'Compite con todo tu centro' },
        callout2: { icon: Zap, title: 'Retos Semanales', sub: 'Motivación que no se apaga' },
        stats: [
            { label: 'Atletas Activos', val: '248', icon: Users },
            { label: 'Retos Activos', val: '12', icon: Zap },
            { label: 'Asistencia', val: '86%', icon: Activity },
            { label: 'Crecimiento', val: '+14%', icon: TrendingUp },
        ],
        panelIcon: Users,
        panelLabel: 'Comunidad Activa',
        panelValue: '248 Atletas',
        panel2Icon: Trophy,
        panel2Label: 'Retos Completados',
        panel2Value: '94 Este Mes',
        cta: 'ÚNETE A LA ARENA',
    },
    {
        brand: 'BUSINESS',
        headline: <>Haz crecer <br /><span className="text-brand-red">tu negocio fitness</span></>,
        tagline: 'Cobros • Analíticas • Automatización',
        callout1: { icon: DollarSign, title: 'Cobros Automáticos', sub: 'Suscripciones sin fricción' },
        callout2: { icon: TrendingUp, title: 'Analíticas En Vivo', sub: 'Decisiones basadas en datos' },
        stats: [
            { label: 'Ingresos (Mes)', val: '€12,840', icon: DollarSign },
            { label: 'Miembros', val: '248', icon: Users },
            { label: 'Renovación', val: '91%', icon: Activity },
            { label: 'Crecimiento', val: '+14%', icon: TrendingUp },
        ],
        panelIcon: ShoppingBag,
        panelLabel: 'Punto de Venta Activo',
        panelValue: 'Tienda Online',
        panel2Icon: CreditCard,
        panel2Label: 'Pagos Procesados',
        panel2Value: '€8,120',
        cta: 'EMPIEZA TU LEGADO',
    },
];

export default function B2BShareCard({ onClose, isAdmin }: B2BShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [variantIdx, setVariantIdx] = useState(0);
    const variant = VARIANTS[variantIdx];

    const handleRegenerate = () => {
        setVariantIdx(prev => {
            if (VARIANTS.length <= 1) return prev;
            let next = Math.floor(Math.random() * VARIANTS.length);
            if (next === prev) next = (next + 1) % VARIANTS.length;
            return next;
        });
    };

    // Realistic-looking data
    const chartData = [
        { name: 'Lun', value: 45 },
        { name: 'Mar', value: 52 },
        { name: 'Mie', value: 48 },
        { name: 'Jue', value: 61 },
        { name: 'Vie', value: 55 },
        { name: 'Sab', value: 67 },
        { name: 'Dom', value: 42 },
    ];

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            const dataUrl = await toPng(cardRef.current, {
                pixelRatio: 2,
                quality: 1,
                width: 1080,
                height: 1080,
            });

            const link = document.createElement('a');
            link.download = `rival-fit-management-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Error generating card:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-start overflow-y-auto p-4 md:p-8 backdrop-blur-2xl animate-in fade-in duration-300">
            {/* Mobile Fixed Download Button */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[1010] w-[calc(100%-3rem)] flex gap-3">
                <button
                    onClick={handleRegenerate}
                    disabled={isGenerating || !isAdmin}
                    title="Generar otra imagen"
                    className="shrink-0 bg-white/10 border border-white/20 text-white p-4 rounded-2xl flex items-center justify-center active:scale-95 disabled:opacity-50 transition-all"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
                <button
                    onClick={handleDownload}
                    disabled={isGenerating || !isAdmin}
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-black italic uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all border border-black/10"
                >
                    <Download className="w-5 h-5" />
                    {!isAdmin ? "Acceso Restringido" : (isGenerating ? "Generando..." : "Descargar")}
                </button>
            </div>

            {/* Header Editor */}
            <div className="w-full max-w-2xl flex justify-between items-center mb-6 shrink-0">
                <div className="flex flex-col">
                    <h2 className="text-white font-black italic uppercase text-lg leading-none tracking-tight">Management Ad Editor</h2>
                    <p className="text-brand-red text-[9px] font-black uppercase tracking-[0.4em] mt-1">BRAND IDENTITY v4.0</p>
                </div>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-2 bg-white/5 rounded-full border border-white/10">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col items-center gap-8 w-full max-w-5xl pb-20">
                {/* PREVIEW CONTAINER */}
                <div className="relative shadow-[0_0_120px_rgba(227,30,36,0.15)] rounded-[48px] overflow-hidden border border-white/10 origin-top scale-[0.35] sm:scale-[0.5] md:scale-[0.6] lg:scale-[0.7] xl:scale-[0.85] -mb-[500px] sm:-mb-[350px] lg:-mb-[100px]">

                    {/* THE CARD (1080x1080) */}
                    <div
                        ref={cardRef}
                        className="w-[1080px] h-[1080px] relative overflow-hidden flex flex-col items-center px-12 pt-20"
                        style={{ background: '#000000' }}
                    >
                        {/* Dark Mode Theme Accents */}
                        <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-brand-red/10 blur-[180px] -mr-80 -mt-80" />
                        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-500/5 blur-[150px] -ml-64 -mb-64" />

                        {/* Branding & Headline */}
                        <div className="relative z-10 w-full text-center mb-16 space-y-4">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <span className="text-white font-black text-6xl tracking-tighter italic">RIVAL</span>
                                <span className="bg-brand-red text-white text-xl font-black px-6 py-2 rounded-xl tracking-widest uppercase shadow-2xl shadow-brand-red/20">{variant.brand}</span>
                            </div>

                            <h1 className="text-white font-black text-[84px] leading-[1] tracking-tight max-w-5xl mx-auto uppercase italic">
                                {variant.headline}
                            </h1>
                            <p className="text-gray-500 text-3xl font-black uppercase tracking-[0.4em]">{variant.tagline}</p>
                        </div>

                        {/* THE REAL DASHBOARD COMPOSITION */}
                        <div className="relative w-full flex-1 flex flex-col items-center justify-start mt-4">

                            {/* Callout 1 */}
                            <div className="absolute -top-10 left-4 z-20 animate-in slide-in-from-left duration-700">
                                <div className="bg-[#1A1A1A] border border-white/10 p-7 rounded-[28px] shadow-2xl flex flex-col gap-1 min-w-[300px]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-red/20 rounded-xl flex items-center justify-center text-brand-red">
                                            <variant.callout1.icon className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-white font-black text-2xl uppercase italic leading-none">{variant.callout1.title}</h4>
                                    </div>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">{variant.callout1.sub}</p>
                                </div>
                                <div className="text-brand-red mt-4 ml-24">
                                    <svg width="100" height="60" viewBox="0 0 100 60" fill="none" className="rotate-[12deg]">
                                        <path d="M5 5C5 5 50 5 80 45M80 45L68 38M80 45L90 35" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* Callout 2 */}
                            <div className="absolute top-10 right-4 z-20 text-right animate-in slide-in-from-right duration-700 delay-300">
                                <div className="bg-[#1A1A1A] border border-white/10 p-7 rounded-[28px] shadow-2xl flex flex-col gap-1 min-w-[300px]">
                                    <div className="flex items-center gap-3 justify-end">
                                        <h4 className="text-white font-black text-2xl uppercase italic leading-none">{variant.callout2.title}</h4>
                                        <div className="w-10 h-10 bg-brand-red/20 rounded-xl flex items-center justify-center text-brand-red">
                                            <variant.callout2.icon className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[11px]">{variant.callout2.sub}</p>
                                </div>
                                <div className="text-brand-red mt-4 mr-24 scale-x-[-1]">
                                    <svg width="100" height="60" viewBox="0 0 100 60" fill="none" className="rotate-[12deg]">
                                        <path d="M5 5C5 5 50 5 80 45M80 45L68 38M80 45L90 35" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* THE DASHBOARD BOX (Matches app's real CSS) */}
                            <div className="w-[980px] h-[580px] bg-[#000000] rounded-[48px] border-[12px] border-[#151515] shadow-[0_80px_150px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative">
                                {/* Dashboard Header */}
                                <div className="h-14 w-full bg-[#0A0A0A] border-b border-white/5 flex items-center px-10 justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full bg-brand-red" />
                                        <span className="text-white font-black italic uppercase text-sm tracking-widest">Dashboard General</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-24 h-4 bg-white/5 rounded-full" />
                                        <div className="w-8 h-8 rounded-full bg-white/10" />
                                    </div>
                                </div>

                                <div className="flex-1 p-10 flex flex-col gap-8">
                                    {/* Stat Cards Row */}
                                    <div className="grid grid-cols-4 gap-6">
                                        {variant.stats.map((stat, idx) => (
                                            <div key={idx} className="bg-[#111111] border border-white/5 rounded-[24px] p-6 flex flex-col gap-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <stat.icon className="w-5 h-5 text-brand-red opacity-50" />
                                                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                                                </div>
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{stat.label}</p>
                                                <h4 className="text-white text-3xl font-black italic">{stat.val}</h4>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Main Chart Area */}
                                    <div className="flex-1 grid grid-cols-5 gap-8">
                                        <div className="col-span-3 bg-[#111111] border border-white/5 rounded-[32px] p-8 flex flex-col">
                                            <div className="flex items-center justify-between mb-8">
                                                <p className="text-white font-black italic uppercase text-lg tracking-tight">Rendimiento Miembros</p>
                                                <div className="flex gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-brand-red" />
                                                    <div className="w-3 h-3 rounded-full bg-blue-500 opacity-30" />
                                                </div>
                                            </div>
                                            <div className="flex-1 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={chartData}>
                                                        <defs>
                                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#E31E24" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#E31E24" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <Area type="monotone" dataKey="value" stroke="#E31E24" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                                                        <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="col-span-2 flex flex-col gap-6">
                                            <div className="flex-1 bg-brand-red rounded-[32px] p-8 flex flex-col justify-between text-white shadow-[0_20px_40px_rgba(227,30,36,0.3)]">
                                                <variant.panelIcon className="w-10 h-10" />
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{variant.panelLabel}</p>
                                                    <h4 className="text-4xl font-black italic leading-none italic uppercase">{variant.panelValue}</h4>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-[#111111] border border-white/10 rounded-[32px] p-8 flex flex-col justify-between">
                                                <variant.panel2Icon className="w-10 h-10 text-brand-red" />
                                                <div>
                                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2">{variant.panel2Label}</p>
                                                    <h4 className="text-white text-3xl font-black italic">{variant.panel2Value}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="relative z-10 w-full flex flex-col items-center gap-10 mt-16 pb-10">
                            <div className="flex flex-col items-center gap-3">
                                <h3 className="text-white font-black text-6xl italic uppercase tracking-tighter">Pruébalo GRATIS x 15 días</h3>
                                <p className="text-brand-red font-black text-2xl uppercase tracking-[0.5em]">WWW.RIVALFIT.APP</p>
                            </div>

                            <div className="bg-white text-black px-24 py-10 rounded-full text-5xl font-black italic uppercase tracking-[0.2em] shadow-2xl transition-transform hover:scale-105">
                                {variant.cta}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Editor Footer (Desktop & Tablet) */}
                <div className="hidden md:flex w-full bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-xl flex-col md:flex-row items-center justify-between gap-8 mt-10 lg:mt-0 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-brand-red rounded-2xl flex items-center justify-center text-white shadow-glow">
                            <Activity className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-white font-black text-2xl italic uppercase tracking-tight leading-none">Rival Fit Dark Mode v4 — {variant.brand}</p>
                            <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px]">1080x1080 PNG • Composición HQ • Variante {variantIdx + 1}/{VARIANTS.length}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRegenerate}
                            disabled={isGenerating || !isAdmin}
                            title="Generar otra imagen (otro ángulo de la plataforma)"
                            className="bg-white/5 border border-white/10 text-white px-6 py-5 rounded-2xl font-black italic uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className="w-5 h-5" /> Actualizar
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isGenerating || !isAdmin}
                            className="bg-white text-black px-12 py-5 rounded-2xl font-black italic uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 hover:bg-brand-red hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                            {!isAdmin ? "Acceso Restringido" : (isGenerating ? "Generando..." : "Descargar Imagen")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
