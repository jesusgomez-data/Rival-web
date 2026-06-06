"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { checkinWithQR } from "../gyms/checkin-actions";
import { ShieldAlert, ShieldCheck, Loader2, Dumbbell, Home, Sparkles } from "lucide-react";
import Link from "next/link";

function AthleteCheckinClient() {
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");
    
    const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [className, setClassName] = useState("");
    const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

    useEffect(() => {
        if (!classId) {
            setStatus("error");
            setErrorMessage("Código QR inválido o clase no especificada.");
            return;
        }

        let active = true;
        async function runCheckin() {
            setStatus("scanning");
            // Simulate the scan processing to show off the premium UI animation
            await new Promise((resolve) => setTimeout(resolve, 1800));
            if (!active) return;

            try {
                if (!classId) return;
                const res = await checkinWithQR(classId);
                if (!active) return;

                if (res.error) {
                    setStatus("error");
                    setErrorMessage(res.error);
                } else {
                    setClassName(res.className || "Clase");
                    setAlreadyCheckedIn(!!res.alreadyCheckedIn);
                    setStatus("success");
                }
            } catch (err) {
                if (!active) return;
                setStatus("error");
                setErrorMessage("Ocurrió un error inesperado al procesar el check-in.");
            }
        }

        runCheckin();
        return () => {
            active = false;
        };
    }, [classId]);

    // Check if error is membership-related
    const isMembershipError = 
        errorMessage.toLowerCase().includes("miembro") || 
        errorMessage.toLowerCase().includes("membresía") || 
        errorMessage.toLowerCase().includes("inscribirte");

    return (
        <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md bg-brand-gray border border-white/5 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                {/* Visual Accent Top Bar */}
                <div className={`absolute top-0 inset-x-0 h-1 transition-colors duration-500 ${
                    status === "success" ? "bg-green-500" :
                    status === "error" ? "bg-brand-red" : "bg-brand-red"
                }`} />

                {/* Ambient glow backgrounds */}
                {status === "scanning" && (
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-red/5 rounded-full blur-[100px] pointer-events-none" />
                )}
                {status === "success" && (
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />
                )}
                {status === "error" && (
                    <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-red/5 rounded-full blur-[100px] pointer-events-none" />
                )}

                <div className="relative z-10 text-center">
                    {/* Brand header */}
                    <div className="flex items-center justify-center gap-2 mb-8 opacity-60">
                        <span className="font-heading font-black text-lg tracking-tight text-white uppercase italic">
                            RIVAL <span className="text-brand-red">FIT</span>
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">CHECK-IN</span>
                    </div>

                    {/* ──────────────── SCANNING / LOADING STATE ──────────────── */}
                    {status === "scanning" && (
                        <div className="animate-fade-in">
                            <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center bg-black/40 rounded-full border border-white/5">
                                {/* Pulse effects */}
                                <div className="absolute inset-0 rounded-full border border-brand-red/20 animate-ping duration-1000" />
                                <div className="absolute inset-3 rounded-full border border-brand-red/30" />
                                <div className="absolute inset-6 rounded-full border border-brand-red/40" />
                                
                                {/* Bouncing laser line scanner */}
                                <div className="absolute top-1/2 left-4 right-4 h-[2px] bg-brand-red shadow-[0_0_10px_#ef4444] animate-bounce" />
                                
                                <Loader2 className="w-8 h-8 text-brand-red animate-spin relative z-10" />
                            </div>

                            <h2 className="text-xl font-heading font-black text-white italic uppercase tracking-wider mb-2">
                                Validando Acceso
                            </h2>
                            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                                Escaneando tu credencial de atleta y verificando el estado de tu membresía con el centro...
                            </p>
                        </div>
                    )}

                    {/* ──────────────── SUCCESS STATE ──────────────── */}
                    {status === "success" && (
                        <div className="animate-in zoom-in-95 duration-300">
                            <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center bg-green-500/10 rounded-full border border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                                <ShieldCheck className="w-14 h-14 text-green-400" />
                                <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping duration-1000" />
                            </div>

                            <h2 className="text-2xl font-heading font-black text-white italic uppercase tracking-tighter mb-1">
                                Acceso Autorizado
                            </h2>
                            
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
                                <Sparkles className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-green-400">
                                    {alreadyCheckedIn ? "Check-in ya realizado" : "Check-in Completado"}
                                </span>
                            </div>

                            {/* Class info card */}
                            <div className="bg-black/40 border border-white/5 rounded-2xl p-5 mb-8 text-left max-w-sm mx-auto">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Entrenamiento Activo</p>
                                <p className="text-lg font-black text-white leading-tight uppercase italic">{className}</p>
                                <p className="text-xs text-gray-400 mt-2 font-medium">Asistencia registrada en el sistema del centro.</p>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3 max-w-xs mx-auto">
                                <Link
                                    href="/dashboard/training"
                                    className="w-full flex items-center justify-center gap-2 bg-brand-red text-white py-4 rounded-xl font-heading text-sm font-black italic uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] active:scale-95"
                                >
                                    <Dumbbell className="w-4 h-4 fill-current" /> Ver WOD / Entrenamiento
                                </Link>
                                
                                <Link
                                    href="/dashboard"
                                    className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-400 py-3.5 rounded-xl font-heading text-xs font-black uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                >
                                    <Home className="w-3.5 h-3.5" /> Ir a Inicio
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* ──────────────── ERROR STATE ──────────────── */}
                    {status === "error" && (
                        <div className="animate-in zoom-in-95 duration-300">
                            <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center bg-brand-red/10 rounded-full border border-brand-red/20 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                                <ShieldAlert className="w-14 h-14 text-brand-red" />
                            </div>

                            <h2 className="text-2xl font-heading font-black text-white italic uppercase tracking-tighter mb-3">
                                Acceso Denegado
                            </h2>

                            {/* Error card */}
                            <div className="bg-brand-red/5 border border-brand-red/20 rounded-2xl p-5 mb-8 text-center max-w-sm mx-auto">
                                <p className="text-sm font-semibold text-brand-red leading-relaxed">{errorMessage}</p>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3 max-w-xs mx-auto">
                                {isMembershipError ? (
                                    <Link
                                        href="/dashboard/gyms"
                                        className="w-full flex items-center justify-center gap-2 bg-brand-red text-white py-4 rounded-xl font-heading text-sm font-black italic uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] active:scale-95"
                                    >
                                        Explorar Membresías
                                    </Link>
                                ) : null}
                                
                                <Link
                                    href="/dashboard"
                                    className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-400 py-3.5 rounded-xl font-heading text-xs font-black uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all active:scale-95"
                                >
                                    <Home className="w-3.5 h-3.5" /> Ir a Inicio
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CheckinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-10 h-10 text-brand-red animate-spin mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando lector...</p>
            </div>
        }>
            <AthleteCheckinClient />
        </Suspense>
    );
}
