import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Medal, Flame, TrendingUp, Users, Award, Shield } from "lucide-react";
import clsx from "clsx";
import FollowButton from "../community/FollowButton";


export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
    const supabase = await createClient();

    // Fetch current user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch top 10 athletes by XP
    const { data: athletes } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, xp_points, level, is_official')
        .order('xp_points', { ascending: false })
        .limit(10);

    // Fetch user follows
    const { data: myFollows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id || '');

    const followedIds = new Set(myFollows?.map(f => f.following_id) || []);

    // Get current user's rank
    let myRank = null;
    let myProfile: any = null;
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('xp_points, full_name, avatar_url, username, level').eq('id', user.id).single();
        myProfile = profile;
        if (profile) {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gt('xp_points', profile.xp_points);
            myRank = (count || 0) + 1;
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header Section */}
            <div className="relative p-8 rounded-3xl bg-gradient-to-r from-brand-red/20 via-zinc-900 to-zinc-900 border border-white/5 overflow-hidden">
                <Trophy className="absolute -right-8 -top-8 w-48 h-48 text-brand-red opacity-10 rotate-12" />
                <div className="relative z-10">
                    <h1 className="text-4xl font-heading font-bold text-white mb-2 uppercase italic tracking-tighter">Salón de la Fama</h1>
                    <p className="text-gray-400 max-w-md">Cada repetición cuenta. Cada entrenamiento es un paso hacia la grandeza. Mira quién lidera el campo de batalla.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-brand-gray/40 border border-border/10 p-6 rounded-[32px] flex items-center gap-4 group hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500">
                        <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest leading-none mb-1">Trofeos Totales</p>
                        <p className="text-xl font-heading font-black text-foreground italic">4 Disponibles</p>
                    </div>
                </div>
                <div className="bg-brand-gray/40 border border-border/10 p-6 rounded-[32px] flex items-center gap-4 group hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest leading-none mb-1">Combate Arena</p>
                        <p className="text-xl font-heading font-black text-foreground italic">Duelos Temporada 1</p>
                    </div>
                </div>
                <div className="bg-brand-gray/40 border border-border/10 p-6 rounded-[32px] flex items-center gap-4 group hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest leading-none mb-1">Rango Global</p>
                        <p className="text-xl font-heading font-black text-foreground italic">Soldado Activo</p>
                    </div>
                </div>
            </div>

            {/* Your Status (If not in top 1) */}
            {
                myProfile && (
                    <div className="bg-brand-red p-[1px] rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                        <div className="bg-zinc-900/95 backdrop-blur-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-brand-red flex items-center justify-center text-white font-heading font-black text-2xl drop-shadow-glow">
                                        #{myRank}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-brand-gray animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-heading font-black text-brand-red italic uppercase">{myProfile.full_name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black uppercase text-brand-red bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded tracking-widest">{myProfile.level || 'Recluta'}</span>
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Estado Activo</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-12 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                                <div className="text-center sm:text-right">
                                    <p className="text-2xl font-heading font-black text-white tabular-nums">{myProfile.xp_points.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Tu XP Total</p>
                                </div>
                                <div className="text-center sm:text-right">
                                    <p className="text-2xl font-heading font-black text-brand-red italic">{myProfile.level || 'SOLDADO'}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Rango Global</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Main Ranking List */}
            <div className="bg-brand-gray border border-border/10 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-border/10 bg-black/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-red" />
                        <h2 className="font-heading font-bold text-white uppercase italic tracking-wider">Clasificación Global</h2>
                    </div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Calculado por XP Total</span>
                </div>

                <div className="divide-y divide-white/5">
                    {athletes && athletes.length > 0 ? (
                        athletes.map((athlete, index) => (
                            <div
                                key={athlete.username}
                                className={clsx(
                                    "flex items-center p-4 lg:p-6 transition-all hover:bg-white/5 group",
                                    index === 0 ? "bg-brand-red/5" : ""
                                )}
                            >
                                {/* Rank */}
                                <div className="w-12 flex justify-center items-center">
                                    {index < 3 ? (
                                        <Medal className={clsx(
                                            "w-6 h-6",
                                            index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-300" : "text-orange-500"
                                        )} />
                                    ) : (
                                        <span className="text-gray-500 font-mono font-bold">#{index + 1}</span>
                                    )}
                                </div>

                                {/* User Info */}
                                <div className="flex items-center gap-4 flex-1 px-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden relative border border-white/10 group-hover:border-brand-red/50 transition-colors">
                                        <Image
                                            src={athlete.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.full_name || 'User')}&background=random`}
                                            alt={athlete.full_name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm lg:text-base text-brand-red font-bold">{athlete.full_name}</p>
                                        <p className="text-xs text-gray-500">@{athlete.username}</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-6 lg:gap-8 pr-4 lg:pr-8">
                                    <div className="hidden sm:block text-right min-w-[60px]">
                                        <div className="flex items-center gap-1 justify-end text-yellow-500">
                                            <Trophy className="w-3 h-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-tighter">
                                                {athlete.level >= 5 ? 3 : (athlete.level >= 2 ? 2 : 1)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400">Trofeos</p>
                                    </div>
                                    <div className="text-right min-w-[80px]">
                                        <p className="text-base lg:text-xl font-heading font-extrabold text-foreground">{athlete.xp_points.toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total XP</p>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="ml-4">
                                    {athlete.id !== user?.id && !athlete.is_official && (
                                        <FollowButton targetId={athlete.id} isFollowingInitial={followedIds.has(athlete.id)} />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-20 text-center">
                            <p className="text-gray-500 italic">No se encontraron leyendas aún. ¡Empieza a entrenar!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Incentive Card */}
            <div className="bg-black border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div>
                    <h3 className="text-lg font-heading font-bold text-white mb-1 italic uppercase tracking-wider">¿Quieres subir de rango?</h3>
                    <p className="text-sm text-gray-400">Completa misiones diarias y desafía a los influencers para ganar XP adicional.</p>
                </div>
                <Link
                    href="/dashboard/training"
                    className="whitespace-nowrap bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-brand-red hover:text-white transition-all shadow-[0_4px_25px_rgba(255,255,255,0.1)] uppercase text-xs tracking-widest"
                >
                    Comenzar la siguiente misión
                </Link>
            </div>
        </div >
    );
}
