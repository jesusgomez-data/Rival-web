"use client";

import Script from "next/script";
import { useTheme } from "@/app/ThemeContext";

// Widget de Cloudflare Turnstile (anti-bots). El propio script de Cloudflare
// rellena un input oculto "cf-turnstile-response" dentro de este div, que
// viaja solo con el resto del <form> — no hace falta manejar el token en
// React. Si no hay site key configurada (dev/local), no renderiza nada y el
// server action tampoco exige verificación (ver utils/turnstile.ts).
export default function TurnstileWidget() {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const { theme } = useTheme();
    if (!siteKey) return null;

    return (
        <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
            <div className="cf-turnstile" data-sitekey={siteKey} data-theme={theme === 'light' ? 'light' : 'dark'} />
        </>
    );
}
