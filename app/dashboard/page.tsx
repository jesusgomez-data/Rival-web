'use client'

import Image from "next/image";
import { Flame, MoreHorizontal, MessageCircle, Heart, Share2, TrendingUp, Trophy, Dumbbell, ArrowRight, ArrowLeft, Swords, ChevronDown, Plus, Star, Users, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLanguage } from "@/app/LanguageContext";
import LikeButton from "./community/LikeButton";
import FollowButton from "./community/FollowButton";
import FeedPost from "./FeedPost";
import CreatePost from "./CreatePost";
import StoryBar from "./stories/StoryBar";
import { getMyDuels, acceptDuel } from "./community/duel-actions";
import UserMediaGallery from "./UserMediaGallery";
import { getMissions } from "./training/actions";
import DashboardTour from "@/components/onboarding/DashboardTour";
import EssentialsHero from "@/components/onboarding/EssentialsHero";
import InfoTooltip from "@/components/InfoTooltip";
import { getMonday } from "@/utils/date";

function SuggestedUser({ id, name, username, role, avatar, isFollowing, isOfficial }: { id: string, name: string, username: string, role: string, avatar?: string, isFollowing: boolean, isOfficial?: boolean }) {
    const { t } = useLanguage();
    return (
        <div className="flex items-center gap-3 group">
            <Link href={`/dashboard/profile/${username}`} className="flex-1 flex items-center gap-3 group/link">
                <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/5 overflow-hidden relative group-hover/link:border-brand-red transition-colors">
                    {avatar ? (
                        <Image src={avatar} alt={name} fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                            {name.substring(0, 2)}
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-brand-red transition-colors flex items-center gap-1.5">
                        {name}
                        {isOfficial && (
                            <span className="bg-brand-red p-0.5 rounded-full inline-flex">
                                <Trophy className="w-2.5 h-2.5 text-white" />
                            </span>
                        )}
                    </p>
                    <p className="text-xs text-gray-500">{role || t.dashboard.roleAthlete}</p>
                </div>
            </Link>
            <FollowButton targetId={id} isFollowingInitial={isFollowing} />
        </div>
    )
}

function StatCard({ label, value, subtext, icon }: { label: string, value: string, subtext: string, icon: React.ReactNode }) {
    return (
        <div className="bg-brand-gray/40 border border-border/10 p-3 md:p-6 rounded-[24px] backdrop-blur-md hover:border-brand-red/40 hover:bg-brand-gray/60 transition-all group cursor-pointer h-full flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-2 md:mb-4 gap-2">
                <div className="text-foreground/60 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] truncate flex-1">{label}</div>
                <div className="p-1.5 md:p-2 bg-foreground/5 rounded-lg group-hover:scale-110 group-hover:bg-brand-red/20 transition-all shrink-0">{icon}</div>
            </div>
            <div>
                <div className={`text-xl md:text-3xl font-heading font-black text-foreground italic tracking-tighter truncate`}>{value}</div>
                <div className="text-foreground/40 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1 group-hover:text-foreground/80 transition-opacity truncate">{subtext}</div>
            </div>
        </div>
    )
}


function CollapsibleCreatePost({ currentUser, language }: { currentUser: any, language: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [repostData, setRepostData] = useState<any>(null);

    useEffect(() => {
        const handleRepost = (e: any) => {
            setRepostData(e.detail);
            setIsOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        window.addEventListener('repost-wod', handleRepost as any);
        return () => window.removeEventListener('repost-wod', handleRepost as any);
    }, []);

    return (
        <div className="mb-10">
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full bg-brand-gray/30 border border-border/10 rounded-[28px] p-2.5 md:p-3.5 flex items-center justify-between group hover:border-brand-red/50 hover:bg-brand-gray/50 transition-all cursor-pointer shadow-xl backdrop-blur-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border border-white/10 bg-black/40 overflow-hidden relative shadow-inner">
                            {currentUser?.user_metadata?.avatar_url ? (
                                <Image src={currentUser.user_metadata.avatar_url} alt="User" fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] bg-gray-800 font-black text-gray-500 italic">ME</div>
                            )}
                        </div>
                        <span className="text-gray-400 text-xs md:text-sm font-bold uppercase tracking-widest group-hover:text-gray-200 transition-colors">
                            {language === 'es' ? '¿Qué tenemos para hoy?' : 'Share your workout...'}
                        </span>
                    </div>
                    <div id="create-post-btn" className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-brand-red/10 border border-brand-red/20 shadow-glow-sm flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all transform group-hover:rotate-90">
                        <Plus className="w-4 h-4 md:w-5 md:h-5" />
                    </div>
                </button>
            ) : (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-brand-gray/20 border border-white/5 rounded-[32px] px-2 py-4 md:px-4 md:py-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10" />

                    <div className="flex justify-between items-center mb-8 relative z-10 border-b border-white/5 pb-5">
                        <div className="flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-brand-red" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground italic">{repostData ? 'REPOSTEAR WOD' : 'Nueva Publicación'}</h2>
                        </div>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setRepostData(null);
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-2 group bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:border-white/20 shadow-sm"
                        >
                            {language === 'es' ? 'Cancelar' : 'Cancel'} <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    <CreatePost
                        currentUser={currentUser}
                        onSuccess={() => {
                            setIsOpen(false);
                            setRepostData(null);
                        }}
                        initialPostType={repostData ? 'wod' : 'standard'}
                        initialData={repostData}
                    />
                </div>
            )}
        </div>
    )
}

export default function DashboardHome() {
    const { language, t } = useLanguage();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [data, setData] = useState<any>({
        profile: null,
        workoutCount: 0,
        feedPosts: [],
        trendingAthletes: [],
        rivalsCount: 0,
        currentUser: null,
        missionProgress: 0,
        missionGoal: 5,
        duels: [],
        myGyms: [],
        activeCenterIds: new Set<string>()
    });
    const [activeTab, setActiveTab] = useState('following');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const { data: authData } = await supabase.auth.getUser();
                const user = authData?.user;
                if (!user) return;

                const currentWeekStart = getMonday();

                // Fetch todo paralelo para velocidad
                const [
                    { data: memberships },
                    { data: profileData },
                    { count: workouts },
                    { count: classes },
                    { count: followingCount },
                    { data: myFollows },
                    { data: trending },
                    missionsData,
                    duelsData
                ] = await Promise.all([
                    supabase.from('members').select('*, organization:center_id(id, name, logo_url, city)').eq('user_id', user.id).in('status', ['active', 'trial']),
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('class_results').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
                    supabase.from('follows').select('following_id').eq('follower_id', user.id),
                    supabase.from('profiles')
                        .select('id, username, full_name, avatar_url, level, is_official')
                        .neq('id', user.id)
                        .eq('is_official', false) // Exclude official accounts from follow recommendations
                        .order('xp_points', { ascending: false })
                        .limit(4),
                    getMissions(),
                    getMyDuels()
                ]);

                const followedIds = new Set(myFollows?.map(f => f.following_id) || []);

                // Find the sessions_count mission for the weekly goal widget
                const sessionMission = missionsData?.find((m: any) => m.goal_type === 'sessions_count' || m.goal_type === 'workouts');
                const weeklyProgress = {
                    current: sessionMission?.current_value || 0,
                    goal: sessionMission?.goal_value || 5,
                    percentage: Math.min(100, Math.round(((sessionMission?.current_value || 0) / (sessionMission?.goal_value || 5)) * 100))
                };

                setData((prev: any) => ({
                    ...prev,
                    profile: profileData,
                    workoutCount: (workouts || 0) + (classes || 0),
                    trendingAthletes: trending?.map(athlete => ({ ...athlete, isFollowing: followedIds.has(athlete.id) })) || [],
                    rivalsCount: followingCount || 0,
                    currentUser: user,
                    missionProgress: weeklyProgress.current, // Use the calculated weeklyProgress
                    missionGoal: weeklyProgress.goal, // Use the calculated weeklyProgress
                    duels: duelsData || [],
                    myGyms: memberships?.map((m: any) => m.organization) || [],
                    activeCenterIds: new Set(memberships?.filter((m: any) => m.status === 'active').map((m: any) => m.center_id) || [])
                }));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadData();

        const handleProfileUpdate = () => {
            loadData();
            setRefreshKey(prev => prev + 1);
        };

        window.addEventListener('profile-updated', handleProfileUpdate);

        // Check for first-time visit
        const hasSeenTour = localStorage.getItem("rival_dashboard_tour_seen");
        if (!hasSeenTour) {
            setShowTour(true);
        }

        return () => window.removeEventListener('profile-updated', handleProfileUpdate);
    }, []);

    // NEW: Fetch Feed based on activeTab
    useEffect(() => {
        async function fetchFeed() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: myFollows } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', user.id);

                const followedIds = new Set(myFollows?.map(f => f.following_id) || []);

                // 1. Fetch official accounts IDs
                const { data: officialProfiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('is_official', true);

                const officialIds = officialProfiles?.map(p => p.id) || [];

                let query = supabase
                    .from('posts')
                    .select('*, profiles:user_id(*), workouts:workout_id(*, metrics, workout_sets(*)), likes:likes(user_id)')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (activeTab === 'following') {
                    const idsToFetch = Array.from(new Set([...Array.from(followedIds), user.id, ...officialIds]));
                    query = query.in('user_id', idsToFetch);
                }

                const { data: posts } = await query;
                setData((prev: any) => ({ ...prev, feedPosts: posts || [] }));
            } catch (e) {
                console.error("Error fetching feed:", e);
            }
        }
        fetchFeed();
    }, [activeTab, refreshKey]);

    // Scroll to post if hash is present
    useEffect(() => {
        const handleHashScroll = () => {
            if (typeof window !== 'undefined' && window.location.hash) {
                const hash = window.location.hash.substring(1); // Remove #
                // Wait for content to render/layout
                setTimeout(() => {
                    const element = document.getElementById(hash);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Add highlight effect
                        element.classList.add('ring-2', 'ring-brand-red', 'ring-offset-2', 'ring-offset-background');
                        setTimeout(() => {
                            element.classList.remove('ring-2', 'ring-brand-red', 'ring-offset-2', 'ring-offset-background');
                        }, 3000);
                    }
                }, 500);
            }
        };

        handleHashScroll(); // Run on mount/update

        window.addEventListener('hashchange', handleHashScroll);
        return () => window.removeEventListener('hashchange', handleHashScroll);
    }, [data.feedPosts, data.duels]);

    const formatTimeAgo = (date: string) => {
        try {
            const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h`;
            return `${Math.floor(hours / 24)}d`;
        } catch (e) { return 'recientemente'; }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto space-y-8 pb-12 px-4 lg:px-8">
            {/* Hero Welcome Banner */}
            <div className="relative min-h-[200px] md:h-64 rounded-[32px] md:rounded-[40px] overflow-hidden border border-white/5 shadow-2xl flex flex-col justify-center dark-section">
                <Image
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
                    alt="Training Arena"
                    fill
                    className="object-cover opacity-40 grayscale"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
                <div className="relative z-10 px-6 sm:px-12 py-8 sm:py-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] sm:text-xs font-black mb-4 w-fit">
                        <Flame className="w-3 h-3 fill-current" />
                        {t.dashboard.liveStatus}
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-heading font-black !text-white mb-2 md:mb-3 italic uppercase tracking-tight leading-none">
                        {t.dashboard.welcome} <span className="text-brand-red">{data.profile?.full_name?.split(' ')[0] || t.dashboard.warrior}</span>
                    </h1>
                    <p className="!text-gray-300 text-sm sm:text-lg max-w-2xl font-medium">
                        {language === 'es' ? (
                            <>Has registrado <span className="text-white font-bold">{data.workoutCount} sesiones</span> y estás siguiendo a <span className="text-white font-bold">{data.rivalsCount} rivales</span>. {t.dashboard.statsTime}</>
                        ) : (
                            <>You have logged <span className="text-white font-bold">{data.workoutCount} sessions</span> and are following <span className="text-white font-bold">{data.rivalsCount} rivals</span>. {t.dashboard.statsTime}</>
                        )}
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
                {/* Left Column: Feed */}
                <div className="lg:col-span-7 space-y-8">

                    {/* 1. My Gyms Section (Moved here) */}
                    {data.myGyms.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-black text-foreground italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-brand-red" /> {t.dashboard.myGyms}
                                <InfoTooltip
                                    title="Tus Sedes"
                                    content="Centros oficiales donde estás inscrito. Accede para ver WODs exclusivos y chatear con tu equipo."
                                />
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {data.myGyms.map((gym: any) => (
                                    <Link key={gym.id} href={`/gym/${gym.id}`} className="group relative overflow-hidden rounded-2xl bg-brand-gray/40 border border-border/10 hover:border-brand-red/50 transition-all p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gray-800 border border-white/10 overflow-hidden relative shrink-0">
                                            {gym.logo_url ? (
                                                <Image src={gym.logo_url} alt={gym.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-black text-gray-600">{gym.name[0]}</div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-heading font-black text-foreground italic uppercase group-hover:text-brand-red transition-colors">{gym.name}</h3>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {t.dashboard.athletePanel}
                                            </p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-brand-red group-hover:translate-x-1 transition-all ml-auto" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. Stories Bar (Moved here as requested) */}
                    <div>
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] ml-2 mb-4">{t.dashboard.stories}</h3>
                        <StoryBar currentUser={data.currentUser} />
                    </div>

                    {/* 3. Stats Grid (Collapsible on Mobile) */}
                    <div>
                        {/* Mobile Toggle Button */}
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="w-full flex lg:hidden items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl mb-4 text-xs font-black uppercase tracking-widest text-gray-400"
                        >
                            <span>Tus Estadísticas</span>
                            <InfoTooltip
                                title="Tus Estadísticas"
                                content="Un resumen rápido de tu progreso y logros en Rival Fit."
                                className="scale-75"
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-brand-red">{showStats ? 'Ocultar' : 'Ver'}</span>
                                <ChevronDown className={clsx("w-4 h-4 transition-transform", showStats ? "rotate-180" : "")} />
                            </div>
                        </button>

                        <div id="stats-grid" className={clsx(
                            "grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 transition-all duration-300",
                            !showStats ? "hidden lg:grid" : "grid"
                        )}>
                            <Link href="/dashboard/training" className="group">
                                <StatCard
                                    label={t.dashboard.statsEntrenamientos}
                                    value={data.workoutCount?.toString() || "0"}
                                    icon={<Dumbbell className="w-4 h-4 text-brand-red" />}
                                    subtext={t.dashboard.statsSesionesTotales}
                                />
                            </Link>
                            <Link href="/dashboard/community" className="group">
                                <StatCard
                                    label={t.dashboard.statsRivales}
                                    value={data.rivalsCount?.toString() || "0"}
                                    icon={<Flame className="w-4 h-4 text-orange-500" />}
                                    subtext={t.dashboard.statsSeguidos}
                                />
                            </Link>
                            <Link href="/dashboard/leaderboard" className="group">
                                <StatCard
                                    label={t.dashboard.statsRacha}
                                    value={data.workoutCount ? (language === 'es' ? "1 Día" : "1 Day") : "0"}
                                    icon={<Trophy className="w-4 h-4 text-yellow-500" />}
                                    subtext={t.dashboard.statsContinuo}
                                />
                            </Link>
                            <Link href="/dashboard/analytics" className="group">
                                <StatCard
                                    label={t.dashboard.statsRango}
                                    value={data.profile?.level ? `${t.dashboard.level} ${data.profile.level}` : t.dashboard.revelLevel}
                                    icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
                                    subtext={t.dashboard.statsPrestigio}
                                />
                            </Link>
                        </div>
                    </div>



                    {/* 4. Feed Header & Feed */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-heading font-black text-foreground italic tracking-tighter uppercase flex items-center gap-3">
                                {language === 'es' ? 'Feed de ' : 'Activity '}<span className="text-brand-red">{language === 'es' ? 'Actividad' : 'Feed'}</span>
                                <InfoTooltip
                                    title="Noticias"
                                    content="Aquí verás los registros de entrenamiento públicos y anuncios globales de la comunidad."
                                    className="scale-75"
                                />
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                                    {t.dashboard.liveUpdates}
                                </p>
                            </div>
                        </div>
                        <div id="activity-feed" className="flex bg-white/5 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 self-start sm:self-auto shadow-2xl">
                            <button
                                onClick={() => setActiveTab('following')}
                                className={clsx(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    activeTab === 'following' ? "bg-brand-red text-white shadow-glow" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {t.dashboard.tabsFollowing}
                            </button>
                            <button
                                onClick={() => setActiveTab('global')}
                                className={clsx(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    activeTab === 'global' ? "bg-brand-red text-white shadow-glow" : "text-gray-500 hover:text-white"
                                )}
                            >
                                {t.dashboard.tabsGlobal}
                            </button>
                        </div>
                    </div>

                    {/* Social Feed */}
                    <div className="space-y-8">
                        {/* Old StoryBar location removed */}

                        {data.workoutCount === 0 && <EssentialsHero />}

                        <CollapsibleCreatePost currentUser={data.currentUser} language={language} />

                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] ml-2">{t.dashboard.recentActivity}</h3>
                        {data.feedPosts && data.feedPosts.length > 0 ? (
                            <div className="space-y-10">
                                {(() => {
                                    const activeDuelUserIds = new Set(data.duels.filter((d: any) => d.status === 'active' || d.status === 'pending').map((d: any) => d.challenger_id === data.currentUser?.id ? d.opponent_id : d.challenger_id));

                                    return data.feedPosts.map((post: any) => (
                                        <div key={post.id} id={`post-${post.id}`} className="scroll-mt-24 transition-all duration-300 rounded-3xl">
                                            <FeedPost
                                                postId={post.id}
                                                username={post.profiles?.username}
                                                user={post.profiles?.full_name || "Unknown Athlete"}
                                                action={post.media_type === 'class_result' ? (language === 'es' ? "ha completado una sesión de clase" : "completed a class session") : post.workout_id ? (language === 'es' ? "ha completado un entrenamiento" : "completed a workout") : (language === 'es' ? "ha publicado una actualización" : "posted an update")}
                                                time={formatTimeAgo(post.created_at)}
                                                avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                                image={post.media_url}
                                                initialLikes={post.likes ? post.likes.length : (post.likes_count || 0)}
                                                hasLikedInitial={post.likes?.some((l: any) => l.user_id === data.currentUser?.id)}
                                                comments={post.comments_count || 0}
                                                highlight={post.workouts?.title}
                                                mediaType={post.media_type}
                                                caption={post.caption}
                                                currentUserId={data.currentUser?.id}
                                                authorId={post.user_id}
                                                workoutData={post.workouts}
                                                music_url={post.music_url}
                                                music_title={post.music_title}
                                                music_artist={post.music_artist}
                                                isOfficial={post.profiles?.is_official}
                                                isMember={data.activeCenterIds.has(post.user_id) || post.user_id === data.currentUser?.id}
                                                context={activeTab as 'following' | 'global'}
                                                isAdminUser={data.profile?.is_official}
                                                hasActiveDuel={activeDuelUserIds.has(post.user_id)}
                                            />
                                        </div>
                                    ));
                                })()}
                            </div>
                        ) : (
                            <div className="group relative p-12 md:p-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10">
                                    <div className="w-20 h-20 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto mb-6 border border-brand-red/20 group-hover:scale-110 transition-transform">
                                        <Flame className="w-10 h-10 text-brand-red" />
                                    </div>
                                    <h3 className="text-xl font-heading font-black italic uppercase text-white mb-2">{language === 'es' ? 'TU ARENA ESTÁ VACÍA' : 'YOUR ARENA IS EMPTY'}</h3>
                                    <p className="text-gray-500 font-medium max-w-sm mx-auto mb-8">
                                        {language === 'es' ? 'Sigue a otros atletas o sube tu primer entrenamiento para empezar a ver actividad.' : 'Follow other athletes or upload your first workout to see activity.'}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                        <button
                                            onClick={() => setActiveTab('global')}
                                            className="px-8 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all outline-none"
                                        >
                                            {language === 'es' ? 'Explorar Rival Fit' : 'Explore Rival Fit'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-8 md:space-y-12">
                    <UserMediaGallery userId={data.currentUser?.id} />

                    {data.duels.length > 0 && (
                        <div id="duels-section" className="bg-black/40 border border-brand-red/20 rounded-[32px] p-5 md:p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(220,38,38,0.1)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-brand-red/5 group-hover:text-brand-red/10 transition-all pointer-events-none">
                                <Swords className="w-32 h-32 rotate-12" />
                            </div>
                            <h3 className="font-heading font-black text-white italic tracking-wider mb-8 flex items-center gap-3">
                                <Swords className="w-6 h-6 text-brand-red" /> {t.dashboard.duelsTitle}
                                <InfoTooltip
                                    title="Reglas del Duelo"
                                    content="Gana puntos entrenando. El volumen (kg) y la duración de carrera suman a tu marcador en tiempo real."
                                />
                            </h3>
                            <div className="space-y-6">
                                {data.duels.map((duel: any) => {
                                    const isChallenger = duel.challenger_id === data.currentUser?.id;
                                    const rival = isChallenger ? duel.opponent : duel.challenger;
                                    const isPending = duel.status === 'pending';
                                    return (
                                        <div key={duel.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 transition-all hover:bg-white/[0.08]">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="flex -space-x-3">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 bg-black/40 overflow-hidden relative shrink-0">
                                                        <Image src={data.profile?.avatar_url || `https://ui-avatars.com/api/?name=ME`} alt="ME" fill className="object-cover" />
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-700 overflow-hidden relative">
                                                        <Image src={rival?.avatar_url || `https://ui-avatars.com/api/?name=${rival?.username}`} alt="RIVAL" fill className="object-cover" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-foreground uppercase italic truncate">VS {rival?.full_name || rival?.username}</p>
                                                    <p className="text-xs text-gray-500 uppercase font-bold mt-1">
                                                        {isPending
                                                            ? (language === 'es' ? 'Esperando...' : 'Pending...')
                                                            : (duel.status === 'completed' ? (language === 'es' ? 'Finalizado' : 'Ended') : (language === 'es' ? 'Duelo Activo' : 'Active Duel'))}
                                                    </p>

                                                    {/* SCORE DISPLAY */}
                                                    {!isPending && (
                                                        <div className="flex justify-between items-center text-xs font-mono bg-black/20 rounded p-2 mt-2 border border-white/5">
                                                            <div className="text-center">
                                                                <span className="text-brand-gray block text-[10px] mb-0.5">YOU</span>
                                                                <span className={`font-black text-sm ${(isChallenger ? duel.challenger_score : duel.opponent_score) > (isChallenger ? duel.opponent_score : duel.challenger_score) ? 'text-brand-red' : 'text-white'}`}>
                                                                    {isChallenger ? duel.challenger_score : duel.opponent_score}
                                                                </span>
                                                            </div>
                                                            <div className="text-center flex flex-col justify-center">
                                                                <span className="text-white/20 text-[10px] font-bold">PTS</span>
                                                            </div>
                                                            <div className="text-center">
                                                                <span className="text-brand-gray block text-[10px] mb-0.5">RIVAL</span>
                                                                <span className={`font-black text-sm ${(isChallenger ? duel.opponent_score : duel.challenger_score) > (isChallenger ? duel.challenger_score : duel.opponent_score) ? 'text-brand-red' : 'text-white'}`}>
                                                                    {isChallenger ? duel.opponent_score : duel.challenger_score}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {isPending && !isChallenger && (
                                                <button onClick={async () => { await acceptDuel(duel.id); window.location.reload(); }} className="mt-4 w-full py-3 bg-brand-red text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 active:scale-95 transition-all">
                                                    {language === 'es' ? 'Aceptar Duelo' : 'Accept Duel'}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    <div className="bg-brand-gray/40 border border-white/10 rounded-[32px] p-5 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <h3 className="font-heading font-black text-foreground italic tracking-wider mb-10 flex items-center gap-3 text-lg">
                            <Flame className="w-6 h-6 text-brand-red" /> {t.dashboard.rivalsToFollow}
                        </h3>
                        <div className="space-y-5">
                            {data.trendingAthletes.map((athlete: any) => (
                                <div key={athlete.username} className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-brand-red/30 transition-all group/user">
                                    <SuggestedUser
                                        id={athlete.id}
                                        name={athlete.full_name || athlete.username}
                                        username={athlete.username}
                                        role={athlete.level}
                                        avatar={athlete.avatar_url}
                                        isFollowing={athlete.isFollowing}
                                        isOfficial={athlete.is_official}
                                    />
                                </div>
                            ))}
                        </div>
                        <Link href="/dashboard/community" className="group/link mt-12 w-full py-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                            {t.dashboard.enterArena} <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="bg-gradient-to-br from-brand-gray to-black border border-white/10 rounded-[32px] p-5 md:p-8 relative overflow-hidden group shadow-2xl">
                        <div className="relative z-10">
                            <h3 className="font-heading font-black text-foreground italic tracking-wider mb-5 uppercase text-lg">{t.dashboard.weeklyGoal}</h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-foreground font-black text-2xl italic">{data.missionProgress} <span className="text-gray-500 text-sm not-italic font-bold uppercase ml-2">/ {data.missionGoal} {t.dashboard.sessions}</span></span>
                                    <span className="text-brand-red font-black text-lg tabular-nums">{Math.min((data.missionProgress / data.missionGoal) * 100, 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden p-0.5 border border-white/5">
                                    <div
                                        className="bg-brand-red h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                                        style={{ width: `${Math.min((data.missionProgress / data.missionGoal) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center mt-3">{t.dashboard.extraXP}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showTour && (
                <DashboardTour onComplete={() => {
                    setShowTour(false);
                    localStorage.setItem("rival_dashboard_tour_seen", "true");
                }} />
            )}
        </div>
    );
}
