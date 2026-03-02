import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function isImageUrl(src: string | undefined | null): boolean {
    if (!src || typeof src !== 'string') return false;
    const trimmed = src.trim();
    // JSON data starts with { or [ — not a valid image URL
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed === 'null' || trimmed === 'undefined') return false;
    // Standard next/image requirement: must start with / or http
    return trimmed.startsWith('/') || trimmed.startsWith('http') || trimmed.startsWith('blob:') || trimmed.startsWith('data:');
}
