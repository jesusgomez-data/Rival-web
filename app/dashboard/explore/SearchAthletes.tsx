"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export default function SearchAthletes() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get("q") || "");
    const [isPending, startTransition] = useTransition();

    const handleSearch = (val: string) => {
        setQuery(val);
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (val) {
                params.set("q", val);
            } else {
                params.delete("q");
            }
            router.push(`/dashboard/community?${params.toString()}`);
        });
    };

    return (
        <div className="relative group w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-red transition-colors" />
            <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar atletas o rivales..."
                className="w-full bg-brand-gray border border-white/5 rounded-xl md:rounded-2xl py-2.5 md:py-3 pl-11 md:pl-12 pr-10 text-xs md:text-sm text-white focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20 transition-all placeholder:text-gray-600"
            />
            {query && (
                <button
                    onClick={() => handleSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
            {isPending && (
                <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-brand-red/20 overflow-hidden rounded-full">
                    <div className="h-full bg-brand-red w-1/3 animate-[shimmer_1.5s_infinite] transition-all" />
                </div>
            )}
        </div>
    );
}
