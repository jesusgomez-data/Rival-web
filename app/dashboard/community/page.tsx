'use client'

import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trophy, Dumbbell, UserSearch } from "lucide-react";
import LikeButton from "./LikeButton";
import FollowButton from "./FollowButton";
import DuelButton from "./DuelButton";
import SearchAthletes from "./SearchAthletes";
import { useEffect, useState, Suspense } from "react";
import FeedPost from "../FeedPost";
import StoryBar from "../stories/StoryBar";
import { useLanguage } from "@/app/LanguageContext";

export default function CommunityPage({
    searchParams
}: {
    searchParams: any
}) {
    const { language, t } = useLanguage();
    const [query, setQuery] = useState("");
    const [data, setData] = useState<any>({
        user: null,
        profile: null,
        followedIds: new Set(),
        searchResults: [],
        posts: [],
        loading: true
    });

    const supabase = createClient();

    useEffect(() => {
        async function fetchParams() {
            const params = await searchParams;
            if (params?.q) setQuery(params.q);
        }
        fetchParams();
    }, [searchParams]);

    useEffect(() => {
        async function loadContent() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: myFollows } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', user.id);

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                const followedIds = new Set(myFollows?.map(f => f.following_id) || []);

                let searchResults: any[] = [];
                if (query) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('*')
                        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                        .neq('id', user.id)
                        .limit(10);
                    searchResults = profiles || [];
                }

                const { data: posts } = await supabase
                    .from('posts')
                    .select(`
                        *,
                        profiles:user_id (id, full_name, avatar_url, username),
                        workouts:workout_id (title, total_volume_kg, workout_sets(*), location_name),
                        likes:likes(user_id)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(query ? 100 : 20);

                setData({
                    user,
                    profile,
                    followedIds,
                    searchResults,
                    posts: posts || [],
                    loading: false
                });
            } catch (e) {
                console.error(e);
            }
        }
        loadContent();
    }, [query]);

    const formatTimeAgo = (date: string) => {
        try {
            const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
            if (seconds < 60) return `${t.community.timeAgoPrefix} ${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h`;
            return `${Math.floor(hours / 24)}d`;
        } catch (e) { return "reciente"; }
    }

    if (data.loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white uppercase italic tracking-tighter">{t.community.title}</h1>
                    <p className="text-gray-400 text-sm">{t.community.subtitle}</p>
                </div>
                <Suspense fallback={<div className="h-10 w-full max-w-md bg-brand-gray animate-pulse rounded-2xl" />}>
                    <SearchAthletes />
                </Suspense>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    <div className="mb-8">
                        <StoryBar currentUser={data.user} />
                    </div>

                    {query && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 italic uppercase">
                                <UserSearch className="w-5 h-5 text-brand-red" />
                                {t.community.matchingAthletes} "{query}"
                            </h2>
                            {data.searchResults.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {data.searchResults.map((profile: any) => (
                                        <div key={profile.id} className="bg-brand-gray border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
                                            <Link href={`/dashboard/profile/${profile.username}`} className="flex items-center gap-3 group">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden relative">
                                                    <Image
                                                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`}
                                                        alt={profile.full_name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-bold group-hover:text-brand-red transition-colors">{profile.full_name}</p>
                                                    <p className="text-xs text-gray-500">@{profile.username}</p>
                                                </div>
                                            </Link>
                                            <div className="flex items-center gap-2">
                                                <DuelButton targetId={profile.id} isRival={data.followedIds.has(profile.id)} />
                                                <FollowButton targetId={profile.id} isFollowingInitial={data.followedIds.has(profile.id)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-brand-gray/50 border border-dashed border-white/5 rounded-2xl p-8 text-center">
                                    <p className="text-gray-500">{t.community.noAthletesFound}</p>
                                </div>
                            )}
                            <div className="h-px bg-white/5 my-8" />
                            <h2 className="text-xl font-heading font-bold text-white uppercase italic tracking-wider">{t.community.recentActivity}</h2>
                        </div>
                    )}

                    {data.posts && data.posts.length > 0 ? (
                        data.posts.map((post: any) => (
                            <FeedPost
                                key={post.id}
                                postId={post.id}
                                username={post.profiles?.username}
                                user={post.profiles?.full_name || "Atleta Desconocido"}
                                action={post.workout_id ? t.community.completedWorkout : t.community.postedUpdate}
                                time={formatTimeAgo(post.created_at)}
                                avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                image={post.media_url}
                                initialLikes={post.likes ? post.likes.length : (post.likes_count || 0)}
                                hasLikedInitial={post.likes?.some((l: any) => l.user_id === data.user?.id)}
                                comments={post.comments_count || 0}
                                highlight={post.workouts?.title}
                                mediaType={post.media_type}
                                caption={post.caption}
                                currentUserId={data.user?.id}
                                authorId={post.user_id}
                                workoutData={post.workouts}
                                music_url={post.music_url}
                                music_title={post.music_title}
                                music_artist={post.music_artist}
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-brand-gray/10">
                            <p className="text-gray-500 italic uppercase font-black text-[10px] tracking-[0.2em]">{t.community.noActivity}</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {data.profile?.subscription_tier === 'free' ? (
                        <div className="space-y-6 sticky top-24">
                            <div className="bg-brand-gray border border-white/5 rounded-3xl p-6 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-brand-red uppercase tracking-[0.3em] mb-2">Publicidad</p>
                                    <h3 className="text-xl font-heading font-black italic text-white uppercase mb-4 tracking-tighter leading-tight">Mejora a Premium para eliminar anuncios</h3>
                                    <p className="text-gray-400 text-xs mb-6 font-medium leading-relaxed">Disfruta de una experiencia limpia, análisis avanzados y rutinas exclusivas.</p>
                                    <Link href="/dashboard/profile" className="w-full bg-brand-red hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-red/20 uppercase text-[10px] tracking-widest">
                                        Subir de Nivel
                                    </Link>
                                </div>
                            </div>

                            <div className="bg-brand-gray border border-white/5 rounded-3xl p-1 relative overflow-hidden aspect-[4/5] group">
                                <Image
                                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
                                    alt="Rival Gear Ad"
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                <div className="absolute bottom-6 left-6 right-6">
                                    <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">Patrocinado</p>
                                    <h4 className="text-white font-heading font-black italic text-lg uppercase tracking-tight leading-none mb-3">RIVAL GEAR: ARMADURA PARA EL 1%</h4>
                                    <button className="text-[9px] font-black text-brand-red uppercase tracking-widest hover:text-white transition-colors">Comprar Ahora →</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden lg:block space-y-6 sticky top-24">
                            <div className="bg-gradient-to-br from-brand-red/10 to-transparent border border-brand-red/20 rounded-3xl p-6 backdrop-blur-sm">
                                <Trophy className="w-8 h-8 text-brand-red mb-4" />
                                <h3 className="text-lg font-heading font-bold text-white uppercase italic tracking-tighter">Beneficios Premium Activos</h3>
                                <p className="text-gray-400 text-xs mt-2 font-medium">Gracias por apoyar a la comunidad. Tienes acceso total a todas las funciones sin interrupciones.</p>
                            </div>
                            {/* Pro-specific content could go here instead of ads */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
