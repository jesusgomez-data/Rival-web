import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Trophy, Flame, TrendingUp, Award, Swords } from "lucide-react";
import Link from "next/link";
import LeaderboardClient from "./LeaderboardClient";
import ChallengesSection from "./ChallengesSection";
import { getActiveChallenges } from "./ranking-actions";

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch initial XP athletes
    const { data: athletes } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, xp_points, level, is_official')
        .neq('is_official', true)
        .order('xp_points', { ascending: false })
        .limit(20);

    const { data: myFollows } = await createAdminClient()
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id || '');

    const followedIds = new Set(myFollows?.map(f => f.following_id) || []);
    const challenges = await getActiveChallenges();

    // Get current user's rank
    let myRank = null;
    let myProfile: any = null;
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('xp_points, full_name, avatar_url, username, level, is_admin').eq('id', user.id).single();
        myProfile = profile;
        if (profile) {
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .neq('is_official', true)
                .gt('xp_points', profile.xp_points);
            myRank = (count || 0) + 1;
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 sm:space-y-12 pb-20 pl-0 pr-3 sm:px-0">
            {/* Header Section */}
            <div className="relative p-8 sm:p-12 rounded-[40px] sm:rounded-[50px] bg-black border border-white/5 overflow-hidden shadow-2xl group/header">
                <Trophy className="absolute -right-16 -top-16 w-60 h-60 sm:w-80 sm:h-80 text-brand-red opacity-5 rotate-12 group-hover/header:rotate-[15deg] group-hover/header:scale-110 transition-all duration-1000" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <span className="w-8 sm:w-12 h-1 bg-brand-red rounded-full" />
                        <span className="text-[10px] sm:text-xs font-black text-brand-red uppercase tracking-[0.5em] italic">Elite Status</span>
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-heading font-black text-white mb-4 sm:mb-6 uppercase italic tracking-tighter leading-none">
                        HALL OF <span className="text-brand-red">FAME</span>
                    </h1>
                    <p className="text-gray-400 max-w-xl text-sm sm:text-lg font-medium leading-relaxed">
                        El lugar donde las leyendas se forjan. Entrena más duro, gana más duelos y escala hasta la cima del ecosistema Rival.
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
                {/* Mobile Personal Status (shown at top on small screens) */}
                {myProfile && (
                    <div className="lg:hidden">
                        <div className="bg-brand-red p-[1px] rounded-[32px] shadow-glow-sm overflow-hidden group">
                            <div className="bg-zinc-900 p-6 rounded-[32px] relative overflow-hidden">
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[8px] font-black text-brand-red uppercase tracking-[0.3em] mb-1">Tu Rango</p>
                                        <div className="text-4xl font-heading font-black text-white italic tracking-tighter">
                                            #{myRank}
                                        </div>
                                    </div>
                                    <div className="flex gap-6 text-right">
                                        <div>
                                            <p className="text-lg font-black text-white italic">{myProfile.xp_points.toLocaleString()}</p>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">XP</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-brand-red italic">{myProfile.level}</p>
                                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Lvl</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Left: Leaderboards */}
                <div className="lg:col-span-8 space-y-8">
                    <LeaderboardClient
                        initialData={athletes || []}
                        currentUser={user}
                        followedIds={followedIds}
                    />
                </div>

                {/* Right: Challenges & Desktop Personal Status */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Desktop Personal Status */}
                    {myProfile && (
                        <div className="hidden lg:block">
                            <div className="bg-brand-red p-[1px] rounded-[40px] shadow-glow-sm overflow-hidden group">
                                <div className="bg-zinc-900 p-8 rounded-[40px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 text-brand-red opacity-5 group-hover:scale-125 transition-transform duration-700">
                                        <TrendingUp className="w-32 h-32" />
                                    </div>
                                    <div className="relative z-10 text-center">
                                        <p className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] mb-4">Tu Estatus Actual</p>
                                        <div className="text-6xl font-heading font-black text-white italic mb-2 tracking-tighter">
                                            #{myRank}
                                        </div>
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">Rango Global</p>
                                        <div className="h-px bg-white/5 w-full mb-6" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xl font-black text-white italic">{myProfile.xp_points.toLocaleString()}</p>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">XP Total</p>
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-brand-red italic">{myProfile.level}</p>
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Nivel</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Community Challenges */}
                    <ChallengesSection 
                        challenges={challenges}
                        userId={user?.id}
                        isAdmin={!!myProfile?.is_admin}
                    />

                    {/* Ad/Promo */}
                    <div className="bg-gradient-to-br from-brand-red to-red-950 p-6 sm:p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
                        <Swords className="absolute -bottom-10 -left-10 w-48 h-48 opacity-10 -rotate-12 group-hover:rotate-0 transition-all duration-700 hidden sm:block" />
                        <h3 className="text-2xl font-heading font-black text-white italic uppercase tracking-tighter mb-4 leading-none">Únete a la<br />Élite Premium</h3>
                        <p className="text-sm text-white/70 mb-6 font-medium">Desbloquea multiplicadores de XP y duelos exclusivos de temporada.</p>
                        <Link href="/dashboard/settings/billing" className="block w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-all text-center">
                            Mejora tu Plan
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
