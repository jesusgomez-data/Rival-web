"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { joinChallenge } from "../../ranking-actions";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

export default function ChallengeJoinButton({ challengeId }: { challengeId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleJoin = async () => {
        setLoading(true);
        try {
            const res = await joinChallenge(challengeId);
            if (res.success) {
                router.refresh();
            } else {
                alert(res.error || "Error al unirse al reto");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleJoin}
            disabled={loading}
            className={clsx(
                "w-full py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-glow hover:scale-105 active:scale-95 border border-brand-red/20",
                loading ? "bg-gray-800 text-gray-400" : "bg-brand-red text-white"
            )}
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "UNIRME AL DESAFÍO"}
        </button>
    );
}
