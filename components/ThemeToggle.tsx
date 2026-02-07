"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/app/ThemeContext";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle({ className, iconClass }: { className?: string, iconClass?: string }) {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className={clsx(
                "w-10 h-10 rounded-xl bg-card/50 border border-border/50",
                className
            )} />
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className={clsx(
                "relative w-10 h-10 rounded-xl transition-all duration-300 flex items-center justify-center shrink-0",
                "bg-card/40 backdrop-blur-md border border-border/50 text-gray-400 hover:text-brand-red shadow-lg hover:shadow-brand-red/10 group overflow-hidden",
                className
            )}
            title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Toggle theme"
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-red/0 to-brand-red/10 opacity-0 group-hover:opacity-100 transition-opacity" />

            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={theme}
                    initial={{ y: 20, opacity: 0, rotate: -45 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    {theme === 'dark' ? (
                        <Sun className={clsx("w-5 h-5", iconClass)} />
                    ) : (
                        <Moon className={clsx("w-5 h-5", iconClass)} />
                    )}
                </motion.div>
            </AnimatePresence>
        </button>
    );
}
