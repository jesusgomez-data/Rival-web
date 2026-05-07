"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
    X, ChevronRight, Play, Camera, Dumbbell, Trophy, Zap,
    Plus, ArrowRight, Clock, Heart, MessageCircle, Share2, Flame, Star
} from "lucide-react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type ContentType = 'historia' | 'post' | 'wod' | 'pr';

interface ContentCard {
    id: ContentType;
    emoji: string;
    title: string;
    subtitle: string;
    howTo: string;
    color: string;
    bg: string;
    border: string;
    steps: string[];
    preview: React.ReactNode;
}

// ── Mock previews ─────────────────────────────────────────────────────────────
function StoryPreview() {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-16 h-28 rounded-2xl bg-gradient-to-b from-zinc-700 to-zinc-900 border border-white/10 overflow-hidden relative shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                <div className="absolute bottom-2 left-0 right-0 text-center text-[6px] font-black text-white uppercase tracking-wider">24h</div>
                <div className="absolute top-2 left-2 right-2 h-0.5 bg-white/40 rounded-full">
                    <div className="h-full w-2/3 bg-white rounded-full" />
                </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-red rounded-full flex items-center justify-center border-2 border-black shadow">
                <Clock className="w-3 h-3 text-white" />
            </div>
        </div>
    );
}

function PostPreview() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-white/10 flex flex-col overflow-hidden shadow-xl">
                <div className="flex-1 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white/40" />
                </div>
                <div className="px-1.5 py-1 space-y-0.5">
                    <div className="flex gap-1.5 items-center">
                        <Heart className="w-2 h-2 text-brand-red fill-brand-red" />
                        <MessageCircle className="w-2 h-2 text-white/40" />
                        <Share2 className="w-2 h-2 text-white/40" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function WodPreview() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 bg-zinc-900 border border-brand-red/30 rounded-xl p-2 shadow-xl space-y-1.5">
                <div className="flex items-center gap-1">
                    <Dumbbell className="w-2.5 h-2.5 text-brand-red" />
                    <div className="h-1.5 w-10 bg-brand-red/40 rounded-full" />
                </div>
                <div className="space-y-1">
                    {['AMRAP', 'EMOM', 'FOR TIME'].map((t, i) => (
                        <div key={t} className="flex items-center gap-1">
                            <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-brand-red' : 'bg-white/20'}`} />
                            <div className="h-1 flex-1 bg-white/10 rounded-full" />
                        </div>
                    ))}
                </div>
                <div className="bg-brand-red/10 border border-brand-red/20 rounded p-1 text-center">
                    <span className="text-[5px] font-black text-brand-red uppercase">Resultado</span>
                </div>
            </div>
        </div>
    );
}

