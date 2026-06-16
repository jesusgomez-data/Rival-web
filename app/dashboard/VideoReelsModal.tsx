'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Share2, Music, User, Trophy, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReelPosts, toggleLike, getComments, addComment, toggleCommentLike } from './community/actions';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useLanguage } from '../LanguageContext';
import { Send, Loader2 } from 'lucide-react';
import MentionText from '@/components/MentionText';
import MentionInput from '@/components/MentionInput';
import { useVideo } from './VideoContext';

interface ReelPost {
    id: string;
    media_url: string;
    caption: string;
    created_at: string;
    profiles: {
        username: string;
        full_name: string;
        avatar_url: string | null;
        is_official?: boolean;
    };
    initialLikes: number;
    hasLikedInitial: boolean;
    comments_count?: number;
    music_title?: string;
    music_artist?: string;
    user_id: string;
}

interface VideoReelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialPostId?: string;
    context: 'following' | 'global';
}

function CommentsDrawer({ postId, onClose }: { postId: string, onClose: () => void }) {
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadComments();
    }, [postId]);

    const loadComments = async () => {
        setLoading(true);
        const data = await getComments(postId);
        setComments(data || []);
        setLoading(false);
        setTimeout(scrollToBottom, 100);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async () => {
        if (!newComment.trim()) return;
        setSubmitting(true);
        const result = await addComment(postId, newComment, replyingTo?.id);
        if (result?.success) {
            setNewComment('');
            setReplyingTo(null);
            loadComments();
        }
        setSubmitting(false);
    };

    const handleCommentLike = async (commentId: string) => {
        // Optimistically toggle comment like
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    has_liked: !c.has_liked,
                    likes_count: c.has_liked ? c.likes_count - 1 : c.likes_count + 1
                };
            }
            return c;
        }));
        await toggleCommentLike(commentId);
    };

    // Process comments to group replies under parent comments
    const roots = comments.filter(c => !c.parent_id);
    const repliesMap = new Map<string, any[]>();
    comments.forEach(c => {
        if (c.parent_id) {
            if (!repliesMap.has(c.parent_id)) {
                repliesMap.set(c.parent_id, []);
            }
            repliesMap.get(c.parent_id)!.push(c);
        }
    });

    const getDescendants = (commentId: string): any[] => {
        const list: any[] = [];
        const direct = repliesMap.get(commentId) || [];
        direct.forEach(child => {
            list.push(child);
            list.push(...getDescendants(child.id));
        });
        return list;
    };

    return (
        <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[60vh] bg-[#111] rounded-t-3xl border-t border-white/10 z-[300] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-white font-bold text-sm">Comentarios</h3>
                <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/70 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-red" />
                    </div>
                ) : roots.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-8">
                        Sé el primero en comentar.
                    </div>
                ) : (
                    <>
                        {roots.map((c) => {
                            const p = c.user as any;
                            const replies = getDescendants(c.id);

                            return (
                                <div key={c.id} className="space-y-3">
                                    {/* Parent Comment */}
                                    <div className="flex gap-3 items-start justify-between group">
                                        <div className="flex gap-3">
                                            {p?.username ? (
                                                <Link href={`/dashboard/profile/${p.username}`}>
                                                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 relative">
                                                        {p.avatar_url ? (
                                                            <Image src={p.avatar_url} alt="user" width={32} height={32} className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                                <User className="w-3 h-3 text-gray-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-gray-800 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-gray-500" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    {p?.username ? (
                                                        <Link href={`/dashboard/profile/${p.username}`} className="text-white font-bold text-[10px] hover:underline">
                                                            {p.username}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-white font-bold text-[10px]">Usuario</span>
                                                    )}
                                                    <span className="text-gray-500 text-[9px] uppercase tracking-widest">
                                                        {new Date(c.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-white/80 text-xs leading-relaxed">
                                                    <MentionText text={c.content} className="text-brand-red hover:underline" />
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <button
                                                        onClick={() => setReplyingTo({ id: c.id, username: p?.username || 'Usuario' })}
                                                        className="text-[9px] font-black uppercase text-white/40 hover:text-white/80 transition-colors"
                                                    >
                                                        Responder
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Like button */}
                                        <button onClick={() => handleCommentLike(c.id)} className="flex flex-col items-center gap-0.5 pt-1 pr-1 shrink-0 text-white/40 hover:text-brand-red transition-colors">
                                            <Heart className={clsx("w-3.5 h-3.5", c.has_liked ? "fill-brand-red text-brand-red" : "text-white/40")} />
                                            {c.likes_count > 0 && <span className="text-[8px] font-black text-white/40">{c.likes_count}</span>}
                                        </button>
                                    </div>

                                    {/* Replies */}
                                    {replies.length > 0 && (
                                        <div className="pl-11 space-y-3 border-l-2 border-white/5 ml-4">
                                            {replies.map(reply => {
                                                const rp = reply.user as any;
                                                return (
                                                    <div key={reply.id} className="flex gap-2.5 items-start justify-between group">
                                                        <div className="flex gap-2.5">
                                                            {rp?.username ? (
                                                                <Link href={`/dashboard/profile/${rp.username}`}>
                                                                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/10 relative">
                                                                        {rp.avatar_url ? (
                                                                            <Image src={rp.avatar_url} alt="user" width={24} height={24} className="object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                                                <User className="w-2.5 h-2.5 text-gray-500" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </Link>
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/10 bg-gray-800 flex items-center justify-center">
                                                                    <User className="w-2.5 h-2.5 text-gray-500" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    {rp?.username ? (
                                                                        <Link href={`/dashboard/profile/${rp.username}`} className="text-white font-bold text-[10px] hover:underline">
                                                                            {rp.username}
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="text-white font-bold text-[10px]">Usuario</span>
                                                                    )}
                                                                    <span className="text-gray-500 text-[8px] uppercase tracking-widest">
                                                                        {new Date(reply.created_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-white/80 text-xs leading-relaxed">
                                                                    <MentionText text={reply.content} className="text-brand-red hover:underline" />
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    <button
                                                                        onClick={() => setReplyingTo({ id: c.id, username: rp?.username || 'Usuario' })}
                                                                        className="text-[8px] font-black uppercase text-white/40 hover:text-white/80 transition-colors"
                                                                    >
                                                                        Responder
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Like button */}
                                                        <button onClick={() => handleCommentLike(reply.id)} className="flex flex-col items-center gap-0.5 pt-0.5 pr-1 shrink-0 text-white/40 hover:text-brand-red transition-colors">
                                                            <Heart className={clsx("w-3 h-3", reply.has_liked ? "fill-brand-red text-brand-red" : "text-white/40")} />
                                                            {reply.likes_count > 0 && <span className="text-[8px] font-black text-white/40">{reply.likes_count}</span>}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Replying banner */}
            {replyingTo && (
                <div className="px-5 py-2 bg-brand-red/10 border-t border-brand-red/20 text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-between">
                    <span>Respondiendo a <span className="text-brand-red">@{replyingTo.username}</span></span>
                    <button onClick={() => setReplyingTo(null)} className="text-white/50 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="p-4 border-t border-white/10">
                <div className="relative flex items-center gap-2 bg-white/5 rounded-2xl border border-white/10 px-4 focus-within:border-brand-red transition-all">
                    <div className="flex-1">
                        <MentionInput
                            value={newComment}
                            onChange={setNewComment}
                            placeholder={replyingTo ? `Responder a @${replyingTo.username}...` : "Escribe un comentario..."}
                            className="bg-transparent border-none focus:ring-0 text-white text-xs py-3 w-full outline-none"
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={submitting || !newComment.trim()}
                        className="p-2 text-brand-red hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function Reel({ post, isActive, onOpenComments, isGlobalMuted, onToggleMute }: { post: ReelPost, isActive: boolean, onOpenComments: () => void, isGlobalMuted: boolean, onToggleMute: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [liked, setLiked] = useState(post.hasLikedInitial);
    const [likes, setLikes] = useState(post.initialLikes);
    const [showMuteHint, setShowMuteHint] = useState(false);
    const { t } = useLanguage();

    const lastTap = useRef<number>(0);
    const [showHeart, setShowHeart] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else if (!document.hidden && isActive && videoRef.current) {
                videoRef.current.play().catch(() => { });
                setIsPlaying(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isActive]);

    useEffect(() => {
        if (isActive && videoRef.current) {
            // Attempt to play. Browsers might block if not muted.
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Auto-play blocked, retrying muted", error);
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(e => console.error("Muted autoplay also failed", e));
                    }
                });
            }
            setIsPlaying(true);
        } else if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

    // Show hint when muted status changes globally
    useEffect(() => {
        if (isActive && isGlobalMuted) {
            setShowMuteHint(true);
            const timer = setTimeout(() => setShowMuteHint(false), 2500);
            return () => clearTimeout(timer);
        }
    }, [isGlobalMuted, isActive]);

    const handleTap = (e: React.MouseEvent) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            handleDoubleTap(e);
        } else {
            handleTogglePlay();
        }
        lastTap.current = now;
    };

    const handleDoubleTap = async (e: React.MouseEvent) => {
        if (!liked) {
            setLiked(true);
            setLikes(prev => prev + 1);
            await toggleLike(post.id);
        }
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
    };

    const handleTogglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                videoRef.current.play().catch(() => {
                    // If play fails (e.g. sound was blocked), try playing muted
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play();
                    }
                });
                setIsPlaying(true);
            }
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setLiked(!liked);
        setLikes(liked ? likes - 1 : likes + 1);
        await toggleLike(post.id);
    };

    return (
        <div className="relative h-screen w-full snap-start bg-black flex items-center justify-center overflow-hidden">
            <video
                ref={videoRef}
                src={post.media_url}
                className="h-full w-full object-contain cursor-pointer"
                loop
                playsInline
                muted={!isActive || isGlobalMuted || (typeof document !== 'undefined' && document.hidden)}
                onClick={handleTap}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => { setIsBuffering(false); setLoadError(false); }}
                onEnded={() => setIsBuffering(false)}
                onError={() => { setLoadError(true); setIsBuffering(false); }}
            />

            {isBuffering && !loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 gap-3">
                    <Loader2 className="w-12 h-12 text-brand-red animate-spin shadow-glow" />
                    <span className="text-white text-xs font-black uppercase tracking-[0.2em] drop-shadow-xl">Cargando Reel...</span>
                </div>
            )}

            {/* Error Overlay */}
            {loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 p-10 text-center">
                    <X className="w-16 h-16 text-brand-red mb-4" />
                    <p className="text-white font-bold mb-4">No se pudo cargar el video</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setLoadError(false); setIsBuffering(true); videoRef.current?.load(); }}
                        className="px-6 py-2 bg-brand-red text-white font-black rounded-full"
                    >
                        REINTENTAR
                    </button>
                </div>
            )}

            {/* Mute/Unmute Label Hint */}
            <AnimatePresence>
                {showMuteHint && isGlobalMuted && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-40 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2 pointer-events-none"
                    >
                        <VolumeX className="w-4 h-4 text-white" />
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">Video silenciado · Toca para activar</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showHeart && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                    >
                        <Heart className="w-24 h-24 text-brand-red fill-current drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                    </motion.div>
                )}
            </AnimatePresence>

            {!isPlaying && !showHeart && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="bg-black/40 p-6 rounded-full"
                    >
                        <Play className="w-12 h-12 text-white fill-white" />
                    </motion.div>
                </div>
            )}

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-10">
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={handleLike}
                        className={clsx(
                            "p-3 rounded-full backdrop-blur-md transition-all active:scale-90",
                            liked ? "bg-brand-red text-white" : "bg-white/10 text-white"
                        )}
                    >
                        <Heart className={clsx("w-6 h-6", liked && "fill-current")} />
                    </button>
                    <span className="text-white text-xs font-bold shadow-sm">{likes}</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenComments(); }}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                    >
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    <span className="text-white text-xs font-bold shadow-sm">{post.comments_count || 0}</span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (navigator.share) {
                            navigator.share({
                                title: `Watch this workout by @${post.profiles?.username} on Rival Fit`,
                                text: post.caption || '',
                                url: window.location.href,
                            }).catch(console.error);
                        } else {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied to clipboard!");
                        }
                    }}
                    className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                >
                    <Share2 className="w-6 h-6" />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                    className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all"
                >
                    {isGlobalMuted ? <VolumeX className="w-6 h-6 text-brand-red" /> : <Volume2 className="w-6 h-6" />}
                </button>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
                <div className="flex items-center gap-3 mb-4">
                    {post.profiles?.username ? (
                        <Link href={`/dashboard/profile/${post.profiles.username}`} className="relative">
                            <div className="w-10 h-10 rounded-full border-2 border-brand-red overflow-hidden bg-gray-800">
                                {post.profiles?.avatar_url ? (
                                    <Image src={post.profiles.avatar_url} alt={post.profiles.username} width={40} height={40} className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                        <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                )}
                            </div>
                        </Link>
                    ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-brand-red overflow-hidden bg-gray-800 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-400" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            {post.profiles?.username ? (
                                <Link href={`/dashboard/profile/${post.profiles.username}`} className="text-white font-black italic uppercase text-sm drop-shadow-md hover:underline">
                                    @{post.profiles.username}
                                </Link>
                            ) : (
                                <span className="text-white font-black italic uppercase text-sm drop-shadow-md">Usuario</span>
                            )}
                            {post.profiles?.is_official && (
                                <Trophy className="w-3 h-3 text-brand-red fill-current" />
                            )}
                        </div>
                    </div>
                </div>
                <p className="text-white/90 text-xs leading-relaxed max-w-[80%] line-clamp-2">
                    <MentionText text={post.caption} className="text-brand-red font-bold hover:underline" />
                </p>
                {post.music_title && (
                    <div className="flex items-center gap-2 mt-4">
                        <div className="w-6 h-6 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center animate-spin-slow">
                            <Music className="w-3 h-3 text-white" />
                        </div>
                        <p className="text-white/70 text-[10px] font-medium tracking-wide">
                            {post.music_title} — {post.music_artist}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VideoReelsModal({ isOpen, onClose, initialPostId, context }: VideoReelsModalProps) {
    const [posts, setPosts] = useState<ReelPost[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
    const { isMuted: isGlobalMuted, toggleMute } = useVideo();

    useEffect(() => {
        if (isOpen) {
            loadPosts();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, context]);

    const loadPosts = async () => {
        setLoading(true);
        const fetchedPosts = await getReelPosts(context);

        // If initialPostId is provided, rearrange list to start with it
        let sortedPosts = [...fetchedPosts];
        if (initialPostId) {
            const index = sortedPosts.findIndex(p => p.id === initialPostId);
            if (index !== -1) {
                const initial = sortedPosts.splice(index, 1)[0];
                sortedPosts.unshift(initial);
            }
        }

        setPosts(sortedPosts);
        setLoading(false);
    };

    const handleScroll = () => {
        if (containerRef.current) {
            const index = Math.round(containerRef.current.scrollTop / window.innerHeight);
            setActiveIndex(index);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed inset-0 z-[200] bg-black flex items-center justify-center md:bg-black/90 dark-section keep-all"
            >
                {/* Desktop Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-6 z-[210] p-2 bg-white/10 hover:bg-brand-red text-white rounded-full transition-colors hidden md:block"
                    style={{ top: 'max(1.5rem, env(safe-area-inset-top))' }}
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Mobile Close Button (floating) */}
                <button
                    onClick={onClose}
                    className="absolute left-4 z-[210] p-2 bg-black/40 backdrop-blur-md text-white rounded-full md:hidden border border-white/10"
                    style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
                >
                    <X className="w-6 h-6" />
                </button>

                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="h-screen w-full md:max-w-md bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar"
                >
                    {posts.length > 0 ? (
                        posts.map((post, index) => (
                            <Reel
                                key={post.id}
                                post={post}
                                isActive={activeIndex === index}
                                onOpenComments={() => setCommentsPostId(post.id)}
                                isGlobalMuted={isGlobalMuted}
                                onToggleMute={toggleMute}
                            />
                        ))
                    ) : loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-white p-10 text-center">
                            <p>No hay videos disponibles en este momento.</p>
                        </div>
                    )}
                </div>
            </motion.div>
            {/* Comments Overlay */}
            {commentsPostId && (
                <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm" onClick={() => setCommentsPostId(null)}>
                    <CommentsDrawer postId={commentsPostId} onClose={() => setCommentsPostId(null)} />
                </div>
            )}
        </AnimatePresence>
    );
}
