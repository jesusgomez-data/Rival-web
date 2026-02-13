"use client";

import { useState } from "react";
import { Award, Loader2, CheckCircle2 } from "lucide-react";
import { joinChallenge } from "./ranking-actions";
import { clsx } from "clsx";

interface ChallengeCardProps {
    challenge: any;
    userId: string | undefined;
    isParticipatingInitial: boolean;
}

export default function ChallengeCard({ challenge, userId, isParticipatingInitial }: ChallengeCardProps) {
    const [loading, setLoading] = useState(false);
    const [isJoined, setIsJoined] = useState(isParticipatingInitial);

    const handleJoin = async () => {
        if (!userId || isJoined) return;
        setLoading(true);
        try {
            const res = await joinChallenge(challenge.id);
            if (res.success) {
                setIsJoined(true);
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
        <div className="bg-brand-gray/30 border border-white/5 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] backdrop-blur-md relative overflow-hidden group hover:border-brand-red/30 transition-all">
            <div className="flex items-start justify-between mb-3 sm:mb-4 relative z-10">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black/40 rounded-xl flex items-center justify-center border border-white/10 text-brand-red">
                    <Award className="w-5 h-5" />
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-black text-brand-red bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/20 uppercase tracking-widest">
                        +{challenge.xp_reward} XP
                    </span>
                </div>
            </div>
            <h4 className="text-base sm:text-lg font-black text-white italic uppercase tracking-tight mb-2 group-hover:text-brand-red transition-colors">{challenge.title}</h4>
            <p className="text-[11px] sm:text-xs text-gray-400 font-medium mb-5 sm:mb-6 line-clamp-2">{challenge.description}</p>

            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Atletas inscritos</span>
                        <span className="text-xs font-black text-white italic">{(challenge.participants?.length || 0) + (isJoined && !isParticipatingInitial ? 1 : 0)}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand-red rounded-full transition-all duration-1000 shadow-glow-sm"
                            style={{ width: `${Math.min(100, ((challenge.participants?.length || 0) + (isJoined ? 1 : 0)) * 5)}%` }}
                        />
                    </div>
                </div>

                <button
                    onClick={handleJoin}
                    disabled={loading || isJoined}
                    className={clsx(
                        "w-full py-3.5 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all flex items-center justify-center gap-2",
                        isJoined
                            ? "bg-brand-red/10 text-brand-red border border-brand-red/10 cursor-default"
                            : "bg-brand-red text-white hover:shadow-glow-sm active:scale-95"
                    )}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isJoined ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" /> INSCRITO
                        </>
                    ) : (
                        "Participar"
                    )}
                </button>
            </div>
        </div>
    );
}
