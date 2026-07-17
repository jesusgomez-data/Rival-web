
"use client";

import { Trophy, Share2, Download, Activity, Calendar, Award, ShieldCheck, X, Send } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";
import { useRef, useState } from "react";
import PRCard from "../app/dashboard/explore/PRCard";

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

export default function ShareableCard({ user, data, onClose }: ShareableCardProps & { onClose?: () => void }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const exportImage = async () => {
        if (!cardRef.current) return null;
        const { toPng } = await import('html-to-image');
        const dataUrl = await toPng(cardRef.current, {
            cacheBust: true,
            pixelRatio: 3,
            quality: 1.0,
            backgroundColor: '#050505',
        });
        const blob = await (await fetch(dataUrl)).blob();
        return {
            dataUrl,
            file: new File([blob], `rival-fit-${user.username}-${Date.now()}.png`, { type: 'image/png' }),
        };
    };

    const downloadImage = (dataUrl: string) => {
        // Appended to the DOM before clicking — some browsers (notably iOS
        // Safari) silently drop a detached <a download> click.
        const link = document.createElement('a');
        link.download = `rival-fit-${user.username}-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const exported = await exportImage();
            if (!exported) return;
            if (navigator.share && navigator.canShare?.({ files: [exported.file] })) {
                await navigator.share({
                    files: [exported.file],
                    title: 'Rival Fit Achievement',
                    text: `¡Mira mi logro en Rival Fit! @${user.username} ha completado: ${data.title}`,
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: 'Rival Fit Achievement',
                    text: `¡Mira mi logro en Rival Fit! @${user.username} ha completado: ${data.title}`,
                    url: window.location.origin,
                });
            } else {
                downloadImage(exported.dataUrl);
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') console.error(e);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const exported = await exportImage();
            if (exported) downloadImage(exported.dataUrl);
        } catch (err) {
            console.error('Download failed:', err);
            alert('Error al descargar la tarjeta. Intenta nuevamente.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleStory = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const exported = await exportImage();
            if (!exported) return;
            if (navigator.share && navigator.canShare?.({ files: [exported.file] })) {
                await navigator.share({
                    files: [exported.file],
                    title: 'Historia Rival Fit',
                    text: 'Mi historia en Rival Fit',
                });
            } else {
                downloadImage(exported.dataUrl);
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') console.error('Story share failed:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            {onClose && (
                <div className="flex justify-end mb-3">
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 hover:bg-brand-red rounded-full text-white transition-colors active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}
            <div
                ref={cardRef}
                className="w-full aspect-[4/5] bg-[#050505] rounded-[48px] overflow-hidden relative border border-white/5 shadow-2xl group/card selection:bg-brand-red/30 keep-all dark-section"
            >
                {data.type === 'pr' ? (
                    <PRCard
                        userName={user.name}
                        avatarUrl={user.avatar}
                        sport={data.title.includes('•') ? data.title.split('•')[1].trim() : "Cross Training"}
                        exerciseName={data.stats.find(s => s.label === "EJERCICIO")?.value || data.title}
                        weight={data.stats.find(s => s.label === "PESO")?.value.replace(/[^0-9.]/g, '') || "0"}
                        unit={data.stats.find(s => s.label === "PESO")?.value.replace(/[0-9.]/g, '') || "kg"}
                        backgroundImage={data.image}
                        isStory={false}
                    />
                ) : (
                    <>
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
                                        {data.type === 'medal' ? <Award className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                                        {data.type === 'medal' ? 'DESAFÍO SUPERADO' : 'MISIÓN COMPLETADA'}
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

                            {/* Bottom Bar Label for Non-PR */}
                            <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-brand-red/50" />
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{data.date}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-brand-red opacity-50" />
                                    <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">DATA VERIFIED</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Decorative Overlay for Elite Rank */}
                {user.rank === 'ELITE' && (
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-red/10 blur-[60px] rounded-full" />
                )}
                <div className="absolute bottom-0 right-0 w-60 h-60 bg-brand-red/5 blur-[80px] rounded-full pointer-events-none" />
            </div>

            {/* Action Buttons (Outside of the captured area for better UI) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6">
                <button
                    onClick={handleShare}
                    disabled={isDownloading}
                    className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[9px] sm:text-[10px] disabled:opacity-60"
                >
                    <Share2 className="w-4 h-4 text-brand-red" />
                    COMPARTIR
                </button>
                <button
                    onClick={handleStory}
                    disabled={isDownloading}
                    className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[9px] sm:text-[10px] disabled:opacity-60"
                >
                    <Send className="w-4 h-4 text-brand-red -rotate-12" />
                    HISTORIA
                </button>
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={clsx(
                        "py-4 bg-brand-red text-white rounded-2xl shadow-glow transition-all active:scale-95 flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[9px] sm:text-[10px]",
                        isDownloading && "opacity-70 cursor-wait"
                    )}
                >
                    {isDownloading ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                    GUARDAR
                </button>
            </div>
        </div>
    );
}
