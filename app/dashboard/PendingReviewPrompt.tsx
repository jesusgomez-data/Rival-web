'use client';

import { useState, useEffect } from 'react';
import { getPendingClassReviews, saveClassResult } from './gyms/management-actions';
import { X, Check, Timer, Activity } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

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
                if (data && data.length > 0) {
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
    let wodData: any = {};
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
            <div className="bg-[#111] w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-white/10 shadow-2xl flex flex-col relative animate-in slide-in-from-bottom duration-500">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#111] sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-heading font-black italic uppercase text-white tracking-tighter">
                            ¡Felicidades Rival! 🔥
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Entreno Finalizado • {currentClass.coach?.full_name || 'Coach'}
                        </p>
                    </div>
                    <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/10 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* WOD Preview */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3 relative group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-red"></div>
                                <h3 className="text-xs font-black uppercase text-gray-300 tracking-widest">WOD del Día</h3>
                            </div>
                            {currentClass.wod && <span className="text-[9px] font-bold text-brand-red uppercase px-2 py-0.5 bg-brand-red/10 rounded">Ver Completo</span>}
                        </div>

                        <div className="text-sm font-medium text-gray-400 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                            {wodData?.blocks ? (
                                wodData.blocks.map((b: any, i: number) => (
                                    <div key={i} className="mb-2 last:mb-0">
                                        <span className="text-white font-bold">{b.title || b.format || `Bloque ${i + 1}`}</span>
                                        <p className="opacity-80 text-xs">{b.content?.substring(0, 100) || (b.exercises && b.exercises.map((e: any) => e.name).join(', ').substring(0, 100))}...</p>
                                    </div>
                                ))
                            ) : (
                                wodData?.workout || "Sube tus resultados para completar la sesión."
                            )}
                        </div>
                    </div>

                    {/* Simple Inputs */}
                    <div className="space-y-4">
                        <div className="bg-[#1a1a1a] rounded-2xl p-1 border border-white/5 focus-within:border-brand-red/50 focus-within:bg-[#222] transition-all">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-4 pt-3 block">Resultado (Tiempo/Reps/Kilos)</label>
                            <input
                                autoFocus
                                value={resultValue}
                                onChange={(e) => setResultValue(e.target.value)}
                                placeholder="Ej: 12:45, 5 Rounds + 10, 100kg..."
                                className="w-full bg-transparent px-4 pb-3 pt-1 text-lg font-bold text-white outline-none placeholder-white/20"
                            />
                        </div>

                        <div className="bg-[#1a1a1a] rounded-2xl p-1 border border-white/5 focus-within:border-brand-red/50 focus-within:bg-[#222] transition-all">
                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-4 pt-3 block">Notas (Opcional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="¿Cómo te sentiste?"
                                className="w-full bg-transparent px-4 pb-3 pt-1 text-sm text-white outline-none placeholder-white/20 resize-none h-16"
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
                            <div className={clsx("w-5 h-5 rounded flex items-center justify-center transition-colors border", shareToFeed ? "bg-brand-red border-brand-red" : "border-gray-600")}>
                                {shareToFeed && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className={clsx("text-xs font-bold uppercase tracking-wide", shareToFeed ? "text-white" : "text-gray-500")}>
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
                            className="flex-1 py-4 bg-white text-black text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                        >
                            {isLoading ? 'Guardando...' : 'Guardar Resultado'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
