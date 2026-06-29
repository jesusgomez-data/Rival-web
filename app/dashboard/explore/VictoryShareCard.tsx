"use client";

import { Trophy, Share2, Download, Instagram, X, Swords, Crown, TrendingUp, Loader2 } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";
import { useRef, useState, useEffect } from "react";
import { toBlob, toPng } from "html-to-image";
import { createUserPost } from "./actions";
import { createStory } from "../stories/actions";

interface VictoryShareCardProps {
    winner: {
        name: string;
        username: string;
        avatar: string;
        score: number | null | undefined;
    };
    loser: {
        name: string;
        username: string;
        avatar: string;
        score: number | null | undefined;
    };
    onClose: () => void;
}

export default function VictoryShareCard({ winner, loser, onClose }: VictoryShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [winnerAvatarBase64, setWinnerAvatarBase64] = useState<string | null>(null);
    const [loserAvatarBase64, setLoserAvatarBase64] = useState<string | null>(null);

    // Effect to pre-load avatars as Base64 to avoid CORS issues with canvas generation
    useEffect(() => {
        const loadAvatar = async (url: string, setter: (val: string) => void) => {
            if (!url) return;
            try {
                const response = await fetch(url, { mode: 'cors' });
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => setter(reader.result as string);
                reader.readAsDataURL(blob);
            } catch (e) {
                console.error("Error loading avatar for canvas:", e);
                setter(url); // Fallback
            }
        };

        if (winner.avatar) loadAvatar(winner.avatar, setWinnerAvatarBase64);
        if (loser.avatar) loadAvatar(loser.avatar, setLoserAvatarBase64);
    }, [winner.avatar, loser.avatar]);

    const dataUrlToBlob = (dataUrl: string) => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const generateShareImage = async () => {
        if (!cardRef.current) return null;
        try {
            // Give time for images to load with crossOrigin
            await new Promise(r => setTimeout(r, 100));
            return await toPng(cardRef.current, {
                pixelRatio: 2,
                quality: 1,
                cacheBust: true,
            });
        } catch (error) {
            console.error('Error generating image:', error);
            return null;
        }
    };

    const handleRivalPost = async () => {
        setIsPosting(true);
        try {
            const dataUrl = await generateShareImage();
            if (!dataUrl) throw new Error("No image generated");

            const blob = dataUrlToBlob(dataUrl);
            const file = new File([blob], `duel-victory-${Date.now()}.png`, { type: 'image/png' });

            const formData = new FormData();
            formData.append('media', file);
            formData.append('content', `¡He ganado un duelo contra ${loser.name}! 👊🔥 #DuelVictory #RivalFit`);
            formData.append('media_type', 'image');

            const res = await createUserPost(formData);
            if (res.success) {
                alert("¡Publicado en el Feed!");
                onClose();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            alert(`Error al publicar: ${error.message}`);
        } finally {
            setIsPosting(false);
        }
    };

    const handleRivalStory = async () => {
        setIsPosting(true);
        try {
            const dataUrl = await generateShareImage();
            if (!dataUrl) throw new Error("No image generated");

            const blob = dataUrlToBlob(dataUrl);
            const file = new File([blob], `duel-story-${Date.now()}.png`, { type: 'image/png' });

            const formData = new FormData();
            formData.append('media', file);
            formData.append('media_type', 'image');
            formData.append('metadata', JSON.stringify({
                type: 'duel_victory',
                winner: winner.username,
                loser: loser.username
            }));

            const res = await createStory(formData);
            if (res.success) {
                alert("¡Subido a tus Historias!");
                onClose();
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            alert(`Error al publicar story: ${error.message}`);
        } finally {
            setIsPosting(false);
        }
    };

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);
        try {
            const dataUrl = await generateShareImage();
            if (!dataUrl) throw new Error('Failed to generate image');

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `victoria-rival-${winner.username}-${Date.now()}.png`;
            a.click();
        } catch (error) {
            console.error('Error downloading victory card:', error);
            alert('Error al descargar la tarjeta.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsGenerating(true);

        try {
            const dataUrl = await generateShareImage();
            if (!dataUrl) throw new Error('Failed to generate image');

            const blob = dataUrlToBlob(dataUrl);
            const file = new File([blob], `victoria-rival-${Date.now()}.png`, { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Victoria en Rival Fit',
                    text: `¡He ganado un duelo en Rival Fit! 👊 #RivalFit #Victoria`,
                });
            } else {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `victoria-rival-${Date.now()}.png`;
                a.click();
                alert('La tarjeta se ha descargado. ¡Compártela en tus redes!');
            }
        } catch (error) {
            console.error('Error sharing victory card:', error);
            alert('Error al compartir la tarjeta.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg mb-20 md:mb-0">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                >
                    <X className="w-8 h-8" />
                </button>

                {/* THE CARD */}
                <div
                    ref={cardRef}
                    className="w-full aspect-[4/5] bg-black rounded-[40px] overflow-hidden relative border border-white/10 shadow-[0_0_50px_rgba(220,38,38,0.2)]"
                >
                    {/* Background Effects */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-red/20 via-transparent to-black" />
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.15),transparent_70%)]" />

                        {/* Mesh Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] invert" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
                    </div>

                    <div className="relative z-10 h-full flex flex-col py-8 px-6 items-center text-center">
                        {/* Header */}
                        <div className="mt-4 mb-2">
                            <div className="bg-brand-red text-white py-1 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-4 inline-block shadow-glow">
                                Victoria Total
                            </div>
                            <h2 className="text-4xl md:text-5xl font-heading font-black text-white italic uppercase tracking-tighter leading-none">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Duelo</span> <br />
                                Finalizado
                            </h2>
                        </div>

                        {/* Versus Visual */}
                        <div className="flex-1 w-full flex items-center justify-center gap-4 my-4">
                            {/* Winner Side */}
                            <div className="flex-1 flex flex-col items-center">
                                <div className="relative mb-4">
                                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-brand-red p-1 shadow-[0_0_30px_rgba(220,38,38,0.4)] relative">
                                        <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-900">
                                            <img
                                                src={winnerAvatarBase64 || winner.avatar || `https://ui-avatars.com/api/?name=${winner.name}`}
                                                alt={winner.name}
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute -top-3 -right-3 bg-yellow-400 p-2 rounded-full shadow-lg transform rotate-12 border-2 border-black">
                                            <Crown className="w-5 h-5 text-black" />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-lg font-black text-white uppercase italic tracking-tighter truncate w-full px-2">{winner.name}</p>
                                <div className="mt-2 flex items-center gap-1.5 text-brand-red font-black text-2xl">
                                    {(winner.score ?? 0).toLocaleString()} <span className="text-[10px] uppercase tracking-widest text-gray-500">pts</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                                <Swords className="w-6 h-6 text-white/20" />
                                <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                            </div>

                            {/* Loser Side */}
                            <div className="flex-1 flex flex-col items-center opacity-60 grayscale-[0.5]">
                                <div className="relative mb-4">
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/20 p-1">
                                        <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-900">
                                            <img
                                                src={loserAvatarBase64 || loser.avatar || `https://ui-avatars.com/api/?name=${loser.name}`}
                                                alt={loser.name}
                                                crossOrigin="anonymous"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-tight truncate w-full px-2">{loser.name}</p>
                                <div className="mt-1 flex items-center gap-1.5 text-gray-400 font-bold">
                                    {(loser.score ?? 0).toLocaleString()} <span className="text-[8px] uppercase tracking-widest">pts</span>
                                </div>
                            </div>
                        </div>

                        {/* Branding Footer */}
                        <div className="mt-auto mb-2 w-full pt-4 border-t border-white/5 flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="bg-brand-red w-4 h-4 rounded-sm flex items-center justify-center">
                                    <Swords className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Rival Fit</span>
                            </div>
                            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Descarga la app en rivalfit.app</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <button
                        onClick={handleRivalPost}
                        disabled={isGenerating || isPosting}
                        className="bg-brand-red p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest text-[10px] shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                        Rival Post
                    </button>
                    <button
                        onClick={handleRivalStory}
                        disabled={isGenerating || isPosting}
                        className="bg-brand-blue p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest text-[10px] shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                        Rival Story
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isGenerating || isPosting}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest text-[10px] shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <Instagram className="w-5 h-5" />
                        Instagram
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating || isPosting}
                        className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 text-gray-400" />}
                        Galería
                    </button>
                </div>
            </div>
        </div>
    );
}

