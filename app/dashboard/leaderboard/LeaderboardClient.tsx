"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Flame, Users, Award, Swords, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { clsx } from "clsx";
import FollowButton from "../community/FollowButton";
import { getRankings } from "./ranking-actions";

export default function LeaderboardClient({ initialData, currentUser, followedIds }: any) {
    const [category, setCategory] = useState<'xp' | 'combat' | 'social'>('xp');
    const [athletes, setAthletes] = useState(initialData);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (category === 'xp') {
            setAthletes(initialData);
            return;
        }

        async function load() {
            setLoading(true);
            const data = await getRankings(category);
            setAthletes(data);
            setLoading(false);
        }
        load();
    }, [category, initialData]);

    const getStatValue = (athlete: any) => {
        if (category === 'xp') return (athlete.xp_points || 0).toLocaleString();
        if (category === 'combat') return athlete.duels_won?.[0]?.count || 0;
        if (category === 'social') return athlete.followers?.[0]?.count || 0;
        return athlete.level;
    };

    const getStatUnit = () => {
        if (category === 'xp') return 'XP';
        if (category === 'combat') return 'Victoria(s)';
        if (category === 'social') return 'Seguidores';
        return 'Nivel';
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Tabs */}
            <div className="flex bg-brand-gray/50 p-1.5 rounded-2xl border border-white/5 w-fit mx-auto sm:mx-0 overflow-x-auto no-scrollbar max-w-full">
                <button
                    onClick={() => setCategory('xp')}
                    className={clsx(
                        "flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                        category === 'xp' ? "bg-brand-red text-white shadow-glow-sm" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Leyendas
                </button>
                <button
                    onClick={() => setCategory('combat')}
                    className={clsx(
                        "flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                        category === 'combat' ? "bg-brand-red text-white shadow-glow-sm" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Gladiadores
                </button>
                <button
                    onClick={() => setCategory('social')}
                    className={clsx(
                        "flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                        category === 'social' ? "bg-brand-red text-white shadow-glow-sm" : "text-gray-500 hover:text-white"
                    )}
                >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Influencers
                </button>
            </div>

            {/* List */}
            <div className="bg-brand-gray/30 border border-white/5 rounded-[32px] sm:rounded-[40px] overflow-hidden backdrop-blur-xl shadow-2xl">
                {loading ? (
                    <div className="p-20 flex justify-center">
                        <Flame className="w-10 h-10 text-brand-red animate-pulse" />
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {athletes && athletes.length > 0 ? athletes.map((athlete: any, index: number) => (
                            <div
                                key={athlete.id}
                                className={clsx(
                                    "group flex items-center p-4 sm:p-6 transition-all hover:bg-white/5",
                                    index === 0 && "bg-brand-red/5"
                                )}
                            >
                                {/* Rank Number */}
                                <div className="w-10 sm:w-16 flex justify-center shrink-0">
                                    {index === 0 ? <Medal className="w-5 h-5 sm:w-8 sm:h-8 text-yellow-500 drop-shadow-glow" /> :
                                        index === 1 ? <Medal className="w-4 h-4 sm:w-7 sm:h-7 text-gray-400" /> :
                                            index === 2 ? <Medal className="w-4 h-4 sm:w-7 sm:h-7 text-orange-500" /> :
                                                <span className="text-sm sm:text-xl font-heading font-black text-gray-600">#{index + 1}</span>}
                                </div>

                                {/* Avatar */}
                                <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-black border border-white/10 overflow-hidden relative mr-3 sm:mr-6 group-hover:border-brand-red/50 transition-colors shrink-0">
                                    <Image
                                        src={athlete.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.full_name || 'U')}&background=random`}
                                        alt={athlete.full_name}
                                        fill
                                        className="object-cover"
                                    />
                                    {athlete.is_official && (
                                        <div className="absolute top-0 right-0 bg-brand-red p-0.5 sm:p-1 rounded-bl-lg">
                                            <Trophy className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* User Details */}
                                <div className="flex-1 min-w-0 mr-3">
                                    <Link href={`/dashboard/profile/${athlete.username}`} className="block">
                                        <div className="flex items-center gap-1.5 sm:gap-2">
                                            <h3 className="font-heading font-black text-white italic uppercase tracking-tight text-xs sm:text-lg group-hover:text-brand-red transition-colors truncate">
                                                {athlete.full_name}
                                            </h3>
                                            {athlete.level >= 10 && <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
                                        </div>
                                        <p className="text-[7px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mt-0.5 sm:mt-1">
                                            @{athlete.username} <span className="hidden sm:inline">• SOLDADO LVL {athlete.level}</span>
                                        </p>
                                    </Link>
                                </div>

                                {/* Stat Display */}
                                <div className="text-right mr-3 sm:mr-10">
                                    <p className="text-sm sm:text-2xl font-heading font-black text-white italic tracking-tighter leading-none mb-0.5 sm:mb-1">
                                        {getStatValue(athlete)}
                                    </p>
                                    <p className="text-[6px] sm:text-[9px] text-gray-500 font-black uppercase tracking-widest">
                                        {getStatUnit()}
                                    </p>
                                </div>

                                {/* Action */}
                                <div className="shrink-0 scale-90 sm:scale-100">
                                    {athlete.id !== currentUser?.id && (
                                        <FollowButton
                                            targetId={athlete.id}
                                            isFollowingInitial={followedIds.has(athlete.id)}
                                            variant="small"
                                        />
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="p-20 text-center">
                                <p className="text-gray-500 italic">No hay datos disponibles en esta categoría.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
