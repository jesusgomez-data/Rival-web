"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

export default function FloatingThemeToggle() {
    const pathname = usePathname();

    // No mostrar en el dashboard porque ya tiene su propio toggle en el header/sidebar
    if (pathname?.startsWith('/dashboard')) {
        return null;
    }

    return (
        <div className="fixed bottom-6 left-6 z-50">
            <ThemeToggle
                className="bg-background/80 backdrop-blur-md border border-border shadow-2xl hover:bg-background ring-1 ring-white/10 rounded-2xl p-1"
                iconClass="w-5 h-5"
            />
        </div>
    );
}
