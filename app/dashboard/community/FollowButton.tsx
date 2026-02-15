"use client";

import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toggleFollow } from "./follows-actions";
import clsx from "clsx";

interface FollowButtonProps {
    targetId: string;
    isFollowingInitial: boolean;
    variant?: 'small' | 'large';
}

export default function FollowButton({ targetId, isFollowingInitial, variant = 'small' }: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(isFollowingInitial);
    const [isPending, setIsPending] = useState(false);

    const handleToggle = async () => {
        if (isPending) return;
        setIsPending(true);

        // Optimistic UI update
        const previousState = isFollowing;
        setIsFollowing(!previousState);

        const result = await toggleFollow(targetId);

        if (result.error) {
            // Rollback on error
            setIsFollowing(previousState);
            alert("Error: " + result.error);
        }

        setIsPending(false);
    };

    if (variant === 'large') {
        return (
            <button
                onClick={handleToggle}
                disabled={isPending}
                className={clsx(
                    "w-full flex items-center justify-center gap-2 py-2 md:py-3 rounded-xl text-xs md:text-base font-bold transition-all",
                    isFollowing
                        ? "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                        : "bg-brand-red text-white hover:bg-red-600 shadow-[0_4px_15px_rgba(220,38,38,0.3)]"
                )}
            >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : isFollowing ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {isFollowing ? "Dejar de seguir" : "Seguir Atleta"}
            </button>
        );
    }

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={clsx(
                "text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all flex items-center gap-1 whitespace-nowrap",
                isFollowing
                    ? "bg-white/5 text-gray-500 border border-white/10"
                    : "bg-brand-red/10 text-brand-red border border-brand-red/20 hover:bg-brand-red hover:text-white"
            )}
        >
            {isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
            ) : isFollowing ? (
                <>Dejar</>
            ) : (
                <>Seguir</>
            )}
        </button>
    );
}
