"use client";

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("DASHBOARD ERROR:", error);
        console.error("ERROR MESSAGE:", error.message);
        console.error("ERROR STACK:", error.stack);
    }, [error]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-8">
                <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest mb-4">
                    🔴 Error de Dashboard
                </h2>
                <div className="bg-black/50 rounded-xl p-4 mb-6 font-mono text-sm overflow-auto max-h-96">
                    <p className="text-red-400 font-bold text-base mb-2">
                        {process.env.NODE_ENV === 'production'
                            ? "Ha ocurrido un error inesperado."
                            : error.message || "Error desconocido"}
                    </p>
                    {process.env.NODE_ENV !== 'production' && error.stack && (
                        <pre className="text-gray-400 text-xs whitespace-pre-wrap">
                            {error.stack}
                        </pre>
                    )}
                    {error.digest && (
                        <p className="text-gray-500 text-xs mt-4">
                            Ref: {error.digest}
                        </p>
                    )}
                </div>
                <button
                    onClick={reset}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-3 rounded-xl tracking-widest transition-all"
                >
                    Intentar de nuevo
                </button>
            </div>
        </div>
    );
}
