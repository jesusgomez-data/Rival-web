"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Loader2, Users, X } from "lucide-react";
import { getPostLikes, toggleLike } from "./actions";
import clsx from "clsx";

interface LikeButtonProps {
    postId: string;
    initialLikes: number;
    hasLikedInitial: boolean;
}

const sessionLikeState = new Map<string, { likes: number; hasLiked: boolean }>();

export function rememberLikeState(postId: string, likes: number, hasLiked: boolean) {
    sessionLikeState.set(postId, { likes, hasLiked });
}

export default function LikeButton({ postId, initialLikes, hasLikedInitial }: LikeButtonProps) {
    const cached = sessionLikeState.get(postId);
    const [likes, setLikes] = useState(cached?.likes ?? initialLikes);
    const [hasLiked, setHasLiked] = useState(cached?.hasLiked ?? hasLikedInitial);
    const [isPending, setIsPending] = useState(false);
    const [bounce, setBounce] = useState(false);
    const [showLikes, setShowLikes] = useState(false);
    const [likers, setLikers] = useState<any[]>([]);
    const [loadingLikers, setLoadingLikers] = useState(false);

    useEffect(() => {
        const onExternalLike = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.postId !== postId) return;
            if (!hasLiked && !isPending) handleToggle();
            else if (hasLiked) {
                setBounce(true);
                setTimeout(() => setBounce(false), 400);
            }
        };
        window.addEventListener('rival-external-like', onExternalLike);
        return () => window.removeEventListener('rival-external-like', onExternalLike);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId, hasLiked, isPending, likes]);

    const handleToggle = async () => {
        if (isPending) return;
        setIsPending(true);

        setBounce(true);
        setTimeout(() => setBounce(false), 400);

        const previousLikes = likes;
        const previousHasLiked = hasLiked;
        const newLikes = hasLiked ? Math.max(0, likes - 1) : likes + 1;
        const newHasLiked = !hasLiked;

        setLikes(newLikes);
        setHasLiked(newHasLiked);
        sessionLikeState.set(postId, { likes: newLikes, hasLiked: newHasLiked });

        const result = await toggleLike(postId);

        if (result.error) {
            setLikes(previousLikes);
            setHasLiked(previousHasLiked);
            sessionLikeState.set(postId, { likes: previousLikes, hasLiked: previousHasLiked });
        }

        setIsPending(false);
    };

    const openLikes = async () => {
        if (likes <= 0) return;
        setShowLikes(true);
        setLoadingLikers(true);
        try {
            const data = await getPostLikes(postId);
            setLikers(data || []);
        } finally {
            setLoadingLikers(false);
        }
    };

    return (
        <div className={clsx("flex flex-col items-center gap-1 group", hasLiked ? "text-brand-red" : "text-zinc-400")}>
            <button
                onClick={handleToggle}
                disabled={isPending}
                aria-label={hasLiked ? "Quitar like" : "Dar like"}
                className="transition-all active:scale-90 hover:text-brand-red"
            >
                <Heart
                    className={clsx(
                        "w-7 h-7 transition-all duration-200",
                        hasLiked && "fill-current drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]",
                        bounce && "scale-125"
                    )}
                />
            </button>
            <button
                type="button"
                onClick={openLikes}
                disabled={likes <= 0}
                className="text-[10px] font-black disabled:cursor-default disabled:opacity-80 hover:text-white transition-colors"
                aria-label="Ver personas que dieron like"
            >
                {likes}
            </button>

            {showLikes && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowLikes(false)}>
                    <div className="w-full max-w-sm max-h-[80vh] overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-white/5 bg-white/5 px-5 py-4">
                            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
                                <Users className="h-4 w-4 text-brand-red" /> Likes
                            </h3>
                            <button onClick={() => setShowLikes(false)} className="text-gray-500 hover:text-white" aria-label="Cerrar">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-3">
                            {loadingLikers ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-brand-red" /></div>
                            ) : likers.length > 0 ? (
                                likers.map((person) => (
                                    <Link key={person.id} href={`/dashboard/profile/${person.username}`} onClick={() => setShowLikes(false)} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-white/5 transition-colors">
                                        <img src={person.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.full_name || person.username || 'User')}&background=random`} alt={person.full_name || person.username} className="h-10 w-10 rounded-full object-cover bg-zinc-900 border border-white/10" />
                                        <div className="min-w-0 text-left">
                                            <p className="truncate text-sm font-bold text-white">{person.full_name || person.username}</p>
                                            <p className="truncate text-xs text-gray-500">@{person.username}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="py-10 text-center text-sm font-bold text-gray-500">Aun no hay likes.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

