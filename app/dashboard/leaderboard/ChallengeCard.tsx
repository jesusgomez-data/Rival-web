"use client";

import { useState, useEffect } from "react";
import { Award, Loader2, CheckCircle2, Clock, Edit2, Share2, Users, X, UserCircle } from "lucide-react";
import { joinChallenge, getChallengeParticipants, syncMyChallengeProgress } from "./ranking-actions";
import { isAutoTrackableChallenge } from "@/lib/challenge-types";
import { clsx } from "clsx";
import Link from "next/link";
import Image from "next/image";

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
    const [showParticipants, setShowParticipants] = useState(false);
    const [participantsData, setParticipantsData] = useState<any[]>([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);

    const [liveCount, setLiveCount] = useState(challenge.participants?.length || 0);
    const [liveParticipation, setLiveParticipation] = useState<any>(
        challenge.participants?.find((p: any) => p.user_id === userId)
    );

    useEffect(() => {
        let mounted = true;
        const fetchLiveStatus = async () => {
            // Retos tipo "entrena X días" se recalculan solos contra la
            // actividad real cada vez que se ve la tarjeta — antes esto
            // dependía de que el usuario escribiera su propio número a mano.
            if (isAutoTrackableChallenge(challenge.goal_type)) {
                await syncMyChallengeProgress(challenge.id).catch(() => {});
            }
            const res = await getChallengeParticipants(challenge.id);
            if (res.success && res.participants && mounted) {
                setLiveCount(res.participants.length);
                const myPart = res.participants.find((p: any) => p.user_id === userId);
                if (myPart) {
                    setIsJoined(true);
                    setLiveParticipation(myPart);
                } else {
                    setIsJoined(false);
                    setLiveParticipation(undefined);
                }
            }
        };
        fetchLiveStatus();
        return () => { mounted = false; };
    }, [challenge.id, challenge.goal_type, userId]);

    const openParticipantsModal = async () => {
        setShowParticipants(true);
        if (participantsData.length === 0) {
            setLoadingParticipants(true);
            const res = await getChallengeParticipants(challenge.id);
            if (res.success) setParticipantsData(res.participants || []);
            setLoadingParticipants(false);
        }
    };



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
                setLiveCount((prev: number) => prev + 1);
                setLiveParticipation({ current_progress: 0 });
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
        <>
        <Link href={`/dashboard/leaderboard/challenge/${challenge.id}`} className="block h-full group">
            <div className="bg-brand-gray/30 border border-white/5 p-5 sm:p-6 rounded-[28px] sm:rounded-[32px] backdrop-blur-md relative overflow-hidden group-hover:border-brand-red/30 transition-all h-full flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between mb-3 sm:mb-4 relative z-10">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black/40 rounded-xl flex items-center justify-center border border-white/10 text-brand-red">
                            <Award className="w-5 h-5" />
                        </div>
                        <div className="text-right flex items-center gap-2">
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const { shareChallengeToFeed } = await import('./ranking-actions');
                                            const res = await shareChallengeToFeed(challenge.id);
                                            if (res.success) alert("¡Reto compartido en el feed exitosamente!");
                                            else alert(res.error || "Error al compartir");
                                        }}
                                        className="p-1.5 bg-brand-red/10 border border-brand-red/20 hover:bg-brand-red/20 text-brand-red hover:text-white rounded-lg transition-all active:scale-95 flex items-center justify-center relative z-30"
                                        title="Compartir al Feed"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                    </button>
                                    {onEdit && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onEdit(challenge);
                                            }}
                                            className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded-lg transition-all active:scale-95 flex items-center justify-center relative z-30"
                                            title="Editar Reto"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </>
                            )}
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
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Atletas inscritos</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white italic">{liveCount}</span>
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); openParticipantsModal(); }}
                                    className="bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded-md flex items-center gap-1 transition-all active:scale-95 z-30"
                                    title="Ver inscritos"
                                >
                                    <Users className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] sm:text-[10px] font-black text-brand-red uppercase tracking-widest">Tu Progreso</span>
                            <span className="text-xs font-black text-white italic">
                                {(liveParticipation?.current_progress || 0)} / {challenge.goal_value || '?'}
                            </span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className="h-full bg-brand-red rounded-full transition-all duration-1000 shadow-glow-sm relative overflow-hidden"
                                style={{ width: `${Math.min(100, ((liveParticipation?.current_progress || 0) / (challenge.goal_value || 1)) * 100)}%` }}
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
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Atletas inscritos</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-white italic">{liveCount}</span>
                                    <button 
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openParticipantsModal(); }}
                                        className="bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded-md flex items-center gap-1 transition-all active:scale-95 z-30"
                                        title="Ver inscritos"
                                    >
                                        <Users className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-red rounded-full transition-all duration-1000 shadow-glow-sm"
                                    style={{ width: `${Math.min(100, (liveCount + (isJoined ? 1 : 0)) * 5)}%` }}
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

        {showParticipants && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowParticipants(false); }}>
                <div 
                    className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <h3 className="text-sm font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-red" />
                            Atletas Inscritos
                        </h3>
                        <button 
                            onClick={() => setShowParticipants(false)}
                            className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {loadingParticipants ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
                                <span className="text-xs font-bold uppercase tracking-widest">Cargando atletas...</span>
                            </div>
                        ) : participantsData.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 text-xs italic">
                                No hay inscritos aún.
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {participantsData.map((p, idx) => (
                                    <Link 
                                        key={idx}
                                        href={`/dashboard/profile/${p.profiles?.username || ''}`}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 overflow-hidden relative flex-shrink-0">
                                            {p.profiles?.avatar_url && (p.profiles.avatar_url.startsWith('http') || p.profiles.avatar_url.startsWith('/')) ? (
                                                <Image src={p.profiles.avatar_url} alt={p.profiles.username} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-brand-red/10 text-brand-red font-black uppercase text-xs">
                                                    {p.profiles?.username?.substring(0, 2) || "?"}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-sm font-black text-white truncate group-hover:text-brand-red transition-colors">
                                                    {p.profiles?.full_name || p.profiles?.username}
                                                </h4>
                                                {p.profiles?.is_official && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">@{p.profiles?.username}</p>
                                        </div>
                                        {p.is_completed ? (
                                            <div className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 flex items-center gap-1 shrink-0">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Completado</span>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0 text-right">
                                                <span className="text-brand-red">{p.current_progress}</span> / {challenge.goal_value || '?'}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
