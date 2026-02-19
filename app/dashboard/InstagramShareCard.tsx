'use client';

import React, { useRef, useState, useEffect } from 'react';
import { toBlob } from 'html-to-image';
import { Trophy, Flame, Dumbbell, Instagram, Download, Share2, MapPin, Zap, Wind, TrendingUp, Heart, X } from 'lucide-react';
import Image from 'next/image';
import { clsx } from 'clsx';

interface InstagramShareCardProps {
    user: string;
    avatar: string;
    username: string;
    content: {
        type: 'workout' | 'pr' | 'image' | 'class_result' | 'running' | 'challenge' | 'wod';
        title?: string;
        highlight?: string;
        stats?: Array<{ label: string, value: string, icon?: string }>;
        image?: string;
        mapData?: string; // Base64 or URL for the path preview
        wodData?: any;
        attribution?: {
            username: string;
            avatar: string;
            id?: string;
        };
    };
    onClose: () => void;
}

export default function InstagramShareCard({ user, avatar, username, content, onClose }: InstagramShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (avatar) {
            // Pre-fetch image and convert to Base64 to avoid CORS issues in canvas
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
                    setAvatarUrl(avatar); // Fallback to original URL
                }
            };
            loadAvatar();
        }
    }, [avatar]);

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            // Give extra time for images to load if needed
            const blob = await toBlob(cardRef.current, {
                pixelRatio: 2,
                quality: 1,
            });

            if (!blob) throw new Error('Failed to generate image');

            const file = new File([blob], `rival-share-${Date.now()}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Rival Fit Training',
                    text: '¡Mira mi entrenamiento en Rival Fit!',
                });
            } else {
                // Fallback: Download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rival-fit-share-${username}.png`;
                a.click();
                URL.revokeObjectURL(url);
                alert('Tu tarjeta de Instagram se ha descargado. ¡Súbela a tus Stories!');
            }
        } catch (error) {
            console.error('Error generating share card:', error);
            alert('Error al generar la tarjeta de compartir.');
        } finally {
            setIsGenerating(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center justify-start overflow-y-auto p-4 md:p-8 backdrop-blur-2xl animate-in fade-in duration-300 custom-scrollbar">
            {/* Top Navigation */}
            <div className="w-full max-w-sm flex justify-between items-center mb-6 shrink-0">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Vista Previa</p>
                <button
                    onClick={onClose}
                    className="text-white/50 hover:text-white transition-colors p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 border border-white/10"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col items-center gap-4 w-full max-w-sm pb-10">
                {/* The Card Holder */}
                <div className="relative shadow-2xl shadow-brand-red/10 rounded-[40px] overflow-hidden border border-white/5 scale-[0.75] sm:scale-100 origin-top transition-transform -mb-32 sm:mb-0">
                    {/* The Card (Renders for conversion) */}

                    <div
                        ref={cardRef}
                        className="w-[360px] h-[640px] bg-black relative overflow-hidden flex flex-col items-center justify-between p-10 font-sans"
                        style={{
                            backgroundImage: 'radial-gradient(circle at center, #1a1a1a 0%, #000000 100%)',
                        }}
                    >
                        {/* Background Decorative Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/10 blur-[100px] -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-red/10 blur-[100px] -ml-32 -mb-32" />

                        {/* Branding Header */}
                        <div className="relative z-10 flex flex-col items-center gap-6 pt-4">
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-black text-5xl tracking-tighter italic drop-shadow-lg">RIVAL</span>
                                    <span className="bg-brand-red text-white text-sm font-black px-3 py-1 rounded-md tracking-widest uppercase -rotate-6 shadow-lg shadow-red-900/50">FIT</span>
                                </div>
                                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-brand-red to-transparent rounded-full opacity-50" />
                            </div>

                            {/* User Info - Typography Style */}
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <Trophy className="w-3 h-3 text-brand-red" />
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">ATLETA</p>
                                    <Trophy className="w-3 h-3 text-brand-red" />
                                </div>
                                <h2 className="text-white font-black text-3xl italic uppercase tracking-tighter leading-none text-center">{user}</h2>
                                <p className="text-brand-red font-bold text-sm tracking-[0.2em] uppercase mt-1">@{username}</p>
                            </div>
                        </div>

                        {/* Content Specifics */}
                        <div className="w-full bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Flame className="w-16 h-16 text-brand-red" />
                            </div>

                            <div className="relative z-10 space-y-4">
                                <div className="space-y-1">
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] italic">
                                        {content.type === 'pr' ? 'NUEVO RÉCORD' : (content.type === 'challenge' ? 'DESAFÍO COMPLETADO' : (content.type === 'wod' ? 'WOD COMPLETADO' : 'ACTIVIDAD COMPLETADA'))}
                                    </p>
                                    <h3 className="text-white font-black text-2xl italic uppercase tracking-tight leading-none">
                                        {content.title || 'Entrenamiento'}
                                    </h3>
                                </div>

                                {content.type === 'wod' && content.wodData && (
                                    <div className="space-y-3">
                                        {content.wodData.blocks?.slice(0, 2).map((block: any, bi: number) => (
                                            <div key={bi} className="bg-white/5 rounded-2xl p-3 border border-white/5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black text-brand-red uppercase italic">{block.format || 'METCON'}</span>
                                                    <span className="text-[8px] font-bold text-gray-500 uppercase">
                                                        {block.format === 'EMOM' || block.format === 'DEATH BY' ? (
                                                            `${block.config?.minutes || 15} MINS`
                                                        ) : (block.format === 'TABATA' || block.format === 'INTERVALS') ? (
                                                            `${block.config?.rounds || 8} RDS`
                                                        ) : block.config?.timecap ? (
                                                            `CAP: ${block.config.timecap}`
                                                        ) : null}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {block.exercises?.slice(0, 4).map((ex: any, ei: number) => (
                                                        <div key={ei} className="space-y-1">
                                                            <div className="flex justify-between items-center text-[10px]">
                                                                <span className="text-gray-300 font-bold uppercase truncate pr-4">{ex.name}</span>
                                                                <span className="text-white font-black shrink-0">{ex.reps} {ex.detail && `(${ex.detail})`}</span>
                                                            </div>
                                                            {ex.showRounds && ex.roundDetails && ex.roundDetails.length > 0 && (
                                                                <div className="grid grid-cols-5 gap-1 pt-1 pb-2">
                                                                    {ex.roundDetails.map((rd: string, ri: number) => rd && (
                                                                        <div key={ri} className="bg-white/10 rounded-md py-1 text-[8px] text-center font-black text-brand-red border border-white/5">
                                                                            {rd}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(block.exercises?.length > 4) && (
                                                        <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">+ {block.exercises.length - 4} EJERCICIOS MÁS</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Result Summary - Compact at the Bottom */}
                                        {(content.wodData.summary || content.stats?.length > 0 || content.wodData._stats?.length > 0) && (
                                            <div className="flex items-center gap-2 pt-2 border-t border-white/10 mt-1">
                                                <div className="flex-1">
                                                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-wider">
                                                        {content.wodData.summary?.scoreType || content.stats?.[0]?.label || content.wodData._stats?.[0]?.label || 'PUNTUACIÓN'}
                                                    </p>
                                                    <p className="text-brand-red font-black text-lg italic leading-none truncate">
                                                        {content.wodData.summary?.scoreLabel || content.stats?.[0]?.value || content.wodData._stats?.[0]?.value || '-'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-wider">
                                                        {content.stats?.[1]?.label || content.wodData._stats?.[1]?.label || 'TIEMPO'}
                                                    </p>
                                                    <p className="text-white font-black text-sm italic leading-none truncate">
                                                        {content.wodData.summary?.totalTime || content.stats?.[1]?.value || content.wodData._stats?.[1]?.value || '--:--'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {content.highlight && content.type !== 'wod' && (
                                    <div className="bg-brand-red/10 border-l-4 border-brand-red py-3 px-4 rounded-r-xl">
                                        <p className="text-brand-red font-bold text-lg leading-tight uppercase italic">{content.highlight}</p>
                                    </div>
                                )}

                                {content.stats && content.stats.length > 0 && content.type !== 'wod' && (
                                    <div className={clsx(
                                        "grid gap-4 pt-2",
                                        content.type === 'running' ? "grid-cols-3" : "grid-cols-2"
                                    )}>
                                        {content.stats.map((stat, i) => (
                                            <div key={i} className="flex flex-col">
                                                <span className="text-gray-500 text-[8px] font-black uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                                                    {stat.icon === 'distance' && <MapPin className="w-2 h-2" />}
                                                    {stat.icon === 'pace' && <Wind className="w-2 h-2" />}
                                                    {stat.icon === 'time' && <Zap className="w-2 h-2" />}
                                                    {stat.icon === 'elevation' && <TrendingUp className="w-2 h-2" />}
                                                    {stat.icon === 'heart' && <Heart className="w-2 h-2" />}
                                                    {stat.label}
                                                </span>
                                                <span className={clsx(
                                                    "text-white font-black italic leading-none",
                                                    content.type === 'running' ? "text-lg" : "text-xl"
                                                )}>{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.type === 'running' && (
                                    <div className="mt-6 w-full aspect-[2/1] bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-20">
                                            <div className="w-full h-full border-2 border-dashed border-brand-red/30 rounded-full scale-150 rotate-12" />
                                        </div>
                                        <MapPin className="w-4 h-4 text-brand-red absolute top-1/2 left-1/2 -ms-2 -mt-2 animate-pulse" />
                                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">RECORRIDO GPS</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-brand-red opacity-0 group-hover:opacity-20 transition-opacity animate-pulse" />
                                    <Trophy className="w-5 h-5 text-brand-red relative z-10" />
                                </div>
                                <div className="text-left leading-none">
                                    <p className="text-white font-black text-[10px] uppercase tracking-widest">DESCÁRGATE LA APP</p>
                                    <p className="text-gray-500 font-bold text-[8px] uppercase tracking-widest">RIVALFIT.APP</p>
                                </div>
                            </div>
                            <p className="text-gray-600 text-[8px] font-bold uppercase tracking-[0.4em]">JOIN THE ARENA • JOIN THE ARENA</p>
                        </div>
                    </div>
                </div>

                {/* UI Buttons */}
                <div className="flex flex-col gap-4 w-full bg-white/5 p-6 rounded-[32px] border border-white/10 backdrop-blur-xl shrink-0">
                    <button
                        onClick={handleShare}
                        disabled={isGenerating}
                        className="w-full py-5 bg-brand-red text-white rounded-2xl font-black italic uppercase tracking-[0.2em] shadow-glow flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <><Instagram className="w-5 h-5" /> Compartir en Instagram</>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="w-full py-4 bg-white/10 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/20 transition-all active:scale-95 border border-white/5"
                    >
                        Cerrar Editor
                    </button>
                </div>
            </div>
        </div>
    );
}
