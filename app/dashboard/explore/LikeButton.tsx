"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "./actions";
import clsx from "clsx";

interface LikeButtonProps {
    postId: string;
    initialLikes: number;
    hasLikedInitial: boolean;
}

export default function LikeButton({ postId, initialLikes, hasLikedInitial }: LikeButtonProps) {
    const [likes, setLikes] = useState(initialLikes);
    const [hasLiked, setHasLiked] = useState(hasLikedInitial);
    const [isPending, setIsPending] = useState(false);
    const [bounce, setBounce] = useState(false);

    // Doble-tap sobre el contenido del post → like (nunca quita el like, como IG)
    useEffect(() => {
        const onExternalLike = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.postId !== postId) return;
            if (!hasLiked && !isPending) handleToggle();
            else if (hasLiked) {
                // Ya con like: solo el rebote visual como feedback
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

        // Trigger bounce animation
        setBounce(true);
        setTimeout(() => setBounce(false), 400);

        // Optimistic UI update
        const newLikes = hasLiked ? Math.max(0, likes - 1) : likes + 1;
        const newHasLiked = !hasLiked;

        setLikes(newLikes);
        setHasLiked(newHasLiked);

        const result = await toggleLike(postId);

        if (result.error) {
            // Rollback on error
            setLikes(likes);
            setHasLiked(hasLiked);
        }

        setIsPending(false);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            aria-label={hasLiked ? "Quitar like" : "Dar like"}
            className={clsx(
                "flex flex-col items-center gap-1 group transition-all active:scale-90",
                hasLiked ? "text-brand-red" : "text-zinc-400 hover:text-brand-red"
            )}
        >
            <Heart
                className={clsx(
                    "w-7 h-7 transition-all duration-200",
                    hasLiked && "fill-current drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]",
                    bounce && "scale-125"
                )}
            />
            <span className="text-[10px] font-black">{likes}</span>
        </button>
    );
}
