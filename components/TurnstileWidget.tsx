"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTheme } from "@/app/ThemeContext";

declare global {
    interface Window {
        turnstile?: {
            render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
            reset: (widgetId?: string) => void;
            remove: (widgetId?: string) => void;
        };
    }
}

// Widget de Cloudflare Turnstile (anti-bots) para login/registro.
//
// Antes se dejaba que el propio script de Cloudflare auto-detectara el div
// ".cf-turnstile" al cargar (renderizado implícito). Eso es frágil: si el
// script termina de cargar antes de que React haya montado el div (muy
// posible en móvil con red más lenta), o si se navega entre /login y
// /signup sin una recarga completa (Next reutiliza el <script> ya cargado
// y next/script no vuelve a disparar onLoad), el widget nunca aparece — el
// input oculto "cf-turnstile-response" se queda vacío para siempre y el
// login falla con "verificación de seguridad requerida", sin ninguna forma
// de recuperarse ni siquiera recargando (justo el bug reportado).
//
// Ahora se renderiza explícitamente vía la API de Turnstile, con:
// - Fallback a renderizar de inmediato si el script ya estaba cargado
//   (navegación SPA sin recarga real).
// - Callbacks de error/expirado que muestran un aviso claro con botón de
//   reintentar, en vez de fallar en silencio.
interface TurnstileWidgetProps {
    // Permite al formulario deshabilitar el botón de enviar hasta que el
    // token exista de verdad — así ya no se puede ni pulsar "Entrar" antes
    // de que Turnstile termine su verificación (la causa más probable de
    // que un envío rápido en móvil llegara sin token).
    onStatusChange?: (status: 'loading' | 'ready' | 'error') => void;
}

export default function TurnstileWidget({ onStatusChange }: TurnstileWidgetProps = {}) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    const updateStatus = (s: 'loading' | 'ready' | 'error') => {
        setStatus(s);
        onStatusChange?.(s);
    };

    const renderWidget = () => {
        if (!containerRef.current || !window.turnstile || !siteKey) return;
        // Si ya había un widget montado (re-render por cambio de tema, o
        // navegación SPA previa), se quita antes de crear uno nuevo para no
        // duplicarlo dentro del mismo contenedor.
        if (widgetIdRef.current) {
            try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
        }
        try {
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                theme: theme === 'light' ? 'light' : 'dark',
                callback: () => updateStatus('ready'),
                'error-callback': () => updateStatus('error'),
                'expired-callback': () => updateStatus('error'),
                'timeout-callback': () => updateStatus('error'),
            });
        } catch {
            updateStatus('error');
        }
    };

    useEffect(() => {
        if (!siteKey) return;
        // El script puede haber cargado ya en una navegación anterior dentro
        // de esta misma sesión del navegador — en ese caso next/script no
        // vuelve a disparar onLoad, así que se renderiza directo en vez de
        // esperar un evento que nunca llegará.
        if (window.turnstile) {
            renderWidget();
        }
        return () => {
            if (widgetIdRef.current && window.turnstile) {
                try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    // Sin site key (dev/local) no hay widget que esperar — el formulario no
    // debe quedarse bloqueado por un estado "loading" que nunca cambiará.
    useEffect(() => {
        if (!siteKey) onStatusChange?.('ready');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!siteKey) return null;

    return (
        <div>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
                onLoad={renderWidget}
                onError={() => setStatus('error')}
            />
            <div ref={containerRef} />
            {status === 'error' && (
                <div className="mt-2 flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
                    <span className="text-xs text-red-500 font-semibold leading-snug">
                        No se pudo cargar la verificación de seguridad. Comprueba tu conexión o desactiva bloqueadores de anuncios.
                    </span>
                    <button
                        type="button"
                        onClick={() => { updateStatus('loading'); renderWidget(); }}
                        className="shrink-0 flex items-center gap-1 text-xs font-bold text-red-500 hover:underline"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                    </button>
                </div>
            )}
        </div>
    );
}
