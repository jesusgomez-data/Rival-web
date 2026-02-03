import Image from "next/image";
import { Flame, MoreHorizontal, MessageCircle, Heart, Share2, TrendingUp, Trophy, Dumbbell, ArrowRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import clsx from "clsx";
import LikeButton from "./community/LikeButton";
import FollowButton from "./community/FollowButton";
import FeedPost from "./FeedPost";
import CreatePost from "./CreatePost";
import StoryBar from "./stories/StoryBar";
import { getMyDuels, acceptDuel } from "./community/duel-actions";
import { Swords } from "lucide-react";
import UserMediaGallery from "./UserMediaGallery";


export const dynamic = 'force-dynamic';

function SuggestedUser({ id, name, username, role, avatar, isFollowing }: { id: string, name: string, username: string, role: string, avatar?: string, isFollowing: boolean }) {
    return (
        <div className="flex items-center gap-3 group">
            <Link href={`/dashboard/profile/${username}`} className="flex-1 flex items-center gap-3 group/link">
                <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/5 overflow-hidden relative group-hover/link:border-brand-red transition-colors">
                    {avatar ? (
                        <Image src={avatar} alt={name} fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">
                            {name.substring(0, 2)}
                        </div>
                    )}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-foreground group-hover/link:text-brand-red transition-colors">{name}</p>
                    <p className="text-xs text-gray-500">{role || 'Athlete'}</p>
                </div>
            </Link>
            <FollowButton targetId={id} isFollowingInitial={isFollowing} />
        </div>
    )
}

export default async function DashboardHome(props: {
    searchParams: Promise<{ tab?: string }>
}) {
    const searchParams = await props.searchParams;
    const activeTab = searchParams.tab || 'following';
    const supabase = await createClient();

    let profile: any = null;
    let workoutCount = 0;
    let feedPosts: any[] = [];
    let trendingAthletes: any[] = [];
    let rivalsCount = 0;
    let currentUser: any = null;
    let missionProgress = 0;
    let missionGoal = 5;
    let duels: any[] = [];
    let myGyms: any[] = [];

    try {
        const { data: { user } } = await supabase.auth.getUser();
        currentUser = user;

        if (user) {
            // 0. Get My Gyms
            const { data: memberships } = await supabase
                .from('members')
                .select('*, organization:center_id(id, name, logo_url, city)')
                .eq('user_id', user.id)
                .in('status', ['active', 'trial']);

            myGyms = memberships?.map((m: any) => m.organization) || [];
            // 1. Get User Profile
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            profile = profileData;

            // 2. Get Personal Stats (Workouts + Classes)
            const { count: workouts } = await supabase
                .from('workouts')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            const { count: classes } = await supabase
                .from('class_results')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            workoutCount = (workouts || 0) + (classes || 0);

            const { count: followingCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', user.id);
            rivalsCount = followingCount || 0;

            // 3. Feed Logic
            const { data: myFollows } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);

            const followedIds = new Set(myFollows?.map(f => f.following_id) || []);

            if (activeTab === 'global') {
                const { data: posts } = await supabase
                    .from('posts')
                    .select('*, profiles:user_id(*), workouts:workout_id(*, workout_sets(*)), likes:likes(user_id)')
                    .order('created_at', { ascending: false })
                    .limit(10);
                feedPosts = posts || [];
            } else {
                const followingIds = Array.from(followedIds);
                const idsToFetch = [...followingIds, user.id];
                const { data: posts } = await supabase
                    .from('posts')
                    .select('*, profiles:user_id(*), workouts:workout_id(*, workout_sets(*)), likes:likes(user_id)')
                    .in('user_id', idsToFetch)
                    .order('created_at', { ascending: false })
                    .limit(10);
                feedPosts = posts || [];
            }

            // 4. Trending Athletes
            const { data: trending } = await supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, level')
                .neq('id', user.id)
                .order('xp_points', { ascending: false })
                .limit(4);

            trendingAthletes = trending?.map(athlete => ({
                ...athlete,
                isFollowing: followedIds.has(athlete.id)
            })) || [];

            // 5. Fetch Mission Progress (Filtered by User)
            const { data: missionData } = await supabase
                .from('missions')
                .select(`
                    *,
                    user_missions!inner(current_value, user_id)
                `)
                .eq('goal_type', 'sessions_count')
                .eq('user_missions.user_id', user.id)
                .single();

            if (missionData) {
                missionGoal = missionData.goal_value;
                missionProgress = missionData.user_missions?.[0]?.current_value || 0;
            }

            // 6. Get Duels
            duels = await getMyDuels();

            // 7. Ensure we have some default mock data if no real data exists
            if (feedPosts.length === 0) {
                // Add some mock posts for demo purposes
                feedPosts = [
                    {
                        id: 'mock-1',
                        user_id: 'mock-user-1',
                        profiles: { full_name: 'Alex Champion', avatar_url: 'https://ui-avatars.com/api/?name=Alex+Champion&background=random' },
                        workout_id: null,
                        workouts: { title: 'Morning Session' },
                        media_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop',
                        created_at: new Date(Date.now() - 3600000).toISOString(),
                        likes_count: 24,
                        comments_count: 5,
                        likes: []
                    },
                    {
                        id: 'mock-2',
                        user_id: 'mock-user-2',
                        profiles: { full_name: 'Jordan Fitness', avatar_url: 'https://ui-avatars.com/api/?name=Jordan+Fitness&background=random' },
                        workout_id: null,
                        workouts: { title: 'Legs Destroyed' },
                        media_url: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop',
                        created_at: new Date(Date.now() - 7200000).toISOString(),
                        likes_count: 42,
                        comments_count: 12,
                        likes: []
                    }
                ];
            }

            if (trendingAthletes.length === 0) {
                // Add mock trending athletes
                trendingAthletes = [
                    { id: 'athlete-1', username: 'ironwill', full_name: 'Iron Will', level: 'Elite', avatar_url: 'https://ui-avatars.com/api/?name=Iron+Will&background=random', isFollowing: false },
                    { id: 'athlete-2', username: 'speedster', full_name: 'Speedster Pro', level: 'Intermediate', avatar_url: 'https://ui-avatars.com/api/?name=Speedster+Pro&background=random', isFollowing: false },
                    { id: 'athlete-3', username: 'flexgod', full_name: 'Flex God', level: 'Elite', avatar_url: 'https://ui-avatars.com/api/?name=Flex+God&background=random', isFollowing: false },
                    { id: 'athlete-4', username: 'cardio_queen', full_name: 'Cardio Queen', level: 'Intermediate', avatar_url: 'https://ui-avatars.com/api/?name=Cardio+Queen&background=random', isFollowing: false }
                ];
            }
        }
    } catch (error) {
        console.error("Dashboard Data Error:", error);
    }

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

    return (
        <div className="max-w-full mx-auto space-y-8 pb-12 px-0 lg:px-8">
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
                <div className="relative z-10 px-6 md:px-12 py-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-[10px] md:text-xs font-black mb-3 md:mb-4 w-fit">
                        <Flame className="w-3 h-3 fill-current" />
                        ESTADO EN VIVO
                    </div>
                    <h1 className="text-2xl md:text-5xl font-heading font-black text-white mb-2 md:mb-3 italic uppercase tracking-tight leading-none">
                        Bienvenido, <span className="text-brand-red">{profile?.full_name?.split(' ')[0] || 'Guerrero'}</span>
                    </h1>
                    <p className="text-gray-400 text-xs md:text-lg max-w-2xl font-medium">
                        Has registrado <span className="text-white font-bold">{workoutCount} sesiones</span> y estás siguiendo a <span className="text-white font-bold">{rivalsCount} rivales</span>. Es hora de dominar.
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
                {/* Left Column: Feed */}
                <div className="lg:col-span-7 space-y-8">

                    {/* My Gyms Section */}
                    {myGyms.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-black text-foreground italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                                <Dumbbell className="w-5 h-5 text-brand-red" /> Tus Gimnasios
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {myGyms.map((gym) => (
                                    <Link key={gym.id} href={`/gym/${gym.id}`} className="group relative overflow-hidden rounded-2xl bg-brand-gray/40 border border-white/5 hover:border-brand-red/50 transition-all p-4 flex items-center gap-4">
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
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Panel de Atleta
                                            </p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-brand-red group-hover:translate-x-1 transition-all ml-auto" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-heading font-black text-foreground italic tracking-tighter uppercase">
                                Feed de <span className="text-brand-red">Actividad</span>
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                                    Actualizaciones en vivo
                                </p>
                            </div>
                        </div>
                        <div className="flex bg-white/5 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 self-start sm:self-auto shadow-2xl">
                            <Link
                                href="/dashboard?tab=following"
                                className={clsx(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    activeTab === 'following' ? "bg-brand-red text-white shadow-glow" : "text-gray-500 hover:text-white"
                                )}
                            >
                                Siguiendo
                            </Link>
                            <Link
                                href="/dashboard?tab=global"
                                className={clsx(
                                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                    activeTab === 'global' ? "bg-brand-red text-white shadow-glow" : "text-gray-500 hover:text-white"
                                )}
                            >
                                Global
                            </Link>
                        </div>
                    </div>

                    {/* Performance Snapshot */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                        <Link href="/dashboard/training" className="group">
                            <StatCard
                                label="Entrenamientos"
                                value={workoutCount?.toString() || "0"}
                                icon={<Dumbbell className="w-4 h-4 text-brand-red" />}
                                subtext="Sesiones Totales"
                            />
                        </Link>
                        <Link href="/dashboard/community" className="group">
                            <StatCard
                                label="Rivales"
                                value={rivalsCount?.toString() || "0"}
                                icon={<Flame className="w-4 h-4 text-orange-500" />}
                                subtext="Seguidos"
                            />
                        </Link>
                        <Link href="/dashboard/leaderboard" className="group">
                            <StatCard
                                label="Racha"
                                value={workoutCount ? "1 Día" : "0"}
                                icon={<Trophy className="w-4 h-4 text-yellow-500" />}
                                subtext="Continuo"
                            />
                        </Link>
                        <Link href="/dashboard/analytics" className="group">
                            <StatCard
                                label="Rango"
                                value={profile?.level ? `Nivel ${profile.level}` : 'Recluta'}
                                icon={<TrendingUp className="w-4 h-4 text-purple-500" />}
                                subtext="Prestigio"
                            />
                        </Link>
                    </div>

                    {/* Social Feed */}
                    <div className="space-y-8">
                        {/* Stories Segment */}
                        <div>
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] ml-2 mb-4">Historias</h3>
                            <StoryBar currentUser={currentUser} />
                        </div>

                        {/* Post Creator */}
                        <CreatePost currentUser={currentUser} />

                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Actividades Recientes</h3>
                        {feedPosts && feedPosts.length > 0 ? (
                            <div className="space-y-10">
                                {feedPosts.map((post) => (
                                    <FeedPost
                                        key={post.id}
                                        postId={post.id}
                                        username={post.profiles?.username}
                                        user={post.profiles?.full_name || "Unknown Athlete"}
                                        action={post.media_type === 'class_result' ? "ha completado una sesión de clase" : post.workout_id ? "ha completado un entrenamiento" : "ha publicado una actualización"}
                                        time={formatTimeAgo(post.created_at)}
                                        avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                        image={post.media_url}
                                        initialLikes={post.likes_count || 0}
                                        hasLikedInitial={post.likes?.some((l: any) => l.user_id === currentUser?.id)}
                                        comments={post.comments_count || 0}
                                        highlight={post.workouts?.title}
                                        mediaType={post.media_type}
                                        caption={post.caption}
                                        currentUserId={currentUser?.id}
                                        authorId={post.user_id}
                                        workoutData={post.workouts}
                                        music_url={post.music_url}
                                        music_title={post.music_title}
                                        music_artist={post.music_artist}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="group relative p-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Flame className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-500 italic font-medium">Silencio en la arena. Sigue a algunos rivales para ver la acción.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-8 md:space-y-12">
                    {/* Right Sidebar (Widgets) */}

                    {/* Media Gallery */}
                    <UserMediaGallery userId={currentUser?.id} />

                    {/* Duels Widget */}
                    {duels.length > 0 && (
                        <div className="bg-black/40 border border-brand-red/20 rounded-[32px] p-5 md:p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(220,38,38,0.1)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 text-brand-red/5 group-hover:text-brand-red/10 transition-colors">
                                <Swords className="w-24 h-24 rotate-12" />
                            </div>
                            <h3 className="font-heading font-black text-foreground italic tracking-wider mb-10 flex items-center gap-3 text-lg">
                                <Swords className="w-6 h-6 text-brand-red" /> DUELOS ACTIVOS
                            </h3>
                            <div className="space-y-6">
                                {duels.map((duel) => {
                                    const isChallenger = duel.challenger_id === currentUser?.id;
                                    const rival = isChallenger ? duel.opponent : duel.challenger;
                                    const isPending = duel.status === 'pending';

                                    return (
                                        <div key={duel.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 transition-all hover:bg-white/[0.08]">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="flex -space-x-3">
                                                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/10 bg-black/40 overflow-hidden relative shrink-0">
                                                        <Image src={profile?.avatar_url || `https://ui-avatars.com/api/?name=ME`} alt="ME" fill className="object-cover" />
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-700 overflow-hidden relative">
                                                        <Image src={rival?.avatar_url || `https://ui-avatars.com/api/?name=${rival?.username}`} alt="RIVAL" fill className="object-cover" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-foreground uppercase italic truncate">VS {rival?.full_name || rival?.username}</p>
                                                    <p className="text-xs text-gray-500 uppercase font-bold mt-1">{isPending ? 'Esperando aceptación' : 'Duelo de 7 días'}</p>
                                                </div>
                                            </div>
                                            {isPending && !isChallenger && (
                                                <form action={async () => {
                                                    'use server';
                                                    await acceptDuel(duel.id);
                                                }}>
                                                    <button type="submit" className="mt-4 w-full py-3 bg-brand-red text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 active:scale-95 transition-all">
                                                        Aceptar Duelo
                                                    </button>
                                                </form>
                                            )}
                                            {!isPending && (
                                                <div className="mt-4">
                                                    <div className="flex justify-between text-xs font-black text-gray-500 uppercase tracking-widest mb-2">
                                                        <span>Mi Vol</span>
                                                        <span>Vol Rival</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                                                        <div className="h-full bg-brand-red w-1/2" />
                                                        <div className="h-full bg-white/10 w-1/2" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Dynamic Trending Athletes */}
                    <div className="bg-brand-gray/40 border border-white/10 rounded-[32px] p-5 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-brand-red/5 group-hover:text-brand-red/10 transition-colors">
                            <Trophy className="w-24 h-24 rotate-12" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="font-heading font-black text-foreground italic tracking-wider mb-10 flex items-center gap-3 text-lg">
                                <Flame className="w-6 h-6 text-brand-red" /> RIVALES A SEGUIR
                            </h3>
                            <div className="space-y-5">
                                {trendingAthletes.map((athlete) => (
                                    <div key={athlete.username} className="bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:border-brand-red/30 transition-all group/user">
                                        <SuggestedUser
                                            id={athlete.id}
                                            name={athlete.full_name || athlete.username}
                                            username={athlete.username}
                                            role={athlete.level}
                                            avatar={athlete.avatar_url}
                                            isFollowing={athlete.isFollowing}
                                        />
                                    </div>
                                ))}
                            </div>
                            <Link href="/dashboard/community" className="group/link mt-12 w-full py-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                                Entrar en la Arena Global <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Weekly Goal Progress */}
                    <div className="bg-gradient-to-br from-brand-gray to-black border border-white/10 rounded-[32px] p-5 md:p-8 relative overflow-hidden group shadow-2xl">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-10">
                                <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center border border-brand-red/20 text-brand-red">
                                    <TrendingUp className="w-8 h-8" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-foreground font-black text-2xl italic">{missionProgress} <span className="text-gray-500 text-sm not-italic font-bold uppercase ml-2">/ {missionGoal} Sesiones</span></span>
                                    <span className="text-brand-red font-black text-lg tabular-nums">{Math.min((missionProgress / missionGoal) * 100, 100).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-white/5 h-4 rounded-full overflow-hidden p-0.5 border border-white/5">
                                    <div
                                        className="bg-brand-red h-full rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(220,38,38,0.6)]"
                                        style={{ width: `${Math.min((missionProgress / missionGoal) * 100, 100)}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center mt-3">Termina la semana con fuerza para reclamar XP adicional</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, icon }: { label: string, value: string, subtext: string, icon: React.ReactNode }) {
    return (
        <div className="bg-brand-gray/40 border border-white/5 p-3 md:p-6 rounded-[24px] backdrop-blur-md hover:border-brand-red/40 hover:bg-brand-gray/60 transition-all group cursor-pointer h-full flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between mb-2 md:mb-4 gap-2">
                <div className="text-gray-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] truncate flex-1">{label}</div>
                <div className="p-1.5 md:p-2 bg-white/5 rounded-lg group-hover:scale-110 group-hover:bg-brand-red/20 transition-all shrink-0">{icon}</div>
            </div>
            <div>
                <div className={`text-xl md:text-3xl font-heading font-black text-foreground italic tracking-tighter truncate`}>{value}</div>
                <div className="text-gray-600 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60 group-hover:opacity-100 transition-opacity truncate">{subtext}</div>
            </div>
        </div>
    )
}
