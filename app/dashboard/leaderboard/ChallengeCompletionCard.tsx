"use client";

import { useState } from "react";
import { Trophy, Share2 } from "lucide-react";
import InstagramShareCard from "../InstagramShareCard";

interface ChallengeCompletionCardProps {
    challenge: {
        title: string;
        xp_reward: number;
    };
    user: {
        username: string;
        full_name: string;
        avatar_url: string;
    };
    progress: number;
}

export default function ChallengeCompletionCard({ challenge, user, progress }: ChallengeCompletionCardProps) {
    const [showShare, setShowShare] = useState(false);

    return (
        <>
            <div
                onClick={() => setShowShare(true)}
                className="mt-4 w-full bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-yellow-500/20 transition-all group shadow-glow-sm"
            >
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-1 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Status
                    </p>
                    <p className="text-sm font-black text-white italic uppercase flex items-center gap-2">
                        Completado
                    </p>
                </div>
                <div className="bg-yellow-500/20 p-2 rounded-full text-yellow-500 group-hover:scale-110 transition-transform bg-white/5 border border-white/10">
                    <Share2 className="w-4 h-4" />
                </div>
            </div>

            {showShare && (
                <InstagramShareCard
                    user={user.full_name || user.username}
                    username={user.username}
                    avatar={user.avatar_url}
                    content={{
                        type: 'challenge',
                        title: challenge.title,
                        highlight: `+${challenge.xp_reward} XP Gained`,
                        stats: [
                            { label: 'STATUS', value: 'COMPLETADO', icon: 'heart' },
                            { label: 'RESULTADO', value: `${progress}`, icon: 'time' }
                        ]
                    }}
                    onClose={() => setShowShare(false)}
                />
            )}
        </>
    );
}
