'use client'

import Image from "next/image";
import { Flame, MoreHorizontal, MessageCircle, Heart, Share2, TrendingUp, Trophy, Dumbbell, ArrowRight, ArrowLeft, Swords, ChevronDown, Plus, Star, Users, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/LanguageContext";
import LikeButton from "./explore/LikeButton";
import FollowButton from "./explore/FollowButton";
import FeedPost from "./FeedPost";
import StoryBar from "./stories/StoryBar";
import { getMyDuels, acceptDuel } from "./explore/duel-actions";
import { getMissions, getWorkoutStreak } from "./training/actions";
import InfoTooltip from "@/components/InfoTooltip";
import { getMonday } from "@/utils/date";
import { getTodayCheckin } from "./wellness-actions";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import type { ReelPost } from "./VideoReelsViewer";

// ── Dynamic: loaded only when needed, keeps initial bundle lean ───────────────
const CreatePost         = dynamic(() => import("./CreatePost"),                                { ssr: false });
const DashboardTour      = dynamic(() => import("@/components/onboarding/DashboardTour"),       { ssr: false, loading: () => null });
const EssentialsHero     = dynamic(() => import("@/components/onboarding/EssentialsHero"),      { ssr: false, loading: () => null });
const DailyCheckinWidget = dynamic(() => import("@/components/wellness/DailyCheckinWidget"),    { ssr: false, loading: () => null });
const DuelCountdown      = dynamic(() => import("./explore/DuelCountdown"),                   { ssr: false, loading: () => null });
const VictoryShareCard   = dynamic(() => import("./explore/VictoryShareCard"),                { ssr: false, loading: () => null });
const UserMediaGallery   = dynamic(() => import("./UserMediaGallery"),                          { ssr: false, loading: () => null });
const VideoReelsViewer   = dynamic(() => import("./VideoReelsViewer"),                          { ssr: false, loading: () => null });

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

// ── Feed Empty State Guide ────────────────────────────────────────────────────
function FeedEmptyGuide({ onExplore }: { onExplore: () => void }) {
    const CONTENT_TYPES = [
        {
            emoji: '📸', title: 'Historia', desc: '24h · toca el "+" en las historias',
            color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20',
        },
        {
            emoji: '🎬', title: 'Post', desc: 'Foto o video de tu entreno',
            color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
        },
        {
            emoji: '💪', title: 'WOD', desc: 'Entreno completo con ejercicios',
            color: 'text-brand-red', bg: 'bg-brand-red/10', border: 'border-brand-red/20',
        },
        {
            emoji: '🏆', title: 'PR', desc: 'Tu récord personal',
            color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Ghost post cards — visual preview of what the feed looks like */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10 rounded-3xl pointer-events-none" />
                <div className="space-y-4 opacity-25 pointer-events-none select-none">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white/[0.04] border border-white/5 rounded-3xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 bg-white/15 rounded-full w-28" />
                                    <div className="h-2 bg-white/8 rounded-full w-16" />
                                </div>
                            </div>
                            <div className="h-48 bg-white/5 rounded-2xl" />
                            <div className="flex gap-4">
                                <div className="h-3 bg-white/10 rounded-full w-12" />
                                <div className="h-3 bg-white/5 rounded-full w-12" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-8 px-6">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-brand-red/15 border border-brand-red/30 flex items-center justify-center mx-auto mb-4">
                            <Flame className="w-8 h-8 text-brand-red" />
                        </div>
                        <h3 className="text-xl font-black italic uppercase text-white mb-1">Tu Arena está vacía</h3>
                        <p className="text-white/40 text-sm max-w-xs mx-auto mb-6 font-medium">
                            Aquí verás los entrenos de los atletas que sigues. Empieza publicando el tuyo.
                        </p>
                        <button onClick={onExplore}
                            className="px-7 py-3 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl">
                            Explorar comunidad →
                        </button>
                    </div>
                </div>
            </div>

            {/* Content type quick guide */}
            <div className="bg-[#0E0E0E] border border-white/[0.06] rounded-3xl p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25 mb-3 flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> ¿Qué puedes publicar con el botón ➕?
                </p>
                <div className="grid grid-cols-2 gap-2 w-full">
                    {CONTENT_TYPES.map(ct => (
                        <div key={ct.title} className={`flex items-center gap-3 p-3 rounded-2xl border ${ct.bg} ${ct.border}`}>
                            <span className="text-xl">{ct.emoji}</span>
                            <div>
                                <p className={`text-[11px] font-black uppercase ${ct.color}`}>{ct.title}</p>
                                <p className="text-[9px] text-white/30 font-medium leading-tight">{ct.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-[9px] text-white/20 text-center mt-4 font-bold uppercase tracking-widest">
                    Toca el botón ➕ rojo en el feed para comenzar
                </p>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, icon, loading }: { label: string, value: string, subtext: string, icon: React.ReactNode, loading?: boolean }) {
    return (
        <div className="bg-brand-gray/40 border border-border/10 p-3 md:p-6 rounded-[24px] backdrop-blur-md hover:border-brand-red/40 hover:bg-brand-gray/60 transition-all group cursor-pointer h-full flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-2 md:mb-4 gap-2">
                <div className="text-foreground/60 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] flex-1">{label}</div>
                <div className="p-1.5 md:p-2 bg-foreground/5 rounded-lg group-hover:scale-110 group-hover:bg-brand-red/20 transition-all shrink-0">{icon}</div>
            </div>
            <div>
                {loading ? (
                    <div className="h-8 bg-foreground/15 rounded-lg animate-pulse w-20 mb-1" />
                ) : (
                    <div className={`text-xl md:text-3xl font-heading font-black text-foreground italic tracking-tighter truncate`}>{value}</div>
                )}
                <div className="text-foreground/40 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1 group-hover:text-foreground/80 transition-opacity">
                    {loading ? <div className="h-3 bg-foreground/10 rounded w-24 animate-pulse" /> : subtext}
                </div>
            </div>
        </div>
    )
}


function CollapsibleCreatePost({ currentUser, language, refresh }: { currentUser: any, language: string, refresh: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [repostData, setRepostData] = useState<any>(null);
    const [editMode, setEditMode] = useState<{ id: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const shouldOpenCreate = searchParams.get('create') === 'true';
    const newPostType = searchParams.get('newPost') as 'wod' | 'pr' | null;

    const openEditor = (detail: { postId: string; content: string; wodData: any; mediaUrl: any; mediaType: any; cover_url: any }) => {
        const { postId, content, wodData, mediaUrl, mediaType, cover_url } = detail;
        setRepostData({ ...wodData, caption: content, media_url: mediaUrl, media_type: mediaType, cover_url: cover_url ?? null });
        setEditMode({ id: postId });
        setIsOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        if (shouldOpenCreate || newPostType) {
            setIsOpen(true);
            setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        }
    }, [shouldOpenCreate, newPostType]);

    // Recoge una edición de WOD/PR iniciada desde otra página (Explorar, perfil,
    // post individual...) donde no hay ningún listener de 'edit-post' montado.
    // Ver FeedPost.tsx handleEditClick: guarda esto en sessionStorage y navega aquí.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('rival_pending_wod_edit');
            if (raw) {
                sessionStorage.removeItem('rival_pending_wod_edit');
                openEditor(JSON.parse(raw));
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleRepost = (e: any) => {
            setRepostData(e.detail);
            setEditMode(null);
            setIsOpen(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        const handleEdit = (e: any) => openEditor(e.detail);
        window.addEventListener('repost-wod', handleRepost as any);
        window.addEventListener('edit-wod', handleEdit as any);
        window.addEventListener('edit-post', handleEdit as any);
        return () => {
            window.removeEventListener('repost-wod', handleRepost as any);
            window.removeEventListener('edit-wod', handleEdit as any);
            window.removeEventListener('edit-post', handleEdit as any);
        };
    }, []);

    const POST_ACTIONS = [
        { emoji: '📸', label: 'Historia', sub: '24 horas', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', tab: 'story' },
        { emoji: '🎬', label: 'Post',     sub: 'Foto · Video', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20',   tab: 'standard' },
        { emoji: '💪', label: 'WOD',      sub: 'Entrenamiento', color: 'text-brand-red', bg: 'bg-brand-red/10 border-brand-red/20', tab: 'wod' },
        { emoji: '🏆', label: 'PR',       sub: 'Récord',       color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', tab: 'pr' },
    ];

    return (
        <div ref={containerRef} className="mb-6 scroll-mt-4">
            {!isOpen ? (
                <div className="bg-[#0E0E0E] border border-white/[0.07] rounded-3xl overflow-hidden shadow-2xl">
                    {/* Top row: avatar + placeholder */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-full flex items-center gap-3 px-4 pt-4 pb-3 hover:bg-white/[0.02] transition-colors"
                    >
                        <div className="w-9 h-9 rounded-full border border-white/10 bg-black/40 overflow-hidden relative shrink-0">
                            {currentUser?.user_metadata?.avatar_url ? (
                                <Image src={currentUser.user_metadata.avatar_url} alt="User" fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] bg-zinc-800 font-black text-zinc-500">ME</div>
                            )}
                        </div>
                        <span className="flex-1 text-left text-white/25 text-sm font-medium">¿Qué vas a publicar hoy?</span>
                        <div className="w-7 h-7 rounded-xl bg-brand-red flex items-center justify-center shadow-[0_0_12px_rgba(220,38,38,0.4)] shrink-0">
                            <Plus className="w-4 h-4 text-white" />
                        </div>
                    </button>

                    {/* Content type quick-pick row */}
                    <div className="grid grid-cols-4 border-t border-white/[0.05] divide-x divide-white/[0.05]">
                        {POST_ACTIONS.map(action => (
                            <button
                                key={action.tab}
                                onClick={() => {
                                    if (action.tab === 'story') {
                                        // Scroll to story bar
                                        document.getElementById('story-bar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        window.dispatchEvent(new CustomEvent('open-story-creator'));
                                    } else {
                                        setIsOpen(true);
                                        setTimeout(() => containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                                    }
                                }}
                                className="flex flex-col items-center gap-1.5 py-3 px-2 hover:bg-white/[0.04] transition-colors active:bg-white/[0.06]"
                            >
                                <span className="text-xl leading-none">{action.emoji}</span>
                                <span className={`text-[10px] font-black uppercase leading-none ${action.color}`}>{action.label}</span>
                                <span className="text-[8px] text-white/20 font-medium leading-none">{action.sub}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-brand-gray/20 border border-white/5 rounded-[28px] md:rounded-[32px] px-1.5 py-4 md:px-4 md:py-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10" />

                    <div className="flex justify-between items-center mb-6 relative z-10 border-b border-white/5 pb-4 px-2">
                        <div className="flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5 text-brand-red animate-pulse" />
                            <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-foreground italic truncate max-w-[150px] sm:max-w-none">
                                {editMode ? 'EDITAR WOD' : repostData ? 'REPOSTEAR WOD' : 'Nueva Publicación'}
                            </h2>
                        </div>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                setRepostData(null);
                            }}
                            className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all flex items-center gap-1.5 group bg-white/5 px-2.5 py-1.5 rounded-full border border-white/5 hover:border-white/20 shadow-sm shrink-0"
                        >
                            {language === 'es' ? 'Cancelar' : 'Cancel'} <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    <CreatePost
                        currentUser={currentUser}
                        onSuccess={() => {
                            setIsOpen(false);
                            setRepostData(null);
                            setEditMode(null);
                            refresh();
                        }}
                        initialPostType={
                            editMode ? (repostData?.media_type === 'wod' || repostData?.post_type === 'wod' ? 'wod' : repostData?.media_type === 'pr' ? 'pr' : 'standard') :
                            (repostData && (repostData.media_type === 'wod' || repostData.post_type === 'wod') ? 'wod' : (newPostType || 'standard'))
                        }
                        initialData={repostData}
                        editingPostId={editMode?.id}
                    />
                </div>
            )}
        </div>
    )
}

// ── Session cache — stale-while-revalidate for dashboard stats ───────────────
const DASH_CACHE_KEY = 'rival_dash_v1';
const DASH_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function readDashCache() {
    try {
        const raw = sessionStorage.getItem(DASH_CACHE_KEY);
        if (!raw) return null;
        const { ts, payload } = JSON.parse(raw);
        if (Date.now() - ts > DASH_CACHE_TTL) return null;
        return payload;
    } catch { return null; }
}

function writeDashCache(payload: any) {
    try {
        const safe = {
            profile: payload.profile,
            workoutCount: payload.workoutCount,
            rivalsCount: payload.rivalsCount,
            workoutStreak: payload.workoutStreak,
            trendingAthletes: payload.trendingAthletes,
            myGyms: payload.myGyms,
        };
        sessionStorage.setItem(DASH_CACHE_KEY, JSON.stringify({ ts: Date.now(), payload: safe }));
    } catch {}
}

export default function DashboardHome() {
    const { language, t } = useLanguage();
    // Reuse singleton client — never create more than one per browser session
    const supabase = useMemo(() => createClient(), []);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [gymsLoading, setGymsLoading] = useState(true);
    const [duelsLoading, setDuelsLoading] = useState(true);
    const [trendingLoading, setTrendingLoading] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [showTour, setShowTour] = useState(false);
    const [reelsOpen, setReelsOpen] = useState(false);
    const [reelsPosts, setReelsPosts] = useState<ReelPost[]>([]);
    const [reelsStartIndex, setReelsStartIndex] = useState(0);
    const [todayCheckin, setTodayCheckin] = useState<any>(undefined);
    const [selectedVictoryDuel, setSelectedVictoryDuel] = useState<any>(null);
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
        activeCenterIds: new Set<string>(),
        workoutStreak: 0,
        myGyms: [],
        repostMap: {} as Record<string, any>,
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const [feedLoading, setFeedLoading] = useState(true);
    // Cache the auth user to avoid repeated auth.getUser() calls across loadData + fetchFeed
    const currentUserRef = useRef<any>(null);
    // Cache follows & official IDs so fetchFeed doesn't re-fetch them
    const followedIdsRef = useRef<string[]>([]);
    const officialIdsRef = useRef<string[]>([]);
    // Track when the page was hidden to detect long background intervals (black screen fix)
    const hiddenAtRef = useRef<number | null>(null);

    // ── Black screen fix for Capacitor/PWA: reload if app was backgrounded > 5 min ──
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.hidden) {
                hiddenAtRef.current = Date.now();
            } else {
                const hiddenMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
                hiddenAtRef.current = null;
                // If backgrounded for more than 5 minutes, do a hard reload to clear the black screen
                if (hiddenMs > 5 * 60 * 1000) {
                    window.location.reload();
                } else if (hiddenMs > 30 * 1000) {
                    // Backgrounded between 30s and 5min → just refresh the feed silently
                    setRefreshKey(prev => prev + 1);
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    // Memoized fetch for main dashboard data (profile, stats, duels)
    const loadData = useCallback(async () => {
        // Show cached data immediately — page feels instant on repeat visits
        const cached = readDashCache();
        if (cached) {
            setData((prev: any) => ({ ...prev, ...cached }));
            setLoading(false);
            setStatsLoading(false);
            setGymsLoading(false);
            setDuelsLoading(false);
            setTrendingLoading(false);
        } else {
            setLoading(true);
            setStatsLoading(true);
            setGymsLoading(true);
            setDuelsLoading(true);
            setTrendingLoading(true);
        }
        try {
            // Retrieve session locally first (super fast)
            const { data: sessionData } = await supabase.auth.getSession();
            let user = sessionData?.session?.user || null;
            if (!user) {
                const { data: authData } = await supabase.auth.getUser();
                user = authData?.user || null;
            }
            if (!user) {
                setLoading(false);
                setStatsLoading(false);
                setGymsLoading(false);
                setDuelsLoading(false);
                setTrendingLoading(false);
                return;
            }

            // Cache user for reuse in fetchFeed (avoids repeated auth.getUser() calls)
            currentUserRef.current = user;

            // Fetch basic profile data (fast single query key lookup)
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();

            setData((prev: any) => ({
                ...prev,
                currentUser: user,
                profile: profileData
            }));

            // Release full screen spinner immediately once layout can draw user info
            setLoading(false);

            // "Tus Gimnasios" solo depende de esta query — se resuelve y pinta
            // aparte para no esperar a misiones/duelos (que son mucho más lentos:
            // pasan por Server Action + su propio auth.getUser() + writes de sync).
            const membershipsPromise = supabase.from('members').select('*, organization:center_id(id, name, logo_url, city, center_type, owner_id, head_coach_id)').eq('user_id', user.id).in('status', ['active', 'trial']);
            membershipsPromise.then(({ data: memberships }: any) => {
                setData((prev: any) => ({
                    ...prev,
                    myGyms: memberships?.map((m: any) => m.organization) || [],
                    activeCenterIds: new Set(memberships?.filter((m: any) => m.status === 'active').map((m: any) => m.center_id) || []),
                }));
                setGymsLoading(false);
            }).catch(() => setGymsLoading(false));

            // Fetch secondary data (counts, trending, official, missions, duels) in the background
            Promise.all([
                membershipsPromise,
                supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('class_results').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).in('media_type', ['wod', 'pr', 'class_result']),
                supabase.from('follows').select('following_id').eq('follower_id', user.id),
                supabase.from('profiles')
                    .select('id, username, full_name, avatar_url, level, is_official')
                    .neq('id', user.id)
                    .eq('is_official', false)
                    .order('xp_points', { ascending: false })
                    .limit(4),
                supabase.from('profiles').select('id').eq('is_official', true),
                getMissions(),
                getMyDuels(),
                getWorkoutStreak()
            ]).then(([
                membershipsResult,
                workoutsResult,
                classesResult,
                wodPostsResult,
                followsResult,
                trendingResult,
                officialResult,
                missionsData,
                duelsData,
                realStreak
            ]) => {
                const memberships = membershipsResult.data;
                const workouts = workoutsResult.count;
                const classes = classesResult.count;
                const wodPosts = wodPostsResult.count;
                const myFollows = followsResult.data;
                const trending = trendingResult.data;
                const officialProfiles = officialResult.data;

                const followedIds = new Set(myFollows?.map((f: { following_id: string }) => f.following_id) || []);
                const followingCount = myFollows?.length || 0;
                
                followedIdsRef.current = Array.from(followedIds) as string[];
                officialIdsRef.current = (officialProfiles?.map((p: any) => p.id) || []) as string[];

                const sessionMission = missionsData?.find((m: any) => m.goal_type === 'sessions_count' || m.goal_type === 'workouts');
                const weeklyProgress = {
                    current: sessionMission?.current_value || 0,
                    goal: sessionMission?.goal_value || 5,
                };

                const freshStats = {
                    profile: profileData,
                    workoutCount: (workouts || 0) + (classes || 0) + (wodPosts || 0),
                    trendingAthletes: trending?.map((athlete: any) => ({ ...athlete, isFollowing: followedIds.has(athlete.id) })) || [],
                    rivalsCount: followingCount || 0,
                    myGyms: memberships?.map((m: any) => m.organization) || [],
                    workoutStreak: realStreak || 0,
                };
                
                writeDashCache(freshStats);

                setData((prev: any) => ({
                    ...prev,
                    workoutCount: freshStats.workoutCount,
                    trendingAthletes: freshStats.trendingAthletes,
                    rivalsCount: freshStats.rivalsCount,
                    missionProgress: weeklyProgress.current,
                    missionGoal: weeklyProgress.goal,
                    duels: duelsData || [],
                    myGyms: freshStats.myGyms,
                    activeCenterIds: new Set(memberships?.filter((m: any) => m.status === 'active').map((m: any) => m.center_id) || []),
                    workoutStreak: freshStats.workoutStreak
                }));

                setStatsLoading(false);
                setGymsLoading(false);
                setDuelsLoading(false);
                setTrendingLoading(false);
            }).catch(err => {
                console.error("Background data fetch catch:", err);
                setStatsLoading(false);
                setGymsLoading(false);
                setDuelsLoading(false);
                setTrendingLoading(false);
            });
        } catch (e) {
            console.error("loadData error:", e);
            setLoading(false);
            setStatsLoading(false);
            setGymsLoading(false);
            setDuelsLoading(false);
            setTrendingLoading(false);
        }
        // load checkin separately (non-blocking)
        getTodayCheckin().then(setTodayCheckin);
    }, [supabase]);

    useEffect(() => {
        loadData();

        // On profile update: reload stats AND refresh the feed
        const handleProfileUpdate = () => {
            loadData();
            setRefreshKey(prev => prev + 1);
        };
        window.addEventListener('profile-updated', handleProfileUpdate);

        const hasSeenTour = localStorage.getItem("rival_dashboard_tour_seen");
        if (!hasSeenTour) setShowTour(true);

        return () => window.removeEventListener('profile-updated', handleProfileUpdate);
    }, [loadData]);

    // Memoized feed fetcher: reuses cached user, skips follows query on global tab
    const fetchFeed = useCallback(async () => {
        const user = data.currentUser || currentUserRef.current;
        if (!user) return;

        try {
            setFeedLoading(true);

            // Optimized select: likes como COUNT (antes bajaba TODAS las filas
            // de likes de cada post — cientos de filas muertas por página)
            let query = supabase
                .from('posts')
                .select(`
                    id, user_id, caption, media_url, media_type, post_type,
                    wod_data, workout_id, music_url, music_title, music_artist,
                    created_at, view_count,
                    profiles:user_id (id, username, full_name, avatar_url, level, is_official),
                    workouts:workout_id (*),
                    likes:likes(count),
                    comments:comments(count)
                `)
                .order('created_at', { ascending: false })
                .limit(15);

            let followedIds = followedIdsRef.current;
            let officialIds = officialIdsRef.current;

            if (followedIds.length === 0) {
                const [{ data: myFollows }, { data: officialProfiles }] = await Promise.all([
                    supabase.from('follows').select('following_id').eq('follower_id', user.id),
                    supabase.from('profiles').select('id').eq('is_official', true),
                ]);
                followedIds = myFollows?.map((f: any) => f.following_id) || [];
                officialIds = officialProfiles?.map((p: any) => p.id) || [];
                followedIdsRef.current = followedIds;
                officialIdsRef.current = officialIds;
            }

            const idsToFetch = Array.from(new Set([user.id, ...followedIds, ...officialIds])).filter(Boolean);
            query = query.in('user_id', idsToFetch);

            const { data: posts, error } = await query;
            if (error) console.error("[fetchFeed] Query error:", error);

            // Mis likes de estos posts: una sola consulta ligera
            let myLikedIds = new Set<string>();
            if (posts && posts.length > 0) {
                const { data: myLikes } = await supabase
                    .from('likes')
                    .select('post_id')
                    .eq('user_id', user.id)
                    .in('post_id', posts.map((p: any) => p.id));
                myLikedIds = new Set((myLikes || []).map((l: any) => l.post_id));
            }
            const postsWithLikes = (posts || []).map((p: any) => ({
                ...p,
                likes_count: p.likes?.[0]?.count || 0,
                has_liked: myLikedIds.has(p.id),
            }));

            // Batch-fetch original posts for reposts — single query, avoids N+1
            const repostIds = (posts || [])
                .filter((p: any) => p.media_type === 'repost')
                .map((p: any) => { try { return JSON.parse(p.media_url || '{}').originalPostId; } catch { return null; } })
                .filter(Boolean);

            let repostMap: Record<string, any> = {};
            if (repostIds.length > 0) {
                const { data: originals } = await supabase
                    .from('posts')
                    .select('id, caption, media_url, media_type, profiles:user_id(username, full_name, avatar_url, is_official)')
                    .in('id', repostIds);
                for (const orig of (originals || [])) repostMap[orig.id] = orig;
            }

            setData((prev: any) => ({ ...prev, feedPosts: postsWithLikes, repostMap }));
        } catch (e) {
            console.error("[fetchFeed] Catch error:", e);
        } finally {
            setFeedLoading(false);
        }
    }, [supabase, data.currentUser?.id]);

    // Trigger feed fetch whenever the tab changes, a refresh is requested, or the user is ready
    useEffect(() => {
        if (data.currentUser) {
            fetchFeed();
        }
    }, [fetchFeed, refreshKey, data.currentUser?.id]);

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

    // ── Reels viewer: listen for open-reels events from FeedPost ──────────────
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as ReelPost
            if (!detail?.src) return

            // Collect all video posts from the current feed and deduplicate
            const VIDEO_EXTS = /\.(mp4|webm|mov|m4v)(\?.*)?$/i
            const videoIndicators = ['/videos/', 'video/upload', '.mov?', '.mp4?']
            const isVideoUrl = (url: string) => VIDEO_EXTS.test(url) || videoIndicators.some(v => url.includes(v))

            const feedVideos: ReelPost[] = (data.feedPosts || [])
                .filter((p: any) => {
                    const url = p.media_url || ''
                    return p.media_type === 'video' || isVideoUrl(url)
                })
                .map((p: any) => ({
                    postId: p.id,
                    src: p.media_url,
                    username: p.profiles?.username || p.profiles?.full_name || 'rival',
                    userFullName: p.profiles?.full_name,
                    avatar: p.profiles?.avatar_url,
                    caption: p.caption,
                    initialLikes: p.likes_count || 0,
                    hasLikedInitial: p.has_liked || false,
                    commentsCount: p.comments_count || 0,
                    currentUserId: data.currentUser?.id,
                    authorId: p.user_id,
                }))

            // Ensure the clicked post is in the list (add if not found in feed)
            const exists = feedVideos.some(v => v.postId === detail.postId)
            if (!exists) feedVideos.unshift(detail)

            const idx = feedVideos.findIndex(v => v.postId === detail.postId)
            setReelsPosts(feedVideos)
            setReelsStartIndex(idx >= 0 ? idx : 0)
            setReelsOpen(true)
        }

        window.addEventListener('open-reels', handler)
        return () => window.removeEventListener('open-reels', handler)
    }, [data.feedPosts, data.currentUser])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto space-y-6 pb-12 px-3 sm:px-4 lg:px-8 overflow-x-hidden">
            {/* Hero Welcome Banner */}
            <div className="relative min-h-[110px] md:h-44 rounded-2xl md:rounded-[28px] overflow-hidden border border-white/5 shadow-2xl flex flex-col justify-center dark-section w-full">
                <Image
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=60&w=800&auto=format&fit=crop"
                    alt="Training Arena"
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className="object-cover opacity-40 grayscale"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
                <div className="relative z-10 px-4 sm:px-8 py-4 sm:py-8">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 text-brand-red text-[9px] font-black mb-1.5 w-fit">
                        <Flame className="w-2.5 h-2.5 fill-current" />
                        {t.dashboard.liveStatus}
                    </div>
                    <h1 className="text-xl sm:text-3xl font-heading font-black !text-white mb-1 italic uppercase tracking-tight leading-none">
                        {t.dashboard.welcome} <span className="text-brand-red">{data.profile?.full_name?.split(' ')[0] || t.dashboard.warrior}</span>
                    </h1>
                    <p className="!text-gray-300 text-[10px] sm:text-sm max-w-2xl font-bold uppercase tracking-wider">
                        <span className="text-white font-extrabold">{data.workoutCount}</span> sesiones · <span className="text-white font-extrabold">{data.rivalsCount}</span> rivales
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-6 lg:gap-16">
                {/* Left Column: Feed */}
                <div className="lg:col-span-7 space-y-6 min-w-0 overflow-hidden">

                    {/* 1. My Gyms Section (Moved here) */}
                    {gymsLoading ? (
                        <div className="mb-8">
                            <h2 className="text-xl font-black text-foreground italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-brand-red animate-pulse" /> {t.dashboard.myGyms}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="animate-pulse rounded-2xl bg-brand-gray/40 border border-border/10 p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-foreground/10 shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-foreground/15 rounded w-2/3" />
                                            <div className="h-3 bg-foreground/10 rounded w-1/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : data.myGyms?.length > 0 ? (
                        <div className="mb-8">
                            <h2 className="text-xl font-black text-foreground italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-brand-red" /> {t.dashboard.myGyms}
                                <InfoTooltip
                                    title="Tus Sedes"
                                    content="Centros oficiales donde estás inscrito. Accede para ver WODs exclusivos y chatear con tu equipo."
                                />
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {data.myGyms.map((gym: any) => {
                                    const isOwnerOrHeadCoach = gym.owner_id === data.currentUser?.id || gym.head_coach_id === data.currentUser?.id;
                                    const gymHref = isOwnerOrHeadCoach
                                        ? `/dashboard/gyms/${gym.id}`
                                        : (gym.center_type === 'personal_trainer' ? `/trainer/${gym.id}` : `/gym/${gym.id}`);
                                    return (
                                    <Link key={gym.id} href={gymHref} className="group relative overflow-hidden rounded-2xl bg-brand-gray/40 border border-border/10 hover:border-brand-red/50 transition-all p-4 flex items-center gap-4">
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
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    {/* 2. Stories Bar (Moved here as requested) */}
                    <div id="story-bar">
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
                                    loading={statsLoading}
                                />
                            </Link>
                            <Link href="/dashboard/explore" className="group">
                                <StatCard
                                    label={t.dashboard.statsRivales}
                                    value={data.rivalsCount?.toString() || "0"}
                                    icon={<Flame className="w-4 h-4 text-orange-500" />}
                                    subtext={t.dashboard.statsSeguidos}
                                    loading={statsLoading}
                                />
                            </Link>
                            <Link href="/dashboard/leaderboard" className="group">
                                <StatCard
                                    label={t.dashboard.statsRacha}
                                    value={data.workoutStreak > 0 ? `${data.workoutStreak} ${data.workoutStreak === 1 ? (language === 'es' ? 'Día' : 'Day') : (language === 'es' ? 'Días' : 'Days')}` : "0"}
                                    icon={<Trophy className="w-4 h-4 text-yellow-500" />}
                                    subtext={t.dashboard.statsContinuo}
                                    loading={statsLoading}
                                />
                            </Link>
                            <Link href="/dashboard/analytics" className="group">
                                <StatCard
                                    label={t.dashboard.statsRango}
                                    value={data.profile?.level ? `${t.dashboard.level} ${data.profile.level}` : t.dashboard.revelLevel}
                                    icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
                                    subtext={t.dashboard.statsPrestigio}
                                    loading={statsLoading}
                                />
                            </Link>
                        </div>
                    </div>



                    {/* 4. Feed Header & Feed */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                            <h2 className="text-xl md:text-3xl font-heading font-black text-foreground italic tracking-tighter uppercase flex items-center gap-2 flex-wrap">
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
                        </div>
                    <div className="space-y-6">
                        {/* Old StoryBar location removed */}

                        <EssentialsHero />

                        <CollapsibleCreatePost 
                            currentUser={data.currentUser} 
                            language={language} 
                            refresh={() => {
                                setRefreshKey(prev => prev + 1);
                                loadData();
                            }}
                        />

                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] ml-2">{t.dashboard.recentActivity}</h3>

                        {/* Feed skeleton — visible while posts load */}
                        {feedLoading && (
                            <div className="space-y-8">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-[28px] p-5 space-y-4 animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-3 bg-white/10 rounded-full w-32" />
                                                <div className="h-2 bg-white/5 rounded-full w-20" />
                                            </div>
                                        </div>
                                        <div className="h-48 bg-white/5 rounded-2xl" />
                                        <div className="flex gap-4">
                                            <div className="h-3 bg-white/10 rounded-full w-12" />
                                            <div className="h-3 bg-white/10 rounded-full w-12" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!feedLoading && data.feedPosts && data.feedPosts.length > 0 ? (
                            <div className="space-y-10">
                                {(() => {
                                    const activeDuelUserIds = new Set(data.duels.filter((d: any) => d.status === 'active' || d.status === 'pending').map((d: any) => d.challenger_id === data.currentUser?.id ? d.opponent_id : d.challenger_id));

                                    return data.feedPosts.map((post: any) => {
                                        let repostOriginalPost: any = undefined;
                                        if (post.media_type === 'repost') {
                                            try {
                                                const meta = JSON.parse(post.media_url || '{}');
                                                if (meta.originalPostId) repostOriginalPost = data.repostMap?.[meta.originalPostId];
                                            } catch {}
                                        }
                                        return (
                                        <div key={post.id} id={`post-${post.id}`} className="scroll-mt-24 transition-all duration-300">
                                            <FeedPost
                                                postId={post.id}
                                                username={post.profiles?.username}
                                                user={post.profiles?.full_name || "Unknown Athlete"}
                                                action={post.media_type === 'class_result' ? (language === 'es' ? "ha completado una sesión de clase" : "completed a class session") : post.workout_id ? (language === 'es' ? "ha completado un entrenamiento" : "completed a workout") : (language === 'es' ? "ha publicado una actualización" : "posted an update")}
                                                time={formatTimeAgo(post.created_at)}
                                                avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                                image={post.media_url}
                                                initialLikes={post.likes_count ?? (Array.isArray(post.likes) ? post.likes.length : 0)}
                                                hasLikedInitial={post.has_liked ?? (Array.isArray(post.likes) && post.likes.some((l: any) => l.user_id === data.currentUser?.id))}
                                                comments={post.comments?.[0]?.count || 0}
                                                highlight={post.workouts?.title}
                                                mediaType={post.media_type}
                                                caption={post.caption}
                                                currentUserId={data.currentUser?.id}
                                                authorId={post.user_id}
                                                workoutData={post.workouts}
                                                music_url={post.music_url}
                                                music_title={post.music_title}
                                                music_artist={post.music_artist}
                                                thumbnail_url={post.thumbnail_url}
                                                cover_url={post.cover_url}
                                                isOfficial={post.profiles?.is_official}
                                                isMember={data.activeCenterIds.has(post.user_id) || post.user_id === data.currentUser?.id}
                                                context="following"
                                                isAdminUser={data.profile?.is_official}
                                                hasActiveDuel={activeDuelUserIds.has(post.user_id)}
                                                post_type={post.post_type}
                                                wod_data={post.wod_data}
                                                repostOriginalPost={repostOriginalPost}
                                                viewCount={post.view_count || 0}
                                            />
                                        </div>
                                    )});
                                })()}
                            </div>
                        ) : (
                            <FeedEmptyGuide onExplore={() => { window.location.href = '/dashboard/explore'; }} />
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-6 md:space-y-8 min-w-0 overflow-hidden">
                    <UserMediaGallery userId={data.currentUser?.id} />

                    {duelsLoading ? (
                        <div className="bg-black/40 border border-brand-red/20 rounded-[32px] p-5 md:p-8 backdrop-blur-xl animate-pulse space-y-6">
                            <div className="h-6 bg-white/10 rounded w-1/3 mb-8" />
                            {[1, 2].map((i) => (
                                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-white/10 rounded w-1/2" />
                                        <div className="h-3 bg-white/5 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : data.duels.length > 0 ? (
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
                                                    {/* div, no <p>: DuelCountdown renderiza <div> y <p> no puede contener bloques */}
                                                    <div className="text-xs text-gray-500 uppercase font-bold mt-1">
                                                        <DuelCountdown endDate={duel.end_date} status={duel.status} />
                                                    </div>

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

                                            {duel.status === 'completed' && (
                                                <button
                                                    onClick={() => setSelectedVictoryDuel(duel)}
                                                    className="mt-4 w-full py-3 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-brand-red hover:border-brand-red transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Share2 className="w-3.5 h-3.5" /> {language === 'es' ? 'Compartir Victoria' : 'Share Victory'}
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : null}

                    <div className="bg-brand-gray/40 border border-white/10 rounded-[32px] p-5 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <h3 className="font-heading font-black text-foreground italic tracking-wider mb-10 flex items-center gap-3 text-lg">
                            <Flame className="w-6 h-6 text-brand-red" /> {t.dashboard.rivalsToFollow}
                        </h3>
                        <div className="space-y-5">
                            {trendingLoading ? (
                                [1, 2, 3].map((i) => (
                                    <div key={i} className="animate-pulse bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-foreground/10 shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-foreground/15 rounded w-1/2" />
                                            <div className="h-3 bg-foreground/10 rounded w-1/3" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                data.trendingAthletes.map((athlete: any) => (
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
                                ))
                            )}
                        </div>
                        <Link href="/dashboard/explore" className="group/link mt-12 w-full py-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white hover:bg-white/10 transition-all">
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
            {selectedVictoryDuel && (
                <VictoryShareCard
                    winner={{
                        name: selectedVictoryDuel.winner_id === data.currentUser?.id ? (data.profile?.full_name || data.currentUser?.username || "Tú") : (selectedVictoryDuel.challenger_id === selectedVictoryDuel.winner_id ? selectedVictoryDuel.challenger.full_name : selectedVictoryDuel.opponent.full_name),
                        username: selectedVictoryDuel.winner_id === data.currentUser?.id ? (data.profile?.username || "Tú") : (selectedVictoryDuel.challenger_id === selectedVictoryDuel.winner_id ? selectedVictoryDuel.challenger.username : selectedVictoryDuel.opponent.username),
                        avatar: selectedVictoryDuel.winner_id === data.currentUser?.id ? (data.profile?.avatar_url || "") : (selectedVictoryDuel.challenger_id === selectedVictoryDuel.winner_id ? selectedVictoryDuel.challenger.avatar_url : selectedVictoryDuel.opponent.avatar_url),
                        score: selectedVictoryDuel.winner_id === selectedVictoryDuel.challenger_id ? selectedVictoryDuel.challenger_score : selectedVictoryDuel.opponent_score
                    }}
                    loser={{
                        name: selectedVictoryDuel.winner_id !== data.currentUser?.id ? (data.profile?.full_name || data.currentUser?.username || "Tú") : (selectedVictoryDuel.challenger_id !== selectedVictoryDuel.winner_id ? selectedVictoryDuel.challenger.full_name : selectedVictoryDuel.opponent.full_name),
                        username: selectedVictoryDuel.winner_id !== data.currentUser?.id ? (data.profile?.username || "Tú") : (selectedVictoryDuel.challenger_id !== selectedVictoryDuel.winner_id ? selectedVictoryDuel.challenger.username : selectedVictoryDuel.opponent.username),
                        avatar: selectedVictoryDuel.winner_id !== data.currentUser?.id ? (data.profile?.avatar_url || "") : (selectedVictoryDuel.challenger_id !== selectedVictoryDuel.winner_id ? selectedVictoryDuel.challenger.avatar_url : selectedVictoryDuel.opponent.avatar_url),
                        score: selectedVictoryDuel.winner_id !== selectedVictoryDuel.challenger_id ? selectedVictoryDuel.challenger_score : selectedVictoryDuel.opponent_score
                    }}
                    onClose={() => setSelectedVictoryDuel(null)}
                />
            )}
            {showTour && (
                <DashboardTour onComplete={() => {
                    setShowTour(false);
                    localStorage.setItem("rival_dashboard_tour_seen", "true");
                }} />
            )}

            {/* ── Fullscreen Reels Viewer ── */}
            <AnimatePresence>
                {reelsOpen && reelsPosts.length > 0 && (
                    <VideoReelsViewer
                        posts={reelsPosts}
                        startIndex={reelsStartIndex}
                        onClose={() => setReelsOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
