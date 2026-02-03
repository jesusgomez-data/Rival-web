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
                className="bg-background/80 backdrop-blur-md border-border shadow-2xl hover:bg-background ring-1 ring-white/10 w-12 h-12 rounded-full"
                iconClass="w-6 h-6"
            />
        </div>
    );
}
