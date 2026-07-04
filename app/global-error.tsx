'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'] });

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global Error detected:', error);
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="es">
            <body className={`${outfit.className} bg-black text-white antialiased`}>
                <div className="flex h-screen w-full flex-col items-center justify-center p-6 text-center">

                    {/* Logo or Icon could go here */}
                    <div className="mb-6 rounded-full bg-red-500/10 p-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-red-500"
                        >
                            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight mb-3">
                        Algo salió mal
                    </h1>

                    <p className="text-gray-400 mb-8 max-w-md text-lg">
                        Hemos encontrado un error inesperado al cargar la aplicación.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => reset()}
                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg shadow-red-900/20"
                        >
                            Reintentar
                        </button>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors duration-200"
                        >
                            Volver al inicio
                        </button>
                    </div>

                    <p className="mt-12 text-xs text-zinc-600 font-mono">
                        Error ID: {error.digest || 'Unknown'}
                    </p>
                </div>
            </body>
        </html>
    );
}
