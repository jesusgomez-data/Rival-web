"use client";

import React, { useRef, useState } from 'react';
import { Download, X, Loader2, Send } from 'lucide-react';
import RouteMap from './RouteMap';
import { toPng } from 'html-to-image';

interface RunShareCardProps {
    imageUrl: string | null;
    distance: number;
    time: number;
    pace: string;
    elevation: number;
    path: { lat: number; lon: number }[];
    date: string;
    userName: string;
    onClose: () => void;
}

export default function RunShareCard({ imageUrl, distance, time, pace, elevation, path, date, userName, onClose }: RunShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                quality: 1.0,
                pixelRatio: 3,
                cacheBust: true,
                skipAutoScale: true
            });
            const link = document.createElement('a');
            link.download = `RivalFit-Run-${date.replace(/\s/g, '-')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error(err);
            alert("Error al generar la descarga. Intenta de nuevo.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShareToStory = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, {
                quality: 1.0,
                pixelRatio: 3,
                cacheBust: true,
                skipAutoScale: true,
            });

            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], `RivalFit-Run-${Date.now()}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Rival Fit · Carrera',
                    text: '¡Mira mi carrera de hoy en Rival Fit!',
                });
                onClose();
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RivalFit-Run-${Date.now()}.png`;
                a.click();
                URL.revokeObjectURL(url);
                alert('La imagen se ha descargado. Ábrela desde tu galería y súbela a Instagram Stories.');
                onClose();
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                console.error(err);
                alert('No se pudo abrir Instagram. Descarga la imagen y súbela manualmente.');
            }
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300 overscroll-contain">
            <div className="w-full max-w-[360px] flex flex-col gap-3 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center text-white px-2">
                    <h3 className="font-heading font-black italic uppercase tracking-tighter text-lg">Tu Resumen de Carrera</h3>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-brand-red transition-colors text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* THE STICKER/CARD */}
                <div
                    ref={cardRef}
                    className="aspect-[9/16] w-full bg-[#050505] rounded-[40px] overflow-hidden relative shadow-2xl border border-white/10"
                >
                    {imageUrl ? (
                        <img src={imageUrl} alt="Run" className="absolute inset-0 w-full h-full object-cover opacity-60" crossOrigin="anonymous" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-brand-red/20 via-black to-black" />
                    )}

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />

                    {/* Patterns */}
                    <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    {/* CONTENT */}
                    <div className="relative h-full flex flex-col items-center justify-between py-12 px-8 text-white">
                        {/* Brand */}
                        <div className="text-center">
                            <h2 className="text-3xl font-heading font-black italic uppercase tracking-tighter shadow-black drop-shadow-lg">RIVAL <span className="text-brand-red">FIT</span></h2>
                            <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.4em] mt-1">Status Report</p>
                        </div>

                        {/* STATS */}
                        <div className="w-full space-y-4 text-center">
                            <div className="space-y-0">
                                <p className="text-8xl font-heading font-black italic tracking-tighter text-white drop-shadow-[0_0_25px_rgba(220,38,38,0.6)]">{(distance / 1000).toFixed(2)}</p>
                                <p className="text-xs font-black uppercase text-brand-red tracking-[0.5em] -mt-2 drop-shadow-md">KILÓMETROS</p>
                            </div>

                            <div className="grid grid-cols-2 gap-8 border-y border-white/10 py-6 mx-2">
                                <div className="space-y-1">
                                    <p className="text-2xl font-heading font-black italic text-white">{Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}</p>
                                    <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em]">Tiempo</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-2xl font-heading font-black italic text-white">{pace}</p>
                                    <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em]">Ritmo Med</p>
                                </div>
                            </div>
                        </div>

                        {/* MAP & DATE */}
                        <div className="w-full flex flex-col items-center gap-8">
                            <div className="w-40 h-40 bg-black/50 backdrop-blur-md rounded-[32px] border border-white/20 p-6 flex items-center justify-center shadow-2xl relative group">
                                <div className="absolute inset-0 bg-brand-red/5 blur-xl group-hover:bg-brand-red/10 transition-colors" />
                                <RouteMap path={path} className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" color="white" />
                            </div>

                            <div className="text-center space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/80">{userName}</p>
                                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/30">{date}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleShareToStory}
                        disabled={isDownloading}
                        className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-heading font-black italic uppercase tracking-widest flex items-center justify-center gap-2 shadow-glow active:scale-95 transition-all text-xs border border-white/10 disabled:opacity-60"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -rotate-12" />}
                        INSTAGRAM
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 py-4 bg-white text-black rounded-2xl font-heading font-black italic uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/90 active:scale-95 transition-all text-xs"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isDownloading ? "..." : "DESCARGAR PNG"}
                    </button>
                </div>

                <p className="text-center text-[9px] text-white/40 font-black uppercase tracking-widest px-8">Diseño optimizado para Instagram y feed de Rival Fit.</p>
            </div>
        </div>
    );
}
