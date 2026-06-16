"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { Trophy, Swords, ShieldCheck, Dumbbell, Calendar, MapPin, Hash, TrendingUp, Award, Star, Lock, Image as ImageIcon, LayoutGrid, List, Activity, MessageCircle, Sunrise, Flame, X, MessageSquare, Edit2, Globe, Users, Plus, ArrowRight, Play, Loader2, CheckCircle, AlertTriangle, ChevronLeft } from "lucide-react";
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
import { createClient } from "@/utils/supabase/client";
import { createNotification } from "../../notifications-actions";

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

export default function ProfileContent({ profile, combatStats, user, isFollowing: isFollowingProp, posts, canViewContent, privacy, workouts, badges, gear, isAdminUser = false, hasActiveDuel = false, medals = [] }: ProfileContentProps) {
    const router = useRouter();
    const [following, setFollowing] = useState(isFollowingProp);

    // Sync server-side value on navigation (handles Next.js page cache)
    useEffect(() => { setFollowing(isFollowingProp); }, [isFollowingProp]);

    const [mobileTab, setMobileTab] = useState<'activity' | 'gallery' | 'stats' | 'calendar'>('activity');
    const [modalOpen, setModalOpen] = useState<'followers' | 'following' | null>(null);
    const [avatarModalOpen, setAvatarModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any[]>([]);
    const [loadingModal, setLoadingModal] = useState(false);

    // Profile Calendar State
    const [scheduledWorkouts, setScheduledWorkouts] = useState<any[]>([]);
    const [loadingCalendar, setLoadingCalendar] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function fetchCalendar() {
            if (!user) return;
            setLoadingCalendar(true);
            try {
                // Anyone can view the scheduled workouts of the profile owner,
                // but security: only query profile owner's workouts.
                const { data, error } = await supabase
                    .from('scheduled_workouts')
                    .select('*')
                    .eq('user_id', profile.id)
                    .order('scheduled_date', { ascending: true });
                if (!error && data) {
                    setScheduledWorkouts(data);
                }
            } catch (err) {
                console.error("Error fetching calendar:", err);
            } finally {
                setLoadingCalendar(false);
            }
        }
        fetchCalendar();
    }, [profile.id, user]);

    const handleDiscardWorkout = async (workout: any) => {
        if (!user || user.id !== profile.id) return;
        if (!confirm(`¿Descartar "${workout.title}"? Se eliminará de tu agenda.`)) return;
        await supabase.from('scheduled_workouts').delete().eq('id', workout.id).eq('user_id', user.id);
        setScheduledWorkouts(prev => prev.filter(w => w.id !== workout.id));
    };

    const handleSendReminder = async (workout: any) => {
        try {
            const title = "Recordatorio de Entrenamiento ⚡";
            const content = `${user.user_metadata?.full_name || 'Alguien'} te recuerda tu entrenamiento pendiente: "${workout.title}"`;
            const result = await createNotification({
                userId: profile.id, // Enviar al dueño del perfil
                type: "workout_reminder",
                title,
                content,
                link: "/dashboard/training"
            });
            if (result.success) {
                alert("¡Recordatorio enviado con éxito al atleta! 🚀");
            } else {
                alert("Error al enviar recordatorio: " + (result.error || ""));
            }
        } catch (err: any) {
            console.error(err);
            alert("Error al enviar recordatorio: " + err.message);
        }
    };

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
            
            {/* New Premium Profile Header with Cover Photo */}
            <section className="glass-dark border border-white/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden relative mb-8 shadow-2xl">
                {/* Cover Photo Banner */}
                <div className="h-48 md:h-64 relative w-full select-none overflow-hidden border-b border-white/10"
                    style={profile.is_official ? { background: 'linear-gradient(135deg, #000 0%, #0a0a0a 40%, #1a0000 70%, #000 100%)' } : { background: 'linear-gradient(to right, #dc2626, rgba(220,38,38,0.8), #111)' }}>
                    
                    {/* Back Arrow Button */}
                    <button
                        onClick={() => router.back()}
                        className="absolute top-5 left-5 w-10 h-10 bg-black/60 border border-white/10 hover:bg-black/80 hover:border-brand-red/50 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-lg hover:scale-105 active:scale-95 group z-30"
                        title="Volver"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    {profile.is_official ? (
                        /* Official branded cover */
                        <>
                            {/* Diagonal stripe pattern */}
                            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #dc2626 0, #dc2626 1px, transparent 0, transparent 24px)', backgroundSize: '34px 34px' }} />
                            {/* Red glow at bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-brand-red/15 to-transparent" />
                            {/* Large faint R symbol */}
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[160px] font-black text-white/[0.03] italic tracking-tighter select-none pointer-events-none leading-none">R</div>
                            {/* Official ribbon */}
                            <div className="absolute top-5 left-[70px] flex items-center gap-2 bg-black/60 border border-blue-500/30 backdrop-blur-md px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.2)] z-30">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">Cuenta Oficial · RivalFit</span>
                            </div>
                        </>
                    ) : profile.cover_url ? (
                        <>
                            <Image src={profile.cover_url} alt="Cover" fill className="object-cover pointer-events-none" style={{ objectPosition: `center ${profile.cover_position ?? 50}%` }} priority />
                            <div className="absolute inset-0 bg-brand-red/10 mix-blend-multiply" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop')] bg-cover opacity-20 mix-blend-overlay" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                        </>
                    )}
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-red/20 blur-[80px] -mr-20 -mt-20 rounded-full pointer-events-none" />
                </div>

                {/* Details (Avatar & Info) Container */}
                <div className="p-6 md:p-8 lg:p-12 pt-0 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 relative">
                    {/* Background Ambience inside details */}
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-orange/5 blur-[100px] -ml-20 -mb-20 rounded-full pointer-events-none" />
                    
                    {/* Avatar (Overlapping Cover Photo) */}
                    <div className="relative group shrink-0 -mt-16 md:-mt-24 z-10">
                        <div className="absolute -inset-2 bg-gradient-to-tr from-brand-red to-brand-orange rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />
                        <button
                            onClick={() => setAvatarModalOpen(true)}
                            className={clsx(
                                "relative w-28 h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full border-4 overflow-hidden bg-black transition-transform active:scale-95",
                                profile.is_official
                                    ? "border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]"
                                    : "border-[#020202] shadow-glow-red"
                            )}
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
                    <div className="flex-1 space-y-6 text-center md:text-left relative z-10 w-full mt-4 md:mt-0">
                    <div className="space-y-2">
                        <div className="flex flex-col items-center md:items-start gap-2">
                            {profile.is_official && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full">
                                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.25em]">Plataforma Oficial · App Administrator</span>
                                </div>
                            )}
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

                    {/* Integrated Stats */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                        {profile.is_official ? (
                            /* Official profile: show content stats, no follower/following counts */
                            <>
                                <button onClick={() => scrollToSection('activity-feed', 'activity')} className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-blue-500/10 text-center flex-1 md:flex-none min-w-[80px] hover:border-blue-500/30 transition-colors cursor-pointer">
                                    <div className="text-xl md:text-2xl font-black italic text-white">{stats.wods}</div>
                                    <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-400/60">WODs</div>
                                </button>
                                <button onClick={() => scrollToSection('activity-feed', 'activity')} className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-blue-500/10 text-center flex-1 md:flex-none min-w-[80px] hover:border-blue-500/30 transition-colors cursor-pointer">
                                    <div className="text-xl md:text-2xl font-black italic text-brand-red">{stats.prs}</div>
                                    <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-400/60">Publicaciones</div>
                                </button>
                                <div className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-blue-500/10 text-center flex-1 md:flex-none min-w-[80px]">
                                    <div className="text-xl md:text-2xl font-black italic text-blue-400">∞</div>
                                    <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-400/60">Miembros</div>
                                </div>
                            </>
                        ) : (
                            /* Regular profile */
                            <>
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
                                <button onClick={() => handleOpenModal('following')} className="glass px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border-white/5 text-center flex-1 md:flex-none min-w-[80px] hover:border-brand-red/30 transition-colors cursor-pointer">
                                    <div className="text-xl md:text-2xl font-black italic text-white/80">{profile.following_count || 0}</div>
                                    <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/40">Siguiendo</div>
                                </button>
                            </>
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
                                <FollowButton targetId={profile.id} isFollowingInitial={following} onToggle={setFollowing} />
                                <DuelButton targetId={profile.id} isRival={following} hasActiveDuel={hasActiveDuel} />
                                {following && (
                                    <Link href={`/dashboard/messages?userId=${profile.id}`}
                                        className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-brand-red hover:text-white hover:border-brand-red transition-all flex items-center justify-center"
                                        title="Enviar mensaje">
                                        <MessageCircle className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Bio inline — just below buttons */}
                    {!profile.is_official && profile.bio && (
                        <p className="text-sm text-gray-300 font-medium italic leading-relaxed border-l-2 border-brand-red/60 pl-4 py-1 whitespace-pre-wrap mt-3">
                            {profile.bio}
                        </p>
                    )}
                </div>
            </div>
            </section>

            {/* Bio / Manifiesto — OFFICIAL ONLY */}
            {profile.is_official ? (
                <div className="relative rounded-[32px] overflow-hidden border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.08)]"
                    style={{ background: 'linear-gradient(135deg, #000 0%, #050510 50%, #020008 100%)' }}>
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #3b82f6 0, #3b82f6 1px, transparent 0, transparent 20px)', backgroundSize: '28px 28px' }} />
                    {/* Blue glow top right */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                    {/* Red glow bottom left */}
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-red/10 blur-[60px] rounded-full -ml-16 -mb-16 pointer-events-none" />

                    <div className="relative z-10 p-6 md:p-12 space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                                <ShieldCheck className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em]">Canal Oficial</p>
                                <p className="text-[11px] font-bold text-white/60">Administrador de la Plataforma</p>
                            </div>
                            <div className="ml-auto px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Verificado ✓</span>
                            </div>
                        </div>

                        {/* Message */}
                        <p className="text-base md:text-xl font-bold text-gray-200 leading-relaxed italic tracking-tight whitespace-pre-wrap border-l-2 border-blue-500/40 pl-5">
                            {profile.bio || "Bienvenidos a la plataforma oficial de RivalFit. Aquí encontrarás entrenamientos, retos y toda la información para llevar tu rendimiento al siguiente nivel."}
                        </p>

                        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                            <div className="h-1 w-8 bg-brand-red rounded-full" />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">RivalFit Official · Todos los derechos reservados</span>
                        </div>
                    </div>
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
                <button
                    onClick={() => setMobileTab('calendar')}
                    className={clsx(
                        "flex-1 py-4 flex justify-center items-center border-b-2 transition-all",
                        mobileTab === 'calendar' ? "border-brand-red text-white" : "border-transparent text-gray-500"
                    )}
                >
                    <Calendar className="w-5 h-5" />
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
                                    <FollowButton targetId={profile.id} isFollowingInitial={following} onToggle={setFollowing} variant="large" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Calendario de Entrenamientos — Premium Timeline */}
                            <div className={clsx(mobileTab !== 'calendar' && "hidden md:block")}>
                                <div className="mb-10 relative">
                                    {/* Section Header */}
                                    <div className="flex items-center justify-between mb-8 px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-brand-red to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-red/20">
                                                <Calendar className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white uppercase tracking-wider">Mi Agenda</h3>
                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.3em]">Entrenamientos Programados</p>
                                            </div>
                                        </div>
                                        {scheduledWorkouts.length > 0 && (
                                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                                                <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">
                                                    {scheduledWorkouts.filter((w: any) => !w.is_completed).length} Activo{scheduledWorkouts.filter((w: any) => !w.is_completed).length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {loadingCalendar ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                                            <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Cargando agenda...</p>
                                        </div>
                                    ) : scheduledWorkouts.length > 0 ? (
                                        <div className="relative pl-6 md:pl-8">
                                            {/* Timeline vertical line */}
                                            <div className="absolute left-[11px] md:left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-brand-red/40 via-white/10 to-transparent" />

                                            <div className="space-y-3">
                                                {scheduledWorkouts.map((workout: any, wIdx: number) => {
                                                    const workoutDate = new Date(workout.scheduled_date + 'T00:00:00');
                                                    const today = new Date();
                                                    today.setHours(0,0,0,0);
                                                    const workoutDateZero = new Date(workoutDate);
                                                    workoutDateZero.setHours(0,0,0,0);
                                                    
                                                    const isToday = workoutDateZero.getTime() === today.getTime();
                                                    const isPast = workoutDateZero.getTime() < today.getTime() && !workout.is_completed;
                                                    const isFuture = workoutDateZero.getTime() > today.getTime();

                                                    const statusColor = workout.is_completed
                                                        ? 'emerald' : isToday ? 'red' : isPast ? 'amber' : 'white';
                                                    
                                                    const dayName = workoutDate.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
                                                    const dayNum = workoutDate.getDate();
                                                    const monthName = workoutDate.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();

                                                    return (
                                                        <motion.div
                                                            key={workout.id}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: wIdx * 0.06, duration: 0.35 }}
                                                            className="relative group/row"
                                                        >
                                                            {/* Timeline node dot */}
                                                            <div className={clsx(
                                                                "absolute -left-6 md:-left-8 top-5 w-[9px] h-[9px] rounded-full border-2 z-10 transition-all",
                                                                workout.is_completed
                                                                    ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                                                    : isToday
                                                                        ? "bg-brand-red border-red-400 shadow-[0_0_10px_rgba(220,38,38,0.6)] scale-125"
                                                                        : isPast
                                                                            ? "bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                                                            : "bg-white/20 border-white/30"
                                                            )} />

                                                            {/* Card */}
                                                            <div className={clsx(
                                                                "rounded-2xl border transition-all duration-300 overflow-hidden",
                                                                workout.is_completed
                                                                    ? "bg-emerald-500/[0.03] border-emerald-500/10 opacity-60 hover:opacity-80"
                                                                    : isToday
                                                                        ? "bg-gradient-to-r from-brand-red/[0.08] to-transparent border-brand-red/20 shadow-[0_0_30px_rgba(220,38,38,0.06)]"
                                                                        : isPast
                                                                            ? "bg-amber-500/[0.04] border-amber-500/15"
                                                                            : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                                                            )}>
                                                                <div className="flex items-stretch">
                                                                    {/* Date Column */}
                                                                    <div className={clsx(
                                                                        "w-16 md:w-20 shrink-0 flex flex-col items-center justify-center py-4 border-r",
                                                                        workout.is_completed ? "border-emerald-500/10" :
                                                                        isToday ? "border-brand-red/15" :
                                                                        isPast ? "border-amber-500/10" : "border-white/5"
                                                                    )}>
                                                                        <span className={clsx(
                                                                            "text-[8px] font-black uppercase tracking-[0.2em] mb-0.5",
                                                                            isToday ? "text-brand-red" : "text-gray-600"
                                                                        )}>{isToday ? 'HOY' : dayName}</span>
                                                                        <span className={clsx(
                                                                            "text-2xl md:text-3xl font-black leading-none",
                                                                            workout.is_completed ? "text-emerald-500/40" :
                                                                            isToday ? "text-white" :
                                                                            isPast ? "text-amber-500/60" : "text-white/20"
                                                                        )}>{dayNum}</span>
                                                                        <span className={clsx(
                                                                            "text-[7px] font-bold uppercase tracking-widest mt-0.5",
                                                                            isToday ? "text-brand-red/60" : "text-gray-700"
                                                                        )}>{monthName}</span>
                                                                    </div>

                                                                    {/* Content Column */}
                                                                    <div className="flex-1 min-w-0 p-4 md:p-5">
                                                                        <div className="flex items-start justify-between gap-3 mb-2.5">
                                                                            <div className="min-w-0">
                                                                                <h4 className={clsx(
                                                                                    "text-sm md:text-base font-black uppercase tracking-wide leading-tight truncate",
                                                                                    workout.is_completed ? "text-emerald-400/60 line-through" : "text-white"
                                                                                )}>
                                                                                    {workout.title}
                                                                                </h4>
                                                                                {workout.sport_type && (
                                                                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-[0.2em] mt-0.5">
                                                                                        {workout.sport_type}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                            {/* Status badge */}
                                                                            {workout.is_completed ? (
                                                                                <span className="shrink-0 flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                                                    <CheckCircle className="w-2.5 h-2.5" /> Hecho
                                                                                </span>
                                                                            ) : isPast ? (
                                                                                <span className="shrink-0 flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border border-amber-500/20 animate-pulse">
                                                                                    <AlertTriangle className="w-2.5 h-2.5" /> Vencido
                                                                                </span>
                                                                            ) : isToday ? (
                                                                                <span className="shrink-0 flex items-center gap-1 bg-brand-red/15 text-brand-red px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border border-brand-red/25">
                                                                                    <Flame className="w-2.5 h-2.5" /> Hoy
                                                                                </span>
                                                                            ) : null}
                                                                        </div>

                                                                        {/* Exercise chips — compact horizontal wrap */}
                                                                        {workout.exercises && workout.exercises.length > 0 && (
                                                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                                                {workout.exercises.slice(0, 5).map((ex: any, idx: number) => (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className={clsx(
                                                                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border",
                                                                                            workout.is_completed
                                                                                                ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500/40"
                                                                                                : "bg-white/[0.04] border-white/[0.06] text-gray-400"
                                                                                        )}
                                                                                    >
                                                                                        <Dumbbell className="w-2.5 h-2.5 opacity-40" />
                                                                                        {ex.name}
                                                                                        {ex.reps && <span className="text-gray-600 font-normal">×{ex.reps}</span>}
                                                                                    </span>
                                                                                ))}
                                                                                {workout.exercises.length > 5 && (
                                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold text-gray-600 bg-white/[0.02] border border-white/[0.04]">
                                                                                        +{workout.exercises.length - 5}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Action row */}
                                                                        {!workout.is_completed && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Link
                                                                                    href={`/dashboard/training/session?mode=scheduled&scheduledId=${workout.id}&workout=${encodeURIComponent(JSON.stringify({
                                                                                        title: workout.title,
                                                                                        exercises: workout.exercises,
                                                                                        sportType: workout.sport_type
                                                                                    }))}`}
                                                                                    className={clsx(
                                                                                        "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95",
                                                                                        isToday
                                                                                            ? "bg-gradient-to-r from-brand-red to-orange-600 text-white shadow-lg shadow-brand-red/20 hover:shadow-brand-red/40"
                                                                                            : "bg-white/10 text-white hover:bg-white/15"
                                                                                    )}
                                                                                >
                                                                                    <Play className="w-3 h-3 fill-current" /> Iniciar
                                                                                </Link>

                                                                                {isPast && (
                                                                                    <button
                                                                                        onClick={() => handleSendReminder(workout)}
                                                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/15 hover:bg-amber-500/20 transition-all active:scale-95"
                                                                                    >
                                                                                        <MessageCircle className="w-3 h-3" /> Recordar
                                                                                    </button>
                                                                                )}
                                                                                {user?.id === profile.id && (
                                                                                    <button
                                                                                        onClick={() => handleDiscardWorkout(workout)}
                                                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-white/5 text-gray-500 border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all active:scale-95"
                                                                                    >
                                                                                        <X className="w-3 h-3" /> Descartar
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 px-6 bg-white/[0.02] border border-dashed border-white/5 rounded-[28px]">
                                            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                                                <Calendar className="w-7 h-7 text-gray-600" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500 mb-1">Sin entrenamientos programados</p>
                                            <p className="text-[10px] text-gray-600 font-medium">Genera un WOD con IA y agrégalo a tu agenda</p>
                                        </div>
                                    )}
                                </div>
                            </div>

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
                                                    hasLikedInitial={!!(user && post.likes && post.likes.some((l: any) => l.user_id === user.id))}
                                                    comments={post.comments?.[0]?.count || 0}
                                                    caption={post.caption}
                                                    workoutData={post.workouts}
                                                    music_url={post.music_url}
                                                    thumbnail_url={post.thumbnail_url}
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
                                                {profile.featured_rms.map((rm: any) => {
                                                    const ex = (rm.exercise || '').toLowerCase();
                                                    const isEndurance = /run|row|swim|bike|cycling|km|m\b|meter|endur|cardio|corr|natat|cicl/.test(ex);
                                                    const isTime = /for\s*time|time|min|seg|sec/.test(ex);
                                                    let displayUnit = rm.unit || 'kg';
                                                    if (isEndurance && displayUnit === 'kg') displayUnit = 'm';
                                                    if (isTime && displayUnit === 'kg') displayUnit = 'min';
                                                    return (
                                                    <div key={rm.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2 group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red shrink-0 group-hover:scale-110 transition-transform">
                                                                <Dumbbell className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-[11px] md:text-xs font-black uppercase text-gray-300 tracking-wide">{rm.exercise}</span>
                                                        </div>
                                                        <span className="text-sm md:text-base font-black text-white italic tracking-tighter">{rm.weight} {displayUnit}</span>
                                                    </div>
                                                    );
                                                })}
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
                                    <ul className="space-y-3">
                                        {/* WODs del Día */}
                                        <li className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-brand-red/10 rounded-lg shrink-0">
                                                    <LayoutGrid className="w-4 h-4 text-brand-red" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest block">WODs del Día</span>
                                                    <span className="text-[8px] text-gray-600">Publica o explora entrenamientos</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href="/dashboard?newPost=wod" className="flex-1 flex items-center justify-center gap-1.5 bg-brand-red text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors">
                                                    <Plus className="w-3 h-3" /> Publicar WOD
                                                </Link>
                                                <Link href="/dashboard/community" className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1">
                                                    Ver <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </li>

                                        {/* Retos Globales */}
                                        <li className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-purple-500/10 rounded-lg shrink-0">
                                                    <Trophy className="w-4 h-4 text-purple-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest block">Retos Globales</span>
                                                    <span className="text-[8px] text-gray-600">Crea o únete a competiciones</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href="/dashboard/competitions?new=true" className="flex-1 flex items-center justify-center gap-1.5 bg-purple-600 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-purple-700 transition-colors">
                                                    <Plus className="w-3 h-3" /> Crear Reto
                                                </Link>
                                                <Link href="/dashboard/competitions" className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1">
                                                    Ver <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </li>

                                        {/* Ranking Élite */}
                                        <li className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-green-500/10 rounded-lg shrink-0">
                                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest block">Ranking Élite</span>
                                                    <span className="text-[8px] text-gray-600">Los mejores atletas de la plataforma</span>
                                                </div>
                                            </div>
                                            <Link href="/dashboard/leaderboard" className="flex items-center justify-center gap-1.5 bg-green-600/20 border border-green-500/30 text-green-400 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-green-600/30 transition-colors w-full">
                                                Ver mi posición <ArrowRight className="w-3 h-3" />
                                            </Link>
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

