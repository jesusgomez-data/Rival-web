import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-full text-center px-4 bg-background text-foreground">
            <div className="mb-6 rounded-full bg-zinc-800/50 p-6">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-zinc-500"
                >
                    <path d="m21 21-4.3-4.3" />
                    <path d="M11 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6" />
                    <circle cx="11" cy="11" r="8" />
                </svg>
            </div>

            <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-700 to-zinc-900 mb-2 select-none">
                404
            </h1>

            <h2 className="text-2xl font-bold mb-4 tracking-tight">
                Página no encontrada
            </h2>

            <p className="text-muted-foreground mb-8 max-w-md text-lg">
                Parece que te has desviado de la ruta. Esta página no existe o ha sido movida.
            </p>

            <Link
                href="/"
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-lg shadow-red-900/20"
            >
                Volver a la arena
            </Link>
        </div>
    );
}
