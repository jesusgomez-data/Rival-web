"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/app/ThemeContext";
import clsx from "clsx";
import { useEffect, useState } from "react";

export default function ThemeToggle({ className, iconClass }: { className?: string, iconClass?: string }) {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration mismatch by rendering a placeholder or nothing until mounted
    if (!mounted) {
        return (
            <div className={clsx(
                "p-2.5 rounded-xl flex items-center justify-center opacity-0",
                className
            )} />
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className={clsx(
                "p-2.5 rounded-xl transition-all hover:scale-110 flex items-center justify-center",
                "bg-card border border-border text-gray-400 hover:text-brand-red shadow-sm cursor-pointer",
                className
            )}
            title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className={clsx("w-5 h-5 animate-in zoom-in duration-300", iconClass)} />
            ) : (
                <Moon className={clsx("w-5 h-5 animate-in zoom-in duration-300", iconClass)} />
            )}
        </button>
    );
}