function PrPreview() {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-1">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="text-[10px] font-black text-yellow-400 uppercase">¡PR!</div>
                <div className="text-[8px] text-white/40 font-bold">100 kg</div>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EssentialsHero() {
    const [isVisible, setIsVisible]     = useState(false);
    const [selected, setSelected]       = useState<ContentType>('historia');
    const [showFullGuide, setShowFullGuide] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const hidden = localStorage.getItem('rival_essentials_v2_hidden');
        if (!hidden) setIsVisible(true);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('rival_essentials_v2_hidden', 'true');
    };

    const cards: ContentCard[] = [
        {
            id: 'historia',
            emoji: '📸',
            title: 'Historia',
            subtitle: 'Dura 24h',
            howTo: 'Toca el círculo "+" en las historias',
            color: 'text-pink-400',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/30',
            steps: [
                'Ve al inicio del feed',
                'Toca tu círculo con "+" en la barra de historias',
                'Sube una foto o video (desaparece en 24h)',
                'Añade stickers, texto y música',
            ],
            preview: <StoryPreview />,
        },
        {
            id: 'post',
            emoji: '🎬',
            title: 'Post',
            subtitle: 'Foto / Video',
            howTo: 'Toca ➕ → Actualización',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            steps: [
                'Toca el botón ➕ rojo en el feed',
                'Escribe tu mensaje o selecciona una foto/video',
                'Añade una descripción de tu entrenamiento',
                'Publica y acumula likes y comentarios',
            ],
            preview: <PostPreview />,
        },
        {
            id: 'wod',
            emoji: '💪',
            title: 'WOD',
            subtitle: 'Entreno completo',
            howTo: 'Toca ➕ → WOD del Día',
            color: 'text-brand-red',
            bg: 'bg-brand-red/10',
            border: 'border-brand-red/30',
            steps: [
                'Toca el botón ➕ rojo en el feed',
                'Elige la pestaña "WORKOUT"',
                'Añade tus ejercicios, series y repeticiones',
                'Registra tu resultado y publícalo',
            ],
            preview: <WodPreview />,
        },
        {
            id: 'pr',
            emoji: '🏆',
            title: 'PR',
            subtitle: 'Récord personal',
            howTo: 'Toca ➕ → Nuevo PR',
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/30',
            steps: [
                'Toca el botón ➕ rojo en el feed',
                'Elige la pestaña "NUEVO PR"',
                'Selecciona el ejercicio y el peso/tiempo',
                'Comparte tu logro con la comunidad',
            ],
            preview: <PrPreview />,
        },
    ];

    const active = cards.find(c => c.id === selected)!;

    if (!isVisible) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="mb-8 relative"
            >
                <div className="bg-[#0E0E0E] border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">

                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-red/15 border border-brand-red/25 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-brand-red fill-current" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white uppercase tracking-tight">¿Cómo funciona Rival?</h2>
                                <p className="text-[10px] text-white/30 font-bold">Toca cada tipo de contenido para aprender</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 text-white/20 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content type tabs */}
                    <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar w-full">
                        {cards.map(card => (
                            <button
                                key={card.id}
                                onClick={() => setSelected(card.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all shrink-0 ${
                                    selected === card.id
                                        ? `${card.bg} ${card.border} ${card.color}`
                                        : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:border-white/15'
                                }`}
                            >
                                <span className="text-base">{card.emoji}</span>
                                <div className="text-left">
                                    <p className="text-[11px] font-black uppercase leading-none">{card.title}</p>
                                    <p className="text-[9px] font-bold opacity-60 leading-none mt-0.5">{card.subtitle}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Active card detail */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selected}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.18 }}
                            className="px-3 pb-4"
                        >
                            <div className={`rounded-2xl border ${active.border} ${active.bg} p-4`}>
                                <div className="flex gap-4">
                                    {/* Preview */}
                                    <div className={`w-20 h-20 rounded-xl border ${active.border} bg-black/40 flex items-center justify-center shrink-0 overflow-hidden`}>
                                        {active.preview}
                                    </div>

                                    {/* Steps */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${active.color}`}>
                                            {active.emoji} Cómo publicar un {active.title}
                                        </p>
                                        <div className="space-y-1.5">
                                            {active.steps.map((step, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[8px] font-black ${active.bg} border ${active.border} ${active.color}`}>
                                                        {i + 1}
                                                    </div>
                                                    <p className="text-[10px] text-white/60 font-medium leading-tight">{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* CTA row */}
                    <div className="flex gap-2 px-4 pb-4 border-t border-white/[0.05] pt-4">
                        <button
                            onClick={() => setShowFullGuide(true)}
                            className="flex-1 flex items-center justify-center gap-2 bg-brand-red text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_16px_rgba(220,38,38,0.25)]"
                        >
                            <Play className="w-3.5 h-3.5 fill-current" /> Ver tutorial completo
                        </button>
                        <button
                            onClick={handleClose}
                            className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Full guide modal */}
            <AnimatePresence>
                {showFullGuide && (
                    <FullGuideModal cards={cards} onClose={() => setShowFullGuide(false)} />
                )}
            </AnimatePresence>
        </>
    );
}

// ── Full Guide Modal ──────────────────────────────────────────────────────────
function FullGuideModal({ cards, onClose }: { cards: ContentCard[]; onClose: () => void }) {
    const [step, setStep] = useState(0);
    const router = useRouter();

    const current = cards[step];

    const actions: Record<ContentType, { label: string; href: string }> = {
        historia: { label: 'Ir al inicio y añadir historia', href: '/dashboard' },
        post:     { label: 'Crear mi primer post',           href: '/dashboard' },
        wod:      { label: 'Registrar un entrenamiento',     href: '/dashboard/training' },
        pr:       { label: 'Publicar mi PR',                 href: '/dashboard' },
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4"
        >
            <motion.div
                initial={{ scale: 0.92, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 30 }}
                className="w-full max-w-lg bg-[#0C0C0C] border border-white/[0.08] rounded-[40px] overflow-hidden shadow-2xl"
            >
                {/* Progress bar */}
                <div className="flex gap-1 p-4 pb-0">
                    {cards.map((_, i) => (
                        <div key={i} className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden cursor-pointer" onClick={() => setStep(i)}>
                            {i < step && <div className="h-full bg-white/40 w-full" />}
                            {i === step && (
                                <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 4, ease: 'linear' }}
                                    className="h-full bg-brand-red" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4">
                    <div className={`px-3 py-1 rounded-full border ${current.border} ${current.bg} text-[10px] font-black uppercase tracking-widest ${current.color}`}>
                        {current.emoji} {current.title}
                    </div>
                    <button onClick={onClose} className="p-2 text-white/25 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                        className="px-6 pb-6 space-y-6">

                        {/* Big preview */}
                        <div className={`w-full h-40 rounded-3xl border ${current.border} ${current.bg} flex items-center justify-center`}>
                            <div className="scale-[2]">
                                {current.preview}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight leading-tight mb-2">
                                {current.emoji} {current.title}
                            </h2>
                            <p className={`text-sm font-bold uppercase tracking-widest ${current.color} mb-4`}>{current.subtitle}</p>

                            <div className="space-y-3">
                                {current.steps.map((s, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${current.bg} border ${current.border} ${current.color}`}>
                                            {i + 1}
                                        </div>
                                        <p className="text-sm text-white/70 font-medium leading-tight">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex gap-3">
                            {step < cards.length - 1 ? (
                                <button onClick={() => setStep(s => s + 1)}
                                    className="flex-1 bg-brand-red text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-[0_0_16px_rgba(220,38,38,0.3)]">
                                    Siguiente <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button onClick={onClose}
                                    className="flex-1 bg-brand-red text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-[0_0_16px_rgba(220,38,38,0.3)]">
                                    ¡Empezar ahora! <Flame className="w-4 h-4" />
                                </button>
                            )}
                            {step > 0 && (
                                <button onClick={() => setStep(s => s - 1)}
                                    className="px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
                                    Atrás
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
