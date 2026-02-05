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

    if (!mounted) {
        return (
            <div className={clsx(
                "flex items-center gap-2",
                className
            )} />
        );
    }

    return (
        <div className={clsx("flex items-center gap-2", className)}>
            <button
                onClick={toggleTheme}
                className={clsx(
                    "w-11 h-11 rounded-xl transition-all hover:scale-105 flex items-center justify-center shrink-0",
                    "bg-card border border-border text-gray-400 hover:text-brand-red shadow-sm cursor-pointer",
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
        </div>
    );
}
