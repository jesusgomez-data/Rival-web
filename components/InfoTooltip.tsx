"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface InfoTooltipProps {
    content: string;
    title?: string;
    className?: string;
}

export default function InfoTooltip({ content, title, className }: InfoTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, arrowX: 12 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Update position when showing
    const updatePosition = () => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const tooltipWidth = Math.min(screenWidth - 32, 280); // Max width 280, but padding for mobile

        let left = rect.left + window.scrollX;
        let arrowX = 12; // Default arrow position

        // If tooltip would go off-screen on the right
        if (left + tooltipWidth > screenWidth - 16) {
            const overflow = (left + tooltipWidth) - (screenWidth - 16);
            left -= overflow;
            arrowX += overflow; // Shift arrow to stay pointed at trigger
        }

        // If it would go off-screen on the left (unlikely for an icon, but safe)
        if (left < 16) {
            const underflow = 16 - left;
            left += underflow;
            arrowX -= underflow;
        }

        setCoords({
            top: rect.top + window.scrollY,
            left: left,
            arrowX: arrowX
        });
    };

    useLayoutEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
                tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setIsVisible(false);
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside as any);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside as any);
        };
    }, [isVisible]);

    const TooltipContent = (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={tooltipRef}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    style={{
                        position: 'absolute',
                        top: coords.top,
                        left: coords.left,
                        transform: 'translate(0, -100%)',
                        zIndex: 9999,
                        pointerEvents: 'auto',
                        width: 'max-content'
                    }}
                    className="mb-3"
                >
                    <div className="bg-[#0f0f0f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,1)] relative w-full max-w-[280px]">
                        {/* Dynamic Arrow */}
                        <div
                            className="absolute top-full -mt-px w-3 h-3 border-l border-b border-white/10 bg-[#0f0f0f]/95 rotate-[-45deg]"
                            style={{ left: `${coords.arrowX}px` }}
                        />

                        {title && (
                            <h4 className="text-[10px] font-black text-brand-red uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Info className="w-3 h-3" /> {title}
                            </h4>
                        )}
                        <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
                            {content}
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div
            ref={triggerRef}
            className={clsx("relative inline-flex items-center group", className)}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsVisible(!isVisible);
            }}
        >
            <div className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-help group-hover:scale-110 active:scale-90 duration-200">
                <HelpCircle className="w-4 h-4 text-gray-400 group-hover:text-brand-red transition-colors" />
            </div>

            {mounted && createPortal(TooltipContent, document.body)}
        </div>
    );
}
