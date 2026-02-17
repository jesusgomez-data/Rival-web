import React from 'react';
import { clsx } from "clsx";

interface PromoCardProps {
    title?: string;
    subtitle?: string;
    className?: string;
}

export default function PromoCard({
    title = "PUSH YOUR LIMITS",
    subtitle = "NO EXCUSES • JUST RESULTS",
    className
}: PromoCardProps) {
    return (
        <div className={clsx("relative w-full aspect-[4/5] max-w-md mx-auto overflow-hidden rounded-[40px] shadow-2xl group select-none", className)}>

            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center z-0 grayscale contrast-[1.2] brightness-[0.6] mix-blend-luminosity transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop')" }}
            />

            {/* Red Overlay */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-brand-red/80 via-black/60 to-black/20 mix-blend-overlay" />

            {/* Smoke Overlay (CSS approximation) */}
            <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_80%,rgba(220,38,38,0.15),transparent_70%)]" />

            {/* Neon Frame */}
            <div className="absolute inset-8 md:inset-10 border-4 border-brand-red rounded-[30px] shadow-[0_0_20px_#dc2626,inset_0_0_40px_rgba(220,38,38,0.4)] opacity-80 z-30 pointer-events-none" />

            {/* Glass Content */}
            <div className="absolute bottom-20 md:bottom-28 left-1/2 -translate-x-1/2 w-[85%] z-40">
                <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-[30px] p-8 md:p-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    {/* Scanlines */}
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(transparent_0%,rgba(255,255,255,0.03)_1px,transparent_2px)] pointer-events-none" />

                    {/* Main Text */}
                    <div className="relative mb-6 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
                        <h2 className="text-5xl md:text-7xl font-black text-transparent uppercase leading-[0.9] tracking-tighter" style={{ WebkitTextStroke: '1px white' }}>
                            PUSH YOUR
                        </h2>
                        <h2 className="text-5xl md:text-7xl font-black text-white uppercase leading-[0.9] tracking-tighter shadow-[0_0_30px_rgba(220,38,38,0.8)] mt-1">
                            LIMITS
                        </h2>
                    </div>

                    {/* Divider */}
                    <div className="h-0.5 w-full bg-brand-red mb-6 shadow-[0_0_10px_#dc2626]" />

                    {/* Sub Text */}
                    <p className="text-sm md:text-lg font-bold text-white/90 uppercase tracking-[0.3em]">
                        {subtitle}
                    </p>

                    {/* Logo Mark */}
                    <div className="mt-8 flex items-center justify-center gap-3 opacity-90">
                        <svg width="32" height="32" viewBox="0 0 512 512" fill="none" className="drop-shadow-[0_0_10px_#dc2626]">
                            <path
                                d="M160 100H280C360 100 390 160 390 210C390 280 340 310 290 310H220L280 412H360L290 310H300C340 310 420 280 420 190C420 110 360 70 260 70H130L100 442H180L160 100Z"
                                fill="#DC2626"
                            />
                        </svg>
                        <span className="text-xl md:text-2xl font-black text-white tracking-tight">
                            Rival<span className="text-brand-red">Fit</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
