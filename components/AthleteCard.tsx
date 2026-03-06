"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Share2, Star } from "lucide-react";
import clsx from "clsx";

interface AthleteCardProps {
    profile: {
        full_name: string;
        username: string;
        avatar_url?: string;
        level?: number;
        xp?: number;
        sport?: string;
        power_stat?: number;
        endurance_stat?: number;
        agility_stat?: number;
        consistency_stat?: number;
        country?: string;
    };
    stats: {
        totalWorkouts: number;
        totalVolume: number;
        streak: number;
        prCount: number;
        wins?: number;
        percentile?: number;
    };
}

const SPORT_COLORS: Record<string, { from: string; to: string; accent: string }> = {
    crossfit: { from: '#7f1d1d', to: '#450a0a', accent: '#ef4444' },
    gym: { from: '#1e1b4b', to: '#0f0a2b', accent: '#8b5cf6' },
    running: { from: '#064e3b', to: '#022c22', accent: '#10b981' },
    ocr: { from: '#78350f', to: '#451a03', accent: '#f59e0b' },
    calisthenics: { from: '#1e3a5f', to: '#0d2137', accent: '#3b82f6' },
    default: { from: '#7f1d1d', to: '#1a0a0a', accent: '#ef4444' },
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
    const clamped = Math.min(Math.max(Math.round(value), 0), 99);
    return (
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-white/60 uppercase w-14 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${clamped}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full" style={{ backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-black text-white w-6 text-right">{clamped}</span>
        </div>
    );
}

export default function AthleteCard({ profile, stats }: AthleteCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const sport = profile.sport?.toLowerCase() || 'default';
    const colors = SPORT_COLORS[sport] || SPORT_COLORS.default;

    const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

    // Pre-load avatar to Base64 to avoid CORS issues with canvas generation
    useEffect(() => {
        if (!profile.avatar_url) return;
        
        const loadAvatar = async () => {
            try {
                const response = await fetch(profile.avatar_url!, { mode: 'cors' });
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => setAvatarBase64(reader.result as string);
                reader.readAsDataURL(blob);
            } catch (e) {
                console.error("Error loading avatar for canvas:", e);
                // Fallback to original URL if proxy fails, but it might break download
                setAvatarBase64(profile.avatar_url!);
            }
        };

        loadAvatar();
    }, [profile.avatar_url]);

    const overallRating = Math.min(
        Math.round(
            (Math.min((profile.power_stat || 0) / 10, 99) * 0.25) +
            (Math.min((profile.endurance_stat || 0) / 10, 99) * 0.25) +
            (Math.min((profile.agility_stat || 0) / 10, 99) * 0.2) +
            (Math.min((profile.consistency_stat || 0) / 10, 99) * 0.15) +
            (Math.min(stats.streak * 3, 99) * 0.15)
        ), 99
    );

    const levelLabel = overallRating >= 85 ? 'ELITE' : overallRating >= 70 ? 'GOLD' : overallRating >= 55 ? 'SILVER' : 'ROOKIE';
    const levelGradient = overallRating >= 85 ? 'from-yellow-400 to-amber-600' : overallRating >= 70 ? 'from-yellow-300 to-yellow-500' : overallRating >= 55 ? 'from-gray-300 to-gray-500' : 'from-amber-700 to-amber-900';

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const { toPng } = await import('html-to-image');
            
            // Wait a tiny bit for any animations to settle
            await new Promise(resolve => setTimeout(resolve, 200));

            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 3,
                backgroundColor: colors.to,
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                }
            });

            const link = document.createElement('a');
            link.download = `rival-card-${profile.username}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            console.error('Download failed:', e);
            alert('Error al generar la imagen. Intenta de nuevo.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Card */}
            <div ref={cardRef}
                className="relative w-64 h-96 rounded-[1.5rem] overflow-hidden shadow-2xl select-none"
                style={{ background: `linear-gradient(145deg, ${colors.from}, ${colors.to})` }}>
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 30%, ${colors.accent}33 0%, transparent 70%)` }} />

                {/* Top Section */}
                <div className="relative z-10 pt-5 px-5 pb-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className={clsx("text-5xl font-heading font-black leading-none bg-gradient-to-b", levelGradient, "bg-clip-text text-transparent")}>{overallRating}</div>
                            <div className={clsx("text-[10px] font-black tracking-[0.25em] mt-0.5 bg-gradient-to-r", levelGradient, "bg-clip-text text-transparent")}>{levelLabel}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-white/50 tracking-widest uppercase">{profile.sport || 'Athlete'}</div>
                            <div className="text-[10px] font-black text-white/30">{profile.country || '🌍'}</div>
                            <div className="mt-1 flex items-center gap-1 justify-end">
                                {Array.from({ length: Math.min(Math.floor(overallRating / 20), 5) }).map((_, i) => (
                                    <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Avatar — use plain img so html2canvas can capture it */}
                <div className="relative z-10 flex justify-center -mt-2">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                        style={{ borderColor: colors.accent }}>
                        {(avatarBase64 || profile.avatar_url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarBase64 || profile.avatar_url}
                                alt={profile.full_name}
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white"
                                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                {(profile.full_name || 'A').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Name */}
                <div className="relative z-10 text-center mt-2 px-4">
                    <p className="text-white font-black text-sm uppercase tracking-tight leading-tight">{profile.full_name}</p>
                    <p className="text-white/40 text-[9px] font-bold tracking-widest">@{profile.username}</p>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px my-3" style={{ background: `linear-gradient(to right, transparent, ${colors.accent}80, transparent)` }} />

                {/* Stats */}
                <div className="relative z-10 px-5 space-y-1.5">
                    <StatBar label="Potencia" value={profile.power_stat || 0} color={colors.accent} />
                    <StatBar label="Resistencia" value={profile.endurance_stat || 0} color={colors.accent} />
                    <StatBar label="Agilidad" value={profile.agility_stat || 0} color={colors.accent} />
                    <StatBar label="Constancia" value={profile.consistency_stat || 0} color={colors.accent} />
                </div>

                {/* Bottom row */}
                <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-3 flex justify-between items-end">
                    <div className="flex gap-3">
                        {[
                            { val: stats.totalWorkouts, label: 'WKT' },
                            { val: stats.streak, label: 'RACHA' },
                            { val: stats.prCount, label: 'PRs' },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <p className="text-white font-black text-sm leading-none">{s.val}</p>
                                <p className="text-white/40 text-[8px] font-black uppercase">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-right">
                        <p className="text-white/20 text-[8px] font-black tracking-widest">RIVAL FIT</p>
                        <p className="text-white/10 text-[7px]">rivalfit.app</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className={clsx(
                        "flex items-center gap-2 bg-brand-red text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_4px_15px_rgba(220,38,38,0.3)]",
                        isDownloading && "opacity-70 cursor-wait"
                    )}
                >
                    {isDownloading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Download className="w-3.5 h-3.5" />
                    )}
                    {isDownloading ? 'Generando...' : 'Descargar'}
                </button>
                <button
                    onClick={async () => {
                        if (navigator.share) {
                            await navigator.share({ title: `${profile.full_name} · Rival Fit`, text: `Mi Athlete Card en Rival Fit 🔥 Rating: ${overallRating} | @${profile.username}`, url: `https://rivalfit.app/dashboard/profile/${profile.username}` });
                        }
                    }}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">
                    <Share2 className="w-3.5 h-3.5" /> Compartir
                </button>
            </div>
        </div>
    );
}
