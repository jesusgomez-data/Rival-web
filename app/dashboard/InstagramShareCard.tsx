
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { toBlob } from 'html-to-image';
import { Trophy, Flame, MapPin, Zap, Wind, TrendingUp, Heart, X, Instagram, Share2, Activity, ShieldCheck, Map } from 'lucide-react';
import { clsx } from 'clsx';
import PRCard from './explore/PRCard';

interface InstagramShareCardProps {
    user: string;
    avatar: string;
    username: string;
    content: {
        type: 'workout' | 'pr' | 'image' | 'class_result' | 'running' | 'cycling' | 'swimming' | 'challenge' | 'wod' | 'post';
        title?: string;
        highlight?: string;
        stats?: Array<{ label: string, value: string, icon?: string }>;
        image?: string;
        mapData?: string;
    };
    onClose: () => void;
    workoutData?: any;
}

export default function InstagramShareCard({ user, avatar, username, content, onClose, workoutData }: InstagramShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const isEndurance = ['running', 'cycling', 'swimming'].includes(content.type);
    const isStandardPost = content.type === 'post' || content.type === 'image';

    useEffect(() => {
        if (avatar) {
            const loadAvatar = async () => {
                try {
                    const response = await fetch(avatar, { mode: 'cors' });
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setAvatarUrl(reader.result as string);
                    };
                    reader.readAsDataURL(blob);
                } catch (e) {
                    console.error("Error loading avatar for canvas:", e);
                    setAvatarUrl(avatar);
                }
            };
            loadAvatar();
        }
    }, [avatar]);

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            const blob = await toBlob(cardRef.current, {
                pixelRatio: 3,
                quality: 1,
                width: 360,
                height: 640,
            });

            if (!blob) throw new Error('Failed to generate image');

            const file = new File([blob], `rival-performance-${Date.now()}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Rival Fit Performance',
                    text: '¡Mira mi rendimiento en Rival Fit! 🔥',
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rival-performance-${username}.png`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Tarjeta descargada. ¡Compártela en tus Stories!');
            }
        } catch (error) {
            console.error('Error generating share card:', error);
            alert('Error al generar la tarjeta.');
        } finally {
            setIsGenerating(false);
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[320] bg-black/98 flex flex-col items-center justify-start overflow-y-auto px-4 pb-4 md:px-8 md:pb-8 backdrop-blur-3xl animate-in fade-in duration-500 custom-scrollbar"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
            {/* Nav Header */}
            <div className="w-full max-w-sm flex justify-between items-center mb-10 shrink-0">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-red animate-pulse" />
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em]">STORY EDITOR</p>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/50 hover:text-white transition-colors p-3 bg-white/5 rounded-2xl hover:bg-brand-red active:scale-95 border border-white/10"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col items-center gap-6 w-full max-w-sm pb-16">
                {/* THE CARD */}
                <div className="relative shadow-[0_0_100px_rgba(255,46,46,0.15)] rounded-[48px] overflow-hidden border border-white/10 transition-transform origin-top scale-90 sm:scale-100">
                    <div
                        ref={cardRef}
                        className="w-[360px] h-[640px] bg-[#050505] relative overflow-hidden font-sans"
                    >
                        {content.type === 'pr' ? (
                            <PRCard
                                userName={user}
                                avatarUrl={avatarUrl || avatar}
                                sport={content.title?.includes('•') ? content.title.split('•')[1].trim() : "Cross Training"}
                                exerciseName={content.stats?.find(s => s.label === "EJERCICIO")?.value || content.title || "Personal Record"}
                                weight={content.stats?.find(s => s.label === "PESO")?.value.replace(/[^0-9.]/g, '') || "0"}
                                unit={content.stats?.find(s => s.label === "PESO")?.value.replace(/[0-9.]/g, '') || "kg"}
                                backgroundImage={content.image}
                                isStory={true}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-between py-12 px-8">
                                {/* Background Visual Elements */}
                                <div className="absolute inset-0 z-0">
                                    {/* Technical Grid Overlay */}
                                    <div className="absolute inset-0 opacity-[0.03]" 
                                         style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                                    
                                    {/* Radial Glows */}
                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-red/10 blur-[120px] -mr-48 -mt-48 rounded-full" />
                                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-red/5 blur-[120px] -ml-48 -mb-48 rounded-full" />
                                </div>

                                {/* Branding Header Section */}
                                <div className="relative z-10 w-full flex flex-col items-center">
                                    <div className="flex items-center gap-3 mb-8">
                                        <span className="text-white font-black text-4xl tracking-tighter italic leading-none">RIVAL</span>
                                        <span className="bg-brand-red text-white text-[10px] font-black px-3 py-1.5 rounded-sm tracking-[0.3em] uppercase -rotate-6 shadow-2xl shadow-red-950/50">FIT</span>
                                    </div>

                                    {/* Performance Header - Strava Style */}
                                    <div className="flex flex-col items-center gap-4 text-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_8px_rgba(255,46,46,0.8)]" />
                                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.4em]">
                                                {isStandardPost ? "ATHLETE UPDATE" : "PERFORMANCE DATA VERIFIED"}
                                            </p>
                                        </div>
                                        <h1 className="text-white font-black text-4xl md:text-5xl italic uppercase tracking-tighter leading-[0.8] mb-1">
                                            {content.title || (isStandardPost ? 'PUBLICACIÓN' : 'ENTRENAMIENTO')}
                                        </h1>
                                        <div className="h-0.5 w-16 bg-brand-red/30 rounded-full" />
                                    </div>
                                </div>

                                {/* Main Performance Data Center */}
                                <div className="relative z-10 w-full flex flex-col items-center gap-8">
                                    {isEndurance ? (
                                        <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-700">
                                            {/* Giant Distance Metric */}
                                            <div className="flex flex-col items-center mb-10">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-white text-8xl font-black italic tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-none">
                                                        {content.stats?.find(s => s.icon === 'distance')?.value.split(' ')[0] || '--'}
                                                    </span>
                                                    <span className="text-brand-red text-3xl font-black italic uppercase tracking-tighter">KM</span>
                                                </div>
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.5em] mt-2">DISTANCIA TOTAL</p>
                                            </div>

                                            {/* Secondary Grid Stats */}
                                            <div className="grid grid-cols-2 gap-10 w-full px-4">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-white text-4xl font-black italic tracking-tighter leading-none">
                                                            {content.stats?.find(s => s.icon === 'pace')?.value || '--'}
                                                        </span>
                                                        <span className="text-brand-red text-[10px] font-black italic">/KM</span>
                                                    </div>
                                                    <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest">RITMO PROMEDIO</p>
                                                </div>
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-white text-4xl font-black italic tracking-tighter leading-none">
                                                            {content.stats?.find(s => s.icon === 'time')?.value || '--'}
                                                        </span>
                                                        <span className="text-brand-red text-[10px] font-black italic uppercase">MIN</span>
                                                    </div>
                                                    <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest">TIEMPO TOTAL</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : isStandardPost ? (
                                        // Standard Text/Social Post Style
                                        <div className="w-full bg-white/[0.03] border border-white/10 rounded-[40px] p-8 backdrop-blur-2xl">
                                            <div className="space-y-4">
                                                <div className="pb-3 border-b border-white/5">
                                                    <p className="text-brand-red font-black text-[10px] uppercase tracking-[0.3em] mb-1">MENSAJE</p>
                                                </div>
                                                <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                                                    <p className="text-white text-[13px] font-medium leading-relaxed text-left whitespace-pre-wrap select-text">
                                                        {content.highlight || 'Sin contenido'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Standard WOD / Workout Style
                                        <div className="w-full bg-white/[0.03] border border-white/10 rounded-[40px] p-8 backdrop-blur-2xl">
                                            <div className="space-y-6">
                                                <div className="pb-4 border-b border-white/5">
                                                    <p className="text-brand-red font-black text-[10px] uppercase tracking-[0.3em] mb-2">RESULTADOS</p>
                                                    <h3 className="text-white font-black text-3xl italic uppercase leading-tight tracking-tighter">{content.highlight || 'FINALIZADO'}</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    {content.stats?.slice(0, 4).map((stat, i) => (
                                                        <div key={i} className="flex flex-col gap-1">
                                                            <span className="text-gray-600 text-[8px] font-black uppercase tracking-widest leading-none">{stat.label}</span>
                                                            <span className="text-white text-xl font-black italic tracking-tighter">{stat.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Abstract GPS/Performance Visualization */}
                                    <div className="w-full h-24 relative overflow-hidden flex items-center justify-center">
                                        <Map className="w-8 h-8 text-brand-red/20 absolute z-0" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-red/10 to-transparent animate-pulse" />
                                        <div className="w-3/4 h-[1px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-20" />
                                        <span className="relative z-10 text-white/20 text-[7px] font-black uppercase tracking-[0.8em]">SIGNAL • OPTIMISED • DATA</span>
                                    </div>
                                </div>

                                {/* Footer - Athlete Passport */}
                                <div className="relative z-10 w-full pt-8 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl border-2 border-brand-red p-0.5">
                                            <div className="w-full h-full rounded-[14px] overflow-hidden bg-black relative">
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt={user} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black uppercase">
                                                        {username.substring(0, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <h4 className="text-white text-sm font-black italic uppercase tracking-tighter leading-none mb-1">{user}</h4>
                                            <p className="text-brand-red text-[8px] font-black uppercase tracking-widest">RIVAL FIT ATHLETE</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <ShieldCheck className="w-5 h-5 text-brand-red mb-1 opacity-50" />
                                        <p className="text-gray-600 text-[7px] font-black uppercase tracking-widest leading-none">RIVALFIT.APP</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Interaction Section */}
                <div className="w-full space-y-4">
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="w-full group relative overflow-hidden py-6 bg-brand-red text-white rounded-[32px] font-black italic uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(255,46,46,0.3)] active:scale-95 transition-all disabled:opacity-50"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        {isGenerating ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span className="text-xs">GENERANDO ARTE...</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3">
                                <Share2 className="w-5 h-5" />
                                <span className="text-sm">COMPARTIR EN INSTAGRAM</span>
                            </div>
                        )}
                    </button>
                    
                    <p className="text-center text-white/30 text-[8px] font-black uppercase tracking-[0.4em] px-10 leading-relaxed">
                        TU RENDIMIENTO ESTÁ SIENDO SINCRONIZADO CON LA ARENA GLOBAL
                    </p>
                </div>
            </div>
        </div>
    );
}
