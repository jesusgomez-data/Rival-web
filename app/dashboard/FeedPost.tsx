"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal, MessageCircle, Share2, Trophy, X, Send, Smile, Play, Pause, Trash2, Edit2, Save, Heart, Dumbbell, Activity, ChevronDown, ChevronUp, Music, Plus, CheckCircle2, Instagram, Swords, Download, Loader2 } from "lucide-react";
import { VideoProcessor } from "./stories/VideoProcessor";
import LikeButton from "./community/LikeButton";
import DuelButton from "./community/DuelButton";
import { addComment, getComments, deletePost, updatePost, toggleCommentLike, toggleLike } from "./community/actions";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { clsx } from "clsx";
import { useTheme } from "../ThemeContext";
import { isImageUrl } from "@/lib/utils"; import { useStories } from "./stories/StoryContext";
import PRCard from "./community/PRCard";
import VideoReelsModal from "./VideoReelsModal";
import dynamic from 'next/dynamic';
import ShareableCard from "@/components/ShareableCard";
import RunShareCard from "@/components/training/RunShareCard";
import RouteMap from "@/components/training/RouteMap";
import WODPostDisplay from "@/components/WODPostDisplay";
import WODTrackerModal from "@/components/WODTrackerModal";
import WODLeaderboardModal from "@/components/WODLeaderboardModal";
import MentionText from "@/components/MentionText";
import MentionInput from "@/components/MentionInput";
import WodCard from "@/components/community/WodCard";

const InstagramShareCard = dynamic(() => import("./InstagramShareCard"), { ssr: false });

