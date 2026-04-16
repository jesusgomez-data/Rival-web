"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, MessageCircle, Share2, Trophy, X, Send, Smile, Play, Pause, Trash2, Edit2, Save, Heart, Dumbbell, Activity, ChevronDown, ChevronUp, Music, Plus, CheckCircle2, Instagram, Swords, Download, Loader2, Repeat, MessageSquare, Volume2, VolumeX, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { VideoProcessor } from "./stories/VideoProcessor";
import LikeButton from "./community/LikeButton";
import DuelButton from "./community/DuelButton";
import { addComment, getComments, deletePost, updatePost, toggleCommentLike, toggleLike } from "./community/actions";
import { createRepost } from "./community/repost-actions";
import { sharePostViaMessage } from "./community/dm-actions";
import { getFollows } from "./community/follows-actions";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { createClient } from "@/utils/supabase/client";
import { clsx } from "clsx";
import { useTheme } from "../ThemeContext";
import { isImageUrl } from "@/lib/utils"; import { useStories } from "./stories/StoryContext";
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
                <div className="absolute right-0 bottom-full mb-2 w-56 bg-black border border-white/10 rounded-2xl shadow-2xl z-[50] overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
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
                </div>
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

export default function FeedPost({ postId, username, user, action, time, avatar, image, initialLikes, hasLikedInitial, comments: initialCommentsCount, highlight, mediaType, caption, currentUserId, authorId, centerName,
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
    
    // Robustly resolve the photo/media URL
    const photoUrl = useMemo(() => {
        if (!image && !workoutData?.image) return undefined;
        
        let targetMedia: string | undefined = image;

        // If image is JSON, try to extract the URL
        if (targetMedia && targetMedia.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(targetMedia.trim());
                targetMedia = parsed.image || parsed.backgroundImage || parsed.media_url || parsed.mediaUrl || parsed.url;
            } catch(e) { targetMedia = undefined; }
        }
        
        // If image is JSON array (carousel), get first image
        if (targetMedia && targetMedia.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(targetMedia.trim());
                if (Array.isArray(parsed) && parsed.length > 0) {
                    targetMedia = parsed[0];
                }
            } catch(e) { }
        }

        // Final fallback to workout media if still nothing
        const finalUrl = targetMedia || workoutData?.image || workoutData?.metrics?.image;
        
        return isImageUrl(finalUrl) ? finalUrl : undefined;
    }, [image, workoutData]);


    const isCarousel = mediaType === 'carousel';
    const [carouselIndex, setCarouselIndex] = useState(0);
    const carouselItems = useMemo(() => {
        if (!isCarousel) return [];
        try {
            const parsed = JSON.parse(image);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            return [image];
        }
    }, [image, isCarousel]);

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
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Estados para modales de WOD
    const [showWODTracker, setShowWODTracker] = useState(false);
    const [showWODLeaderboard, setShowWODLeaderboard] = useState(false);
    const [completionsCountWod, setCompletionsCountWod] = useState(0);
    const [hasCompletedWod, setHasCompletedWod] = useState(false);
    const [manualOriginalId, setManualOriginalId] = useState<string | null>(null);
    const postRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { isMuted, toggleMute, setLastActiveVideoId, setIsMuted } = useVideo();
    const [isVisible, setIsVisible] = useState(false);
    const [showMuteHint, setShowMuteHint] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isActuallyPlaying, setIsActuallyPlaying] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Video detection (moved up to avoid TDZ ReferenceError)
    const isVideo = !!(image && (
        /\.(mp4|webm|ogg|mov|m4v)$/i.test(image) ||
        (mediaType && mediaType === 'video') ||
        image.includes('/videos/') ||
        image.includes('video/upload') ||
        image.includes('.mov?') ||
        image.includes('.mp4?')
    ));

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
        // Fetch completion data if it's a WOD post OR a post with resolved workout data that looks like a WOD
        const isWodData = resolvedWorkoutData && (resolvedWorkoutData.blocks || (resolvedWorkoutData.metrics && resolvedWorkoutData.metrics.blocks));
        if ((post_type === 'wod' || isWodData) && targetWodId) {
            fetchCompletionsCount(targetWodId);
            checkUserCompletion(targetWodId);
        }
    }, [post_type, targetWodId, resolvedWorkoutData]);

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
                "md:border md:rounded-2xl overflow-hidden transition-all mb-4 md:mb-6",
                "rounded-none md:rounded-2xl", // Flush on mobile, rounded on desktop
                theme === 'dark' ? "bg-brand-gray md:border-white/5 border-y-white/5" : "bg-white md:border-gray-200 border-y-gray-200 shadow-sm"
            )}
        >
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div
                    onClick={handleAvatarClick}
                    className={clsx(
                        "w-12 h-12 rounded-full p-0.5 relative transition-all shrink-0 cursor-pointer",
                        hasStory
                            ? (allSeen
                                ? "ring-2 ring-gray-500" // Seen stories = Gray Ring
                                : "ring-2 ring-brand-red bg-gradient-to-tr from-brand-red to-orange-500 shadow-glow animate-pulse" // Unseen = Red Ring
                            )
                            : "bg-transparent" // No stories = No Ring (just default image border)
                    )}
                >
                    <div className="w-full h-full rounded-full overflow-hidden relative bg-gray-800 border-2 border-black">
                        {avatar && isImageUrl(avatar) ? (
                            <Image 
                                src={avatar} 
                                alt={user} 
                                fill 
                                className={clsx(
                                    "object-cover",
                                    isOfficial && "object-contain bg-white p-1"
                                )} 
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                                {user?.substring(0, 2) || "?"}
                            </div>
                        )}
                    </div>
                </div>
                <Link href={username ? `/dashboard/profile/${username}` : `/dashboard`} className="flex-1 group">
                    <div>
                        <p className="text-base font-black group-hover:opacity-80 transition-opacity leading-tight uppercase font-heading italic tracking-tight flex items-center gap-1.5 text-brand-red">
                            {user}
                            {isOfficial && (
                                <VerifiedBadge size="sm" />
                            )}
                        </p>
                        <p className="text-[10px] text-brand-red font-black uppercase tracking-[0.2em] mt-0.5">
                            {action.includes('PR') || highlight?.includes('PR') ? 'NUEVO PR • ' : ''}
                            {time.toUpperCase()}
                        </p>
                        {music_url && (
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    onClick={toggleMusic}
                                    className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 px-2 py-0.5 rounded-full border border-white/10 transition-colors group"
                                >
                                    <Music className={clsx("w-3 h-3 text-brand-red", isPlaying && "animate-bounce")} />
                                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest max-w-[120px] truncate">
                                        {music_title} • {music_artist}
                                    </span>
                                </button>
                                <audio
                                    ref={audioRef}
                                    src={music_url}
                                    loop
                                    className="hidden"
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                />
                            </div>
                        )}
                    </div>
                </Link>

                <div className="flex items-center gap-4">
                    <p className="hidden sm:block text-[10px] text-gray-500 font-bold uppercase tracking-widest">{time}</p>
                    {(isOwner || isAdminUser) && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="text-gray-500 hover:text-white transition-colors p-2 bg-white/5 rounded-xl border border-white/5"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                             {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl z-20 backdrop-blur-xl overflow-hidden">
                                    <button
                                        onClick={() => {
                                            const eventData: any = {
                                                postId,
                                                content: caption || '',
                                                mediaType: mediaType
                                            };

                                            if (mediaType === 'wod') {
                                                let parsedWodData = wod_data;
                                                if (!parsedWodData && image) {
                                                    try { parsedWodData = JSON.parse(image); } catch (e) { }
                                                }
                                                eventData.wodData = parsedWodData;
                                            } else {
                                                eventData.mediaUrl = image && isImageUrl(image) ? image : null;
                                            }

                                            window.dispatchEvent(new CustomEvent('edit-post', {
                                                detail: eventData
                                            }));
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-5 py-4 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors border-b border-white/5"
                                    >
                                        <Edit2 className="w-4 h-4 text-brand-red" /> {mediaType === 'wod' ? 'Editar Entrenamiento / Post' : 'Editar Publicación'}
                                    </button>
                                    <button
                                        onClick={() => { handleDelete(); setShowMenu(false); }}
                                        className="w-full text-left px-5 py-4 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Eliminar Publicación
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Caption or WOD Display - Only show if not a class_result */}
            {((caption && mediaType !== 'class_result') || (post_type === 'wod' && wod_data)) && (
                <div className={post_type === 'wod' && wod_data ? "px-4 pb-3" : "px-4 pb-3"}>
                    {post_type === 'wod' && wod_data ? (
                        // Renderizar WOD con diseño especial
                        <WODPostDisplay wod={wod_data} compact={false} />
                    ) : (
                        // Renderizar caption normal
                        <MentionText
                            text={caption || ''}
                            className={clsx(
                                "text-sm sm:text-base whitespace-pre-wrap font-accent font-medium tracking-tight leading-relaxed",
                                theme === 'dark' ? "text-gray-100" : "text-black",
                                (isOfficial && workoutData && !isMember && username?.toLowerCase() !== 'rivalfit' && username?.toLowerCase() !== 'rival') && "blur-[2px] select-none pointer-events-none opacity-50"
                            )}
                            mentionClassName="font-black"
                        />
                    )}
                </div>
            )}

            {/* WOD Action Buttons - Hacer WOD y Ver Ranking */}
            {post_type === 'wod' && wod_data && (
                <div className="px-4 pb-4 space-y-3">
                    {/* Badge de cuántas personas lo completaron */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Trophy className="w-4 h-4 text-brand-red" />
                        <span>
                            <span className="font-bold text-white">{completionsCountWod} atletas</span> han completado este WOD
                        </span>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {hasCompletedWod && (
                            <button
                                className="flex-1 bg-gradient-to-r from-brand-red to-orange-600 hover:from-brand-accent hover:to-orange-700 text-white font-black uppercase tracking-widest text-[10px] md:text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-brand-red/50 active:scale-95"
                                onClick={() => setShowWODTracker(true)}
                            >
                                <Edit2 className="w-5 h-5" />
                                Editar mi resultado
                            </button>
                        )}
                        <div className="flex gap-3 flex-1">
                            <button
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] md:text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                onClick={() => setShowWODLeaderboard(true)}
                            >
                                <Trophy className="w-5 h-5 text-brand-yellow" />
                                Ranking
                            </button>
                            <button
                                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] md:text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 group"
                                onClick={handleRepost}
                            >
                                <Repeat className="w-5 h-5 text-brand-red group-hover:rotate-180 transition-transform duration-500" />
                                Repostear
                            </button>
                        </div>
                    </div>

                    {/* Modales */}
                    <WODTrackerModal
                        wodPostId={targetWodId}
                        wodTitle={parsedWodData?.title || "WOD"}
                        wodType="rounds"
                        isOpen={showWODTracker}
                        onClose={() => setShowWODTracker(false)}
                        onSuccess={() => window.location.reload()}
                    />
                    <WODLeaderboardModal
                        wodPostId={targetWodId}
                        wodTitle={parsedWodData?.title || "WOD"}
                        isOpen={showWODLeaderboard}
                        onClose={() => setShowWODLeaderboard(false)}
                    />
                </div>
            )}

            {/* Media Content - RESTRICTED IF OFFICIAL AND NO MEMBER */}
            {(isOfficial && resolvedWorkoutData && !isMember && username?.toLowerCase() !== 'rivalfit' && username?.toLowerCase() !== 'rival') ? (
                <div className="px-4 pb-6">
                    <div className="bg-muted/10 border border-white/5 border-dashed rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10" />
                        <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center mb-1 shadow-glow border border-brand-red/20 relative z-10">
                            <Dumbbell className="w-8 h-8 text-brand-red" />
                        </div>
                        <div className="relative z-10">
                            <h3 className={clsx(
                                "font-heading font-black italic uppercase text-lg mb-2 leading-none",
                                theme === 'dark' ? "text-white" : "text-gray-900"
                            )}>
                                Entrenamiento Exclusivo
                            </h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest max-w-[250px] mx-auto">
                                Este entrenamiento es solo para atletas de este centro. ¡Inscríbete para verlo!
                            </p>
                        </div>
                    </div>
                </div>
            ) : mediaType === 'pr' ? (
                <div className="px-4 pb-6 mt-2">
                    {(() => {
                        let prData: any = {};
                        try {
                            if (typeof image === 'string' && image.startsWith('{')) {
                                prData = JSON.parse(image);
                            }
                        } catch (e) { }

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
            ) : mediaType === 'class_result' ? (
                <div className="px-4 pb-6">
                    {(() => {
                        let blocks: any[] = [];
                        let centerName = "Centro Deportivo";
                        try {
                            const parsed = JSON.parse(image);
                            if (Array.isArray(parsed)) {
                                blocks = parsed.filter(b => {
                                    if (b.type === 'metadata') {
                                        if (b.centerName) centerName = b.centerName;
                                        return false;
                                    }
                                    return true;
                                });
                            }
                        } catch (e) {
                            blocks = [];
                        }

                        const summary = blocks.length > 1 ? `${blocks.length} EJERCICIOS` : (blocks[0]?.title || 'EJERCICIO');
                        const displayCenterName = centerName && !['Centro Deportivo', 'Gimnasio'].includes(centerName) ? ` @ ${centerName}` : '';

                        if (!isExpanded) {
                            return (
                                <button
                                    onClick={() => setIsExpanded(true)}
                                    className={clsx(
                                        "w-full border rounded-[18px] md:rounded-[24px] p-3 md:p-4 flex items-center justify-between hover:border-brand-red/50 transition-all group shadow-2xl relative overflow-hidden",
                                        theme === 'dark' ? "bg-[#121212] border-white/5 hover:bg-white/[0.04]" : "bg-gray-50 border-gray-100 hover:bg-white shadow-md"
                                    )}
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10" />
                                    <div className="flex items-center gap-3 md:gap-4 relative z-10 w-full overflow-hidden">
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20 group-hover:scale-110 transition-transform shrink-0">
                                            <Dumbbell className="w-4 h-4 md:w-5 md:h-5" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-[7px] md:text-[8px] text-gray-500 font-black uppercase tracking-[0.3em] mb-0.5 italic">RESUMEN</p>
                                            <h4 className={clsx(
                                                "text-sm md:text-lg font-accent font-bold uppercase tracking-tight group-hover:text-brand-red transition-colors leading-none truncate pr-2",
                                                theme === 'dark' ? "text-white" : "text-gray-900"
                                            )}>
                                                ENTRENAMIENTO DEL DÍA
                                            </h4>
                                            <p className="text-[8px] md:text-[9px] text-brand-red/70 font-bold uppercase tracking-widest mt-1 flex items-center gap-2 truncate">
                                                <span className="w-1 h-1 shrink-0 rounded-full bg-brand-red animate-pulse"></span>
                                                {summary}{displayCenterName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex bg-white/5 rounded-xl p-2.5 group-hover:bg-brand-red group-hover:text-white transition-all border border-white/5 shrink-0">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </button>
                            );
                        }

                        return (
                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">ENTRENAMIENTO COMPLETO</p>
                                    <button
                                        onClick={() => setIsExpanded(false)}
                                        className="text-[10px] text-brand-red font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        CONTRAER <ChevronUp className="w-3 h-3" />
                                    </button>
                                </div>
                                {blocks.map((block: any, idx: number) => {
                                    const title = (block.title || 'Ejercicio').toUpperCase();
                                    const value = block.value || '';
                                    const exercises = block.exercises || [];

                                    const valMatch = value.match(/^([0-9.]+)\s*(.*)$/);
                                    const valNum = valMatch ? valMatch[1] : value;
                                    const valUnit = valMatch ? valMatch[2] : '';

                                    const isInnerExpanded = expandedInnerBlocks.includes(idx);

                                    return (

                                        <div key={idx} className={clsx(
                                            "border rounded-xl md:rounded-2xl relative overflow-hidden group/card transition-all",
                                            theme === 'dark' ? "bg-[#121212] border-white/5" : "bg-white border-gray-100 shadow-sm",
                                            isInnerExpanded ? "p-3 md:p-4" : "p-2 md:p-3 hover:bg-white/[0.02] cursor-pointer"
                                        )} onClick={() => !isInnerExpanded && toggleInnerBlock(idx)}>
                                            <div className="relative z-10 space-y-1 md:space-y-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className={clsx(
                                                            "text-sm md:text-lg font-accent font-semibold tracking-tighter leading-none truncate pr-2",
                                                            theme === 'dark' ? "text-white" : "text-gray-900"
                                                        )}>
                                                            {title}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right shrink-0">
                                                            <span className="text-xl md:text-3xl font-accent font-bold text-brand-red tracking-tighter leading-none">
                                                                {valNum}
                                                            </span>
                                                            {valUnit && <span className="text-[9px] md:text-xs font-black text-brand-red ml-1 uppercase">{valUnit}</span>}
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleInnerBlock(idx); }}
                                                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                                                        >
                                                            {isInnerExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {isInnerExpanded && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-2">
                                                        <div className="w-full h-1 md:h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                            <div className="bg-brand-red h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: '75%' }}></div>
                                                        </div>

                                                        {exercises.length > 0 && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {exercises.map((ex: any, eIdx: number) => (
                                                                    <div key={eIdx} className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
                                                                        <p className="text-[8px] md:text-[9px] text-gray-500 font-black uppercase tracking-wider truncate">{ex.name}</p>
                                                                        <p className={clsx(
                                                                            "text-[10px] md:text-xs font-bold",
                                                                            theme === 'dark' ? "text-white" : "text-black"
                                                                        )}>{ex.value} {ex.reps ? `x ${ex.reps}` : ''}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );

                                })}

                                {caption && caption.includes('📝 COMENTARIO:') && (
                                    <div className="mt-2 p-6 bg-brand-red/5 border border-brand-red/10 rounded-[24px] relative overflow-hidden group shadow-lg">
                                        <div className="absolute top-0 right-0 p-6 opacity-5">
                                            <MessageCircle className="w-16 h-16 text-brand-red" />
                                        </div>
                                        <p className="text-brand-red font-accent font-semibold text-sm md:text-base relative z-10 leading-relaxed border-l-4 border-brand-red pl-6 py-2">
                                            {caption.split('📝 COMENTARIO:')[1].trim()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            ) : isCarousel ? (
                <div className="px-2 pb-4">
                    <div className="relative aspect-[4/5] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 group/carousel">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={carouselIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src={carouselItems[carouselIndex]}
                                    alt={`Slide ${carouselIndex + 1}`}
                                    fill
                                    className="object-cover"
                                />
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation Arrows */}
                        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity z-10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCarouselIndex(prev => Math.max(0, prev - 1));
                                }}
                                disabled={carouselIndex === 0}
                                className={clsx(
                                    "w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white pointer-events-auto transition-all",
                                    carouselIndex === 0 ? "opacity-0 cursor-default" : "hover:bg-black/80 hover:scale-110 active:scale-90 shadow-lg"
                                )}
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCarouselIndex(prev => Math.min(carouselItems.length - 1, prev + 1));
                                }}
                                disabled={carouselIndex === carouselItems.length - 1}
                                className={clsx(
                                    "w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 text-white pointer-events-auto transition-all",
                                    carouselIndex === carouselItems.length - 1 ? "opacity-0 cursor-default" : "hover:bg-black/80 hover:scale-110 active:scale-90 shadow-lg",
                                    (carouselIndex === 0 && carouselItems.length > 1) && "animate-pulse ring-2 ring-brand-red/50 shadow-glow"
                                )}
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Indicators */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-black/30 backdrop-blur-xl rounded-full border border-white/5">
                            {carouselItems.map((_, i) => (
                                <div
                                    key={i}
                                    className={clsx(
                                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                        carouselIndex === i ? "bg-brand-red w-4" : "bg-white/30"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : mediaType === 'repost' ? (
                <RepostCard image={image} caption={caption} prefetchedPost={repostOriginalPost} />
            ) : mediaType === 'membership_activation' ? (
                <div className="px-4 pb-6">
                    <div className={clsx(
                        "rounded-[28px] p-6 md:p-8 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden border shadow-xl shadow-brand-red/10",
                        theme === 'dark' ? "bg-black/40 border-brand-red/30" : "bg-white border-brand-red/20 shadow-lg"
                    )}>
                        {/* Animated background elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10 animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-red/5 blur-2xl -ml-10 -mb-10 animate-pulse" />

                        <div className="w-20 h-20 rounded-full bg-brand-red/10 flex items-center justify-center mb-1 shadow-glow border border-brand-red/20 relative z-10 animate-in zoom-in duration-500">
                            <CheckCircle2 className="w-10 h-10 text-brand-red" />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <h3 className="font-heading font-black italic uppercase text-xl md:text-2xl text-white tracking-tighter leading-none">¡MEMBRESÍA ACTIVADA!</h3>
                            <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-[0.2em] max-w-[300px] mx-auto leading-relaxed">
                                {caption || `¡Ha comenzado una nueva etapa de entrenamiento!`}
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 mt-2">
                            <span className="h-px w-8 bg-brand-red/30" />
                            <Trophy className="w-4 h-4 text-brand-red" />
                            <span className="h-px w-8 bg-brand-red/30" />
                        </div>
                    </div>
                </div>
            ) : (isImageUrl(image) || resolvedWorkoutData) ? (
                <div className="flex flex-col gap-4">
                    {isImageUrl(image) && (
                        <div className={isVideo ? "flex justify-center px-2" : "px-2"}>
                            <div className={`relative bg-black cursor-pointer group shadow-2xl overflow-hidden ${isVideo ? "aspect-[9/16] max-h-[80vh] w-full max-w-[480px] rounded-[24px] md:rounded-[32px] border border-white/10" : "aspect-video rounded-xl"}`} 
                                onClick={() => { 
                                    setIsLightboxOpen(true); 
                                    if (isVideo) setIsMuted(false);
                                }}
                            >
                                {isVideo ? (
                                    <div className="relative w-full h-full">
                                        <video
                                            ref={videoRef}
                                            src={image}
                                            className="w-full h-full object-cover"
                                            loop
                                            playsInline
                                            muted={isMuted || !isVisible || (typeof document !== 'undefined' && document.hidden)}
                                            preload="metadata"
                                            onCanPlay={() => { if (isVisible && videoRef.current) videoRef.current.play().catch(() => { setLoadError(true); setIsBuffering(false); }); }}
                                            onWaiting={() => setIsBuffering(true)}
                                            onPlaying={() => { setIsBuffering(false); setIsActuallyPlaying(true); setLoadError(false); }}
                                            onPause={() => setIsActuallyPlaying(false)}
                                            onEnded={() => setIsActuallyPlaying(false)}
                                            onError={() => { setLoadError(true); setIsBuffering(false); }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
                                        
                                        {/* Buffering Indicator */}
                                        <AnimatePresence>
                                            {isBuffering && !loadError && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px] z-10 gap-3">
                                                    <Loader2 className="w-10 h-10 text-brand-red animate-spin shadow-glow" />
                                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-lg">Cargando Video...</span>
                                                </div>
                                            )}
                                        </AnimatePresence>

                                        {/* Play Overlay (If paused but visible) */}
                                        <AnimatePresence>
                                            {isVisible && !isActuallyPlaying && !isBuffering && !loadError && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none">
                                                    <motion.div 
                                                        initial={{ scale: 0.5, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="bg-brand-red p-4 rounded-full shadow-glow"
                                                    >
                                                        <Play className="w-8 h-8 text-white fill-current" />
                                                    </motion.div>
                                                </div>
                                            )}
                                        </AnimatePresence>

                                        {/* Error Overlay */}
                                        <AnimatePresence>
                                            {loadError && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-10 p-6 text-center">
                                                    <X className="w-12 h-12 text-brand-red mb-3" />
                                                    <p className="text-white text-xs font-black uppercase tracking-widest">Error al cargar video</p>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setLoadError(false); setIsBuffering(true); if(videoRef.current) { videoRef.current.load(); videoRef.current.play().catch(() => { setLoadError(true); setIsBuffering(false); }); } }}
                                                        className="mt-4 px-4 py-2 bg-brand-red text-white text-[10px] font-black rounded-lg"
                                                    >
                                                        REINTENTAR
                                                    </button>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                        
                                        {/* Mute Hint Overlay */}
                                        <AnimatePresence>
                                            {showMuteHint && isMuted && (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none"
                                                >
                                                    <VolumeX className="w-4 h-4 text-white" />
                                                    <span className="text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Video silenciado</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        
                                        {/* Mute/Unmute Button */}
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                toggleMute(); 
                                            }}
                                            className="absolute bottom-4 right-4 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-md p-2.5 rounded-full border border-white/10 transition-all active:scale-90 group/mute keep-all"
                                        >
                                            {isMuted ? (
                                                <VolumeX className="w-4 h-4 text-white/90 group-hover/mute:text-white keep-white" />
                                            ) : (
                                                <Volume2 className="w-4 h-4 text-white/90 group-hover/mute:text-white keep-white" />
                                            )}
                                        </button>

                                        {/* Play/Pause Indicator (Mobile centered feedback) */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="bg-black/50 backdrop-blur-sm p-4 rounded-full keep-all">
                                                <Play className="w-8 h-8 text-white keep-white" fill="white" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full">
                                        {isImageUrl(image) && (
                                            <Image
                                                src={image}
                                                alt="Post content"
                                                fill
                                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                unoptimized={image.startsWith('data:')}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {resolvedWorkoutData && ((() => {
                        const w = Array.isArray(resolvedWorkoutData) ? resolvedWorkoutData[0] : resolvedWorkoutData;
                        if (!w) return null;

                        // CHECK FOR MULTI-BLOCK METRICS (WOD)
                        if (w.blocks || (w.metrics && w.metrics.blocks && w.metrics.blocks.length > 0)) {
                            // Normalize data for WodCard if it's in the old metrics.blocks format
                            const blocks = (w.blocks || w.metrics.blocks).map((b: any) => ({
                                ...b,
                                config: b.config || {}
                            }));

                            // Derive category from sport_type when category is not explicitly set
                            const derivedCategory = (() => {
                                if (w.category) return w.category;
                                const st = (w.sport_type || '').toLowerCase();
                                if (st === 'running') return 'RUNNING';
                                if (st === 'cycling' || st === 'ciclismo') return 'CYCLING';
                                if (st === 'swimming' || st === 'natación') return 'SWIMMING';
                                if (st === 'fitness' || st === 'gym') return 'GYM';
                                if (st === 'ocr') return 'OCR';
                                if (st === 'hyrox') return 'HYROX';
                                if (st === 'yoga' || st.includes('mobil')) return 'YOGA';
                                if (st === 'boxing' || st === 'boxeo') return 'BOXING';
                                return 'CROSS_TRAINING';
                            })();

                            const embeddedPhotoUrl = w.media_url && isImageUrl(w.media_url) ? w.media_url : null;

                            const normalizedWodData = {
                                title: w.title || (w.sport_type && w.sport_type !== 'Entrenamiento Libre' ? w.sport_type : 'WORKOUT OF THE DAY'),
                                blocks: blocks,
                                summary: w.summary || {
                                    scoreLabel: w.metrics?.score || 'FINALIZADO',
                                    scoreType: w.metrics?.type || 'WORKOUT',
                                    totalTime: w.metrics?.duration || w.metrics?.time || '--:--'
                                },
                                media_url: embeddedPhotoUrl,
                                original_wod_post_id: (w as any).original_wod_post_id || null,
                                category: derivedCategory,
                                // Pass session metrics so WodCard can show distance/pace for endurance sessions
                                metrics: w.metrics || null,
                            };

                            return (
                                <div className="w-full mt-2 flex flex-col">
                                    {/* Photo embedded in WOD post — show above the workout card */}
                                    {embeddedPhotoUrl && (
                                        <div className="px-2 mb-2">
                                            <div
                                                className="relative w-full rounded-xl overflow-hidden cursor-pointer group shadow-2xl bg-black"
                                                style={{ maxHeight: '60vh' }}
                                                onClick={() => setIsLightboxOpen(true)}
                                            >
                                                <Image
                                                    src={embeddedPhotoUrl}
                                                    alt="Foto del entreno"
                                                    width={800}
                                                    height={600}
                                                    className="w-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    style={{ maxHeight: '60vh', objectFit: 'cover' }}
                                                    unoptimized={embeddedPhotoUrl.startsWith('data:')}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <WodCard
                                        completionsCount={completionsCountWod}
                                        hasCompleted={hasCompletedWod}
                                        data={normalizedWodData as any}
                                        userName={username || user}
                                        publishDate={time}
                                        postId={postId}
                                    />
                                </div>
                            );
                        }

                        const sets = w.workout_sets || [];
                        const centerName = w.location_name || 'Gimnasio';
                        const isRun = w.metrics?.type === 'running' || w.sport_type?.toLowerCase() === 'running' || (w.metrics?.path && w.metrics.path.length > 0);

                        // Group by exercise name
                        const grouped: { [key: string]: any } = {};
                        sets.forEach((s: any) => {
                            const name = s.exercise_name || 'Ejercicio';
                            if (!grouped[name]) {
                                grouped[name] = {
                                    name: name,
                                    maxWeight: 0,
                                    totalReps: 0,
                                    allSets: []
                                };
                            }
                            grouped[name].allSets.push(s);
                            if ((s.weight_kg || 0) > (grouped[name].maxWeight || 0)) {
                                grouped[name].maxWeight = s.weight_kg;
                            }
                            grouped[name].totalReps += (s.reps || 0);
                        });

                        const exercises = Object.values(grouped);
                        if (exercises.length === 0 && !image) return null;

                        const summary = exercises.length > 1 ? `${exercises.length} EJERCICIOS` : (exercises[0]?.name || 'ENTRENAMIENTO');
                        const displayCenterName = centerName && !['Centro Deportivo', 'Gimnasio', 'Gimnasio RIVAL HQ'].includes(centerName) ? ` @ ${centerName}` : '';

                        return (
                            <div className="w-full">
                                {!isExpanded ? (
                                    <button
                                        onClick={() => setIsExpanded(true)}
                                        className={clsx(
                                            "w-full border rounded-xl md:rounded-2xl p-2 md:p-3 flex items-center justify-between hover:border-brand-red/50 transition-all group shadow-xl relative overflow-hidden",
                                            theme === 'dark' ? "bg-[#121212] border-white/5 hover:bg-white/[0.04]" : "bg-gray-50 border-gray-100 hover:bg-white shadow-md"
                                        )}
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-red/5 blur-3xl -mr-8 -mt-8" />
                                        <div className="flex items-center gap-2 md:gap-3 relative z-10 w-full overflow-hidden">
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20 group-hover:scale-110 transition-transform shrink-0">
                                                {isRun ? <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <h4 className={clsx(
                                                    "text-xs md:text-sm font-heading font-black italic uppercase tracking-tighter group-hover:text-brand-red transition-colors leading-none truncate pr-2",
                                                    theme === 'dark' ? "text-white" : "text-gray-900"
                                                )}>
                                                    {isRun ? "CARRERA COMPLETADA" : ((!w.sport_type || w.sport_type === 'Entrenamiento Libre') ? (summary || 'ENTRENAMIENTO HÍBRIDO') : w.sport_type)}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-[7px] md:text-[8px] text-brand-red/70 font-bold uppercase tracking-widest flex items-center gap-1.5 truncate">
                                                        <span className="w-1 h-1 shrink-0 rounded-full bg-brand-red"></span>
                                                        {isRun ? `${(w.metrics?.distance / 1000).toFixed(2)} KM • ${w.metrics?.pace || '0:00'}/KM` : (displayCenterName || 'ENTRENAMIENTO')}
                                                    </p>
                                                </div>
                                            </div>
                                            {isRun && w.metrics?.path && (
                                                <div className="shrink-0 w-10 h-10 bg-black/40 rounded-lg p-1 border border-white/10 group-hover:border-brand-red/50 transition-colors">
                                                    <RouteMap path={w.metrics.path} className="w-full h-full" color="#DC2626" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex bg-white/5 rounded-lg p-1.5 group-hover:bg-brand-red group-hover:text-white transition-all border border-white/5 shrink-0 ml-2">
                                            <ChevronDown className="w-3 h-3" />
                                        </div>
                                    </button>
                                ) : (
                                    <div className={clsx(
                                        "border rounded-2xl md:rounded-3xl p-3 md:p-4 relative overflow-hidden group/card shadow-xl animate-in fade-in slide-in-from-top-4 duration-300",
                                        theme === 'dark' ? "bg-[#121212] border-white/5" : "bg-white border-gray-100 shadow-md"
                                    )}>
                                        {/* Accent Background Glow */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 blur-3xl -mr-10 -mt-10" />

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-3 md:mb-4">
                                                <p className="text-[7px] md:text-[8px] text-gray-500 font-black uppercase tracking-[0.3em] italic">RESULTADOS</p>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                                    className="text-[7px] md:text-[8px] text-brand-red font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                                                >
                                                    CERRAR <ChevronUp className="w-3 h-3" />
                                                </button>
                                            </div>

                                            <div className="relative z-10 space-y-4 md:space-y-6">
                                                {exercises.map((ex: any, idx) => {
                                                    const isInnerExpanded = expandedInnerBlocks.includes(idx + 100); // Offset for personal workouts

                                                    return (
                                                        <div key={idx} className={clsx(
                                                            "border rounded-xl md:rounded-2xl relative overflow-hidden group/card transition-all",
                                                            theme === 'dark' ? "bg-[#121212] border-white/5" : "bg-white border-gray-100 shadow-sm",
                                                            isInnerExpanded ? "p-3 md:p-4" : "p-2 md:p-3 hover:bg-white/[0.02] cursor-pointer"
                                                        )} onClick={() => !isInnerExpanded && toggleInnerBlock(idx + 100)}>
                                                            <div className="relative z-10 space-y-1 md:space-y-2">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0 flex-1">
                                                                        <h3 className={clsx(
                                                                            "text-sm md:text-lg font-heading font-black italic uppercase tracking-tighter leading-tight pr-2",
                                                                            theme === 'dark' ? "text-white" : "text-gray-900"
                                                                        )}>
                                                                            {ex.name}
                                                                        </h3>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {ex.maxWeight > 0 && (
                                                                            <div className="text-right shrink-0">
                                                                                <span className="text-sm md:text-xl font-heading font-black text-brand-red italic tracking-tighter leading-none">
                                                                                    {ex.maxWeight}
                                                                                </span>
                                                                                <span className="text-[7px] md:text-[9px] font-black text-brand-red ml-0.5 uppercase">KG</span>
                                                                            </div>
                                                                        )}
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); toggleInnerBlock(idx + 100); }}
                                                                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                                                                        >
                                                                            {isInnerExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {isInnerExpanded && (
                                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-2">
                                                                        <div className="w-full h-1 md:h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                            <div className="bg-brand-red h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: '85%' }}></div>
                                                                        </div>

                                                                        <div className="space-y-2 mt-4">
                                                                            {ex.allSets.map((set: any, sIdx: number) => (
                                                                                <div key={sIdx} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-2.5 border border-white/5 group/set hover:border-brand-red/30 transition-colors">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[9px] font-black text-brand-red uppercase tracking-widest bg-brand-red/10 px-2 py-0.5 rounded border border-brand-red/10 group-hover/set:bg-brand-red group-hover/set:text-white transition-colors">SET {sIdx + 1}</span>
                                                                                    </div>
                                                                                    <p className={clsx(
                                                                                        "text-xs md:text-sm font-bold tracking-tight",
                                                                                        theme === 'dark' ? "text-white" : "text-black"
                                                                                    )}>
                                                                                        {set.weight_kg > 0 && <span className="text-brand-red mr-1">{set.weight_kg}KG</span>}
                                                                                        <span className="opacity-60">x</span> {set.reps > 0 ? (set.reps > 500 ? `${set.reps} M/CAL` : `${set.reps} REPS`) : "COMPLETADO"}
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()
                    )}
                </div>
            ) : null}

            {/* Actions */}
            <div className="px-4 pb-4 pt-4 flex items-center gap-4 border-t border-white/5 mt-2">
                {(resolvedWorkoutData || mediaType === 'class_result') ? (
                    <>
                        <div className="flex-1 flex gap-2">
                            <div className="flex-1">
                                <LikeButtonWithText postId={postId} initialLikes={initialLikes} hasLikedInitial={hasLikedInitial} text="Chocala 👊" />
                            </div>
                            <button
                                onClick={() => setShowComments(!showComments)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] md:text-xs transition-all active:scale-95 border border-white/5"
                            >
                                Comentar
                            </button>
                        </div>
                        {(isVideo || isImageUrl(image)) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadMedia(); }}
                                disabled={isDownloadingVideo}
                                className={clsx(
                                    "p-3 md:p-4 bg-white/5 hover:bg-white/10 rounded-xl md:rounded-2xl border border-white/5 transition-all active:scale-95 group",
                                    isDownloadingVideo ? "text-brand-red animate-pulse" : "text-gray-400 hover:text-brand-red"
                                )}
                                title="Descargar contenido con branding"
                            >
                                {isDownloadingVideo ? (
                                    <div className="flex flex-col items-center gap-1">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="text-[7px] font-black">{downloadProgress}%</span>
                                    </div>
                                ) : <Download className="w-5 h-5" />}
                            </button>
                        )}
                        <ShareButton
                            image={image}
                            workoutData={resolvedWorkoutData}
                            mediaType={mediaType}
                            postId={postId}
                            className="p-3 md:p-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl md:rounded-2xl border border-white/5 transition-all"
                            iconClassName="w-5 h-5"
                            onInstagramShare={() => setShowInstagramCard(true)}
                            onOpenShareCard={() => setShowShareCard(true)}
                            onDownloadMedia={handleDownloadMedia}
                            isDownloadingVideo={isDownloadingVideo}
                            isVideo={(isVideo || isImageUrl(image)) as boolean}
                            highlight={highlight}
                            caption={caption}
                            photoUrl={photoUrl}
                        />
                    </>
                ) : (
                    <div className="flex items-center gap-6 w-full">
                        <LikeButton postId={postId} initialLikes={initialLikes} hasLikedInitial={hasLikedInitial} />
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className={clsx("flex items-center gap-2 transition-colors", showComments ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400')}
                        >
                            <MessageCircle className="w-6 h-6" />
                            <span className="font-bold text-sm">{commentsCount}</span>
                        </button>

                        {/* Quick Duel Button */}
                        {authorId && postId && authorId !== currentUserId && !isOfficial && (
                            <div className="scale-75 origin-left h-auto -my-2">
                                <DuelButton targetId={authorId as string} postId={postId} type="quick" isRival={true} />
                            </div>
                        )}
                        <div className="ml-auto flex items-center gap-4">
                            {(isVideo || isImageUrl(image)) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDownloadMedia(); }}
                                    disabled={isDownloadingVideo}
                                    className={clsx(
                                        "transition-all active:scale-95",
                                        isDownloadingVideo ? "text-brand-red animate-pulse" : "text-gray-400 hover:text-brand-red"
                                    )}
                                    title="Descargar contenido con branding"
                                >
                                    {isDownloadingVideo ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <span className="text-[7px] font-black">{downloadProgress}%</span>
                                        </div>
                                    ) : <Download className="w-6 h-6" />}
                                </button>
                            )}
                            <ShareButton
                                image={image}
                                workoutData={resolvedWorkoutData}
                                mediaType={mediaType}
                                postId={postId}
                                className="text-gray-400 hover:text-white"
                                iconClassName="w-6 h-6"
                                onInstagramShare={() => setShowInstagramCard(true)}
                                onOpenShareCard={() => setShowShareCard(true)}
                                onDownloadMedia={handleDownloadMedia}
                                onRepostClick={() => setShowRepostModal(true)}
                                onMessageClick={() => { setShowDMModal(true); loadDMFollows(); }}
                                isDownloadingVideo={isDownloadingVideo}
                                downloadProgress={downloadProgress}
                                isVideo={(isVideo || isImageUrl(image)) as boolean}
                                highlight={highlight}
                                caption={caption}
                                photoUrl={photoUrl}
                            />
                        </div>
                    </div>
                )}
            </div>

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
                                <img src={image} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]" />
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

        </div >
    );
}

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
