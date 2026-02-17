'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Camera, Plus, Flame, Salad, Cookie, ChevronRight, ScanLine, Trash2, X, Check } from 'lucide-react';
import { getNutritionLogs, addNutritionLog, deleteNutritionLog } from '../training/actions';
import { cn } from '@/lib/utils';

export default function NutritionHub() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const goals = { calories: 2400, protein: 180, carbs: 220, fat: 80 };

    async function loadLogs() {
        const data = await getNutritionLogs();
        setLogs(data);
        setIsLoading(false);
    }

    useEffect(() => {
        loadLogs();
    }, []);

    const totals = logs.reduce((acc, log) => ({
        cal: acc.cal + (log.calories || 0),
        p: acc.p + (log.protein || 0),
        c: acc.c + (log.carbs || 0),
        f: acc.f + (log.fat || 0),
    }), { cal: 0, p: 0, c: 0, f: 0 });

    const [scanStep, setScanStep] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setStream(s);
            if (videoRef.current) {
                videoRef.current.srcObject = s;
                videoRef.current.play();
            }
            setScanStep(1);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setScanStep(1);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleScanComplete = async () => {
        setShowScanner(true);
        await startCamera();

        // Esperar un momento para que el usuario vea la cámara
        await new Promise(r => setTimeout(r, 2000));

        stopCamera();
        alert("Próximamente: El escáner nutricional por IA será habilitado en la próxima actualización.");

        setShowScanner(false);
        setScanStep(0);
    };

    const confirmSave = async () => {
        if (!scanResult) return;
        setIsSaving(true);
        const res = await addNutritionLog(scanResult);
        if (res.success) {
            await loadLogs();
        }
        setIsSaving(false);
        closeScanner();
    };

    const closeScanner = () => {
        stopCamera();
        setShowScanner(false);
        setScanResult(null);
        setScanStep(0);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que quieres borrar este registro?')) return;
        const res = await deleteNutritionLog(id);
        if (res.success) {
            setLogs(logs.filter(l => l.id !== id));
        }
    };

    return (
        <div className="bg-brand-gray/30 rounded-[32px] p-6 border border-white/5 backdrop-blur-md relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-orange-500" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] italic">Nutri Hub_</h3>
                </div>
                <button
                    onClick={handleScanComplete}
                    disabled={showScanner}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all active:scale-95"
                >
                    <Camera className="w-3.5 h-3.5" />
                    Scan Food
                </button>
            </div>

            {/* Calories Ring / Bar */}
            <div className="mb-8">
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Calorías Totales</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-heading font-black italic">{totals.cal}</span>
                            <span className="text-xs font-bold text-gray-500 uppercase italic">/ {goals.calories} kcal</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            totals.cal > goals.calories ? "text-brand-red" : "text-green-500"
                        )}>
                            {Math.round((totals.cal / goals.calories) * 100)}% Consumido
                        </span>
                    </div>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (totals.cal / goals.calories) * 100)}%` }}
                        className={cn(
                            "h-full rounded-full",
                            totals.cal > goals.calories ? "bg-brand-red shadow-[0_0_15px_rgba(227,30,36,0.3)]" : "bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                        )}
                    />
                </div>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <MacroStat label="Prot" current={totals.p} goal={goals.protein} color="bg-blue-500" />
                <MacroStat label="Carbs" current={totals.c} goal={goals.carbs} color="bg-orange-500" />
                <MacroStat label="Fat" current={totals.f} goal={goals.fat} color="bg-yellow-500" />
            </div>

            {/* Recent Activity */}
            <div className="space-y-3">
                <span className="block text-[9px] font-black uppercase tracking-widest text-gray-500">Registros de Hoy_</span>
                {logs.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-white/5 rounded-2xl">
                        <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">No hay registros aún</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group/row hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Utensils className="w-4 h-4 text-orange-500" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-white uppercase truncate max-w-[120px]">Registro</div>
                                    <div className="text-[9px] text-gray-500">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-xs font-black italic">+{log.calories}</div>
                                    <div className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">{log.protein}g P / {log.carbs}g C</div>
                                </div>
                                <button
                                    onClick={() => handleDelete(log.id)}
                                    className="p-1 px-2 border border-white/10 rounded-lg text-gray-600 hover:text-brand-red transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Scanner Overlay */}
            <AnimatePresence>
                {showScanner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                    >
                        {scanStep === 2 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0 bg-white z-50"
                            />
                        )}

                        {scanStep < 4 ? (
                            <>
                                <div className="relative mb-8 pt-10">
                                    <div className="w-48 h-48 border-2 border-dashed border-orange-500/30 rounded-[40px] relative flex items-center justify-center overflow-hidden bg-black">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className={cn(
                                                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                                                scanStep === 3 ? "opacity-30 grayscale" : "opacity-100"
                                            )}
                                        />

                                        {scanStep === 3 && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="absolute inset-0 flex items-center justify-center bg-orange-500/10"
                                            >
                                                <ScanLine className="w-16 h-16 text-orange-500 animate-pulse" />
                                            </motion.div>
                                        )}
                                        <div className="absolute inset-0 border-[2px] border-orange-500 rounded-[40px]" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">
                                        {scanStep === 1 ? 'Encuadra tu comida_' : scanStep === 2 ? 'Capturando Platillo_' : 'Analizando Macros_'}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                        {scanStep === 1 ? 'Mantén el dispositivo quieto' : 'IA procesando...'}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full max-w-[280px]"
                            >
                                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/20">
                                    <Check className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-heading font-black italic text-white mb-2 uppercase">¡Comida Detectada!</h3>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-8">Macros Estimadas por IA_</p>

                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-2xl font-black italic text-white">{scanResult.calories}</p>
                                        <p className="text-[8px] font-black uppercase text-gray-500">Kcal</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-2xl font-black italic text-white">{scanResult.protein}g</p>
                                        <p className="text-[8px] font-black uppercase text-gray-500">Proteína</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-2xl font-black italic text-white">{scanResult.carbs}g</p>
                                        <p className="text-[8px] font-black uppercase text-gray-500">Carbs</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <p className="text-2xl font-black italic text-white">{scanResult.fat}g</p>
                                        <p className="text-[8px] font-black uppercase text-gray-500">Grasas</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={closeScanner}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        onClick={confirmSave}
                                        disabled={isSaving}
                                        className="flex-1 py-4 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20"
                                    >
                                        {isSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        <button
                            onClick={closeScanner}
                            className="absolute top-6 right-6 p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MacroStat({ label, current, goal, color }: { label: string, current: number, goal: number, color: string }) {
    const perc = Math.min(100, (current / goal) * 100);
    return (
        <div className="bg-black/20 rounded-2xl p-3 border border-white/5">
            <span className="block text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">{label}</span>
            <div className="text-sm font-black italic mb-2">{current}g <span className="text-[8px] text-gray-600 not-italic">/ {goal}g</span></div>
            <div className="h-1 w-full bg-white/5 rounded-full">
                <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${perc}%` }} />
            </div>
        </div>
    );
}
