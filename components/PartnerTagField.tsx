"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Users, UserPlus } from "lucide-react";
import { searchProfilesForTag } from "@/app/dashboard/explore/actions";

export interface TaggedProfile {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string | null;
}

// Buscador de "compañero" reutilizable — mismo patrón que ya se usaba solo
// dentro de WODTrackerModal (para registrar resultado), ahora también
// disponible al CREAR/EDITAR el WOD en sí (WodCreator), que es donde el
// usuario realmente espera poder etiquetar con quién entrenó.
export default function PartnerTagField({
    value,
    onChange,
    label = "Compañero (Opcional)",
}: {
    value: TaggedProfile | null;
    onChange: (partner: TaggedProfile | null) => void;
    label?: string;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TaggedProfile[]>([]);
    const [searching, setSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const data = await searchProfilesForTag(query);
                setResults(data as TaggedProfile[]);
            } catch (e) {
                console.error("Error buscando compañero:", e);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [query]);

    return (
        <div>
            <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                {label}
            </label>
            {value ? (
                <div className="flex items-center gap-3 bg-black/30 border border-brand-red/30 rounded-lg p-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0 relative">
                        {value.avatar_url ? (
                            <img src={value.avatar_url} alt={value.full_name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black uppercase">
                                {(value.full_name || value.username || "U").substring(0, 2)}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{value.full_name}</p>
                        <p className="text-gray-500 text-xs truncate">@{value.username}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => { onChange(null); setQuery(""); }}
                        className="p-2 rounded-full text-gray-500 hover:text-brand-red hover:bg-brand-red/10 transition-colors shrink-0"
                        aria-label="Quitar compañero"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                            placeholder="Buscar por nombre o @usuario..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-brand-red/50"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                        )}
                    </div>
                    {showDropdown && query.trim().length >= 2 && (
                        <div className="absolute z-10 mt-1 w-full bg-[#161616] border border-white/10 rounded-lg overflow-hidden shadow-2xl max-h-56 overflow-y-auto">
                            {results.length > 0 ? (
                                results.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { onChange(p); setQuery(""); setShowDropdown(false); }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0 relative">
                                            {p.avatar_url ? (
                                                <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white text-[9px] font-black uppercase">
                                                    {(p.full_name || p.username || "U").substring(0, 2)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white text-sm font-bold truncate">{p.full_name}</p>
                                            <p className="text-gray-500 text-xs truncate">@{p.username}</p>
                                        </div>
                                    </button>
                                ))
                            ) : !searching ? (
                                <p className="p-3 text-xs text-gray-500 font-medium">Sin resultados</p>
                            ) : null}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
