"use client";

import { useState } from "react";
import { Award, Loader2, CheckCircle2, Clock } from "lucide-react";
import { joinChallenge } from "./ranking-actions";
import { clsx } from "clsx";
import Link from "next/link";

interface ChallengeCardProps {
    challenge: any;
    userId: string | undefined;
    isParticipatingInitial: boolean;
    isAdmin?: boolean;
    onEdit?: (challenge: any) => void;
}

export default function ChallengeCard({ challenge, userId, isParticipatingInitial, isAdmin, onEdit }: ChallengeCardProps) {
    const [loading, setLoading] = useState(false);
    const [isJoined, setIsJoined] = useState(isParticipatingInitial);

    const participation = challenge.participants?.find((p: any) => p.user_id === userId);

    const daysLeft = challenge.end_date
        ? Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000))
        : null;

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
        <Link href={`/dashboard/leaderboard/challenge/${challenge.id}`} className="block h-full group">
            <div className="bg-brand-gray/30 border border-white/5 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] backdrop-blur-md relative overflow-hidden group-hover:border-brand-red/30 transition-all h-full flex flex-col justify-between">
                <div>
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
                    <p className="text-[11px] sm:text-xs text-gray-400 font-medium mb-3 line-clamp-2">{challenge.description}</p>
                    {daysLeft !== null && (
                        <div className="flex items-center gap-1.5 mb-4">
                            <Clock className="w-3 h-3 text-orange-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
                                {daysLeft === 0 ? 'Termina hoy' : `${daysLeft} días restantes`}
                            </span>
                        </div>
                    )}
                </div>

                {isJoined ? (
                    <div className="space-y-2 mb-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] sm:text-[10px] font-black text-brand-red uppercase tracking-widest">Tu Progreso</span>
                            <span className="text-xs font-black text-white italic">
                                {(participation?.current_progress || 0)} / {challenge.goal_value || '?'}
                            </span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-brand-red rounded-full transition-all duration-1000 shadow-glow-sm relative overflow-hidden"
                                style={{ width: `${Math.min(100, ((participation?.current_progress || 0) / (challenge.goal_value || 1)) * 100)}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                        <button disabled className="w-full mt-2 py-2 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-3 h-3" /> Inscrito
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Atletas inscritos</span>
                                <span className="text-xs font-black text-white italic">{(challenge.participants?.length || 0)}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-red rounded-full transition-all duration-1000 shadow-glow-sm"
                                    style={{ width: `${Math.min(100, ((challenge.participants?.length || 0) + (isJoined ? 1 : 0)) * 5)}%` }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleJoin();
                            }}
                            disabled={loading}
                            className={clsx(
                                "w-full py-3.5 sm:py-3 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all flex items-center justify-center gap-2 relative z-20",
                                loading ? "bg-brand-gray text-gray-400" : "bg-brand-red text-white hover:shadow-glow-sm active:scale-95 hover:bg-red-600"
                            )}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Participar"}
                        </button>
                    </div>
                )}
            </div>
        </Link>
    );
}