function ShareButton({ image, workoutData, mediaType, postId, className, iconClassName = "w-5 h-5", onInstagramShare, onOpenShareCard, onDownloadMedia, isDownloadingVideo, downloadProgress, isVideo }: {
    image?: string,
    workoutData?: any,
    mediaType?: string,
    postId?: string,
    className?: string,
    iconClassName?: string,
    onInstagramShare?: () => void,
    onOpenShareCard?: () => void,
    onDownloadMedia?: () => void,
    isDownloadingVideo?: boolean,
    downloadProgress?: number,
    isVideo?: boolean
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
                const data = JSON.parse(image);
                window.dispatchEvent(new CustomEvent('share-to-story', { detail: { type: 'pr', data, postId } }));
            } catch (e) {
                console.error("Error parsing PR", e);
            }
        } else {
            const isImageUrl = image && !image.startsWith('{') && !image.startsWith('[');
            if (isImageUrl) {
                window.dispatchEvent(new CustomEvent('share-to-story', { detail: { type: 'image', url: image, postId } }));
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
    };
    music_url?: string | null;
    music_title?: string | null;
    music_artist?: string | null;
    isMember?: boolean;
    context?: 'following' | 'global';
    isAdminUser?: boolean;
    hasActiveDuel?: boolean;
    post_type?: string; // Tipo de post: 'standard', 'wod', etc.
    wod_data?: any; // Datos del WOD generado (JSON)
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
    workoutData, music_url, music_title, music_artist, isOfficial, isMember = false, context = 'global', isAdminUser, hasActiveDuel, post_type, wod_data
}: FeedPostProps) {
    const { theme } = useTheme();
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [showInstagramCard, setShowInstagramCard] = useState(false);
    const [showShareCard, setShowShareCard] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentList, setCommentList] = useState<Comment[]>([]);
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
    const [isEditing, setIsEditing] = useState(false);
    const [editCaption, setEditCaption] = useState(caption || "");
    const [displayCaption, setDisplayCaption] = useState(caption || "");
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Estados para modales de WOD
    const [showWODTracker, setShowWODTracker] = useState(false);
    const [showWODLeaderboard, setShowWODLeaderboard] = useState(false);

    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);


    // Improved video detection
    const isVideo = image && (
        /\.(mp4|webm|ogg|mov)$/i.test(image) ||
        (mediaType && mediaType === 'video') ||
        image.includes('/videos/') ||
        image.includes('video/upload') ||
        image.includes('.mov?') ||
        image.includes('.mp4?')
    );
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

    // Memoize the workout data: use prop if available, otherwise try to parse from "image" (media_url)
    const resolvedWorkoutData = (() => {
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
    })();


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

    const handleUpdate = async () => {
        const res = await updatePost(postId, editCaption);
        if (res.error) {
            alert(res.error);
        } else {
            setDisplayCaption(editCaption);
            setIsEditing(false);
        }
    };

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

    if (isDeleting) return null;

    const CommentNode = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => (
        <div className={clsx("flex gap-3", depth > 0 && "mt-3")}>
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden shrink-0">
                    {comment.user?.avatar_url && isImageUrl(comment.user.avatar_url) ? (
                        <Image src={comment.user.avatar_url} alt={comment.user.username} width={32} height={32} className="object-cover w-full h-full" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] bg-brand-red/10 font-bold text-gray-400 capitalize whitespace-nowrap overflow-hidden">
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
                            className={clsx("flex items-center gap-1 text-[10px] font-bold transition-colors", comment.has_liked ? "text-red-500" : "text-gray-500 hover:text-red-500")}
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
                            const mention = `@${comment.user.username} `;
                            if (!newComment.includes(mention)) {
                                setNewComment(prev => mention + prev);
                            }
                            setTimeout(() => commentInputRef.current?.focus(), 100);
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
                            <Image src={avatar} alt={user} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                                {user?.substring(0, 2) || "?"}
                            </div>
                        )}
                    </div>
                </div>
                <Link href={`/dashboard/profile/${username || user.toLowerCase().replace(/\s+/g, '')}`} className="flex-1 group">
                    <div>
                        <p className="text-base font-black group-hover:opacity-80 transition-opacity leading-tight uppercase font-heading italic tracking-tight flex items-center gap-1.5 text-brand-red">
                            {user}
                            {isOfficial && (
                                <span className="bg-brand-red p-0.5 rounded-full inline-flex shadow-[0_0_10px_rgba(220,38,38,0.5)] border border-white/20">
                                    <Trophy className="w-2.5 h-2.5 text-white" />
                                </span>
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
                                <div className="absolute right-0 top-full mt-2 w-40 bg-brand-gray border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden backdrop-blur-xl">
                                    <button
                                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                        className="w-full text-left px-5 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-3 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" /> {mediaType === 'wod' ? 'Editar Pie' : 'Editar'}
                                    </button>
                                    {mediaType === 'wod' && (
                                        <button
                                            onClick={() => {
                                                let wodData;
                                                try { wodData = JSON.parse(image); } catch (e) { }
                                                window.dispatchEvent(new CustomEvent('edit-wod', {
                                                    detail: {
                                                        postId,
                                                        content: displayCaption,
                                                        wodData
                                                    }
                                                }));
                                                setShowMenu(false);
                                            }}
                                            className="w-full text-left px-5 py-3 text-sm text-brand-red bg-brand-red/5 hover:bg-brand-red/10 flex items-center gap-3 transition-colors border-t border-white/5"
                                        >
                                            <Dumbbell className="w-4 h-4" /> Editar Entrenamiento
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { handleDelete(); setShowMenu(false); }}
                                        className="w-full text-left px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Eliminar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Caption or WOD Display - Only show if not a class_result (unless editing) */}
            {((displayCaption && mediaType !== 'class_result') || isEditing || (post_type === 'wod' && wod_data)) && (
                <div className={post_type === 'wod' && wod_data && !isEditing ? "px-4 pb-3" : "px-4 pb-3"}>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <textarea
                                value={editCaption}
                                onChange={(e) => setEditCaption(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-red/50"
                                rows={2}
                            />
                            <div className="flex flex-col gap-1">
                                <button onClick={handleUpdate} className="p-2 bg-green-500/10 text-green-500 rounded-lg" title="Guardar"><Save className="w-4 h-4" /></button>
                                <button onClick={() => { setIsEditing(false); setEditCaption(displayCaption); }} className="p-2 bg-red-500/10 text-red-500 rounded-lg" title="Cancelar"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ) : post_type === 'wod' && wod_data ? (
                        // Renderizar WOD con diseño especial
                        <WODPostDisplay wod={wod_data} compact={false} />
                    ) : (
                        // Renderizar caption normal
                        <MentionText
                            text={displayCaption}
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
                            <span className="font-bold text-white">0 atletas</span> han completado este WOD
                        </span>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                        <button
                            className="flex-1 bg-gradient-to-r from-brand-red to-orange-600 hover:from-brand-accent hover:to-orange-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-brand-red/50"
                            onClick={() => setShowWODTracker(true)}
                        >
                            <Dumbbell className="w-5 h-5" />
                            Hacer este WOD
                        </button>
                        <button
                            className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            onClick={() => setShowWODLeaderboard(true)}
                        >
                            <Trophy className="w-5 h-5" />
                            Ranking
                        </button>
                    </div>

                    {/* Modales */}
                    <WODTrackerModal
                        wodPostId={postId}
                        wodTitle={wod_data?.title || "WOD"}
                        wodType="rounds"
                        isOpen={showWODTracker}
                        onClose={() => setShowWODTracker(false)}
                        onSuccess={() => window.location.reload()}
                    />
                    <WODLeaderboardModal
                        wodPostId={postId}
                        wodTitle={wod_data?.title || "WOD"}
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
                            <h3 className="font-heading font-black italic uppercase text-lg text-white mb-2 leading-none">Entrenamiento Exclusivo</h3>
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
                                backgroundImage={prData.backgroundImage || (/\.(jpg|jpeg|png|webp|gif)$/i.test(image) ? image : undefined)}
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

                                {displayCaption && displayCaption.includes('📝 COMENTARIO:') && (
                                    <div className="mt-2 p-6 bg-brand-red/5 border border-brand-red/10 rounded-[24px] relative overflow-hidden group shadow-lg">
                                        <div className="absolute top-0 right-0 p-6 opacity-5">
                                            <MessageCircle className="w-16 h-16 text-brand-red" />
                                        </div>
                                        <p className="text-brand-red font-accent font-semibold text-sm md:text-base relative z-10 leading-relaxed border-l-4 border-brand-red pl-6 py-2">
                                            {displayCaption.split('📝 COMENTARIO:')[1].trim()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
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
                        <div className={isVideo ? "" : "px-2"}>
                            <div className={`relative bg-black cursor-pointer group shadow-2xl overflow-hidden ${isVideo ? "aspect-[9/16] max-h-[85vh]" : "aspect-video rounded-xl"}`} onClick={() => setIsLightboxOpen(true)}>
                                {isVideo ? (
                                    <div className="relative w-full h-full">
                                        <video
                                            src={image}
                                            className="w-full h-full object-cover"
                                            autoPlay
                                            loop
                                            playsInline
                                            muted
                                            preload="auto"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
                                        {/* Play/Pause Indicator */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <div className="bg-black/50 backdrop-blur-sm p-4 rounded-full">
                                                <Play className="w-8 h-8 text-white" fill="white" />
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
                                config: b.config || {} // Safety for legacy data
                            }));
                            const normalizedWodData = {
                                title: w.title || (w.sport_type && w.sport_type !== 'Entrenamiento Libre' ? w.sport_type : 'WORKOUT OF THE DAY'),
                                blocks: blocks,
                                summary: w.summary || {
                                    scoreLabel: w.metrics?.score || 'COMPLETADO',
                                    scoreType: w.metrics?.type || 'WORKOUT',
                                    totalTime: w.metrics?.duration || w.metrics?.time || '--:--'
                                },
                                media_url: image && isImageUrl(image) ? image : null
                            };

                            return (
                                <div className="w-full mt-2">
                                    <WodCard
                                        data={normalizedWodData as any}
                                        userName={username || user}
                                        publishDate={time}
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
                                isDownloadingVideo={isDownloadingVideo}
                                downloadProgress={downloadProgress}
                                isVideo={(isVideo || isImageUrl(image)) as boolean}
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
                                    <span className="text-gray-400">Respondiendo a <span className="font-bold text-brand-red">{replyingTo.user.username}</span></span>
                                    <button type="button" onClick={() => setReplyingTo(null)}><X className="w-3 h-3" /></button>
                                </div>
                            )}
                            <div className="flex gap-2 items-center">
                                <MentionInput
                                    value={newComment}
                                    onChange={setNewComment}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment(e, replyingTo?.id);
                                        }
                                    }}
                                    placeholder="Escribe un comentario..."
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-red/50"
                                />
                                <button type="submit" disabled={!newComment.trim() || isPostingComment} className="p-2 bg-brand-red text-white rounded-xl hover:bg-red-600 transition-colors shadow-glow">
                                    <Send className="w-4 h-4" />
                                </button>
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
                showInstagramCard && (
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
                                    // Support both new WOD format (blocks) and old format (metrics.blocks)
                                    const wodBlocks = (resolvedWorkoutData as any)?.blocks || (resolvedWorkoutData as any)?.metrics?.blocks;
                                    if (wodBlocks && wodBlocks.length > 0) {
                                        return wodBlocks.slice(0, 4).map((b: any) => ({
                                            label: (b.title && b.title !== 'METCON' && !b.title.startsWith('BLOCK') ? b.title : (b.format || b.type || 'BLOQUE')).toUpperCase(),
                                            value: b.exercises?.length ? `${b.exercises.length} EJERC.` : (b.result?.time || `${b.result?.rounds || b.result?.reps || '-'} ${b.result?.rounds ? 'RDS' : 'REPS'}`)
                                        }));
                                    }
                                    if (mediaType === 'pr') {
                                        try {
                                            const d = JSON.parse(image);
                                            return [{ label: d.exerciseName?.toUpperCase(), value: `${d.weight}${d.unit}` }];
                                        } catch (e) { return []; }
                                    }
                                    return [];
                                })(),
                            image: isImageUrl(image) ? image : undefined,
                            mapData: (resolvedWorkoutData as any)?.metrics?.path ? 'GPS_PATH_ACTIVE' : undefined
                        }}
                        onClose={() => setShowInstagramCard(false)}
                    />
                )
            }
            {
                showShareCard && (
                    resolvedWorkoutData?.metrics?.path || resolvedWorkoutData?.metrics?.type === 'running' ? (
                        <RunShareCard
                            imageUrl={image && isImageUrl(image) ? image : null}
                            distance={resolvedWorkoutData.metrics.distance || 0}
                            time={resolvedWorkoutData.duration || 0}
                            pace={resolvedWorkoutData.metrics.pace || "0:00"}
                            elevation={resolvedWorkoutData.metrics.elevation || 0}
                            path={resolvedWorkoutData.metrics.path || []}
                            date={time}
                            userName={user}
                            onClose={() => setShowShareCard(false)}
                        />
                    ) : (
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
                                        title: (resolvedWorkoutData?.sport_type && resolvedWorkoutData.sport_type !== 'fitness') ? resolvedWorkoutData.sport_type.toUpperCase() : (highlight || resolvedWorkoutData?.title || 'ENTRENAMIENTO'),
                                        date: time,
                                        stats: mediaType === 'pr' ? (() => {
                                            try { const d = JSON.parse(image); return [{ label: "PESO", value: `${d.weight}${d.unit}` }, { label: "EJERCICIO", value: d.exerciseName?.toUpperCase() }]; } catch (e) { return [] }
                                        })() : (resolvedWorkoutData as any)?.metrics?.blocks?.map((b: any) => ({
                                            label: b.type?.toUpperCase(),
                                            value: b.result?.time || `${b.result?.rounds || 0} RDS`
                                        })).slice(0, 3) || [{ label: "DISCIPLINA", value: (resolvedWorkoutData?.sport_type || "FITNESS").toUpperCase() }, { label: "ESTADO", value: "COMPLETADO" }],
                                        image: (!isVideo && isImageUrl(image)) ? image : undefined
                                    }}
                                />
                            </div>
                        </div>
                    )
                )
            }
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
