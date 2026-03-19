"use client";

import { Trophy, Share2, Download, Instagram, Swords, Dumbbell, Activity, Calendar, Shield, Star, Award, X } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";
import { useRef, useState } from "react";
// We would usually use html2canvas for downloading, but let's focus on the UI first
// and provide a native share as fallback.

interface ShareableCardProps {
    user: {
        name: string;
        username: string;
        avatar: string;
        level: number;
        rank: string;
    };
    data: {
        type: 'pr' | 'workout' | 'medal';
        title: string;
        date: string;
        stats: { label: string; value: string }[];
        image?: string;
    };
}

export default function ShareableCard({ user, data }: ShareableCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Rival Fit Achievement`,
                    text: `¡Mira mi logro en Rival Fit! @${user.username} ha completado: ${data.title}`,
                    url: window.location.origin
                });
            } catch (e) { console.error(e); }
        }
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const { toPng } = await import('html-to-image');

            // Generate PNG
            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                quality: 1.0,
                backgroundColor: '#050505',
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `rival-fit-${user.username}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

        } catch (err) {
            console.error('Download failed:', err);
            alert('Error al descargar la tarjeta. Intenta nuevamente.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div
            ref={cardRef}
            className="w-full aspect-[4/5] bg-[#050505] rounded-[48px] overflow-hidden relative border border-white/5 shadow-2xl group/card selection:bg-brand-red/30 keep-all dark-section"
        >
            {/* Background Texture & Effects */}
            <div className="absolute inset-0 z-0">
                {data.image ? (
                    <Image
                        src={data.image}
                        alt="Achievement"
                        fill
                        className="object-cover opacity-30 grayscale group-hover/card:grayscale-0 group-hover/card:scale-105 transition-all duration-1000"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 via-black to-black" />
                )}

                {/* Patterns */}
                <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                {/* Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black to-transparent" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 h-full flex flex-col p-6 sm:p-10">
                {/* Header: User & Brand */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div className="flex items-center gap-3 sm:gap-4 bg-white/5 backdrop-blur-md p-1.5 sm:p-2 pr-4 sm:pr-6 rounded-full border border-white/10">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-brand-red relative shrink-0 shadow-glow-sm">
                            <Image
                                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                                alt={user.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-white font-black text-[10px] sm:text-xs uppercase italic tracking-wider truncate max-w-[100px]">{user.name}</h4>
                            <p className="text-[8px] sm:text-[9px] font-black text-brand-red uppercase tracking-[0.2em] leading-none">Soldado Lvl {user.level}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[7px] sm:text-[8px] font-black text-gray-500 uppercase tracking-[0.5em] mb-1">Ecosistema</span>
                        <h1 className="text-lg sm:text-xl font-heading font-black text-white italic tracking-tighter leading-none">RIVAL <span className="text-brand-red">FIT</span></h1>
                    </div>
                </div>

                {/* Badge/Type Ribbon */}
                <div className="flex justify-center mb-4 sm:mb-6">
                    <div className="bg-brand-red px-4 sm:px-6 py-1 sm:py-1.5 rounded-full shadow-glow selection:text-white">
                        <span className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2 italic">
                            {data.type === 'pr' ? <Trophy className="w-3 h-3" /> : data.type === 'medal' ? <Award className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                            {data.type === 'pr' ? 'NUEVO RÉCORD PERSONAL' : data.type === 'medal' ? 'DESAFÍO SUPERADO' : 'MISIÓN COMPLETADA'}
                        </span>
                    </div>
                </div>

                {/* Main achievement area */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
                    <h2 className="text-4xl sm:text-6xl font-heading font-black text-white italic uppercase tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(0,0,0,1)] line-clamp-3">
                        {data.title}
                    </h2>
                    <div className="w-12 sm:w-20 h-1 bg-brand-red/30 rounded-full" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {data.stats.map((stat, i) => (
                        <div key={i} className="bg-black/40 backdrop-blur-xl p-4 rounded-3xl border border-white/5 text-center group/stat hover:border-brand-red/30 transition-colors">
                            <h3 className="text-lg sm:text-2xl font-heading font-black text-white italic leading-none mb-1 group-hover/stat:text-brand-red transition-colors truncate">
                                {stat.value}
                            </h3>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest truncate">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-red/50" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{data.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleShare}
                            className="p-3 bg-white/5 hover:bg-white text-gray-400 hover:text-black rounded-2xl border border-white/10 transition-all active:scale-95"
                            title="Compartir enlace"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className={clsx(
                                "py-3 px-5 bg-brand-red text-white rounded-2xl shadow-glow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2",
                                isDownloading && "opacity-70 cursor-wait"
                            )}
                            title="Descargar imagen"
                        >
                            {isDownloading ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">GUARDAR</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Decorative Overlay for Elite Rank */}
            {user.rank === 'ELITE' && (
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-red/10 blur-[60px] rounded-full" />
            )}
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-brand-red/5 blur-[80px] rounded-full pointer-events-none" />
        </div>
    );
}
