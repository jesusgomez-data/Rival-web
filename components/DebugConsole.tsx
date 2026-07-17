"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Consola visual temporal para depurar en dispositivos reales sin Mac/cable.
 * Se activa solo con ?debug=1 en la URL — no afecta a usuarios normales.
 * Quitar este componente y su import en layout.tsx cuando ya no se necesite.
 */
export default function DebugConsole() {
    const searchParams = useSearchParams();
    const enabled = searchParams.get("debug") === "1";

    useEffect(() => {
        if (!enabled) return;
        if ((window as any).eruda) return;

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/eruda";
        script.onload = () => {
            (window as any).eruda?.init();
        };
        document.body.appendChild(script);
    }, [enabled]);

    return null;
}
