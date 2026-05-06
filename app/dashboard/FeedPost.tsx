"use client";

import { useState, useRef, useEffect, useMemo, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, MessageCircle, Share2, Trophy, X, Send, Smile, Play, Pause, Trash2, Edit2, Save, Heart, Dumbbell, Activity, ChevronDown, ChevronUp, Music, Plus, CheckCircle2, Instagram, Swords, Download, Loader2, Repeat, MessageSquare, Volume2, VolumeX, ChevronLeft, ChevronRight, ExternalLink, ZapOff } from "lucide-react";
import { VideoProcessor } from "./stories/VideoProcessor";
import LikeButton from "./community/LikeButton";
import DuelButton from "./community/DuelButton";
import { addComment, getComments, deletePost, updatePost, toggleCommentLike, toggleLike } from "./community/actions";
import { createRepost } from "./community/repost-actions";
import { sharePostViaMessage } from "./community/dm-actions";
import { getFollows } from "./community/follows-actions";
import type { EmojiClickData } from 'emoji-picker-react';
import { createClient } from "@/utils/supabase/client";
import { clsx } from "clsx";
import { useTheme } from "../ThemeContext";
import { isImageUrl } from "@/lib/utils";
import { useStories } from "./stories/StoryContext";
import PRCard from "./community/PRCard";
import VideoReelsModal from "./VideoReelsModal";
import dynamic from 'next/dynamic';
import ShareableCard from "@/components/ShareableCard";
import RunShareCard from "@/components/training/RunShareCard";
import WorkoutShareCard from "@/components/training/WorkoutShareCard";
import RouteMap from "@/components/training/RouteMap";
import WODPostDisplay from "@/components/WODPostDisplay";
import WODTrackerModal from "@/components/WODTrackerModal";
import WODLeaderboardModal from "@/components/WODLeaderboardModal";
import MentionText from "@/components/MentionText";
import MentionInput from "@/components/MentionInput";
import WodCard from "@/components/community/WodCard";
import { useVideo } from "./VideoContext";
import VerifiedBadge from "@/components/VerifiedBadge";

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
const InstagramShareCard = dynamic(() => import("./InstagramShareCard"), { ssr: false });


function ShareButton({ 
    image, 
    workoutData, 
    mediaType, 
    postId, 
    className, 
    iconClassName = "w-5 h-5", 
    onInstagramShare, 
    onOpenShareCard, 
    onDownloadMedia, 
    onRepostClick,
    onMessageClick,
    isDownloadingVideo, 
    downloadProgress, 
    isVideo,
    highlight,
    caption,
    photoUrl
}: {
    image?: string,
    workoutData?: any,
    mediaType?: string,
    postId?: string,
    className?: string,
    iconClassName?: string,
    onInstagramShare?: () => void,
    onOpenShareCard?: () => void,
    onDownloadMedia?: () => void,
    onRepostClick?: () => void,
    onMessageClick?: () => void,
    isDownloadingVideo?: boolean,
    downloadProgress?: number,
    isVideo?: boolean,
    highlight?: string,
    caption?: string,
    photoUrl?: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleShareLink = () => {
        const url = `${window.location.origin}/dashboard`;
        if (navigator.share) navigator.share({ title: 'RIVAL', url });
        else { navigator.clipboard.writeText(url); alert("Copiado!"); }
        setIsOpen(false);
    };

    const handleShareToStory = () => {
        if (workoutData) {
            window.dispatchEvent(new CustomEvent('share-to-story', { detail: { type: 'workout', data: workoutData, postId } }));
        } else if (mediaType === 'class_result' && image) {
            try {
                const data = JSON.parse(image);
                window.dispatchEvent(new CustomEvent('share-to-story', { detail: { type: 'class_result', data, postId } }));
            } catch (e) {
                console.error("Error parsing class result", e);
            }


        } else if (mediaType === 'pr' && image) {
            try {
                // Try to parse JSON if image is data
                const isJson = (image || '').trim().startsWith('{');
                let prData: any = null;

                if (isJson) {
                    const parsed = JSON.parse(image);
                    prData = {
                        exerciseName: parsed.exerciseName,
                        weight: parsed.weight,
                        unit: parsed.unit,
                        sport: parsed.sport || 'Cross Training'
                    };
                } else {
                    // Fallback to title parsing
                    const text = highlight || workoutData?.title || caption || '';
                    const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|lbs|lb)/i);
                    const exerciseMatch = text.split(/[:!]/).pop()?.split(weightMatch?.[0] || '')[0]?.trim();
                    prData = {
                        exerciseName: exerciseMatch || 'Personal Record',
                        weight: weightMatch?.[0]?.replace(/[a-zA-Z]/g, '') || '0',
                        unit: weightMatch?.[1] || 'kg',
                        sport: 'Cross Training'
                    };
                }


                window.dispatchEvent(new CustomEvent('share-to-story', { 
                    detail: { 
                        type: 'pr', 
                        data: prData, 
                        backgroundImage: photoUrl,
                        postId 
                    } 
                }));
            } catch (e) {
                console.error("Error sharing PR to story", e);
                // Fallback to simple image
                window.dispatchEvent(new CustomEvent('share-to-story', { detail: { type: 'image', url: photoUrl, postId } }));
            }

        } else if (isVideo && image) {
            // Share reel/video directly to story
            window.dispatchEvent(new CustomEvent('share-to-story', {
                detail: { type: 'video', url: image, postId }
            }));
        } else {
            if (photoUrl) {
                window.dispatchEvent(new CustomEvent('share-to-story', { detail: { type: 'image', url: photoUrl, postId } }));
            } else {
                alert("Este contenido no se puede convertir a historia automáticamente.");
            }
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={className}
            >
                <Share2 className={iconClassName} />
            </button>
            {isOpen && (
                <>
                    {/* Mobile overlay backdrop */}
                    <div className="fixed inset-0 bg-black/60 z-[49] md:hidden" onClick={() => setIsOpen(false)} />
                    {/* Share menu - fixed bottom sheet on mobile, absolute dropdown on desktop */}
                    <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-auto md:left-auto md:right-0 md:top-auto md:bottom-full md:mb-2 w-full md:w-56 bg-[#111] md:bg-black border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl z-[50] overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-4 md:fade-in md:zoom-in-95 duration-200">
                        {/* Mobile drag handle */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>
                        <button onClick={handleShareLink} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3">
                            <Share2 className="w-4 h-4" /> Compartir enlace
                        </button>
                        <button onClick={handleShareToStory} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3 border-t border-white/5">
                            <Plus className="w-4 h-4" /> Enviar a Mis Historias
                        </button>
                        <button onClick={() => { setIsOpen(false); onRepostClick?.(); }} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-brand-red hover:bg-brand-red/10 flex items-center gap-3 border-t border-white/5">
                            <Repeat className="w-4 h-4" /> Repostear
                        </button>
                        <button onClick={() => { setIsOpen(false); onMessageClick?.(); }} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3 border-t border-white/5">
                            <MessageSquare className="w-4 h-4" /> Enviar Mensaje
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onInstagramShare?.(); setIsOpen(false); }}
                            className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3 border-t border-white/5"
                        >
                            <Instagram className="w-4 h-4" /> Instagram Story
                        </button>
                        {onOpenShareCard && (
                            <button onClick={() => { onOpenShareCard(); setIsOpen(false); }} className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-brand-red bg-brand-red/5 hover:bg-brand-red/10 flex items-center gap-3 border-t border-white/5">
                                <Trophy className="w-4 h-4" /> Tarjeta Elite
                            </button>
                        )}
                        {isVideo && onDownloadMedia && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDownloadMedia(); setIsOpen(false); }}
                                disabled={isDownloadingVideo}
                                className="w-full text-left px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white bg-brand-red hover:bg-brand-red/90 disabled:bg-gray-800 disabled:text-gray-500 flex items-center justify-between border-t border-white/5 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    {isDownloadingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {isDownloadingVideo ? 'PROCESANDO...' : 'DESCARGAR VIDEO'}
                                </div>
                                {isDownloadingVideo && <span className="font-black">{downloadProgress}%</span>}
                            </button>
                        )}
                        {/* Safe area padding for mobile */}
                        <div className="h-4 md:hidden" />
                    </div>
                </>
            )}
        </div>
    );
}

