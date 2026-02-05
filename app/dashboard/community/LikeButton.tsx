"use client";

import { useState } from "react";
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

    const handleToggle = async () => {
        if (isPending) return;
        setIsPending(true);

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
            alert("Error: " + result.error);
        }

        setIsPending(false);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={clsx(
                "flex items-center gap-2 transition-all group",
                hasLiked ? "text-brand-red" : "text-gray-400 hover:text-brand-red"
            )}
        >
            <Heart className={clsx("w-5 h-5", hasLiked && "fill-current")} />
            <span className="font-bold text-xs">{likes}</span>
        </button>
    );
}
