"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MapPin, User, Building2, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchGlobal } from "./search-actions";
// import { useDebounce } from "use-debounce"; // Or custom debounce if not available

export default function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Debounce custom implementation since we might not have the package installed
    const [debouncedQuery, setDebouncedQuery] = useState(query);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        async function fetchResults() {
            if (debouncedQuery.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            const data = await searchGlobal(debouncedQuery);
            setResults(data);
            setLoading(false);
            setIsOpen(true);
        }

        fetchResults();
    }, [debouncedQuery]);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (url: string) => {
        setIsOpen(false);
        setQuery("");
        router.push(url);
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-md group z-50">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-red transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    placeholder="Buscar atletas, gimnasios..."
                    className="w-full h-10 pl-11 pr-4 bg-muted border-border border focus:border-brand-red/50 rounded-xl text-sm outline-none transition-all placeholder:text-muted-foreground text-foreground"
                />
                {query && (
                    <button
                        onClick={() => { setQuery(""); setResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && (results.length > 0 || loading) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[60vh] overflow-y-auto py-2">
                        {loading && results.length === 0 && (
                            <div className="p-4 text-center text-xs text-gray-500">Buscando...</div>
                        )}

                        {results.map((result, idx) => (
                            <button
                                key={`${result.type}-${result.id}-${idx}`}
                                onClick={() => handleSelect(result.url)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${result.type === 'gym' ? 'bg-blue-500/10 text-blue-500' : 'bg-brand-red/10 text-brand-red'}`}>
                                    {result.image ? (
                                        <img src={result.image} alt={result.title} className="w-full h-full object-cover" />
                                    ) : (
                                        result.type === 'gym' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{result.title}</p>
                                    <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                        {result.type === 'gym' ? <MapPin className="w-3 h-3" /> : '@'}
                                        {result.subtitle}
                                    </p>
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded">
                                    {result.type === 'gym' ? 'CENTRO' : 'ATLETA'}
                                </div>
                            </button>
                        ))}

                        {results.length === 0 && !loading && (
                            <div className="p-4 text-center text-xs text-gray-500">
                                No se encontraron resultados para "{query}"
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
}