function RepostCard({ image, caption, prefetchedPost }: { image?: string; caption?: string; prefetchedPost?: any }) {
    const [originalPost, setOriginalPost] = useState<any>(prefetchedPost || null);
    const [loading, setLoading] = useState(!prefetchedPost);

    let originalPostId: string | null = null;
    try {
        const meta = JSON.parse(image || '{}');
        originalPostId = meta.originalPostId || null;
    } catch (e) {}

    useEffect(() => {
        // Only fetch if the post wasn't pre-loaded by the parent (fallback for direct renders)
        if (prefetchedPost || !originalPostId) { setLoading(false); return; }
        const supabase = createClient();
        supabase
            .from('posts')
            .select('id, caption, media_url, media_type, profiles:user_id(username, full_name, avatar_url, is_official)')
            .eq('id', originalPostId)
            .single()
            .then(({ data }: { data: typeof originalPost }) => {
                setOriginalPost(data);
                setLoading(false);
            });
    }, [originalPostId, prefetchedPost]);

    return (
        <div className="px-4 pb-4">
            {/* Reposter's own caption */}
            {caption && (
                <p className="text-sm text-white mb-3 leading-relaxed">{caption}</p>
            )}

            {/* Embedded original post */}
            <a
                href={originalPostId ? `/dashboard#post-${originalPostId}` : '/dashboard'}
                className="block border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] hover:border-brand-red/30 transition-all group"
            >
                {loading ? (
                    <div className="p-4 flex items-center gap-3 animate-pulse">
                        <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-white/10 rounded w-28" />
                            <div className="h-2 bg-white/5 rounded w-20" />
                        </div>
                    </div>
                ) : originalPost ? (
                    <>
                        {/* Original post header */}
                        <div className="flex items-center gap-2.5 p-3 border-b border-white/5">
                            <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 overflow-hidden relative shrink-0">
                                {originalPost.profiles?.avatar_url ? (
                                    <Image src={originalPost.profiles.avatar_url} alt={originalPost.profiles.username} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-gray-500 uppercase">
                                        {(originalPost.profiles?.full_name || 'U').substring(0, 2)}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-brand-red uppercase italic leading-none truncate">
                                    {originalPost.profiles?.full_name || originalPost.profiles?.username}
                                    {originalPost.profiles?.is_official && <span className="ml-1">✓</span>}
                                </p>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                    @{originalPost.profiles?.username}
                                </p>
                            </div>
                            <Repeat className="w-3.5 h-3.5 text-brand-red/50 shrink-0" />
                        </div>

                        {/* Original post caption */}
                        {originalPost.caption && (
                            <p className="text-sm text-gray-300 px-3 py-2.5 leading-relaxed line-clamp-3">
                                {originalPost.caption}
                            </p>
                        )}

                        {/* Original post media or WOD content */}
                        {isImageUrl(originalPost.media_url) ? (
                            <div className="relative aspect-video w-full bg-black overflow-hidden">
                                {originalPost.media_type === 'video' ? (
                                    <video src={originalPost.media_url} className="w-full h-full object-cover" muted playsInline />
                                ) : (
                                    <Image src={originalPost.media_url} alt="Post original" fill className="object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                            </div>
                        ) : (originalPost.media_type === 'wod' || originalPost.media_type === 'workout') ? (
                            <div className="px-3 pb-3">
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl border-dashed">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Trophy className="w-3.5 h-3.5 text-brand-red" />
                                        <span className="text-[10px] font-black text-white uppercase italic tracking-tighter">Entrenamiento de Fuerza/WOD</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest line-clamp-1">
                                        {(() => {
                                            try {
                                                const wod = JSON.parse(originalPost.media_url);
                                                return wod.title || "WOD DETECTADO";
                                            } catch { return "ENTRENAMIENTO"; }
                                        })()}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        <div className="px-3 py-2 text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-1 group-hover:text-brand-red transition-colors">
                            <ExternalLink className="w-3 h-3" /> Ver publicación original
                        </div>
                    </>
                ) : (
                    <div className="p-4 flex items-center gap-3 text-gray-600">
                        <Repeat className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Publicación no disponible</span>
                    </div>
                )}
            </a>
        </div>
    );
}

interface FeedPostProps {
    postId: string;
    username?: string;
    user: string;
    action: string;
    time: string;
    avatar: string;
    image: string;
    initialLikes: number;
    hasLikedInitial: boolean;
    comments: number;
    highlight?: string;
    mediaType?: string;
    caption?: string;
    currentUserId?: string;
    authorId?: string;
    centerName?: string;
    isOfficial?: boolean;
    workoutData?: {
        title: string;
        total_volume_kg?: number;
        workout_sets?: any[];
        location_name?: string;
        sport_type?: string;
        metrics?: any;
        image?: string;
    };
    music_url?: string | null;
    music_title?: string | null;
    music_artist?: string | null;
    isMember?: boolean;
    context?: 'following' | 'global';
    isAdminUser?: boolean;
    hasActiveDuel?: boolean;
    post_type?: string;
    wod_data?: any;
    repostOriginalPost?: any; // Pre-fetched original post for repost cards (avoids N+1)
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    parent_id: string | null;
    user: {
        username: string;
        avatar_url: string | null;
    };
    likes_count: number;
    has_liked: boolean;
    replies?: Comment[];
}

const FeedPost = memo(function FeedPost({ postId, username, user, action, time, avatar, image, initialLikes, hasLikedInitial, comments: initialCommentsCount, highlight, mediaType, caption, currentUserId, authorId, centerName,
    workoutData, music_url, music_title, music_artist, isOfficial, isMember = false, context = 'global', isAdminUser, hasActiveDuel, post_type, wod_data, repostOriginalPost
}: FeedPostProps) {
    const { theme } = useTheme();
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [showInstagramCard, setShowInstagramCard] = useState(false);
    const [showShareCard, setShowShareCard] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentList, setCommentList] = useState<Comment[]>([]);
    const [isReposting, setIsReposting] = useState(false);
    const [repostCaption, setRepostCaption] = useState("");
    const [showRepostModal, setShowRepostModal] = useState(false);
    const [showDMModal, setShowDMModal] = useState(false);
    const [dmMessage, setDmMessage] = useState("");
    const [dmFollows, setDmFollows] = useState<any[]>([]);
    const [selectedDmUser, setSelectedDmUser] = useState<string | null>(null);
    const [isSendingDM, setIsSendingDM] = useState(false);

    const handleShareRepost = async () => {
        if (!postId) return;
        setIsReposting(true);
        const res = await createRepost(postId, repostCaption);
        if (res.error) {
            alert("Error al repostear: " + res.error);
        } else {
            alert("¡Reposteado con éxito en tu perfil!");
            setShowRepostModal(false);
            setRepostCaption("");
        }
        setIsReposting(false);
    };

    const loadDMFollows = async () => {
        if (currentUserId) {
            const data = await getFollows(currentUserId, 'following');
            setDmFollows(data || []);
        }
    };

    const handleSendDM = async () => {
        if (!postId || !selectedDmUser) return;
        setIsSendingDM(true);
        const res = await sharePostViaMessage(postId, selectedDmUser, dmMessage);
        if (res.error) {
            alert(res.error);
        } else {
            alert("¡Mensaje enviado a tu amigo con éxito!");
            setShowDMModal(false);
            setDmMessage("");
            setSelectedDmUser(null);
        }
        setIsSendingDM(false);
    };
    
    // Robustly resolve the primary media URL and detection info
    const { resolvedUrl, resolvedIsVideo, resolvedIsCarousel, resolvedItems } = useMemo(() => {
        let url: string | undefined = image;
        let isVid = mediaType === 'video';
        let isCar = mediaType === 'carousel';
        let items: string[] = [];

        // 1. Extract from workoutData if image is missing
        if (!url && workoutData?.image) url = workoutData.image;
        if (!url && workoutData?.metrics?.image) url = workoutData.metrics.image;

        // 2. Handle JSON strings (objects or arrays)
        if (url && typeof url === 'string' && (url.trim().startsWith('{') || url.trim().startsWith('['))) {
            try {
                const parsed = JSON.parse(url.trim());
                if (Array.isArray(parsed)) {
                    isCar = true;
                    items = parsed;
                    url = parsed[0];
                } else {
                    url = parsed.image || parsed.backgroundImage || parsed.media_url || parsed.mediaUrl || parsed.url || url;
                }
            } catch (e) {
                console.warn("[FeedPost] Error parsing media JSON:", e);
            }
        }

        // 3. Precise Video Detection based on resolved URL
        const videoExtensions = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
        const videoIndicators = ['/videos/', 'video/upload', '.mov?', '.mp4?'];
        
        if (!isVid && url && typeof url === 'string') {
            isVid = videoExtensions.test(url) || videoIndicators.some(ind => url.includes(ind));
        }

        // Clean up items if it's a carousel
        if (isCar && items.length === 0 && url) {
            items = [url];
        }

        return {
            resolvedUrl: isImageUrl(url) || isVid ? url : undefined,
            resolvedIsVideo: isVid,
            resolvedIsCarousel: isCar,
            resolvedItems: items
        };
    }, [image, workoutData, mediaType]);

    const photoUrl = resolvedUrl;
    const isVideo = resolvedIsVideo;
    const isCarousel = resolvedIsCarousel;
    const carouselItems = resolvedItems;
    const [carouselIndex, setCarouselIndex] = useState(0);

    const [commentTree, setCommentTree] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [expandedInnerBlocks, setExpandedInnerBlocks] = useState<number[]>([]);

    const toggleInnerBlock = (idx: number) => {
        setExpandedInnerBlocks(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const [showMenu, setShowMenu] = useState(false);
    const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
    const [completionsCountWod, setCompletionsCountWod] = useState(0);
    const [hasCompletedWod, setHasCompletedWod] = useState(false);
    const [manualOriginalId, setManualOriginalId] = useState<string | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);
    const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Estados para modales de WOD
    const [showWODTracker, setShowWODTracker] = useState(false);
    const [showWODLeaderboard, setShowWODLeaderboard] = useState(false);
    const postRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { isMuted, toggleMute, setLastActiveVideoId, setIsMuted } = useVideo();

    const [isVisible, setIsVisible] = useState(false);
    const [showMuteHint, setShowMuteHint] = useState(false);
    // Combined state for buffering/loading
    const [isBuffering, setIsBuffering] = useState(true);
    const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
    const [loadError, setLoadError] = useState(false);
    
    // Auto-disable buffering if there's no media at all
    useEffect(() => {
        if (!image && !workoutData?.image) {
            setIsBuffering(false);
        }
    }, [image, workoutData]);

    
    // Check if post actually has visual media to display in the main container
    const hasMedia = !!(photoUrl || isVideo || isCarousel);

    // Intersection Observer to detect if post is in view
    useEffect(() => {
        if (!postRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { 
                threshold: 0.15, // Reduced from 0.5 to play even if only 15% is on screen
                rootMargin: '100px 0px' // Start loading/playing 100px before it enters viewport
            }
        );

        observer.observe(postRef.current);
        return () => observer.disconnect();
    }, [postId, setLastActiveVideoId]);

    // Handle Page Visibility (app in background)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && videoRef.current) {
                videoRef.current.pause();
            } else if (!document.hidden && isVisible && videoRef.current) {
                videoRef.current.play().catch(() => {
                    // Silently fail — onCanPlay/onError handlers manage the UI state
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isVisible]);

    // Apply mute/play status based on visibility
    useEffect(() => {
        if (!videoRef.current) return;

        if (isVisible) {
            setIsBuffering(true);
            videoRef.current.play().catch(() => {
                // Silently fail — onCanPlay/onError handlers manage the UI state
            });
        } else {
            videoRef.current.pause();
        }
    }, [isVisible]);

    useEffect(() => {
        if (isVisible && isMuted && isVideo) {
            setShowMuteHint(true);
            const timer = setTimeout(() => setShowMuteHint(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowMuteHint(false);
        }
    }, [isVisible, isMuted, isVideo]);

    // Parse wod_data if it's a string
    const parsedWodData = useMemo(() => {
        if (!wod_data) return null;
        if (typeof wod_data === 'object') return wod_data;
        try {
            return JSON.parse(wod_data);
        } catch (e) {
            console.error("Error parsing wod_data:", e);
            return null;
        }
    }, [wod_data]);



    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);

    // Memoize the workout data: use prop if available, otherwise try to parse from "image" (media_url)
    const resolvedWorkoutData = useMemo(() => {
        if (workoutData) return workoutData;
        if (!image || isImageUrl(image)) return null;
        try {
            const parsed = JSON.parse(image);
            // Verify it's actually workout data (has blocks or metrics or title)
            if (parsed && (parsed.blocks || parsed.metrics || parsed.title)) {
                return parsed;
            }
        } catch (e) {
            return null;
        }
        return null;
    }, [workoutData, image]);

    // Extract IDs from workout data if possible
    const workoutWodId = (resolvedWorkoutData as any)?.original_wod_post_id || (resolvedWorkoutData as any)?.postId;
    const targetWodId = manualOriginalId || (parsedWodData as any)?.original_wod_post_id || workoutWodId || postId;


    const isOwner = currentUserId && authorId && currentUserId === authorId;
    const { userStories, openStory } = useStories();

    // Check if the post user has active stories
    const authorStories = userStories.find(us => us.user.id === authorId);
    const hasStory = authorStories && authorStories.stories.length > 0;
    const allSeen = hasStory && authorStories?.stories.every(s => s.has_seen);

    const handleAvatarClick = (e: React.MouseEvent) => {
        if (hasStory) {
            e.preventDefault();
            openStory(authorId || '');
        }
    };


    
    useEffect(() => {
        // Fetch completion data if it's a WOD post OR a post with resolved workout data that looks like a WOD
        const isWodData = resolvedWorkoutData && (resolvedWorkoutData.blocks || (resolvedWorkoutData.metrics && resolvedWorkoutData.metrics.blocks));
        if ((post_type === 'wod' || isWodData) && targetWodId) {
            fetchCompletionsCount(targetWodId);
            // Only check if we don't have a manual ID set yet to avoid loops
            if (!hasCompletedWod) {
                checkUserCompletion(targetWodId);
            }
        }
    }, [post_type, targetWodId, hasCompletedWod]);

    const fetchCompletionsCount = async (targetWodId: string) => {
        try {
            const res = await fetch(`/api/wod/leaderboard?wodPostId=${targetWodId}`);
            const data = await res.json();
            if (data.success && typeof data.total === 'number') {
                setCompletionsCountWod(data.total);
            }
        } catch (e) {
            console.error("Error fetching completions count:", e);
        }
    };

    const checkUserCompletion = async (targetWodId: string) => {
        try {
            const res = await fetch(`/api/wod/my-completion?wodPostId=${targetWodId}`);
            const data = await res.json();
            if (data.success && data.completion) {
                setHasCompletedWod(true);
                // If we found a completion, and it has an original_wod_post_id, use it for everything!
                if (data.completion.original_wod_post_id && data.completion.original_wod_post_id !== targetWodId) {
                    setManualOriginalId(data.completion.original_wod_post_id);
                }
            }
        } catch (e) {
            console.error("Error checking user completion:", e);
        }
    };

    useEffect(() => {

        if (showComments && commentList.length === 0) {
            setIsLoadingComments(true);
            getComments(postId).then((data) => {
                const list = data || [];
                setCommentList(list);
                setCommentTree(buildTree(list));
                setIsLoadingComments(false);
            });
        }
    }, [showComments, postId]);


    useEffect(() => {
        setCommentTree(buildTree(commentList));
    }, [commentList]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    function buildTree(list: Comment[]) {
        const map: { [key: string]: Comment } = {};
        const roots: Comment[] = [];
        const deepList = JSON.parse(JSON.stringify(list));

        deepList.forEach((c: Comment) => {
            c.replies = [];
            map[c.id] = c;
        });

        deepList.forEach((c: Comment) => {
            if (c.parent_id && map[c.parent_id]) {
                map[c.parent_id].replies?.push(c);
            } else {
                roots.push(c);
            }
        });
        return roots;
    }

    async function handleAddComment(e: React.FormEvent, parentId: string | null = null) {
        e.preventDefault();
        if (!newComment.trim()) return;

        setIsPostingComment(true);
        const tempId = Date.now().toString();
        const optimisticComment: Comment = {
            id: tempId,
            content: newComment,
            created_at: new Date().toISOString(),
            parent_id: parentId,
            user: { username: "Tú", avatar_url: null },
            likes_count: 0,
            has_liked: false,
            replies: []
        };

        setCommentList(prev => [...prev, optimisticComment]);
        setNewComment("");
        setReplyingTo(null);
        setCommentsCount(prev => prev + 1);
        setShowEmojiPicker(false);

        const res = await addComment(postId, optimisticComment.content, parentId || undefined);
        if (res?.error) {
            setCommentList(prev => prev.filter(c => c.id !== tempId));
            setCommentsCount(prev => prev - 1);
            alert(`No se pudo publicar el comentario: ${res.error}`);
        }
        setIsPostingComment(false);
    }

    const handleCommentLike = async (commentId: string) => {
        setCommentList(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    likes_count: c.has_liked ? c.likes_count - 1 : c.likes_count + 1,
                    has_liked: !c.has_liked
                };
            }
            return c;
        }));
        await toggleCommentLike(commentId);
    };

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta publicación?")) return;
        setIsDeleting(true);
        const res = await deletePost(postId);
        if (res.error) {
            alert(res.error);
            setIsDeleting(false);
        }
    };

    // Local handleUpdate is removed as we use the global edit form now

    const toggleMusic = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
        }
    };

    const handleDownloadMedia = async () => {
        if (!image || isDownloadingVideo) return;

        setIsDownloadingVideo(true);
        setDownloadProgress(0);
        try {
            console.log("[FeedPost] Starting media processing for download:", image);
            const mediaTypeForProcessor = isVideo ? 'video' : 'image';
            const processedBlob = await VideoProcessor.processMedia(image, mediaTypeForProcessor, (percent) => {
                setDownloadProgress(Math.floor(percent));
            });
            setDownloadProgress(100);
            const ext = isVideo ? 'mp4' : 'jpg';
            const filename = `rival-fit-${postId || Date.now()}.${ext}`;
            await VideoProcessor.downloadBlob(processedBlob, filename);
        } catch (error) {
            console.error("[FeedPost] Media processing/download failed:", error);
            alert("No se pudo procesar el contenido para descargar. Por favor, inténtalo de nuevo.");
        } finally {
            setIsDownloadingVideo(false);
        }
    };

    const openRepostModal = () => {
        setRepostCaption("");
        setShowRepostModal(true);
    };

    const handleRepost = () => {
        // Fallback or legacy handler for backward compatibility in some events
        openRepostModal();
    };

    if (isDeleting) return null;

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setNewComment(prev => prev + emojiData.emoji);
    };

    const CommentNode = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => (
        <div className={clsx("flex gap-3", depth > 0 && "mt-3")}>
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden shrink-0">
                    {comment.user?.avatar_url && isImageUrl(comment.user.avatar_url) ? (
                        <Image src={comment.user.avatar_url} alt={comment.user.username} width={32} height={32} className="object-cover w-full h-full" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] bg-brand-red/10 font-bold text-brand-red capitalize whitespace-nowrap overflow-hidden">
                            {comment.user?.username?.substring(0, 2) || "?"}
                        </div>
                    )}
                </div>
                {comment.replies && comment.replies.length > 0 && (
                    <div className="w-px h-full bg-white/10 my-2" />
                )}
            </div>
            <div className="flex-1">
                <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 text-sm group relative">
                    <span className="font-bold text-gray-200 mr-2">{comment.user?.username || "Usuario"}</span>
                    <span className="text-gray-300 mr-2">
                        <MentionText text={comment.content} className="whitespace-pre-wrap" />
                    </span>
                    <div className="absolute right-2 bottom-1 flex items-center gap-3">
                        <button
                            onClick={() => handleCommentLike(comment.id)}
                            className={clsx("flex items-center gap-1 text-[10px] font-bold transition-colors", comment.has_liked ? "text-brand-red" : "text-gray-500 hover:text-brand-red")}
                        >
                            <Heart className={clsx("w-3 h-3", comment.has_liked && "fill-current")} />
                            {comment.likes_count > 0 && comment.likes_count}
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-600 mt-1 ml-2 font-bold">
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                    <button
                        onClick={() => {
                            setReplyingTo(comment);
                            // Pre-fill mention if not already there
                            const mention = `@${comment.user?.username || ''} `;
                            if (!newComment.includes(mention)) {
                                setNewComment(prev => mention + prev);
                            }
                            // Focus input
                            setTimeout(() => {
                                const inputElement = document.getElementById(`comment-input-${postId}`);
                                if (inputElement) inputElement.focus();
                            }, 100);
                        }}
                        className="text-gray-500 hover:text-brand-red"
                    >
                        Responder
                    </button>
                </div>
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3">
                        {comment.replies.map(reply => (
                            <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div
            ref={postRef}
            id={`post-${postId}`}
            className={clsx(
                "md:mb-10 transition-all relative group/post",
                "rounded-none md:rounded-[48px] overflow-hidden shadow-2xl", // Premium rounded look
                theme === 'dark' ? "bg-black border border-white/5" : "bg-white border border-gray-100"
            )}
        >
            {/* CLASSIC HEADER: Always at the top */}
            <div className="px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div
                        onClick={handleAvatarClick}
                        className={clsx(
                            "w-11 h-11 rounded-full p-0.5 relative transition-all shrink-0 cursor-pointer",
                            hasStory ? "ring-2 ring-brand-red shadow-glow animate-pulse" : "ring-1 ring-white/10"
                        )}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden relative bg-zinc-900 border border-white/10">
                            {avatar && isImageUrl(avatar) ? (
                                <Image src={avatar} alt={user} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white uppercase bg-brand-red">
                                    {user?.substring(0, 2) || "?"}
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <Link href={username ? `/dashboard/profile/${username}` : `/dashboard`} className="flex items-center gap-1.5 group">
                            <span className={clsx(
                                "font-black italic uppercase text-base tracking-tighter transition-colors group-hover:text-brand-red",
                                theme === 'dark' ? "text-white" : "text-zinc-900"
                            )}>
                                {user}
                            </span>
                            {isOfficial && <VerifiedBadge size="sm" />}
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">{time}</span>
                        </div>
                    </div>
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 border",
                            theme === 'dark' ? "bg-white/5 text-white border-white/10 hover:bg-brand-red" : "bg-gray-100 text-zinc-900 border-gray-200 hover:bg-zinc-200"
                        )}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95">
                            <button onClick={() => { window.dispatchEvent(new CustomEvent('edit-post', { detail: { postId, content: caption || '', mediaType } })); setShowMenu(false); }} className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-brand-red flex items-center gap-3 border-b border-white/5">
                                <Edit2 className="w-4 h-4" /> EDITAR
                            </button>
                            <button onClick={handleDownloadMedia} className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-brand-red flex items-center gap-3 border-b border-white/5">
                                <Download className="w-4 h-4" /> DESCARGAR
                            </button>
                            {(isOwner || isAdminUser) && (
                                <button onClick={handleDelete} className="w-full px-5 py-4 text-left text-[11px] font-black text-red-500 hover:bg-red-600 hover:text-white flex items-center gap-3">
                                    <Trash2 className="w-4 h-4" /> ELIMINAR
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area (Media protagonism) - Only shown if there is photo/video/carousel */}
            {hasMedia && (
                <div className="relative w-full overflow-hidden bg-black aspect-[4/5] md:aspect-[4/5]"> 
                    {/* Media rendering */}
                    <div 
                        className="relative w-full h-full cursor-pointer overflow-hidden"
                        onClick={() => { 
                            if (isVideo) {
                                toggleMute();
                                setShowMuteHint(false);
                            } else {
                                setIsLightboxOpen(true);
                            }
                        }}
                    >
                        {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ 
                                        opacity: showMuteHint ? 1 : 0, 
                                        scale: showMuteHint ? 1 : 0.5 
                                    }}
                                    className="bg-black/40 backdrop-blur-xl p-4 rounded-full border border-white/20"
                                >
                                    {isMuted ? <VolumeX className="w-8 h-8 text-white" /> : <Volume2 className="w-8 h-8 text-white" />}
                                </motion.div>
                            </div>
                        )}

                        {isVideo && (
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    toggleMute(); 
                                    setLastActiveVideoId(postId);
                                }}
                                className="absolute bottom-6 left-6 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 z-40 transition-all active:scale-90"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        )}

                        {loadError && (
                            <div className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-8 text-center animate-in fade-in duration-500">
                                <div className="w-20 h-20 rounded-full bg-brand-red/10 flex items-center justify-center mb-6 border border-brand-red/20">
                                    <ZapOff className="w-10 h-10 text-brand-red" />
                                </div>
                                <h4 className="text-lg font-black uppercase italic text-white mb-2 tracking-tighter">VIDEO_NO_DISPONIBLE</h4>
                                <p className="text-xs text-white/40 uppercase font-bold tracking-widest leading-relaxed mb-8 max-w-[200px]">EL FORMATO NO ES COMPATIBLE O EL ARCHIVO ESTÁ DAÑADO.</p>
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setLoadError(false); 
                                        setIsBuffering(true); 
                                        if (videoRef.current) {
                                            videoRef.current.load();
                                            videoRef.current.play().catch(() => {});
                                        }
                                    }}
                                    className="px-8 py-4 bg-brand-red text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-glow active:scale-95 transition-all"
                                >
                                    REINTENTAR CARGA
                                </button>
                            </div>
                        )}

                        {isBuffering && !loadError && (
                            <div className="absolute inset-0 z-[45] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin" />
                                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] animate-pulse">CARGANDO...</span>
                                </div>
                            </div>
                        )}

                        {isVideo ? (
                            <video
                                ref={videoRef}
                                src={image}
                                className="w-full h-full object-cover"
                                loop
                                playsInline
                                muted={isMuted || !isVisible || (typeof document !== 'undefined' && document.hidden)}
                                preload="auto"
                                onCanPlay={() => { 
                                    if (isVisible && videoRef.current) {
                                        videoRef.current.play().catch((err) => { 
                                            console.warn("[FeedPost] Video play failed:", err);
                                            setLoadError(true); 
                                            setIsBuffering(false); 
                                        });
                                    }
                                }}
                                onWaiting={() => setIsBuffering(true)}
                                onPlaying={() => { setIsBuffering(false); setIsActuallyPlaying(true); setLoadError(false); }}
                                onPause={() => setIsActuallyPlaying(false)}
                                onEnded={() => setIsActuallyPlaying(false)}
                                onError={(e) => { 
                                    console.error("[FeedPost] Video load error:", e);
                                    setLoadError(true); 
                                    setIsBuffering(false); 
                                }}
                            />
                        ) : isCarousel ? (
                            <div className="relative w-full h-full group/carousel">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={carouselIndex}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="relative w-full h-full"
                                    >
                                        <div className="relative w-full h-full">
                                            <Image 
                                                src={carouselItems[carouselIndex]} 
                                                alt="Slide" 
                                                fill 
                                                className="object-cover"
                                                onLoadingComplete={() => setIsBuffering(false)}
                                            />
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                                
                                {/* Carousel Navigation Arrows */}
                                {carouselItems.length > 1 && (
                                    <>
                                        {carouselIndex > 0 && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setCarouselIndex(carouselIndex - 1); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white z-40 transition-all active:scale-90 shadow-lg border border-white/10"
                                            >
                                                <ChevronLeft className="w-6 h-6" />
                                            </button>
                                        )}
                                        {carouselIndex < carouselItems.length - 1 && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setCarouselIndex(carouselIndex + 1); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white z-40 transition-all active:scale-90 shadow-lg border border-white/10"
                                            >
                                                <ChevronRight className="w-6 h-6" />
                                            </button>
                                        )}
                                        
                                        {/* Dots Indicator */}
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
                                            {carouselItems.map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className={clsx(
                                                        "w-1.5 h-1.5 rounded-full transition-all",
                                                        i === carouselIndex ? "bg-brand-red w-4 shadow-glow" : "bg-white/40"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <Image 
                                src={photoUrl || '/placeholder.png'} 
                                alt="Post Media" 
                                fill 
                                className="object-cover hover:scale-105 transition-transform duration-1000" 
                                unoptimized={photoUrl?.startsWith('data:')}
                                onLoadingComplete={() => setIsBuffering(false)}
                                onError={() => {
                                    setIsBuffering(false);
                                    setLoadError(true);
                                }}
                            />
                        )}

                    </div>
                </div>
            )}

            {/* ACTION BAR: Horizontal layout below media */}
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <LikeButton postId={postId} initialLikes={initialLikes} hasLikedInitial={hasLikedInitial} />
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }} 
                        className="flex flex-col items-center gap-1 group text-zinc-400 hover:text-white transition-colors"
                    >
                        <MessageCircle className={clsx("w-7 h-7 transition-all active:scale-90", showComments && "fill-brand-red text-brand-red")} />
                        <span className="text-[10px] font-black">{commentsCount}</span>
                    </button>
                    <ShareButton
                        image={image}
                        workoutData={resolvedWorkoutData}
                        mediaType={mediaType}
                        postId={postId}
                        photoUrl={photoUrl}
                        caption={caption}
                        className="text-zinc-400 hover:text-white transition-colors"
                        iconClassName="w-7 h-7"
                        onInstagramShare={() => setShowInstagramCard(true)}
                        onOpenShareCard={() => setShowShareCard(true)}
                        onDownloadMedia={handleDownloadMedia}
                        isVideo={isVideo}
                        onRepostClick={() => setShowRepostModal(true)}
                        onMessageClick={() => { setShowDMModal(true); loadDMFollows(); }}
                    />
                </div>

                {music_url && (
                    <button 
                        onClick={toggleMusic}
                        className={clsx(
                            "w-10 h-10 rounded-full border-2 border-brand-red/50 p-1 relative transition-all group active:scale-90 bg-black shadow-glow",
                            isPlaying && "animate-[spin_4s_linear_infinite]"
                        )}
                    >
                        <Image src="/logo.svg" alt="Music" fill className="object-contain p-2" />
                    </button>
                )}
            </div>

            {/* CAPTION: Classic Instagram style below actions */}
            {caption && (
                <div className="px-6 pb-4">
                    <div className="text-[13px] leading-relaxed">
                        <span className="font-black uppercase italic tracking-tighter text-brand-red mr-2">{username || user}</span>
                        <div className={clsx(
                            "inline transition-all duration-300",
                            theme === 'dark' ? "text-white/90" : "text-zinc-900"
                        )}>
                            <MentionText text={caption} />
                        </div>
                    </div>
                </div>
            )}

            {/* SECONDARY SECTION: WODs, PRs & Supplementary Data */}
            {(resolvedWorkoutData || wod_data || post_type === 'wod' || mediaType === 'pr' || mediaType === 'class_result' || mediaType === 'membership_activation' || mediaType === 'repost') && (
                <div className={clsx(
                    "p-4 md:p-8 border-t border-white/5",
                    theme === 'dark' ? "bg-zinc-950" : "bg-gray-50"
                )}>
                    {/* WOD Display (WOD of the Day type) */}
                    {post_type === 'wod' && wod_data && (
                        <div className="space-y-6">
                            <WODPostDisplay wod={wod_data} compact={false} />
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    className="flex-1 bg-gradient-to-r from-brand-red to-orange-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-2 shadow-glow active:scale-95 transition-all"
                                    onClick={() => setShowWODTracker(true)}
                                >
                                    <Trophy className="w-5 h-5" /> {hasCompletedWod ? 'EDITAR MI RESULTADO' : 'REGISTRAR RESULTADO'}
                                </button>
                                <div className="flex gap-4 flex-1">
                                    <button
                                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
                                        onClick={() => setShowWODLeaderboard(true)}
                                    >
                                        <Trophy className="w-5 h-5 text-brand-yellow" /> RANKING
                                    </button>
                                    <button
                                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-2 transition-all group"
                                        onClick={handleRepost}
                                    >
                                        <Repeat className="w-5 h-5 text-brand-red group-hover:rotate-180 transition-transform duration-500" /> REPOST
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PR Card */}
                    {mediaType === 'pr' && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                             {(() => {
                                let prData: any = {};
                                try { if (typeof image === 'string' && image.startsWith('{')) prData = JSON.parse(image); } catch (e) { }
                                return (
                                    <PRCard
                                        userName={user}
                                        avatarUrl={avatar}
                                        sport={prData.sport || "Cross Training"}
                                        exerciseName={prData.exerciseName || "Ejercicio"}
                                        weight={prData.weight || "0"}
                                        unit={prData.unit || "kg"}
                                        backgroundImage={photoUrl}
                                    />
                                );
                            })()}
                        </div>
                    )}

                    {/* Class Result / Multi-exercise workout */}
                    {mediaType === 'class_result' && (
                        <div className="space-y-4">
                            {(() => {
                                let blocks: any[] = [];
                                try {
                                    const parsed = JSON.parse(image);
                                    if (Array.isArray(parsed)) blocks = parsed.filter(b => b.type !== 'metadata');
                                } catch (e) { }

                                if (!isExpanded) {
                                    return (
                                        <button onClick={() => setIsExpanded(true)} className="w-full border rounded-3xl p-6 bg-white/5 border-white/10 hover:border-brand-red/50 transition-all flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20 group-hover:scale-110 transition-all">
                                                    <Dumbbell className="w-6 h-6" />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="text-lg font-black italic uppercase text-white leading-none">ENTRENAMIENTO COMPLETADO</h4>
                                                    <p className="text-[10px] text-brand-red font-bold uppercase tracking-widest mt-1">{blocks.length} EJERCICIOS REGISTRADOS</p>
                                                </div>
                                            </div>
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        </button>
                                    );
                                }

                                return (
                                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">DESGLOSE</span>
                                            <button onClick={() => setIsExpanded(false)} className="text-[10px] font-black text-brand-red uppercase flex items-center gap-1">CERRAR <ChevronUp className="w-3 h-3" /></button>
                                        </div>
                                        {blocks.map((block: any, idx: number) => {
                                            const isInnerExpanded = expandedInnerBlocks.includes(idx);
                                            return (
                                                <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer" onClick={() => toggleInnerBlock(idx)}>
                                                    <div className="flex justify-between items-center">
                                                        <h5 className="text-sm font-black text-white italic uppercase">{block.title}</h5>
                                                        <span className="text-xl font-black text-brand-red italic">{block.value}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Repost Card */}
                    {mediaType === 'repost' && (
                        <RepostCard image={image} caption={caption} prefetchedPost={repostOriginalPost} />
                    )}

                    {/* Membership Activation */}
                    {mediaType === 'membership_activation' && (
                        <div className="rounded-[40px] p-10 bg-brand-red/5 border border-brand-red/20 text-center space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-brand-red/10 blur-3xl animate-pulse" />
                            <div className="w-24 h-24 rounded-full bg-brand-red/10 flex items-center justify-center mx-auto border border-brand-red/30 shadow-glow">
                                <CheckCircle2 className="w-12 h-12 text-brand-red" />
                            </div>
                            <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">¡MEMBRESÍA ACTIVA!</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{caption || 'Iniciando una nueva etapa de alto rendimiento.'}</p>
                        </div>
                    )}

                    {/* Normalized Workout Card (Endurance or Lift) */}
                    {resolvedWorkoutData && !['pr', 'class_result', 'membership_activation'].includes(mediaType ?? '') && (
                        <WodCard
                            completionsCount={completionsCountWod}
                            hasCompleted={hasCompletedWod}
                            data={resolvedWorkoutData as any}
                            userName={username || user}
                            publishDate={time}
                            postId={postId}
                        />
                    )}
                </div>
            )}


            {/* Comments Section */}
            {
                showComments && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-4">
                        <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {isLoadingComments ? (
                                <div className="text-center text-gray-500 py-4 text-xs">Cargando...</div>
                            ) : commentTree.length > 0 ? (
                                commentTree.map((comment) => <CommentNode key={comment.id} comment={comment} />)
                            ) : (
                                <div className="text-center text-gray-500 py-4 text-xs italic">Aún no hay comentarios.</div>
                            )}
                        </div>
                        <form onSubmit={(e) => handleAddComment(e, replyingTo?.id)} className="flex flex-col gap-2 border-t border-white/5 pt-4 mt-2">
                            {replyingTo && (
                                <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-xs">
                                    <span className="text-gray-400">Respondiendo a <span className="font-bold text-brand-red">{replyingTo.user?.username || 'usuario'}</span></span>
                                    <button type="button" onClick={() => setReplyingTo(null)}><X className="w-3 h-3" /></button>
                                </div>
                            )}
                            <div className="flex gap-2 items-center relative">
                                <div className="relative flex-1 flex items-center">
                                    <MentionInput
                                        id={`comment-input-${postId}`}
                                        value={newComment}
                                        onChange={setNewComment}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment(e, replyingTo?.id);
                                            }
                                        }}
                                        placeholder="Escribe un comentario..."
                                        className={clsx(
                                            "flex-1 border rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-brand-red/50 transition-all",
                                            theme === 'dark' ? "bg-black/40 border-white/10 text-white" : "bg-gray-100 border-gray-200 text-gray-900"
                                        )}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="absolute right-3 text-gray-500 hover:text-brand-red transition-colors"
                                    >
                                        <Smile className="w-5 h-5" />
                                    </button>
                                </div>
                                <button type="submit" disabled={!newComment.trim() || isPostingComment} className="p-2.5 bg-brand-red text-white rounded-xl hover:bg-red-600 transition-colors shadow-glow disabled:opacity-50 disabled:shadow-none">
                                    {isPostingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>

                                {showEmojiPicker && (
                                    <div className="absolute bottom-full right-0 mb-4 z-[60]" ref={emojiPickerRef}>
                                        <EmojiPicker 
                                            theme={theme as any}
                                            onEmojiClick={onEmojiClick}
                                            autoFocusSearch={false}
                                        />
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>
                )
            }

            {/* Lightbox / Video Reels */}
            {
                isLightboxOpen && (
                    isVideo ? (
                        <VideoReelsModal
                            isOpen={isLightboxOpen}
                            onClose={() => setIsLightboxOpen(false)}
                            initialPostId={postId}
                            context={context}
                        />
                    ) : (
                        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsLightboxOpen(false)}>
                            <button
                                onClick={() => setIsLightboxOpen(false)}
                                className="absolute top-6 right-6 text-white hover:text-brand-red focus:outline-none transition-colors z-[110] bg-black/20 p-2 rounded-full"
                            >
                                <X className="w-8 h-8 md:w-10 md:h-10" />
                            </button>
                            <div className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                <img src={photoUrl} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]" />
                            </div>
                        </div>
                    )
                )
            }
            {
                showInstagramCard && (() => {
                    const wd: any = Array.isArray(resolvedWorkoutData) ? resolvedWorkoutData[0] : resolvedWorkoutData;
                    // Blocks: try all sources — completed workout metrics, AI WOD data, or direct blocks
                    const wodBlocks =
                        wd?.metrics?.blocks ||
                        wd?.blocks ||
                        parsedWodData?.blocks ||
                        null;
                    // Duration: try all sources
                    const durLabel = wd?.metrics?.duration || wd?.metrics?.time || wd?.summary?.totalTime || parsedWodData?.summary?.totalTime || undefined;
                    const durSec = wd?.duration_seconds || wd?.metrics?.duration_seconds || wd?.duration || (() => {
                        // Parse durLabel string like "45:30" → total seconds
                        if (durLabel && typeof durLabel === 'string' && durLabel.includes(':')) {
                            const parts = durLabel.split(':').map(Number);
                            if (parts.length === 2) return parts[0] * 60 + (parts[1] || 0);
                            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
                        }
                        return 0;
                    })();
                    // Title & sport
                    const wodTitle = wd?.title || parsedWodData?.title || 'Entrenamiento';
                    const wodSport = wd?.sport_type || parsedWodData?.sportType || 'Cross Training';

                    // Resolve category and run metrics from all sources
                    const wodCategory = parsedWodData?.category || wd?.category || wd?.metrics?.type?.toUpperCase();
                    const isEndurancePost = ['RUNNING','CYCLING','SWIMMING'].includes(wodCategory || '') || wodSport?.toLowerCase() === 'running';
                    const runMetricsData = isEndurancePost ? {
                        distance: wd?.metrics?.distance ? `${(wd.metrics.distance / 1000).toFixed(2)} KM` : undefined,
                        pace: wd?.metrics?.pace || undefined,
                        elevation: wd?.metrics?.elevation ? `${wd.metrics.elevation}M` : undefined,
                    } : undefined;

                    // For WODs with real blocks → use WorkoutShareCard (shows exercises + reps + weights)
                    if (wodBlocks && wodBlocks.length > 0) {
                        return (
                            <WorkoutShareCard
                                blocks={wodBlocks}
                                workoutTitle={wodTitle}
                                sportType={wodSport}
                                category={wodCategory}
                                wodBlocks={parsedWodData?.blocks || wd?.blocks}
                                runMetrics={runMetricsData}
                                duration={durSec}
                                durationLabel={durLabel}
                                date={time}
                                userName={user}
                                onClose={() => setShowInstagramCard(false)}
                            />
                        );
                    }
                    // Fallback for running / PR / generic posts
                    return (
                        <InstagramShareCard
                            user={user}
                            username={username || user}
                            avatar={avatar}
                            content={{
                                type: (resolvedWorkoutData as any)?.metrics?.type === 'running' ? 'running' : (mediaType === 'pr' ? 'pr' : (resolvedWorkoutData ? 'wod' : (mediaType as any || 'workout'))),
                                title: (resolvedWorkoutData?.title === 'Entrenamiento Híbrido Libre' || resolvedWorkoutData?.title === 'Entrenamiento Híbrido') ? 'ENTRENAMIENTO HÍBRIDO' : (resolvedWorkoutData?.title === 'Simulación de Carrera Híbrida' ? 'SIMULACIÓN DE CARRERA' : (resolvedWorkoutData?.title || (mediaType === 'running' ? 'RUNNING' : 'ENTRENAMIENTO'))),
                                highlight: highlight || caption,
                                stats: (resolvedWorkoutData as any)?.metrics?.type === 'running'
                                    ? [
                                        { label: 'DISTANCIA', value: `${(((resolvedWorkoutData as any).metrics.distance || 0) / 1000).toFixed(2)} KM`, icon: 'distance' },
                                        { label: 'RITMO', value: (resolvedWorkoutData as any).metrics.pace || '0:00', icon: 'pace' },
                                        { label: 'TIEMPO', value: (resolvedWorkoutData as any).metrics.time || '00:00', icon: 'time' },
                                        { label: 'DESNIVEL', value: `${(resolvedWorkoutData as any).metrics.elevation || 0}m`, icon: 'elevation' },
                                        { label: 'PULSO MED.', value: `${(resolvedWorkoutData as any).metrics.avgHeartRate || 0}`, icon: 'heart' }
                                    ]
                                    : (() => {
                                        if (mediaType === 'pr') {
                                            try {
                                                const d = JSON.parse(image);
                                                return [
                                                    { label: 'EJERCICIO', value: d.exerciseName?.toUpperCase() },
                                                    { label: 'PESO', value: `${d.weight}${d.unit}` }
                                                ];
                                            } catch (e) {
                                                // Fallback: Parse from title "Back Squat : 180kg"
                                                const text = highlight || wodTitle || '';
                                                const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|lbs|lb)/i);
                                                const exerciseMatch = text.split(/[:!]/).pop()?.split(weightMatch?.[0] || '')[0]?.trim();
                                                
                                                return [
                                                    { label: 'EJERCICIO', value: exerciseMatch?.toUpperCase() || 'PERSONAL RECORD' },
                                                    { label: 'PESO', value: weightMatch?.[0] || '0' }
                                                ];
                                            }
                                        }
                                        return [];
                                    })(),
                                image: photoUrl,
                                mapData: (resolvedWorkoutData as any)?.metrics?.path ? 'GPS_PATH_ACTIVE' : undefined
                            }}
                            onClose={() => setShowInstagramCard(false)}
                        />
                    );
                })()
            }
            {
                showShareCard && (() => {
                    const wd = resolvedWorkoutData;
                    const hasPath = (wd?.metrics?.path?.length ?? 0) > 0;
                    const sportTypeLower = (wd?.sport_type || '').toLowerCase();
                    const titleLower = (wd?.title || highlight || '').toLowerCase();
                    const isEndurance = hasPath ||
                        wd?.metrics?.type === 'running' ||
                        wd?.metrics?.distance > 0 ||
                        ['running', 'cycling', 'swimming'].includes(sportTypeLower) ||
                        titleLower.includes('running') || titleLower.includes('carrera') ||
                        titleLower.includes('cycling') || titleLower.includes('ciclismo') ||
                        titleLower.includes('swimming') || titleLower.includes('natación');

                    if (hasPath) {
                        return (
                            <RunShareCard
                                imageUrl={image && isImageUrl(image) ? image : null}
                                distance={wd.metrics.distance || 0}
                                time={wd.duration || 0}
                                pace={wd.metrics.pace || "0:00"}
                                elevation={wd.metrics.elevation || 0}
                                path={wd.metrics.path || []}
                                date={time}
                                userName={user}
                                onClose={() => setShowShareCard(false)}
                            />
                        );
                    }

                    if (isEndurance) {
                        const categoryMap: Record<string, string> = { running: 'RUNNING', cycling: 'CYCLING', swimming: 'SWIMMING' };
                        const category = categoryMap[sportTypeLower] ||
                            (titleLower.includes('cycling') || titleLower.includes('ciclismo') ? 'CYCLING' :
                             titleLower.includes('swimming') || titleLower.includes('natación') ? 'SWIMMING' : 'RUNNING');
                        const distM = wd?.metrics?.distance || 0;
                        const distKm = distM > 0 ? `${(distM / 1000).toFixed(2)} KM` : undefined;
                        const durationSecs = wd?.duration || wd?.metrics?.duration || 0;
                        const timeLabel = durationSecs > 0
                            ? `${Math.floor(durationSecs / 60)}:${String(durationSecs % 60).padStart(2, '0')}`
                            : undefined;
                        return (
                            <WorkoutShareCard
                                blocks={wd?.blocks || []}
                                workoutTitle={wd?.title || `SESIÓN DE ${category}`}
                                sportType={category.charAt(0) + category.slice(1).toLowerCase()}
                                category={category}
                                runMetrics={{
                                    distance: distKm,
                                    pace: wd?.metrics?.pace,
                                    elevation: wd?.metrics?.elevation ? `${wd.metrics.elevation}M` : undefined,
                                }}
                                duration={durationSecs}
                                durationLabel={timeLabel}
                                date={time}
                                userName={user}
                                onClose={() => setShowShareCard(false)}
                            />
                        );
                    }

                    return (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-500">
                                <button
                                    onClick={() => setShowShareCard(false)}
                                    className="fixed top-6 right-6 z-[110] bg-black/50 backdrop-blur-md p-3 rounded-full text-white hover:text-brand-red transition-all active:scale-95 flex items-center gap-2 border border-white/10"
                                >
                                    <X className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest mr-1 hidden sm:inline">Cerrar</span>
                                </button>
                                <ShareableCard
                                    user={{
                                        name: user,
                                        username: username || user,
                                        avatar: avatar,
                                        level: 12,
                                        rank: "ELITE"
                                    }}
                                    data={{
                                        type: mediaType === 'pr' ? 'pr' : mediaType === 'class_result' ? 'medal' : 'workout',
                                        title: (wd?.sport_type && wd.sport_type !== 'fitness') ? wd.sport_type.toUpperCase() : (highlight || wd?.title || 'ENTRENAMIENTO'),
                                        date: time,
                                        stats: mediaType === 'pr' ? (() => {
                                            try { 
                                                const d = JSON.parse(image); 
                                                return [
                                                    { label: "PESO", value: `${d.weight}${d.unit}` }, 
                                                    { label: "EJERCICIO", value: d.exerciseName?.toUpperCase() }
                                                ]; 
                                            } catch (e) { 
                                                const text = highlight || wd?.title || '';
                                                const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|lbs|lb)/i);
                                                const exerciseMatch = text.split(/[:!]/).pop()?.split(weightMatch?.[0] || '')[0]?.trim();
                                                return [
                                                    { label: "PESO", value: weightMatch?.[0] || '0' },
                                                    { label: "EJERCICIO", value: exerciseMatch?.toUpperCase() || 'PR' }
                                                ];
                                            }
                                        })() : (wd as any)?.metrics?.blocks?.map((b: any) => ({
                                            label: b.type?.toUpperCase(),
                                            value: b.result?.time || `${b.result?.rounds || 0} RDS`
                                        })).slice(0, 3) || [{ label: "DISCIPLINA", value: (wd?.sport_type || "FITNESS").toUpperCase() }, { label: "ESTADO", value: "FINALIZADO" }],
                                        image: isImageUrl(image) ? image : (() => {
                                            try { return JSON.parse(image).image; } catch(e) { return undefined; }
                                        })()
                                    }}
                                />
                            </div>
                        </div>
                    );
                })()
            }

            {/* Repost Modal */}
            {showRepostModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/50">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Repeat className="w-4 h-4 text-brand-red" /> Repostear Publicación</h3>
                            <button onClick={() => setShowRepostModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 flex flex-col gap-4">
                            <textarea
                                value={repostCaption}
                                onChange={(e) => setRepostCaption(e.target.value)}
                                placeholder="Escribe un comentario sobre esta publicación..."
                                className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-brand-red/50 focus:outline-none min-h-[100px] resize-none"
                            />
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleShareRepost}
                                    disabled={isReposting}
                                    className="px-6 py-2 bg-brand-red text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isReposting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                                    {isReposting ? 'Publicando...' : 'Compartir ahora'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Send DM Modal */}
            {showDMModal && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-full sm:slide-in-from-bottom-0">
                    <div className="bg-zinc-950 border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-md flex flex-col shadow-2xl h-[80vh] sm:h-auto">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-zinc-950 z-10 rounded-t-3xl sm:rounded-2xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-gray-300" /> Enviar por DM</h3>
                            <button onClick={() => setShowDMModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3">Buscar amigos</p>
                            <div className="space-y-2">
                                {dmFollows.map(friend => (
                                    <button 
                                        key={friend.id} 
                                        onClick={() => setSelectedDmUser(friend.id)}
                                        className={clsx(
                                            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                            selectedDmUser === friend.id ? "bg-brand-red/10 border-brand-red" : "bg-black/20 border-white/5 hover:border-white/20"
                                        )}
                                    >
                                        <img src={friend.avatar_url || '/default-avatar.png'} alt={friend.username} className="w-10 h-10 rounded-full object-cover bg-gray-800" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-white">@{friend.username}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{friend.full_name}</p>
                                        </div>
                                        {selectedDmUser === friend.id && <CheckCircle2 className="w-5 h-5 text-brand-red" />}
                                    </button>
                                ))}
                                {dmFollows.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-xs italic">Aún no sigues a nadie.</div>
                                )}
                            </div>
                        </div>
                        {selectedDmUser && (
                            <div className="p-4 border-t border-white/10 bg-black/50 animate-in slide-in-from-bottom-5">
                                <textarea
                                    value={dmMessage}
                                    onChange={(e) => setDmMessage(e.target.value)}
                                    placeholder="Añade un mensaje opcional..."
                                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm text-white focus:border-brand-red/50 focus:outline-none min-h-[60px] resize-none mb-3"
                                />
                                <button
                                    onClick={handleSendDM}
                                    disabled={isSendingDM}
                                    className="w-full py-3 bg-white text-black font-black uppercase tracking-widest text-[11px] rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSendingDM ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Send className="w-4 h-4" />}
                                    {isSendingDM ? 'Enviando...' : 'Enviar mensaje'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
});

export default FeedPost;

function LikeButtonWithText({ postId, initialLikes, hasLikedInitial, text }: { postId: string, initialLikes: number, hasLikedInitial: boolean, text: string }) {
    const [likes, setLikes] = useState(initialLikes);
    const [hasLiked, setHasLiked] = useState(hasLikedInitial);
    const [isPending, setIsPending] = useState(false);

    const handleToggle = async () => {
        if (isPending) return;
        setIsPending(true);

        const newLikes = hasLiked ? Math.max(0, likes - 1) : likes + 1;
        const newHasLiked = !hasLiked;

        setLikes(newLikes);
        setHasLiked(newHasLiked);

        const result = await toggleLike(postId);
        if (result.error) {
            setLikes(likes);
            setHasLiked(hasLiked);
            alert("Error: " + result.error);
        }
        setIsPending(false);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={clsx(
                "w-full py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all active:scale-95 shadow-glow",
                hasLiked ? "bg-brand-red text-white" : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
            )}
        >
            <span>{text}</span>
            <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px]">{likes}</span>
        </button>
    );
}
