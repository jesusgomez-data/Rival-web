"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Trophy, Swords, Dumbbell, Calendar, MapPin, Hash, TrendingUp, Award, Star, Lock, Image as ImageIcon, LayoutGrid, List, Activity, MessageCircle, Sunrise, Flame, MessageSquare, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import DuelButton from "../../community/DuelButton";
import FollowButton from "../../community/FollowButton";
import UserMediaGallery from "../../UserMediaGallery";
import TrophyCabinet from "./TrophyCabinet";
import FeedPost from "../../FeedPost";
import ActivityHeatmap from "@/components/ActivityHeatmap";

import { getFollows } from "../../community/follows-actions";

interface ProfileContentProps {
    profile: any;
    combatStats: any;
    user: any;
    isFollowing: boolean;
    posts: any[];
    canViewContent: boolean;
    privacy: string;
    workouts: any[];
    badges: any[];
    gear: any[];
    isAdminUser?: boolean;
}

export default function ProfileContent({ profile, combatStats, user, isFollowing, posts, canViewContent, privacy, workouts, badges, gear, isAdminUser = false }: ProfileContentProps) {
    const [mobileTab, setMobileTab] = useState<'activity' | 'gallery' | 'stats'>('activity');
    const [modalOpen, setModalOpen] = useState<'followers' | 'following' | null>(null);
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any[]>([]);
    const [loadingModal, setLoadingModal] = useState(false);

    const handleOpenModal = async (type: 'followers' | 'following') => {
        setModalOpen(type);
        setLoadingModal(true);
        setModalData([]); // clear previous data
        try {
            const data = await getFollows(profile.id, type);
            setModalData(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingModal(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-12 animate-fade-in pb-20 px-4 md:px-0">
            {/* Tactical Banner */}
            <div className={clsx(
                "relative group rounded-[40px] overflow-hidden border shadow-2xl dark-section transition-all duration-500",
                profile.is_official ? "border-brand-red/30 shadow-[0_0_50px_rgba(220,38,38,0.15)]" : "border-white/5"
            )}>
                <div className={clsx(
                    "h-48 md:h-64 relative",
                    profile.is_official ? "bg-gradient-to-br from-brand-red via-black to-red-950" : "bg-gradient-to-br from-brand-red via-black to-brand-gray"
                )}>
                    {profile.cover_url ? (
                        <>
                            <Image
                                src={profile.cover_url}
                                alt="Cover"
                                fill
                                className="object-cover"
                                style={{ objectPosition: `center ${profile.cover_position || 50}%` }}
                            />
                            {/* Red transparent overlay */}
                            <div className="absolute inset-0 bg-brand-red/10 mix-blend-multiply"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-30 grayscale mix-blend-overlay"></div>
                    )}
                    {/* Manifiesto Overlay - Compact & Top-Right */}
                    {!profile.is_official && profile.bio && (
                        <div className="absolute top-2 right-2 z-[35] md:hidden max-w-[100px]">
                            <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-2xl shadow-black/50 transition-transform duration-500">
                                <div className="flex items-center gap-1 mb-1 justify-end">
                                    <MessageSquare className="w-2 h-2 text-brand-red" />
                                    <h3 className="text-[7px] font-black text-brand-red uppercase tracking-widest text-right">Manifiesto</h3>
                                </div>
                                <p className="text-[8px] text-zinc-200 font-medium italic leading-tight line-clamp-5 text-right shadow-black drop-shadow-sm keep-white">
                                    "{profile.bio}"
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Header Content Container - FIXED LAYOUT */}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-10 z-20">
                    <div className="flex flex-col md:flex-row items-end justify-between gap-6 w-full">
                        {/* Left Side: Avatar & Info */}
                        <div className="flex items-end gap-3 md:gap-6 min-w-0 flex-1">
                            <button
                                onClick={() => setAvatarModalOpen(true)}
                                className="w-20 h-20 md:w-36 md:h-36 rounded-full border-2 md:border-8 border-black bg-brand-gray overflow-hidden relative shadow-2xl shrink-0 z-10"
                            >
                                <Image
                                    src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`}
                                    alt={profile.full_name}
                                    fill
                                    className="object-cover"
                                />
                            </button>

                            <div className="pb-1 md:pb-4 min-w-0 transform translate-y-2 md:translate-y-0 z-20">
                                <div className="mb-1">
                                    <div className="flex items-center gap-1.5 md:gap-3">
                                        <h1 className="text-xl md:text-4xl font-heading font-black text-white italic uppercase tracking-tight md:tracking-tighter truncate leading-none shadow-black drop-shadow-md max-w-[200px] md:max-w-md">
                                            {profile.full_name}
                                            {profile.is_official && (
                                                <span className="ml-2 bg-brand-red p-1 rounded-full inline-flex shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-white/20">
                                                    <Trophy className="w-3 h-3 md:w-5 md:h-5 text-white" />
                                                </span>
                                            )}
                                        </h1>
                                        {profile.level >= 5 && !profile.is_official && <Star className="w-4 h-4 md:w-6 md:h-6 text-yellow-500 fill-yellow-500 shrink-0" />}
                                    </div>
                                    <p className="text-brand-red font-black tracking-widest md:tracking-[0.3em] text-[10px] md:text-sm uppercase mt-0.5 truncate shadow-black drop-shadow-sm flex items-center gap-2">
                                        @{profile.username}
                                        {profile.is_official && <span className="text-[8px] md:text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/5">CUENTA OFICIAL</span>}
                                    </p>
                                </div>

                                {!profile.is_official && (
                                    <div className="flex gap-4 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 w-fit shadow-2xl mb-2">
                                        <button
                                            onClick={() => handleOpenModal('followers')}
                                            className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                                            disabled={!canViewContent && privacy === 'private' && !isFollowing && user?.id !== profile.id}
                                        >
                                            <span className="text-white font-black text-xs md:text-lg leading-none">{profile.followers_count || 0}</span>
                                            <span className="text-gray-400 text-[8px] md:text-xs uppercase font-bold tracking-widest">Seguidores</span>
                                        </button>
                                        <div className="w-px h-4 bg-white/10"></div>
                                        <button
                                            onClick={() => handleOpenModal('following')}
                                            className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50"
                                            disabled={!canViewContent && privacy === 'private' && !isFollowing && user?.id !== profile.id}
                                        >
                                            <span className="text-white font-black text-xs md:text-lg leading-none">{profile.following_count || 0}</span>
                                            <span className="text-gray-400 text-[8px] md:text-xs uppercase font-bold tracking-widest">Seguidos</span>
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Award className="w-3 h-3 text-brand-red" />
                                        <span className="text-[9px] text-white font-black uppercase tracking-wider">
                                            {profile.is_official ? 'Soporte' : (profile.level > 0 ? `Lvl ${profile.level}` : 'Recluta')}
                                        </span>
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-white/30"></div>
                                    <div className="flex items-center gap-1">
                                        <Dumbbell className="w-3 h-3 text-brand-red" />
                                        <span className="text-[9px] text-white font-black uppercase tracking-wider">
                                            {profile.is_official ? 'Oficial' : (profile.main_sport || 'General')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Desktop Buttons */}
                        <div className="hidden md:flex items-center gap-3 shrink-0 mb-4 h-full">
                            {user?.id !== profile.id && !profile.is_official && (
                                <>
                                    {isFollowing && (
                                        <Link
                                            href={`/dashboard/messages?userId=${profile.id}`}
                                            className="p-4 bg-black/60 border border-white/10 rounded-2xl text-white hover:bg-brand-red hover:border-brand-red hover:text-white transition-all group flex items-center gap-2 shadow-2xl backdrop-blur-xl shrink-0"
                                        >
                                            <MessageCircle className="w-5 h-5 text-brand-red group-hover:text-white transition-colors" />
                                            <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Mensaje</span>
                                        </Link>
                                    )}
                                    <div className="shrink-0">
                                        <DuelButton targetId={profile.id} isRival={isFollowing} />
                                    </div>
                                    <div className="min-w-[140px] shrink-0">
                                        <FollowButton targetId={profile.id} isFollowingInitial={isFollowing} variant="large" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* Mobile Actions Bar - Moved out of banner to prevent overlap */}
            <div className="flex md:hidden px-4 mb-2">
                {user?.id !== profile.id && !profile.is_official && (
                    <div className="flex items-center gap-3 w-full overflow-x-auto custom-scrollbar pb-2">
                        {isFollowing && (
                            <Link
                                href={`/dashboard/messages?userId=${profile.id}`}
                                className="flex-1 min-w-[100px] py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-brand-red hover:border-brand-red hover:text-white transition-all group flex justify-center items-center gap-2"
                            >
                                <MessageCircle className="w-4 h-4 text-brand-red group-hover:text-white transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Mensaje</span>
                            </Link>
                        )}
                        <div className="flex-1 min-w-[120px]">
                            <DuelButton targetId={profile.id} isRival={isFollowing} />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <FollowButton targetId={profile.id} isFollowingInitial={isFollowing} variant="large" />
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Tabs */}
            <div className="flex md:hidden border-b border-white/10 mb-4 sticky top-20 bg-black/80 backdrop-blur-xl z-40">
                <button
                    onClick={() => setMobileTab('activity')}
                    className={clsx(
                        "flex-1 py-4 flex justify-center items-center border-b-2 transition-all",
                        mobileTab === 'activity' ? "border-brand-red text-white" : "border-transparent text-gray-500"
                    )}
                >
                    <List className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setMobileTab('gallery')}
                    className={clsx(
                        "flex-1 py-4 flex justify-center items-center border-b-2 transition-all",
                        mobileTab === 'gallery' ? "border-brand-red text-white" : "border-transparent text-gray-500"
                    )}
                >
                    <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setMobileTab('stats')}
                    className={clsx(
                        "flex-1 py-4 flex justify-center items-center border-b-2 transition-all",
                        mobileTab === 'stats' ? "border-brand-red text-white" : "border-transparent text-gray-500"
                    )}
                >
                    <Activity className="w-5 h-5" />
                </button>
            </div>


            <div className="grid lg:grid-cols-12 gap-10">
                {/* Left: Trophies & Biography & Feed & Gallery */}
                <div className="lg:col-span-8 space-y-10">

                    {!canViewContent ? (
                        <div className="bg-brand-gray/30 border border-white/5 p-12 rounded-[40px] backdrop-blur-xl text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase">Esta Cuenta es Privada</h3>
                            <p className="text-gray-400 max-w-sm mx-auto">Sigue a este atleta para ver sus fotos, videos e historial de entrenamiento.</p>
                            {user?.id !== profile.id && (
                                <div className="pt-4">
                                    <FollowButton targetId={profile.id} isFollowingInitial={isFollowing} variant="large" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* GALLERY TAB */}
                            <div className={clsx(mobileTab !== 'gallery' && "hidden md:block")}>
                                <div className="md:mb-10">
                                    <UserMediaGallery userId={profile.id} />
                                </div>
                            </div>

                            {/* ACTIVITY TAB (Contains Bio, Trophy Cabinet, Feed) */}
                            <div className={clsx(mobileTab !== 'activity' && "hidden md:block")}>
                                {/* Bio Card */}
                                <div className="hidden md:block bg-brand-gray/30 border border-white/5 p-8 rounded-[40px] backdrop-blur-xl mb-10">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                        {profile.is_official ? 'Comunicado Oficial' : 'Manifiesto del Atleta'}
                                    </h3>
                                    <p className="text-lg text-gray-300 leading-relaxed italic whitespace-pre-wrap">
                                        "{profile.bio || (profile.is_official ? 'Canal oficial de comunicación de Rival Fit.' : 'Este atleta aún no ha escrito su manifiesto. Sus acciones hablan más que las palabras.')}"
                                    </p>
                                </div>

                                {/* Badges Section */}
                                {!profile.is_official && badges.length > 0 && (
                                    <div className="mb-10 animate-fade-in">
                                        <div className="flex items-center justify-between mb-6 ml-4">
                                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-2">
                                                <Award className="w-4 h-4 text-brand-red" /> Medallas y Logros
                                            </h3>
                                            <span className="text-[10px] font-black text-brand-red bg-brand-red/10 px-3 py-1 rounded-full border border-brand-red/20 shadow-glow uppercase tracking-widest leading-none">
                                                {badges.length} Desbloqueados
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                                            {badges.map((ub: any) => (
                                                <div key={ub.id} className="bg-brand-gray/30 border border-white/5 p-4 rounded-3xl backdrop-blur-xl relative overflow-hidden group hover:border-brand-red/30 transition-all duration-500 hover:scale-105">
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-brand-red/5 blur-2xl -mr-8 -mt-8 group-hover:bg-brand-red/10 transition-colors" />
                                                    <div className="w-12 h-12 bg-black/40 rounded-2xl flex items-center justify-center mb-3 border border-white/5 group-hover:border-brand-red/50 group-hover:shadow-glow transition-all">
                                                        {ub.badges.icon_name === 'Sunrise' && <Sunrise className="w-6 h-6 text-brand-red" />}
                                                        {ub.badges.icon_name === 'Flame' && <Flame className="w-6 h-6 text-orange-500" />}
                                                        {ub.badges.icon_name === 'Award' && <Award className="w-6 h-6 text-yellow-500" />}
                                                        {ub.badges.icon_name === 'MessageSquare' && <MessageSquare className="w-6 h-6 text-blue-500" />}
                                                        {ub.badges.icon_name === 'Trophy' && <Trophy className="w-6 h-6 text-brand-red" />}
                                                    </div>
                                                    <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-1 leading-tight">{ub.badges.name}</h4>
                                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tight line-clamp-2 leading-tight">{ub.badges.description}</p>
                                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                                        <span className="text-[7px] text-brand-red font-black tracking-widest">+{ub.badges.xp_reward} XP</span>
                                                        <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest">{new Date(ub.awarded_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Trophy Cabinet */}
                                {!profile.is_official && (
                                    <div className="mb-10">
                                        <TrophyCabinet combatStats={combatStats} profileLevel={profile.level} />
                                    </div>
                                )}

                                {/* Activity Feed */}
                                <div className="pt-0 md:pt-8">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mb-6 ml-4 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" /> Feed de Actividad
                                    </h3>

                                    {posts.length > 0 ? (
                                        <div className="space-y-6">
                                            {posts.map((post: any) => {
                                                const hasLiked = post.likes && post.likes.some((l: any) => l.user_id === user?.id);
                                                const commentsCount = post.comments && post.comments[0] ? post.comments[0].count : 0;

                                                // Determine action text
                                                let action = "publicó una actualización";
                                                if (post.workouts) action = `completó ${post.workouts.title}`;
                                                else if (post.media_url) action = post.media_type === 'video' ? "compartió un video" : "compartió una foto";

                                                return (
                                                    <FeedPost
                                                        key={post.id}
                                                        postId={post.id}
                                                        username={post.profiles?.username}
                                                        user={post.profiles?.full_name || post.profiles?.username || 'Atleta'}
                                                        action={action}
                                                        time={new Date(post.created_at).toLocaleDateString()}
                                                        avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                                        image={post.media_url}
                                                        mediaType={post.media_type}
                                                        initialLikes={post.likes ? post.likes.length : 0}
                                                        hasLikedInitial={!!hasLiked}
                                                        comments={commentsCount}
                                                        caption={post.caption}
                                                        highlight={post.workouts ? `Entrenamiento Completado` : undefined}
                                                        workoutData={post.workouts}
                                                        music_url={post.music_url}
                                                        music_title={post.music_title}
                                                        music_artist={post.music_artist}
                                                        isOfficial={profile.is_official}
                                                        isAdminUser={isAdminUser}
                                                        currentUserId={user?.id}
                                                        authorId={post.user_id}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[32px]">
                                            <p className="text-gray-500 italic">No hay actividad pública aún.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right: Combat History & Stats */}
                <div className={clsx("lg:col-span-4 space-y-8", mobileTab !== 'stats' && "hidden lg:block")}>
                    {/* Simplified or blurred stats if private could be done here, but requirement implied strict privacy */}
                    {canViewContent ? (
                        <>
                            {/* Combat Record Card */}
                            {!profile.is_official && (
                                <div className="bg-black/60 border border-brand-red/20 rounded-[40px] p-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 text-brand-red/5 group-hover:text-brand-red/10 transition-colors">
                                        <Swords className="w-32 h-32 rotate-12" />
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="font-heading font-black text-white italic tracking-wider mb-8 flex items-center gap-3">
                                            <TrendingUp className="w-5 h-5 text-brand-red" /> REGISTRO DE COMBATE
                                        </h3>

                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center mb-8">
                                                <div className="text-center flex-1">
                                                    <p className="text-3xl font-black text-white italic">{combatStats.wins}</p>
                                                    <p className="text-[8px] font-black uppercase text-green-500 tracking-widest mt-1">Victorias</p>
                                                </div>
                                                <div className="h-10 w-px bg-white/5" />
                                                <div className="text-center flex-1">
                                                    <p className="text-3xl font-black text-white italic">{combatStats.losses}</p>
                                                    <p className="text-[8px] font-black uppercase text-brand-red tracking-widest mt-1">Derrotas</p>
                                                </div>
                                                <div className="h-10 w-px bg-white/5" />
                                                <div className="text-center flex-1">
                                                    <p className="text-3xl font-black text-white italic">{combatStats.draws}</p>
                                                    <p className="text-[8px] font-black uppercase text-gray-500 tracking-widest mt-1">Empates</p>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-white/5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Win Rate</span>
                                                    <span className="text-white font-black italic">{combatStats.total > 0 ? ((combatStats.wins / combatStats.total) * 100).toFixed(0) : 0}%</span>
                                                </div>
                                                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-brand-red h-full rounded-full transition-all duration-1000"
                                                        style={{ width: `${combatStats.total > 0 ? (combatStats.wins / combatStats.total) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Activity Heatmap */}
                            {!profile.is_official && (
                                <ActivityHeatmap workouts={workouts} />
                            )}

                            {/* Vitals Card */}
                            <div className="bg-brand-gray/30 border border-white/10 rounded-[40px] p-8 backdrop-blur-md">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">
                                    {profile.is_official ? 'Información de la App' : 'Vitales del Atleta'}
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            {profile.is_official ? <Trophy className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                                            <span className="text-[10px] font-black uppercase">{profile.is_official ? 'Estatus' : 'Rango'}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">
                                            {profile.is_official ? 'SOPORTE OFICIAL' : (profile.level > 0 ? `SOLDADO Lvl ${profile.level}` : 'RECLUTA')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            {profile.is_official ? <Activity className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                                            <span className="text-[10px] font-black uppercase">{profile.is_official ? 'Versión' : 'Disciplina'}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{profile.is_official ? 'v2.4.0' : (profile.main_sport || 'Multi-Deporte')}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            <MapPin className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase text-brand-red">{profile.is_official ? 'HQ' : 'Sede'}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{profile.is_official ? 'RIVAL HQ' : (profile.gym_home || 'Agente de Campo')}</span>
                                    </div>
                                    {!profile.is_official && (
                                        <div className="flex items-center justify-between py-2 border-b border-white/5">
                                            <div className="flex items-center gap-3 text-brand-red italic">
                                                <Calendar className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase text-brand-red">Edad</span>
                                            </div>
                                            <span className="text-xs font-bold text-white">
                                                {profile.birth_date_public ? (
                                                    profile.birth_date ? `${Math.floor((new Date().getTime() - new Date(profile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} años` : '---'
                                                ) : (
                                                    <span className="text-gray-600 flex items-center gap-1"><Lock className="w-3 h-3" /> Privado</span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase text-brand-red">{profile.is_official ? 'Fundada' : 'Alistado'}</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{new Date(profile.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Gear Card */}


                            {/* Featured RMs Card */}
                            {profile.featured_rms && profile.featured_rms.length > 0 && (
                                <div className="bg-brand-gray/30 border border-white/10 rounded-[40px] p-8 backdrop-blur-md">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Récords Personales</h3>
                                    <div className="space-y-4">
                                        {profile.featured_rms.map((rm: any) => (
                                            <div key={rm.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red shrink-0">
                                                        <Dumbbell className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[11px] md:text-xs font-black uppercase text-gray-300 tracking-wide">{rm.exercise}</span>
                                                </div>
                                                <span className="text-sm md:text-base font-black text-white italic">{rm.weight} {rm.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-brand-gray/30 border border-white/5 rounded-[40px] p-8 backdrop-blur-md opacity-50 grayscale select-none">
                            <p className="text-center text-xs font-black uppercase text-gray-500 tracking-widest">Estadísticas Bloqueadas</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Avatar Fullscreen Modal */}
            {
                avatarModalOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in"
                        onClick={() => setAvatarModalOpen(false)}
                    >
                        <button
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-10"
                            onClick={() => setAvatarModalOpen(false)}
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <div
                            className="relative w-full max-w-2xl aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <Image
                                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`}
                                alt={profile.full_name}
                                fill
                                className="object-contain bg-black"
                            />
                        </div>
                    </div>
                )
            }

            {/* Simple Modal for Followers/Following */}
            {
                modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(null)}>
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <h3 className="text-white font-heading font-black italic uppercase tracking-wider text-lg">
                                    {modalOpen === 'followers' ? 'Seguidores' : 'Seguidos'}
                                </h3>
                                <button onClick={() => setModalOpen(null)} className="text-gray-400 hover:text-white transition-colors">
                                    <Swords className="w-5 h-5 rotate-45" /> {/* Just using X icon logic if available or fallback */}
                                    <span className="text-2xl leading-none">&times;</span>
                                </button>
                            </div>

                            <div className="overflow-y-auto p-4 space-y-2 flex-1 scrollbar-hide">
                                {loadingModal ? (
                                    <div className="flex justify-center py-8">
                                        <Activity className="w-8 h-8 text-brand-red animate-spin" />
                                    </div>
                                ) : modalData.length > 0 ? (
                                    modalData.map((person) => (
                                        <Link
                                            key={person.id}
                                            href={`/dashboard/profile/${person.username}`}
                                            className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group border border-transparent hover:border-white/5"
                                            onClick={() => setModalOpen(null)}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-brand-gray overflow-hidden relative border border-white/10">
                                                <Image
                                                    src={person.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.full_name || 'User')}&background=random`}
                                                    alt={person.full_name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm leading-tight group-hover:text-brand-red transition-colors">{person.full_name}</p>
                                                <p className="text-gray-500 text-xs font-medium">@{person.username}</p>
                                            </div>
                                            {person.level > 0 && (
                                                <div className="ml-auto bg-brand-red/10 px-2 py-0.5 rounded text-[9px] font-black text-brand-red uppercase tracking-wider">
                                                    Lvl {person.level}
                                                </div>
                                            )}
                                        </Link>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 italic text-sm">No hay usuarios en esta lista aún.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
