'use client'

import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Trophy, UserSearch, Flame, Compass, Users, TrendingUp, Swords } from "lucide-react";
import DuelButton from "./DuelButton";
import SearchAthletes from "./SearchAthletes";
import { getMyDuels } from "./duel-actions";
import { useEffect, useState, Suspense, Fragment } from "react";
import FeedPost from "../FeedPost";
import { useLanguage } from "@/app/LanguageContext";
import SidebarAd from "./SidebarAd";
import FeedAd from "./FeedAd";
import clsx from "clsx";
import InfoTooltip from "@/components/InfoTooltip";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function ExplorePage({
    searchParams
}: {
    searchParams: any
}) {
    const { t } = useLanguage();
    const [query, setQuery] = useState("");
    const [data, setData] = useState<any>({
        user: null,
        profile: null,
        followedIds: new Set(),
        searchResults: [],
        posts: [],
        loading: true,
        isMember: false,
        gymEvents: [],
        activeDuelUserIds: new Set()
    });

    const supabase = createClient();

    useEffect(() => {
        async function fetchParams() {
            const params = await searchParams;
            if (params?.q) setQuery(params.q);
        }
        fetchParams();
    }, [searchParams]);

    // Handle edit-wod event: redirect to dashboard where the WOD editor lives
    useEffect(() => {
        const handleEditWod = (e: any) => {
            const { postId } = e.detail || {};
            if (postId) {
                window.location.href = `/dashboard#post-${postId}`;
            } else {
                window.location.href = '/dashboard';
            }
        };
        window.addEventListener('edit-wod', handleEditWod as any);
        return () => window.removeEventListener('edit-wod', handleEditWod as any);
    }, []);

    useEffect(() => {
        async function loadContent() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [
                    { data: myFollows },
                    { data: profile },
                    { data: membership },
                    { data: officialAccounts },
                    duelsData
                ] = await Promise.all([
                    supabase.from('follows').select('following_id').eq('follower_id', user.id),
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    supabase.from('members').select('id, center_id').eq('user_id', user.id).in('status', ['active', 'trial']).limit(1),
                    supabase.from('profiles').select('id').eq('is_official', true),
                    getMyDuels()
                ]);

                // Fetch gym events if member
                let gymEvents: any[] = [];
                const centerId = membership?.[0]?.center_id;
                if (centerId) {
                    const { data: events } = await supabase
                        .from('gym_events')
                        .select('id, title, description, event_date, status, event_type, attendees_count')
                        .eq('center_id', centerId)
                        .neq('status', 'past')
                        .order('event_date', { ascending: true })
                        .limit(3);
                    gymEvents = events || [];
                }

                const followedIds = new Set(myFollows?.map((f: any) => f.following_id) || []);
                const officialIds = officialAccounts?.map((acc: any) => acc.id) || [];
                const activeDuelUserIds = new Set(duelsData?.filter((d: any) => d.status === 'active' || d.status === 'pending').map((d: any) => d.challenger_id === user.id ? d.opponent_id : d.challenger_id));

                let searchResults: any[] = [];
                // ... (previous searchResults logic)

                if (query) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('*')
                        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
                        .neq('id', user.id)
                        .neq('username', 'rivalfit') // Exclude official account from search
                        .limit(50);

                    searchResults = (profiles || []).sort((a: any, b: any) => {
                        const q = query.toLowerCase();
                        const aStarts = (a.full_name || '').toLowerCase().startsWith(q) || (a.username || '').toLowerCase().startsWith(q);
                        const bStarts = (b.full_name || '').toLowerCase().startsWith(q) || (b.username || '').toLowerCase().startsWith(q);
                        if (aStarts && !bStarts) return -1;
                        if (!aStarts && bStarts) return 1;
                        return 0;
                    }).slice(0, 10);
                }

                // officialIds is already declared above from the Promise.all result

                // Fetch Posts based on tab or query
                let postsQuery = supabase
                    .from('posts')
                    .select(`
                        *,
                        profiles:user_id (id, full_name, avatar_url, username, is_official),
                        workouts:workout_id (title, sport_type, total_volume_kg, workout_sets(*), location_name, metrics),
                        likes:likes(user_id),
                        comments:comments(count)
                    `)
                    .order('created_at', { ascending: false });

                const { data: posts } = await postsQuery.limit(query ? 100 : 20);

                setData({
                    user,
                    profile,
                    followedIds,
                    searchResults,
                    posts: posts || [],
                    loading: false,
                    isMember: (membership && membership.length > 0),
                    gymEvents,
                    activeDuelUserIds
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
        <div className="max-w-full lg:max-w-7xl mx-auto space-y-8 pb-20 px-0 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 lg:px-0">
                <div>
                    <h1 className="text-4xl font-heading font-bold text-white uppercase italic tracking-tighter leading-none mb-2">Explorar <span className="text-brand-red">Rival</span></h1>
                    <p className="text-gray-400 text-sm font-medium tracking-wide">Descubre atletas y publicaciones de todo el mundo.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Suspense fallback={<div className="h-10 w-full max-w-md bg-brand-gray animate-pulse rounded-2xl" />}>
                        <SearchAthletes />
                    </Suspense>
                    <InfoTooltip
                        title="Buscar Rivales"
                        content="Encuentra a otros atletas por nombre o usuario para seguirlos o retarlos a un duelo."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-8">
                    {/* Feed Content */}

                    {query && (
                        <div className="space-y-4 pt-4 px-4 lg:px-0 animate-in fade-in slide-in-from-top-2">
                            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2 italic uppercase">
                                <UserSearch className="w-5 h-5 text-brand-red" />
                                {t.community.matchingAthletes} "{query}"
                            </h2>
                            {data.searchResults.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {data.searchResults.map((profile: any) => (
                                        <div key={profile.id} className="bg-brand-gray/50 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors group">
                                            <Link href={`/dashboard/profile/${profile.username}`} className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden relative border border-white/5 group-hover:border-brand-red/50 transition-colors">
                                                    <Image
                                                        src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`}
                                                        alt={profile.full_name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-white font-bold group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                                                        {profile.full_name}
                                                        {profile.is_official && <VerifiedBadge size="sm" />}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-[8px]">@{profile.username}</p>
                                                </div>
                                            </Link>
                                            <div className="flex items-center gap-2">
                                                <DuelButton targetId={profile.id} isRival={data.followedIds.has(profile.id)} hasActiveDuel={data.activeDuelUserIds.has(profile.id)} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-brand-gray/20 border border-dashed border-white/5 rounded-2xl p-8 text-center">
                                    <p className="text-gray-500 italic text-sm">{t.community.noAthletesFound}</p>
                                </div>
                            )}
                            <div className="h-px bg-white/5 my-8" />
                        </div>
                    )}

                    {data.posts && data.posts.length > 0 ? (
                        <div className="space-y-8 animate-in fade-in duration-700">
                            {data.posts.map((post: any, index: number) => (
                                <Fragment key={post.id}>
                                    <FeedPost
                                        postId={post.id}
                                        username={post.profiles?.username}
                                        user={post.profiles?.full_name || "Atleta Desconocido"}
                                        action={post.workout_id ? t.community.completedWorkout : t.community.postedUpdate}
                                        time={formatTimeAgo(post.created_at)}
                                        avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                        image={post.media_url}
                                        initialLikes={post.likes ? post.likes.length : 0}
                                        hasLikedInitial={post.likes && post.likes.some((l: any) => l.user_id === data.user?.id)}
                                        comments={post.comments?.[0]?.count || 0}
                                        highlight={post.workouts?.title}
                                        mediaType={post.media_type}
                                        caption={post.caption}
                                        currentUserId={data.user?.id}
                                        authorId={post.user_id}
                                        workoutData={post.workouts}
                                        music_url={post.music_url}
                                        music_title={post.music_title}
                                        music_artist={post.music_artist}
                                        thumbnail_url={post.thumbnail_url}
                                        isOfficial={post.profiles?.is_official}
                                        isAdminUser={data.profile?.is_official}
                                        hasActiveDuel={data.activeDuelUserIds.has(post.user_id)}
                                        cover_url={post.cover_url}
                                        viewCount={post.view_count || 0}
                                        post_type={post.post_type}
                                        wod_data={post.wod_data}
                                    />
                                    {(index + 1) % 4 === 0 && (
                                        <FeedAd tier={data.profile?.subscription_tier} />
                                    )}
                                </Fragment>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 border border-dashed border-white/5 rounded-[40px] bg-brand-gray/5">
                            <Flame className="w-12 h-12 text-gray-800 mx-auto mb-4 opacity-20" />
                            <p className="text-gray-500 italic uppercase font-black text-[10px] tracking-[0.3em]">No hay actividad reciente global</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-8 sticky top-24">
                    {data.isMember && (
                        <div className="bg-brand-gray/20 border border-white/5 rounded-[40px] p-8 overflow-hidden relative group">
                            <TrendingUp className="absolute -right-8 -top-8 w-32 h-32 text-brand-red opacity-5 group-hover:rotate-12 transition-transform duration-700" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                Eventos del Gimnasio
                                <InfoTooltip
                                    title="Actividades"
                                    content="Competiciones, clases especiales y eventos sociales organizados por tu sede oficial."
                                />
                            </h3>
                            {data.gymEvents.length > 0 ? (
                                <div className="space-y-6">
                                    {data.gymEvents.map((event: any) => {
                                        const isActive = event.status === 'active';
                                        const statusLabel = isActive ? 'Activo' : 'Próximamente';
                                        const statusColor = isActive ? 'text-brand-red' : 'text-yellow-500';
                                        const iconColor = isActive ? 'text-brand-red' : 'text-yellow-500';
                                        const EventIcon = event.event_type === 'competition' ? Swords : Trophy;
                                        const subtitle = event.attendees_count > 0
                                            ? `${event.attendees_count} Atletas participando`
                                            : event.event_date
                                                ? new Date(event.event_date).toLocaleDateString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
                                                : event.description || '';
                                        return (
                                            <div key={event.id} className="flex gap-4 group/item cursor-pointer">
                                                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5 shrink-0 group-hover/item:border-brand-red/50 transition-colors">
                                                    <EventIcon className={`w-5 h-5 ${iconColor}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-[10px] font-black ${statusColor} uppercase tracking-widest leading-none mb-1`}>{statusLabel}</p>
                                                    <h4 className="text-white font-bold text-sm truncate uppercase italic tracking-tight">{event.title}</h4>
                                                    <p className="text-[10px] text-gray-500 font-medium capitalize">{subtitle}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-[11px] text-gray-600 font-medium italic text-center py-4">No hay eventos próximos</p>
                            )}
                            <button className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">
                                Ver Calendario
                            </button>
                        </div>
                    )}
                    <SidebarAd tier={data.profile?.subscription_tier} />
                </div>
            </div>
        </div>
    );
}

