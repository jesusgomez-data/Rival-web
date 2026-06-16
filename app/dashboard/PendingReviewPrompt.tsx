'use client';

import { useState, useEffect } from 'react';
import { getPendingClassReviews, saveClassResult } from './gyms/class-actions';
import { X, Check, Timer, Activity } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import WODPostDisplay from '@/components/WODPostDisplay';

export default function PendingReviewPrompt() {
    const [pendingClasses, setPendingClasses] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Form State
    const [isLoading, setIsLoading] = useState(false);
    // Simple result storage
    const [resultValue, setResultValue] = useState("");
    const [notes, setNotes] = useState("");
    const [shareToFeed, setShareToFeed] = useState(true);

    useEffect(() => {
        const checkPending = async () => {
            try {
                const data = await getPendingClassReviews();
                if (data && Array.isArray(data) && data.length > 0) {
                    setPendingClasses(data);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Failed to check pending reviews", err);
            }
        };
        // Delay slightly check
        const timer = setTimeout(checkPending, 3000);
        return () => clearTimeout(timer);
    }, []);

    if (pendingClasses.length === 0 || !isOpen) return null;
    const currentClass = pendingClasses[currentIndex];
    if (!currentClass) return null;

    // Parse WOD
    let wodData: any = null;
    try {
        if (currentClass.wod?.content) {
            try {
                wodData = JSON.parse(currentClass.wod.content);
            } catch {
                wodData = { workout: currentClass.wod.content };
            }
        }
    } catch (e) { }

    const handleSave = async () => {
        setIsLoading(true);

        let finalData: any[] = [];
        
        // Include WOD data blocks if they exist
        if (wodData) {
            if (wodData.blocks && Array.isArray(wodData.blocks)) {
                finalData = wodData.blocks.map((b: any) => ({
                    ...b,
                    // keep fields
                }));
            } else if (wodData.workout) {
                finalData.push({
                    type: 'custom',
                    title: wodData.title || 'WOD',
                    content: wodData.workout,
                    exercises: []
                });
            }
        }

        if (resultValue) {
            finalData.push({
                type: 'custom',
                value: resultValue,
                title: 'Resultado'
            });
        }

        const res = await saveClassResult(
            currentClass.id,
            finalData,
            notes,
            shareToFeed,
            new Date(currentClass.scheduled_time).toISOString()
        );

        setIsLoading(false);
        if (res.error) {
            alert(res.error);
        } else {
            handleSkip(); // Move next
        }
    };

    const handleSkip = () => {
        if (currentIndex < pendingClasses.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setResultValue("");
            setNotes("");
        } else {
            setIsOpen(false);
        }
    };

    if (isMinimized) {
        return (
            <div className="fixed bottom-24 right-4 z-50 animate-in slide-in-from-bottom duration-500">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="bg-brand-red text-white p-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 hover:scale-105 transition-transform"
                >
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span className="font-black italic uppercase text-xs hidden sm:inline">Resultado Pendiente</span>
                    <span className="bg-white text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{pendingClasses.length}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-card w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-border shadow-2xl flex flex-col relative animate-in slide-in-from-bottom duration-500">

                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-card sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-heading font-black italic uppercase text-foreground tracking-tighter">
                            ¡Felicidades Rival! 🔥
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                            {currentClass.organizationName || 'Rival Fit Madrid'} • {currentClass.coach?.full_name || 'Coach'}
                        </p>
                    </div>
                    <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* WOD Display */}
                    {wodData && (wodData.blocks || wodData.workout) ? (
                        <div className="border border-border bg-black/40 rounded-2xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">WOD COMPLETO</span>
                            </div>
                            {wodData.blocks ? (
                                <WODPostDisplay wod={wodData} compact={false} />
                            ) : (
                                <div className="text-sm font-medium text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {wodData.workout}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-muted rounded-2xl p-4 border border-border text-center text-xs text-muted-foreground italic font-medium">
                            Sube tus resultados para completar la sesión.
                        </div>
                    )}

                    {/* Simple Inputs */}
                    <div className="space-y-4">
                        <div className="bg-background rounded-2xl p-1 border border-border focus-within:border-brand-red/50 transition-all">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 block">Resultado (Tiempo/Reps/Kilos)</label>
                            <input
                                autoFocus
                                value={resultValue}
                                onChange={(e) => setResultValue(e.target.value)}
                                placeholder="Ej: 12:45, 5 Rounds + 10, 100kg..."
                                className="w-full bg-transparent px-4 pb-3 pt-1 text-lg font-bold text-foreground outline-none placeholder-foreground/20"
                            />
                        </div>

                        <div className="bg-background rounded-2xl p-1 border border-border focus-within:border-brand-red/50 transition-all">
                            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 block">Notas (Opcional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="¿Cómo te sentiste?"
                                className="w-full bg-transparent px-4 pb-3 pt-1 text-sm text-foreground outline-none placeholder-foreground/20 resize-none h-16"
                            />
                        </div>

                        {/* Posting Options */}
                        <div
                            onClick={() => setShareToFeed(!shareToFeed)}
                            className={clsx(
                                "flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border",
                                shareToFeed ? "bg-brand-red/10 border-brand-red/20" : "bg-white/5 border-transparent hover:bg-white/10"
                            )}
                        >
                            <div className={clsx("w-5 h-5 rounded flex items-center justify-center transition-colors border", shareToFeed ? "bg-brand-red border-brand-red" : "border-border")}>
                                {shareToFeed && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className={clsx("text-xs font-bold uppercase tracking-wide", shareToFeed ? "text-foreground" : "text-muted-foreground")}>
                                Publicar en Feed
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleSkip}
                            className="px-6 py-4 rounded-xl text-xs font-bold text-gray-500 uppercase hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Omitir
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading || !resultValue}
                            className="flex-1 py-4 bg-foreground text-background text-sm font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                        >
                            {isLoading ? 'Guardando...' : 'Guardar Resultado'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
