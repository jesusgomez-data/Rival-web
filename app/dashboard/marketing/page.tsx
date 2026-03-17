"use client";

import { useState, useRef } from 'react';
import { toBlob } from 'html-to-image';
import { Download, Instagram, Share2, Rocket, Zap, Trophy, Flame, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';

const POST_TEMPLATES = [
    {
        id: 'launch',
        title: 'Lanzamiento Beta',
        headline: 'DOMINA LA ARENA',
        subheadline: 'BETA ACCESS YA DISPONIBLE',
        description: 'La herramienta definitiva para el atleta híbrido ha llegado.',
        accent: '#DC2626',
        bg: 'bg-black'
    },
    {
        id: 'features',
        title: 'Métricas Reales',
        headline: 'TUS MÉTRICAS.',
        subheadline: 'TU PROGRESO.',
        description: 'Registra WODs, Running y Fuerza en un solo lugar.',
        accent: '#DC2626',
        bg: 'bg-[#050505]'
    },
    {
        id: 'community',
        title: 'Comunidad Elite',
        headline: 'NO ENTRENES SOLO.',
        subheadline: 'COMBATE.',
        description: 'Conecta con atletas de todo el mundo y escala posiciones.',
        accent: '#DC2626',
        bg: 'bg-black'
    },
    {
        id: 'metrics_premium',
        title: 'Métricas de Élite',
        headline: 'ANÁLISIS. DE. DATOS.',
        subheadline: 'PERFORMANCE TRACKING',
        description: 'Visualiza cada detalle de tu entrenamiento con precisión milimétrica.',
        accent: '#DC2626',
        bg: 'bg-black',
        image: '/marketing/premium_bg.png'
    },
    {
        id: 'management_pro',
        title: 'Gestión Total',
        headline: 'TU BOX. BAJO CONTROL.',
        subheadline: 'ADMIN SOLUTIONS',
        description: 'Automatiza cobros, agenda y tienda. La herramienta definitiva para dueños de centros.',
        accent: '#DC2626',
        bg: 'bg-black',
        image: '/marketing/management_bg.png'
    },
    {
        id: 'athlete_card',
        title: 'Athlete Card',
        headline: '¿CUÁL ES TU RATING?',
        subheadline: 'ATHLETE CARD — RIVAL FIT',
        description: 'Tu progreso hecho tarjeta. Descárgala. Compártela. Domina.',
        accent: '#EF4444',
        bg: 'bg-black'
    },
    {
        id: 'nutrition',
        title: 'Nutrition Tracker',
        headline: 'COME. BIEN. RINDE. MÁS.',
        subheadline: 'MACRO TRACKER GRATIS',
        description: 'Controla proteínas, carbos y grasas en segundos. Todo en la misma app.',
        accent: '#22C55E',
        bg: 'bg-[#030d06]'
    },
    {
        id: 'recovery',
        title: 'Recovery Score',
        headline: '¿LISTO PARA ENTRENAR?',
        subheadline: 'DAILY CHECK-IN',
        description: 'Tu cuerpo habla. Escúchalo. Score de recuperación diario basado en sueño, energía y dolor muscular.',
        accent: '#8B5CF6',
        bg: 'bg-[#05030d]'
    }
];

export default function MarketingStudio() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const postRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!postRef.current) return;
        setIsGenerating(true);
        try {
            const blob = await toBlob(postRef.current, {
                quality: 1,
                pixelRatio: 3, // Increased for better quality
                width: 500,
                height: 500,
                style: {
                    transform: 'scale(1)',
                }
            });
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rival-fit-post-${POST_TEMPLATES[activeIndex].id}.png`;
                a.click();
            }
        } catch (err) {
            console.error('Error generating image:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const currentPost = POST_TEMPLATES[activeIndex];

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 space-y-12 pb-20">
            {/* Header section */}
            <div className="max-w-4xl mx-auto text-center space-y-4">
                <span className="bg-brand-red/20 text-brand-red px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-brand-red/20">
                    Marketing Studio
                </span>
                <h1 className="text-4xl md:text-6xl font-heading font-black italic uppercase tracking-tight glow-text">
                    Generador de <span className="text-brand-red text-glow">Posteos</span>
                </h1>
                <p className="text-gray-500 max-w-2xl mx-auto text-sm md:text-lg">
                    Diseños premium listos para tu cuenta de Instagram. Profesionales, agresivos y diseñados para convertir.
                </p>
            </div>

            {/* Main Interactive Area */}
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
                {/* Left: Preview & Editor */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setActiveIndex(prev => (prev > 0 ? prev - 1 : POST_TEMPLATES.length - 1))}
                            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Plantilla {activeIndex + 1} de {POST_TEMPLATES.length}</p>
                        <button
                            onClick={() => setActiveIndex(prev => (prev < POST_TEMPLATES.length - 1 ? prev + 1 : 0))}
                            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-90"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>

                    {/* The Post Canvas (1080x1080) */}
                    <div className="relative group perspective-1000">
                        <div
                            ref={postRef}
                            className={clsx(
                                "w-[500px] h-[500px] mx-auto relative overflow-hidden flex flex-col items-center justify-between py-10 px-10 select-none shadow-2xl",
                                currentPost.bg
                            )}
                        >
                            {/* Decorative Background Elements */}
                            {currentPost.image ? (
                                <div className="absolute inset-0 z-0">
                                    <img
                                        src={currentPost.image}
                                        alt="Background"
                                        className="w-full h-full object-cover filter brightness-[0.4] scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />
                                </div>
                            ) : (
                                <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none z-0">
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-red/20 rounded-full blur-[120px]" />
                                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-red/10 rounded-full blur-[100px]" />
                                </div>
                            )}

                            {/* Grid overlay for a tech look */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                            {/* Official Logo */}
                            <div className="relative z-20 flex flex-col items-center">
                                <img
                                    src="/logo_transparent.svg"
                                    alt="Rival Fit Official Logo"
                                    className="w-20 h-20 object-contain filter drop-shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                                />
                                <div className="mt-1 text-center">
                                    <span className="text-base font-black tracking-[0.2em] text-white italic uppercase">RIVAL FIT</span>
                                </div>
                            </div>

                            {/* Content based on template */}
                            {currentPost.id === 'metrics_premium' ? (
                                <div className="relative z-20 w-full px-4 space-y-4">
                                    {/* Simulated Metric Card */}
                                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 shadow-2xl transform rotate-1">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[10px] font-black text-brand-red uppercase tracking-[0.2em] mb-1">Métrica Destacada</p>
                                                <h4 className="text-2xl font-black text-white italic uppercase tracking-tight">Split Time #3</h4>
                                            </div>
                                            <Flame className="w-6 h-6 text-brand-red" />
                                        </div>

                                        <div className="flex items-baseline gap-3 mb-6">
                                            <span className="text-6xl font-black text-white italic tracking-tighter">04:21</span>
                                            <span className="text-xl font-bold text-brand-red italic">-12s</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                            <div>
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Ritmo Medio</p>
                                                <p className="text-sm font-bold text-white uppercase tracking-tight">3:52 min/km</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Frecuencia HR</p>
                                                <p className="text-sm font-bold text-white uppercase tracking-tight">174 BPM</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center space-y-2 pt-2">
                                        <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-white">
                                            CADA SEGUNDO <span className="text-brand-red">CUENTA.</span>
                                        </h3>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                                            {currentPost.description}
                                        </p>
                                    </div>
                                </div>
                            ) : currentPost.id === 'management_pro' ? (
                                <div className="relative z-20 w-full px-4 space-y-6">
                                    {/* Simulated Management Dashboard Snippet */}
                                    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[32px] p-6 shadow-2xl">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center">
                                                    <Trophy className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-white uppercase italic tracking-tighter">Rival Center Pro</p>
                                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Panel de Control</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">LIVE</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recaudación Mensual</span>
                                                <span className="text-xl font-black text-white italic">€12,450.00</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nuevos Atletas</span>
                                                    <span className="text-lg font-black text-brand-red">+48</span>
                                                </div>
                                                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ocupación Box</span>
                                                    <span className="text-lg font-black text-white italic">86%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center space-y-4">
                                        <h3 className="text-4xl font-black italic uppercase leading-none tracking-tighter text-white">
                                            CONTROL <span className="text-brand-red">TOTAL.</span>
                                        </h3>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest text-balance">
                                            {currentPost.description}
                                        </p>
                                    </div>
                                </div>
                            ) : currentPost.id === 'athlete_card' ? (
                                <div className="relative z-20 w-full px-6 space-y-2">
                                    {/* Mock Athlete Card */}
                                    <div className="mx-auto w-48 bg-gradient-to-b from-[#7f1d1d] to-[#1a0505] rounded-3xl p-4 border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.3)] transform -rotate-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="text-4xl font-black text-yellow-400 leading-none">78</div>
                                                <div className="text-[8px] font-black text-yellow-600 tracking-widest">GOLD</div>
                                            </div>
                                            <div className="text-[8px] text-white/50 font-black uppercase tracking-wider">CROSSFIT</div>
                                        </div>
                                        <div className="w-14 h-14 rounded-full bg-red-900/50 border-2 border-red-500 mx-auto mb-2 flex items-center justify-center text-2xl">🏋️</div>
                                        <div className="text-center mb-3">
                                            <p className="text-white font-black text-[10px] uppercase">TU NOMBRE</p>
                                            <p className="text-white/40 text-[7px]">@rivalfit</p>
                                        </div>
                                        <div className="space-y-1">
                                            {[['POTENCIA', '74'], ['RESISTENCIA', '61'], ['AGILIDAD', '83'], ['CONSTANCIA', '58']].map(([l, v]) => (
                                                <div key={l} className="flex items-center gap-1">
                                                    <span className="text-[6px] text-white/50 w-12">{l}</span>
                                                    <div className="flex-1 h-1 bg-white/10 rounded-full"><div className="h-full bg-red-500 rounded-full" style={{ width: `${v}%` }} /></div>
                                                    <span className="text-[7px] text-white font-black">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between mt-3 pt-2 border-t border-white/10">
                                            {[['24', 'WKT'], ['3', 'RACHA'], ['37', 'PRs']].map(([v, l]) => (
                                                <div key={l} className="text-center"><p className="text-white font-black text-[10px]">{v}</p><p className="text-white/30 text-[6px] font-black">{l}</p></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-white">
                                            TU CARD. <span style={{ color: currentPost.accent }}>TU LEGADO.</span>
                                        </h3>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{currentPost.description}</p>
                                    </div>
                                </div>
                            ) : currentPost.id === 'nutrition' ? (
                                <div className="relative z-20 w-full px-6 space-y-3">
                                    {/* Mock Nutrition UI */}
                                    <div className="bg-black/60 border border-green-900/40 rounded-3xl p-5 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Hoy · Martes</p>
                                                <p className="text-xl font-black text-white">1.840 <span className="text-sm text-gray-500">/ 2.200 kcal</span></p>
                                            </div>
                                            <div className="w-12 h-12 rounded-full border-4 border-green-500/60 flex items-center justify-center">
                                                <span className="text-xs font-black text-green-400">84%</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {[['🥩', 'Prot', '164g', '175g', '#EF4444'], ['🌾', 'Carbs', '210g', '240g', '#F59E0B'], ['🥑', 'Grasa', '58g', '70g', '#3B82F6']].map(([e, n, a, t, c]) => (
                                                <div key={n} className="bg-white/5 rounded-xl p-2 text-center">
                                                    <div className="text-lg mb-1">{e}</div>
                                                    <p className="text-[7px] text-gray-500 font-black uppercase">{n}</p>
                                                    <p className="text-[10px] font-black text-white">{a}</p>
                                                    <p className="text-[7px] text-gray-600">{t}</p>
                                                    <div className="h-1 bg-white/10 rounded-full mt-1"><div className="h-full rounded-full" style={{ width: `${Math.round(parseInt(a) / parseInt(t) * 100)}%`, backgroundColor: c }} /></div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">💧 Agua: 1.8 / 2.5 L</p>
                                            <div className="flex gap-1">{[...Array(7)].map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full ${i < 5 ? 'bg-blue-500' : 'bg-white/10'}`} />))}</div>
                                        </div>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-white">
                                            COME PARA <span style={{ color: currentPost.accent }}>GANAR.</span>
                                        </h3>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{currentPost.description}</p>
                                    </div>
                                </div>
                            ) : currentPost.id === 'recovery' ? (
                                <div className="relative z-20 w-full px-6 space-y-3">
                                    {/* Mock Recovery Score UI */}
                                    <div className="bg-black/60 border border-purple-900/40 rounded-3xl p-5 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                                        <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-3">Daily Check-in · Hoy</p>
                                        {/* Score ring */}
                                        <div className="flex items-center gap-5 mb-4">
                                            <div className="w-20 h-20 rounded-full border-4 border-purple-500 flex flex-col items-center justify-center shrink-0" style={{ boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
                                                <span className="text-2xl font-black text-white">82</span>
                                                <span className="text-[7px] text-purple-400 font-black uppercase">Score</span>
                                            </div>
                                            <div className="space-y-1.5 flex-1">
                                                {[['⚡ Energía', '8/10'], ['😴 Sueño', '7.5h'], ['💪 Dolor', 'Bajo'], ['🧠 Motivación', 'Alta']].map(([l, v]) => (
                                                    <div key={l} className="flex justify-between">
                                                        <span className="text-[8px] text-gray-500">{l}</span>
                                                        <span className="text-[8px] font-black text-white">{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                                            <p className="text-[9px] font-black text-purple-300 uppercase tracking-widest">✅ Listo para entrenar fuerte</p>
                                        </div>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <h3 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-white">
                                            ENTRENA <span style={{ color: currentPost.accent }}>INTELIGENTE.</span>
                                        </h3>
                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{currentPost.description}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-20 text-center space-y-4 max-w-[80%]">
                                    <h3 className="text-5xl font-black italic uppercase leading-[0.85] tracking-tighter text-white">
                                        {currentPost.headline.split('.').map((part, i) => (
                                            <span key={i} className="block last:text-brand-red">
                                                {part}{i < currentPost.headline.split('.').length - 1 ? '.' : ''}
                                            </span>
                                        ))}
                                    </h3>

                                    <div className="inline-block px-4 py-1 border border-brand-red/30 bg-brand-red/10 rounded-lg">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-red italic">
                                            {currentPost.subheadline}
                                        </p>
                                    </div>

                                    <p className="text-gray-400 text-sm font-medium leading-relaxed uppercase tracking-wide">
                                        {currentPost.description}
                                    </p>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="relative w-full px-12 flex justify-between items-center z-20 opacity-60 text-white/50">
                                <span className="text-[7px] font-black tracking-[0.4em] uppercase">JOIN THE ARENA</span>
                                <span className="text-[7px] font-black tracking-[0.15em] uppercase italic">RIVALFIT.APP</span>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-brand-red/30 rounded-tl-xl z-20" />
                            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-brand-red/30 rounded-br-xl z-20" />
                        </div>
                    </div>

                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="w-full py-6 bg-brand-red text-white rounded-3xl font-black italic uppercase tracking-[0.2em] shadow-glow flex items-center justify-center gap-4 active:scale-95 transition-all hover:brightness-110 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <><Download className="w-6 h-6" /> Descargar para Instagram</>
                        )}
                    </button>
                </div>

                {/* Right: Strategy & Info */}
                <div className="space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 space-y-8 backdrop-blur-xl">
                        <div>
                            <h3 className="text-2xl font-black italic uppercase text-white mb-4 flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-brand-red" /> Plan Estratégico
                            </h3>
                            <div className="space-y-6">
                                <StrategyCard
                                    icon={<Rocket className="w-5 h-5 text-blue-400" />}
                                    title="Bio de Instagram"
                                    content={`⚔️ Domina la Arena. Registra tu progreso.\n📊 Métricas de Élite en tiempo real.\n🎯 Atletas • Coaches • Box owners.\n🔥 Únete a la nueva era del fitness.\n👇 ACCESO BETA GRATIS\nrivalfit.app`}
                                />
                                <StrategyCard
                                    icon={<Zap className="w-5 h-5 text-yellow-500" />}
                                    title="Frecuencia de Posteo"
                                    content="Sube 1 post/carrusel cada 2 días. Alterna entre estas plantillas y capturas de pantalla reales del dashboard."
                                />
                                <StrategyCard
                                    icon={<Trophy className="w-5 h-5 text-brand-red" />}
                                    title="Retención & Motivación"
                                    content="Publica en Historias los 'Share Cards' de los usuarios. Etiquétalos. Crea sentimiento de comunidad y competencia sana."
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">Consejo Pro</p>
                            <p className="text-gray-400 text-sm leading-relaxed italic">
                                \"La marca Rival Fit es sinónimo de alto rendimiento. Usa colores oscuros y contrastes fuertes. Menos es más. Deja que los números y el logo hablen por sí solos.\"
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return <div className={clsx("border-2 border-white/20 border-t-white rounded-full animate-spin", className)} />;
}

function StrategyCard({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                {icon} {title}
            </div>
            <div className="p-5 bg-black/40 border border-white/5 rounded-2xl">
                <p className="text-white text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {content}
                </p>
            </div>
        </div>
    );
}
