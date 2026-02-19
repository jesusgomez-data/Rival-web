"use client";

import { motion } from "framer-motion";
import {
    Zap,
    Play,
    Swords,
    Trophy,
    Plus,
    X,
    MessageCircle
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/app/LanguageContext";

export default function EssentialsHero() {
    const [isVisible, setIsVisible] = useState(true);
    const { language } = useLanguage();

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-red to-brand-orange p-1 shadow-[0_20px_50px_rgba(239,68,68,0.3)]"
        >
            <div className="bg-black/90 rounded-[31px] p-6 md:p-8 relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/20 blur-[100px] -mr-32 -mt-32" />

                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-brand-red/20 border border-brand-red/30">
                            <Zap className="w-5 h-5 text-brand-red fill-current" />
                        </div>
                        <h2 className="text-xl font-heading font-black italic tracking-tighter uppercase text-white">
                            {language === 'es' ? 'Guía de Inicio Rápido' : 'Quick Start Guide'}
                        </h2>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4 mb-8">
                        <EssentialItem
                            icon={<Plus className="w-5 h-5" />}
                            title={language === 'es' ? 'Publica' : 'Post'}
                            desc={language === 'es' ? 'Sube tu primer entreno' : 'Log your first workout'}
                        />
                        <EssentialItem
                            icon={<Swords className="w-5 h-5" />}
                            title={language === 'es' ? 'Duelo' : 'Duel'}
                            desc={language === 'es' ? 'Reta a un amigo' : 'Challenge a rival'}
                        />
                        <EssentialItem
                            icon={<Trophy className="w-5 h-5" />}
                            title={language === 'es' ? 'Leaderboard' : 'Leaderboard'}
                            desc={language === 'es' ? 'Mira tu ranking' : 'Check your global rank'}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button className="flex-1 bg-brand-red hover:bg-brand-accent text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-glow">
                            <Play className="w-4 h-4 fill-current" />
                            {language === 'es' ? 'Ver video tutorial' : 'Watch video tutorial'}
                        </button>
                        <button className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                            <MessageCircle className="w-4 h-4" />
                            {language === 'es' ? 'Hablar con Soporte' : 'Contact Support'}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function EssentialItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-red/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red mb-3 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
            <p className="text-[10px] text-gray-400 font-medium leading-tight uppercase tracking-wider">{desc}</p>
        </div>
    );
}
