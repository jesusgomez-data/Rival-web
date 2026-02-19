'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service if meaningful
        console.error('Page Error detected:', error);
    }, [error]);

    return (
        <div className="flex h-[70vh] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="mb-4 rounded-full bg-red-500/10 p-3">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-500"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>

            <h2 className="text-xl font-semibold mb-2">Ha ocurrido un error</h2>

            <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                No pudimos cargar esta sección correctamente.
            </p>

            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
                Intentar de nuevo
            </button>
        </div>
    );
}
