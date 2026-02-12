'use client'

import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Share2, MoreHorizontal, Trophy, Dumbbell, UserSearch } from "lucide-react";
import LikeButton from "./LikeButton";
import FollowButton from "./FollowButton";
import DuelButton from "./DuelButton";
import SearchAthletes from "./SearchAthletes";
import { useEffect, useState, Suspense, Fragment } from "react";
import FeedPost from "../FeedPost";
import StoryBar from "../stories/StoryBar";
import { useLanguage } from "@/app/LanguageContext";
import SidebarAd from "./SidebarAd";
import FeedAd from "./FeedAd";

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
                        .limit(50); // Fetch more to sort by relevance

                    searchResults = (profiles || []).sort((a, b) => {
                        const aFull = (a.full_name || '').toLowerCase();
                        const aUser = (a.username || '').toLowerCase();
                        const bFull = (b.full_name || '').toLowerCase();
                        const bUser = (b.username || '').toLowerCase();
                        const q = query.toLowerCase();

                        const aStarts = aFull.startsWith(q) || aUser.startsWith(q);
                        const bStarts = bFull.startsWith(q) || bUser.startsWith(q);

                        if (aStarts && !bStarts) return -1;
                        if (!aStarts && bStarts) return 1;
                        return 0;
                    }).slice(0, 10);
                }

                const { data: posts } = await supabase
                    .from('posts')
                    .select(`
                        *,
                        profiles:user_id (id, full_name, avatar_url, username, is_official),
                        workouts:workout_id (title, total_volume_kg, workout_sets(*), location_name, metrics),
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
                                                    <p className="text-sm text-white font-bold group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                                                        {profile.full_name}
                                                        {profile.is_official && (
                                                            <span className="bg-brand-red p-0.5 rounded-full inline-flex">
                                                                <Trophy className="w-2.5 h-2.5 text-white" />
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">@{profile.username}</p>
                                                </div>
                                            </Link>
                                            <div className="flex items-center gap-2">
                                                <DuelButton targetId={profile.id} isRival={data.followedIds.has(profile.id)} />
                                                {!profile.is_official && (
                                                    <FollowButton targetId={profile.id} isFollowingInitial={data.followedIds.has(profile.id)} />
                                                )}
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
                        data.posts.map((post: any, index: number) => (
                            <Fragment key={post.id}>
                                <FeedPost
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
                                    isOfficial={post.profiles?.is_official}
                                />
                                {(index + 1) % 3 === 0 && (
                                    <FeedAd tier={data.profile?.subscription_tier} />
                                )}
                            </Fragment>
                        ))
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-brand-gray/10">
                            <p className="text-gray-500 italic uppercase font-black text-[10px] tracking-[0.2em]">{t.community.noActivity}</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-6 sticky top-24">
                    <SidebarAd tier={data.profile?.subscription_tier} />
                </div>
            </div>
        </div>
    );
}
