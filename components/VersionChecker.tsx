"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw } from "lucide-react";

// Detecta cuando el servidor ya tiene un deploy más nuevo que el bundle de
// JS que el navegador sigue ejecutando. En móvil la app/PWA se queda
// "abierta" en segundo plano durante días sin recargar — si mientras tanto
// se hace un nuevo deploy (algo frecuente en este proyecto), cada acción de
// servidor (dar like, comentar, seguir, etc.) referencia un ID de acción
// que el nuevo servidor ya no reconoce, y falla con "An unexpected response
// was received from the server" / "Load failed" — visto repetidas veces en
// Sentry, sobre todo en móvil. En vez de dejar que cada acción falle en
// silencio, se avisa con un banner para recargar en cuanto se detecta que
// hay una versión nueva.
export default function VersionChecker() {
    const [hasUpdate, setHasUpdate] = useState(false);
    const initialVersion = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let inFlight = false;

        const checkVersion = async () => {
            // visibilitychange puede dispararse varias veces seguidas (cambiar
            // de app rápido en móvil) — sin esta guardia, cada disparo lanzaba
            // su propio fetch en paralelo (visto en Sentry: 16+ llamadas a
            // /api/version fallando juntas durante un corte de red real).
            if (inFlight) return;
            inFlight = true;
            try {
                const res = await fetch('/api/version', { cache: 'no-store' });
                const data = await res.json();
                if (cancelled || !data?.version || data.version === 'dev') return;

                if (!initialVersion.current) {
                    initialVersion.current = data.version;
                } else if (data.version !== initialVersion.current) {
                    setHasUpdate(true);
                }
            } catch {
                // Sin conexión momentánea: no es una versión nueva, ignorar.
            } finally {
                inFlight = false;
            }
        };

        checkVersion();

        // Revisa cada 5 min mientras la pestaña está activa, y también cada
        // vez que el usuario vuelve a la app tras tenerla en segundo plano
        // (el momento más probable de llevar horas/días con el bundle viejo).
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') checkVersion();
        }, 5 * 60_000);

        const onVisible = () => {
            if (document.visibilityState === 'visible') checkVersion();
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    if (!hasUpdate) return null;

    return (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-4 fade-in duration-300">
            <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-3 bg-brand-red text-white pl-5 pr-4 py-3.5 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.4)] border border-white/10 active:scale-95 transition-all"
            >
                <RefreshCw className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Nueva versión disponible — Actualizar</span>
            </button>
        </div>
    );
}
