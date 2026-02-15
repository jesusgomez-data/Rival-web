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
                pixelRatio: 2,
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
                                "w-[500px] h-[500px] mx-auto relative overflow-hidden flex flex-col items-center justify-center p-12 select-none shadow-2xl",
                                currentPost.bg
                            )}
                        >
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
                                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-red/20 rounded-full blur-[120px]" />
                                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-red/10 rounded-full blur-[100px]" />
                            </div>

                            {/* Grid overlay for a tech look */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                            {/* Logo */}
                            <div className="relative z-10 flex items-center gap-4 mb-12">
                                <div className="w-16 h-16 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                                    <span className="text-white text-4xl font-black">R</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black tracking-tighter leading-none text-white italic">RIVAL</span>
                                    <span className="text-sm font-black text-brand-red tracking-[0.3em] leading-none mt-1">FIT</span>
                                </div>
                            </div>

                            {/* Content based on template */}
                            <div className="relative z-10 text-center space-y-6 max-w-[80%]">
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

                            {/* Footer */}
                            <div className="absolute bottom-10 left-0 w-full px-12 flex justify-between items-center opacity-60">
                                <span className="text-[8px] font-black tracking-[0.5em] text-gray-500 uppercase">JOIN THE ARENA</span>
                                <span className="text-[8px] font-black tracking-[0.2em] text-white uppercase italic">RIVALFIT.APP</span>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-brand-red/30 rounded-tl-xl" />
                            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-brand-red/30 rounded-br-xl" />
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
