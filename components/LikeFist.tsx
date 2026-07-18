"use client";

import clsx from "clsx";
import type { CSSProperties } from "react";

// Icono de "like" en toda la app: el emoji 👊 tal cual, no un SVG que se le
// parezca. Cuando no está dado el like se muestra en gris/semi-transparente
// (no hay "outline" de un emoji); cuando sí, a todo color.
export default function LikeFist({
    active = false,
    size = 28,
    className,
    style,
}: {
    active?: boolean;
    size?: number;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <span
            aria-hidden="true"
            className={clsx(
                "inline-block leading-none select-none transition-all duration-200",
                active ? "grayscale-0 opacity-100" : "grayscale opacity-40",
                className
            )}
            style={{ fontSize: size, ...style }}
        >
            👊
        </span>
    );
}
