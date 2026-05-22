"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { Trophy, Swords, ShieldCheck, Dumbbell, Calendar, MapPin, Hash, TrendingUp, Award, Star, Lock, Image as ImageIcon, LayoutGrid, List, Activity, MessageCircle, Sunrise, Flame, X, MessageSquare, Edit2, Globe, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import DuelButton from "../../community/DuelButton";
import FollowButton from "../../community/FollowButton";
import UserMediaGallery from "../../UserMediaGallery";
import TrophyCabinet from "./TrophyCabinet";
import FeedPost from "../../FeedPost";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import InfoTooltip from "@/components/InfoTooltip";

import { getFollows } from "../../community/follows-actions";
import StoryBar from "../../stories/StoryBar";
import MedalShelf from "./MedalShelf";
import VerifiedBadge from "@/components/VerifiedBadge";

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
    hasActiveDuel?: boolean;
    medals?: any[];
}

export default function ProfileContent({ profile, combatStats, user, isFollowing, posts, canViewContent, privacy, workouts, badges, gear, isAdminUser = false, hasActiveDuel = false, medals = [] }: ProfileContentProps) {
    const [mobileTab, setMobileTab] = useState<'activity' | 'gallery' | 'stats'>('activity');
    const [modalOpen, setModalOpen] = useState<'followers' | 'following' | null>(null);
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any[]>([]);
    const [loadingModal, setLoadingModal] = useState(false);

    const handleOpenModal = async (type: 'followers' | 'following') => {
        setModalOpen(type);
        setLoadingModal(true);
        setModalData([]);
        try {
            const data = await getFollows(profile.id, type);
            setModalData(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingModal(false);
        }
    };

    const stats = {
        wods: profile.is_official ? (posts || []).filter(p => p.media_type === 'wod').length : workouts.length,
        prs: profile.is_official ? (posts || []).length : (((posts || []).filter(p => p.media_type === 'pr').length) + (profile.featured_rms?.length || 0)),
        retos: combatStats.total,
        followers: profile.followers_count
    };

    const scrollToSection = (id: string, tab?: 'activity' | 'gallery' | 'stats') => {
        if (tab) setMobileTab(tab);
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-12 animate-fade-in pb-20 px-0 md:px-4">
            <StoryBar currentUser={user} hideBar={true} />
            
            {/* New Premium Profile Header - Matched to Mockup */}
            <section className="glass-dark border border-white/10 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 lg:p-12 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 relative overflow-hidden mb-8 shadow-2xl">
                {/* Background Ambience */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-red/10 blur-[120px] -mr-40 -mt-40 rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-orange/5 blur-[100px] -ml-20 -mb-20 rounded-full pointer-events-none" />
                
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none hidden md:block">
                    <Activity className="w-64 h-64 text-brand-red" />
                </div>
                
                {/* Avatar */}
                <div className="relative group shrink-0 mt-2">
                    <div className="absolute -inset-2 bg-gradient-to-tr from-brand-red to-brand-orange rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />
                    <button 
                        onClick={() => setAvatarModalOpen(true)}
                        className="relative w-28 h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full border-4 border-[#020202] overflow-hidden bg-black z-10 transition-transform active:scale-95 shadow-glow-red"
                    >
                        {profile.avatar_url ? (
                            <Image
                                src={profile.avatar_url}
                                alt={profile.full_name}
                                fill
                                className={clsx(
                                    profile.is_official ? "object-contain p-2 md:p-3 bg-white" : "object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                )}
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-2xl md:text-4xl font-black text-white italic">
                                {profile.full_name?.charAt(0)}
                            </div>
                        )}
                    </button>
                    {profile.is_official ? (
                        <div className="absolute bottom-1 right-1 w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#020202] shadow-[0_0_15px_rgba(59,130,246,0.5)] z-20">
                            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-white" />
                        </div>
                    ) : (
                        <div className="absolute bottom-1 right-1 w-6 h-6 md:w-8 md:h-8 bg-brand-red rounded-full flex items-center justify-center border-2 border-[#020202] shadow-glow-red z-20">
                            <Activity className="w-3 h-3 md:w-4 md:h-4 text-white fill-white" />
                        </div>
                    )}
                </div>

                {/* Info & Stats */}
                <div className="flex-1 space-y-6 text-center md:text-left relative z-10 w-full">
                    <div className="space-y-2">
                        <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 md:gap-3">
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black italic uppercase tracking-tighter text-white">
                                {profile.full_name}
                            </h1>
                            {!profile.is_official && (
                                <span className="glass px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black tracking-widest text-brand-red uppercase border-brand-red/30 shadow-glow-red">
                                    Pro
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2 text-brand-red font-black tracking-[0.2em] text-[9px] md:text-[10px] uppercase flex-wrap">
                            @{profile.username}
                            <span className="text-gray-600">•</span>
                            <span className="text-white/70 flex items-center gap-1 border border-white/10 bg-white/5 px-2 py-0.5 rounded-md">
                                <Activity className="w-3 h-3 text-brand-red" />
                                {profile.is_official ? 'PLATAFORMA OFICIAL' : (profile.main_sport || 'CROSS TRAINING')}
                            </span>
                            {profile.location && (
                                <>
                                    <span className="text-gray-600">•</span>
                                    <span className="text-white/50 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {profile.location}
                                    </span>
                                </>
                            )}
                        </div>
                        {profile.website && (
                             <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                                 target="_blank" rel="noopener noreferrer"
                                 className="inline-flex items-center justify-center md:justify-start gap-1 text-[9px] text-brand-red/80 font-bold uppercase tracking-wider hover:text-brand-red transition-colors mt-1">
                                 <Globe className="w-3 h-3" /> {profile.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                             </a>
                         )}
                    </div>

                    {/* Integrated Stats (Like Mockup) */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                        <button onClick={() => scrollToSection('activity-feed', 'activity')} className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-white/5 text-center flex-1 md:flex-none min-w-[80px] hover:border-brand-red/30 transition-colors cursor-pointer">
                            <div className="text-xl md:text-2xl font-black italic text-white">{stats.wods}</div>
                            <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40">WODs</div>
                        </button>
                        <button onClick={() => scrollToSection('personal-records', 'stats')} className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-white/5 text-center flex-1 md:flex-none min-w-[80px] hover:border-brand-red/30 transition-colors cursor-pointer">
                            <div className="text-xl md:text-2xl font-black italic text-brand-red">{stats.prs}</div>
                            <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40">PRs</div>
                        </button>
                        <button onClick={() => handleOpenModal('followers')} className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-white/5 text-center flex-1 md:flex-none min-w-[80px] hover:border-brand-red/30 transition-colors cursor-pointer">
                            <div className="text-xl md:text-2xl font-black italic text-brand-orange">{stats.followers}</div>
                            <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40">Seguidores</div>
                        </button>
                        {!profile.is_official && (
                            <button onClick={() => handleOpenModal('following')} className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-white/5 text-center flex-1 md:flex-none min-w-[80px] hover:border-brand-red/30 transition-colors cursor-pointer">
                                <div className="text-xl md:text-2xl font-black italic text-white/80">{profile.following_count || 0}</div>
                                <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40">Siguiendo</div>
                            </button>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 pt-2 w-full">
                        {(user?.id === profile.id || (isAdminUser && profile.is_official)) ? (
                            <Link href="/dashboard/profile" className="w-full sm:w-auto bg-brand-red text-white px-5 md:px-6 py-2.5 md:py-3 font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] btn-sport-tech hover:bg-brand-accent transition-colors text-center shadow-glow-red rounded-xl">
                                <span className="skew-x-[10deg] block">Editar Perfil</span>
                            </Link>
                        ) : !profile.is_official ? (
                            <div className="flex w-full sm:w-auto gap-2">
                                {/* Botones de Seguir y Retar conectados y funcionando */}
                                <div className="flex-1 sm:flex-none"><FollowButton targetId={profile.id} isFollowingInitial={isFollowing} /></div>
                                <div className="flex-1 sm:flex-none"><DuelButton targetId={profile.id} isRival={isFollowing} hasActiveDuel={hasActiveDuel} /></div>
                                {isFollowing && (
                                     <Link href={`/dashboard/messages?userId=${profile.id}`}
                                         className="flex-1 sm:flex-none p-2 md:p-2.5 bg-white/5 border border-white/10 rounded-xl text-brand-red hover:bg-brand-red hover:text-white transition-all flex items-center justify-center shadow-lg">
                                         <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                                     </Link>
                                 )}
                            </div>
                        ) : null}
                    </div>
                </div>
            </section>

            {/* Bio / Manifiesto — IMPROVED FOR OFFICIAL */}
            {profile.is_official ? (
                 <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 md:p-12 backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-white/[0.02] pointer-events-none">
                        <ShieldCheck className="w-48 h-48 -rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-[10px] font-black text-brand-red uppercase tracking-[0.6em] mb-6 flex items-center gap-2 opacity-80">
                            <ShieldCheck className="w-3 h-3" /> COMUNICADO OFICIAL
                        </h3>
                        <div className="space-y-4 max-w-3xl">
                            <p className="text-lg md:text-2xl font-bold text-gray-200 leading-relaxed italic tracking-tight whitespace-pre-wrap">
                                {profile.bio || "Bienvenidos a la plataforma oficial de Rival Fit. Aquí encontrarás toda la información, retos y motivación para llevar tu entrenamiento al siguiente nivel."}
                            </p>
                            <div className="h-0.5 w-12 bg-brand-red/40 rounded-full" />
                        </div>
                    </div>
                </div>
            ) : profile.bio ? (
                <div className="px-4 md:px-0">
                    <p className="text-sm md:text-base text-gray-300 font-medium italic leading-relaxed border-l-2 border-brand-red/60 pl-4 py-1 whitespace-pre-wrap">
                        {profile.bio}
                    </p>
                </div>
            ) : null}


            {/* Medal Shelf — mobile */}
            {medals && medals.length > 0 && (
                <div className="px-1 pt-1">
                    <MedalShelf medals={medals} />
                </div>
            )}

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
                            <div className={clsx(mobileTab !== 'gallery' && "hidden md:block")}>
                                <div className="md:mb-10">
                                    <UserMediaGallery userId={profile.id} />
                                </div>
                            </div>

                            <div className={clsx(mobileTab !== 'activity' && "hidden md:block")}>
                                {/* Competition Medal Shelf */}
                                {!profile.is_official && medals && medals.length > 0 && (
                                    <div className="mb-10 bg-brand-gray/30 border border-white/5 p-6 rounded-[32px] backdrop-blur-xl">
                                        <MedalShelf medals={medals} />
                                    </div>
                                )}

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
                                        <h3 className="font-heading font-black text-white italic tracking-wider mb-6 flex items-center gap-3 ml-4">
                                            <Trophy className="w-5 h-5 text-yellow-500" /> VITRINA DE TROFEOS
                                        </h3>
                                        <TrophyCabinet combatStats={combatStats} profileLevel={profile.level} />
                                    </div>
                                )}

                                {/* Feed de Actividad */}
                                <div id="activity-feed" className="pt-0 md:pt-8">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.4em] mb-6 ml-4 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" /> Feed de Actividad
                                    </h3>

                                    {posts.length > 0 ? (
                                        <div className="space-y-6">
                                            {posts.map((post: any) => (
                                                <FeedPost
                                                    key={post.id}
                                                    postId={post.id}
                                                    username={post.profiles?.username}
                                                    user={post.profiles?.full_name || post.profiles?.username || 'Atleta'}
                                                    action={post.workouts ? `completó ${post.workouts.title}` : "publicó una actualización"}
                                                    time={new Date(post.created_at).toLocaleDateString()}
                                                    avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                                    image={post.media_url}
                                                    mediaType={post.media_type}
                                                    initialLikes={post.likes ? post.likes.length : 0}
                                                    hasLikedInitial={post.likes?.some((l: any) => l.user_id === user?.id)}
                                                    comments={post.comments ? post.comments[0]?.count : 0}
                                                    caption={post.caption}
                                                    workoutData={post.workouts}
                                                    music_url={post.music_url}
                                                    isAdminUser={isAdminUser}
                                                    currentUserId={user?.id}
                                                    authorId={post.user_id}
                                                />
                                            ))}
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

                <div className={clsx("lg:col-span-4 space-y-8", mobileTab !== 'stats' && "hidden md:block")}>
                    {canViewContent && (
                        <>
                            {!profile.is_official ? (
                                <>
                                    <div id="combat-history" className="bg-black/60 border border-brand-red/20 rounded-[40px] p-8 relative overflow-hidden group shadow-2xl shadow-brand-red/5">
                                        <div className="absolute top-0 right-0 p-8 text-brand-red/5 group-hover:text-brand-red/10 transition-colors">
                                            <Swords className="w-32 h-32 rotate-12" />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="font-heading font-black text-white italic tracking-wider mb-8 flex items-center gap-3">
                                                <TrendingUp className="w-5 h-5 text-brand-red" /> REGISTRO DE COMBATE
                                            </h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="text-center">
                                                    <p className="text-3xl font-black text-white italic">{combatStats.wins}</p>
                                                    <p className="text-[8px] font-black uppercase text-green-500 tracking-widest mt-1">Wins</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-3xl font-black text-white italic">{combatStats.losses}</p>
                                                    <p className="text-[8px] font-black uppercase text-brand-red tracking-widest mt-1">Losses</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-3xl font-black text-white italic">{combatStats.draws}</p>
                                                    <p className="text-[8px] font-black uppercase text-gray-500 tracking-widest mt-1">Draws</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <ActivityHeatmap workouts={workouts} userId={profile.id} />
                                    
                                    {/* Featured RMs / PRs Section */}
                                    {profile.featured_rms && profile.featured_rms.length > 0 && (
                                        <div id="personal-records" className="bg-brand-gray/30 border border-white/10 rounded-[40px] p-8 backdrop-blur-md animate-fade-in">
                                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                                <Dumbbell className="w-4 h-4 text-brand-red" /> RÉCORDS PERSONALES (PRs)
                                            </h3>
                                            <div className="space-y-4">
                                                {profile.featured_rms.map((rm: any) => (
                                                    <div key={rm.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2 group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red shrink-0 group-hover:scale-110 transition-transform">
                                                                <Dumbbell className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-[11px] md:text-xs font-black uppercase text-gray-300 tracking-wide">{rm.exercise}</span>
                                                        </div>
                                                        <span className="text-sm md:text-base font-black text-white italic tracking-tighter">{rm.weight} {rm.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="bg-gradient-to-br from-brand-red/10 to-purple-600/10 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl relative overflow-hidden group">
                                    <div className="absolute -right-8 -top-8 w-32 h-32 text-brand-red opacity-10 group-hover:rotate-12 transition-transform duration-700">
                                        <Activity className="w-full h-full" />
                                    </div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                                        Explora el Ecosistema
                                    </h3>
                                    <ul className="space-y-4">
                                        <li className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-brand-red/30 transition-all cursor-pointer">
                                            <LayoutGrid className="w-4 h-4 text-brand-red" />
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">WODs del Día</span>
                                        </li>
                                        <li className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-brand-red/30 transition-all cursor-pointer">
                                            <Trophy className="w-4 h-4 text-purple-500" />
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Retos Globales</span>
                                        </li>
                                        <li className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-brand-red/30 transition-all cursor-pointer">
                                            <TrendingUp className="w-4 h-4 text-green-500" />
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ranking Élite</span>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modales */}
            {avatarModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in" onClick={() => setAvatarModalOpen(false)}>
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors" onClick={() => setAvatarModalOpen(false)}>
                        <X className="w-8 h-8" />
                    </button>
                    <div className="relative w-full max-w-2xl aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <Image src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`} alt={profile.full_name} fill className="object-contain bg-black" />
                    </div>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(null)}>
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h3 className="text-white font-heading font-black italic uppercase tracking-wider text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-brand-red" />
                                {modalOpen === 'followers' ? 'Seguidores' : 'Siguiendo'}
                            </h3>
                            <button onClick={() => setModalOpen(null)} className="text-gray-400 hover:text-white transition-colors text-2xl">&times;</button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-1 scrollbar-hide">
                            {loadingModal ? (
                                <div className="flex justify-center py-8"><Activity className="w-8 h-8 text-brand-red animate-spin" /></div>
                            ) : modalData.length > 0 ? (
                                modalData.map((person) => (
                                    <Link key={person.id} href={`/dashboard/profile/${person.username}`} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group" onClick={() => setModalOpen(null)}>
                                        <div className="w-10 h-10 rounded-full bg-brand-gray overflow-hidden relative border border-white/10">
                                            <Image src={person.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.full_name || 'User')}&background=random`} alt={person.full_name} fill className="object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm group-hover:text-brand-red transition-colors">{person.full_name}</p>
                                            <p className="text-gray-500 text-xs">@{person.username}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12"><p className="text-gray-500 italic text-sm">No hay usuarios en esta lista aún.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

