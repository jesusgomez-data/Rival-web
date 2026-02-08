"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Share, MoreVertical, SquarePlus, Download } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

export default function InstallAppPrompt() {
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const pathname = usePathname();

    useEffect(() => {
        // Detectar si ya está instalada (Standalone mode)
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone ||
            document.referrer.includes('android-app://');

        setIsStandalone(isStandaloneMode);

        if (isStandaloneMode) return;

        // Detectar OS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isAndroidDevice = /android/.test(userAgent);

        setIsIOS(isIosDevice);
        setIsAndroid(isAndroidDevice);

        // Handler para el evento de instalación nativo (Solo Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevenir que Chrome muestre el prompt nativo automáticamente (queremos controlarlo)
            e.preventDefault();
            // Guardar el evento para dispararlo después
            setDeferredPrompt(e);
            // Mostrar nuestro UI
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW fail', err));
        }

        // Mostrar prompt después de un tiempo si es iOS (ya que no tienen evento)
        // O si es Android y por alguna razón no saltó el evento (fallback a instrucciones manuales)
        if (isIosDevice || isAndroidDevice) {
            const hasSeenPrompt = localStorage.getItem('rival_install_prompt_seen');
            if (!hasSeenPrompt) {
                const timer = setTimeout(() => {
                    // Solo activar si no se activó ya por el evento nativo
                    setShowPrompt(prev => prev || true);
                }, 100); // Casi inmediato
                return () => {
                    clearTimeout(timer);
                    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
                };
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('rival_install_prompt_seen', 'true');
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Disparar el prompt nativo
            deferredPrompt.prompt();
            // Esperar a que el usuario responda
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        }
        handleDismiss();
    };

    if (isStandalone || !showPrompt) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[999] p-4 pb-8 pointer-events-none flex justify-center items-end">
            <div className={clsx(
                "w-full max-w-md bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl pointer-events-auto transform transition-all duration-500 animate-in slide-in-from-bottom-10 fade-in",
                showPrompt ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
            )}>
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-glow border border-white/10 shrink-0">
                        <Image src="/logo.svg" alt="Rival App" width={56} height={56} className="w-full h-full object-cover p-1 bg-black" />
                    </div>
                    <div>
                        <h3 className="font-heading font-bold text-lg text-white italic tracking-tighter uppercase leading-tight">
                            Instala Rival Fit
                        </h3>
                        <p className="text-xs text-brand-gray font-medium mt-1">
                            {deferredPrompt ? "Instala la app en un solo click para la mejor experiencia." : "Para la mejor experiencia, añade la app a tu pantalla de inicio."}
                        </p>
                    </div>
                </div>

                {/* Si tenemos el evento nativo capturado (Android), mostramos botón directo */}
                {deferredPrompt ? (
                    <div className="mt-5 flex gap-3">
                        <button
                            onClick={handleDismiss}
                            className="flex-1 bg-white/5 text-gray-400 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-white/10"
                        >
                            Ahora no
                        </button>
                        <button
                            onClick={handleInstallClick}
                            className="flex-[2] bg-brand-red text-white py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-glow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" /> Instalar App
                        </button>
                    </div>
                ) : (
                    /* Si NO hay evento (iOS o Android antiguo), mostramos instrucciones */
                    <>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            {isIOS && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-300">
                                        <span className="flex items-center justify-center w-6 h-6 bg-white/10 rounded-full text-xs font-bold text-white shrink-0">1</span>
                                        <p>Toca el botón <span className="text-blue-400 font-bold inline-flex items-center gap-1"><Share className="w-3.5 h-3.5" /> Compartir</span> de tu navegador.</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-300">
                                        <span className="flex items-center justify-center w-6 h-6 bg-white/10 rounded-full text-xs font-bold text-white shrink-0">2</span>
                                        <p>Selecciona <span className="text-white font-bold inline-flex items-center gap-1"><SquarePlus className="w-3.5 h-3.5" /> Añadir a inicio</span>.</p>
                                    </div>
                                </div>
                            )}

                            {isAndroid && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-300">
                                        <span className="flex items-center justify-center w-6 h-6 bg-white/10 rounded-full text-xs font-bold text-white shrink-0">1</span>
                                        <p>Toca el menú <span className="text-white font-bold inline-flex items-center gap-1"><MoreVertical className="w-3.5 h-3.5" /></span> de Chrome.</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-300">
                                        <span className="flex items-center justify-center w-6 h-6 bg-white/10 rounded-full text-xs font-bold text-white shrink-0">2</span>
                                        <p>Selecciona <span className="text-white font-bold inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Instalar aplicación</span>.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={handleDismiss}
                                className="flex-1 bg-brand-red text-white py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-glow-sm active:scale-95 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
