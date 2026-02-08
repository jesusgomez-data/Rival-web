"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Trophy, Swords, Dumbbell, Calendar, MapPin, Hash, TrendingUp, Award, Star, Lock, Image as ImageIcon, LayoutGrid, List, Activity } from "lucide-react";
import Image from "next/image";
import DuelButton from "../../community/DuelButton";
import FollowButton from "../../community/FollowButton";
import UserMediaGallery from "../../UserMediaGallery";
import TrophyCabinet from "./TrophyCabinet";
import FeedPost from "../../FeedPost";

interface ProfileContentProps {
    profile: any;
    combatStats: any;
    user: any;
    isFollowing: boolean;
    posts: any[];
    canViewContent: boolean;
    privacy: string;
}

export default function ProfileContent({ profile, combatStats, user, isFollowing, posts, canViewContent, privacy }: ProfileContentProps) {
    const [mobileTab, setMobileTab] = useState<'activity' | 'gallery' | 'stats'>('activity');

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-12 animate-fade-in pb-20">
            {/* Tactical Banner */}
            <div className="relative group rounded-[40px] overflow-hidden border border-white/5 shadow-2xl dark-section">
                <div className="h-48 md:h-64 bg-gradient-to-br from-brand-red via-black to-brand-gray relative">
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
                    {/* Mobile Follow Button - Top Right Overlay */}
                    {user?.id !== profile.id && (
                        <div className="absolute top-4 right-4 z-30 md:hidden">
                            <FollowButton targetId={profile.id} isFollowingInitial={isFollowing} />
                        </div>
                    )}
                    {/* Manifiesto Overlay - Mobile Only - Bottom Right */}
                    <div className="absolute bottom-4 right-2 z-10 md:hidden max-w-[120px]">
                        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-lg">
                            <h3 className="text-[6px] font-black text-brand-red uppercase tracking-widest mb-0.5 text-right">Manifiesto</h3>
                            <p className="text-[8px] text-gray-100 italic leading-tight line-clamp-3 text-right">
                                "{profile.bio || '...'}"
                            </p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 z-20">
                    <div className="flex items-end gap-3 md:gap-6 relative">
                        <div className="w-20 h-20 md:w-40 md:h-40 rounded-full border-2 md:border-8 border-black bg-brand-gray overflow-hidden relative shadow-2xl shrink-0 transform translate-y-4 md:translate-y-0 -left-1 md:left-0 z-10">
                            <Image
                                src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`}
                                alt={profile.full_name}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="pb-1 md:pb-4 min-w-0 transform translate-y-2 md:translate-y-0 z-20 w-auto mr-auto">
                            <div className="flex items-center gap-1.5 md:gap-3">
                                <h1 className="text-lg md:text-4xl font-heading font-black text-white italic uppercase tracking-tight md:tracking-tighter truncate leading-none shadow-black drop-shadow-md">{profile.full_name}</h1>
                                {profile.level >= 5 && <Star className="w-4 h-4 md:w-6 md:h-6 text-yellow-500 fill-yellow-500 shrink-0" />}
                            </div>
                            <p className="text-brand-red font-black tracking-widest md:tracking-[0.3em] text-[10px] md:text-sm uppercase mt-0.5 truncate shadow-black drop-shadow-sm">@{profile.username}</p>

                            {/* Mobile Stats Summary */}
                            <div className="block md:hidden mt-2 space-y-2 w-max max-w-[180px] relative z-0">
                                {/* Mini Vitals */}
                                <div className="flex flex-wrap gap-1.5 text-[7px] font-bold text-gray-400">
                                    <span className="bg-black/40 px-1.5 py-0.5 rounded border border-white/5 flex items-center gap-1">
                                        <TrendingUp className="w-2 h-2 text-brand-red" /> {profile.level > 0 ? `Lvl ${profile.level}` : 'Recluta'}
                                    </span>
                                    <span className="bg-black/40 px-1.5 py-0.5 rounded border border-white/5 flex items-center gap-1">
                                        <Dumbbell className="w-2 h-2 text-brand-red" /> {profile.main_sport || 'General'}
                                    </span>
                                </div>
                            </div>

                            {privacy === 'private' && (
                                <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-white/5 rounded-full w-fit border border-white/10">
                                    <Lock className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cuenta Privada</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pb-2 pl-20 md:pl-0 md:pb-4 md:gap-3">
                        {user?.id !== profile.id && (
                            <>
                                <DuelButton targetId={profile.id} isRival={isFollowing} />
                                <div className="hidden md:block w-36">
                                    <FollowButton targetId={profile.id} isFollowingInitial={isFollowing} variant="large" />
                                </div>
                            </>
                        )}
                    </div>
                </div>
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
                                        Manifiesto del Atleta
                                    </h3>
                                    <p className="text-lg text-gray-300 leading-relaxed italic whitespace-pre-wrap">
                                        "{profile.bio || 'Este atleta aún no ha escrito su manifiesto. Sus acciones hablan más que las palabras.'}"
                                    </p>
                                </div>

                                {/* Trophy Cabinet */}
                                <div className="mb-10">
                                    <TrophyCabinet combatStats={combatStats} profileLevel={profile.level} />
                                </div>

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
                                                        highlight={post.workouts ? `Entrenamiento Completado` : undefined}
                                                        workoutData={post.workouts}
                                                        music_url={post.music_url}
                                                        music_title={post.music_title}
                                                        music_artist={post.music_artist}
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

                            {/* Vitals Card */}
                            <div className="bg-brand-gray/30 border border-white/10 rounded-[40px] p-8 backdrop-blur-md">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Vitales del Atleta</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            <Hash className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Rango</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{profile.level > 0 ? `SOLDADO Lvl ${profile.level}` : 'RECLUTA'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            <Dumbbell className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Disciplina</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{profile.main_sport || 'Multi-Deporte'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            <MapPin className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Sede</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{profile.gym_home || 'Agente de Campo'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-3 text-brand-red italic">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase">Alistado</span>
                                        </div>
                                        <span className="text-xs font-bold text-white">{new Date(profile.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

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
        </div>
    );
}
