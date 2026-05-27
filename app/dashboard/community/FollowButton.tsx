"use client";

import { useState } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toggleFollow } from "./follows-actions";
import clsx from "clsx";

interface FollowButtonProps {
    targetId: string;
    isFollowingInitial: boolean;
    variant?: 'small' | 'large';
    onToggle?: (following: boolean) => void;
}

export default function FollowButton({ targetId, isFollowingInitial, variant = 'small', onToggle }: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(isFollowingInitial);
    const [isPending, setIsPending] = useState(false);

    const handleToggle = async () => {
        if (isPending) return;
        setIsPending(true);

        const previousState = isFollowing;
        const nextState = !previousState;
        setIsFollowing(nextState);
        onToggle?.(nextState);

        const result = await toggleFollow(targetId);

        if (result.error) {
            setIsFollowing(previousState);
            onToggle?.(previousState);
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
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                isFollowing
                    ? "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white"
                    : "bg-brand-red text-white shadow-[0_4px_15px_rgba(220,38,38,0.3)] hover:bg-red-600"
            )}
        >
            {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
                <><UserMinus className="w-4 h-4" /> Siguiendo</>
            ) : (
                <><UserPlus className="w-4 h-4" /> Seguir</>
            )}
        </button>
    );
}
