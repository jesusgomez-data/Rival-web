"use client";

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Trash2, X, Building2, Dumbbell, Zap, Flame, TrendingUp, ChevronDown, Plus, Play, Clock, ArrowRight } from "lucide-react";
import { toggleCenterPostLike, addCenterPostComment, getCenterPostComments, deletePost, deleteCenterPostComment } from "./feed-actions";
import Link from "next/link";
import MentionText from "@/components/MentionText";
import MentionInput from "@/components/MentionInput";
import WodCard from "@/components/explore/WodCard";
import WODTrackerModal from "@/components/WODTrackerModal";

export default function GymPostCard({ post, centerId, isAdmin = false, currentUserId, isMember = false }: any) {
    const [likes, setLikes] = useState(post.likes_count || 0);
    const [isLiked, setIsLiked] = useState(post.is_liked || false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [commentAsCenter, setCommentAsCenter] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const postRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [showWODTracker, setShowWODTracker] = useState(false);
    const [hasCompletedWod, setHasCompletedWod] = useState(false);

    useEffect(() => {
        if (post.post_type === 'wod') {
            const checkCompletion = async () => {
                try {
                    const response = await fetch(`/api/wod/my-completion?wodPostId=${post.id}`);
                    const data = await response.json();
                    if (response.ok && data.completion) {
                        setHasCompletedWod(true);
                    }
                } catch (e) {
                    console.error("Error fetching completion status:", e);
                }
            };
            checkCompletion();
        }
    }, [post.id, post.post_type]);

    // Intersection Observer to detect if post is in view
    useEffect(() => {
        if (!postRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.5 } // 50% of the post must be visible
        );

        observer.observe(postRef.current);
        return () => observer.disconnect();
    }, []);

    // Handle Page Visibility (app in background)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // When app goes to background, pause video
                if (videoRef.current) videoRef.current.pause();
            } else {
                // When app comes to foreground, play if visible
                if (isVisible && videoRef.current) {
                    videoRef.current.play().catch(() => { });
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [isVisible]);

    // Handle play/pause based on visibility
    useEffect(() => {
        if (isVisible) {
            videoRef.current?.play().catch(() => { });
        } else {
            videoRef.current?.pause();
        }
    }, [isVisible]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLike = async () => {
        const previousLikes = likes;
        const previousIsLiked = isLiked;

        setIsLiked(!isLiked);
        setLikes(isLiked ? likes - 1 : likes + 1);

        const res = await toggleCenterPostLike(centerId, post.id);
        if (res?.error) {
            setIsLiked(previousIsLiked);
            setLikes(previousLikes);
            // alert("Error liking post: " + res.error); // Silent fail or toast usually better
        }
    };

    const toggleComments = async () => {
        if (!showComments) {
            setLoadingComments(true);
            const res = await getCenterPostComments(post.id);
            setComments(res || []);
            setLoadingComments(false);
        }
        setShowComments(!showComments);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        // Optimistic update could go here but skipping for simplicity
        const res = await addCenterPostComment(centerId, post.id, newComment, commentAsCenter);
        if (res.success) {
            setNewComment("");
            // Refresh comments
            const updatedComments = await getCenterPostComments(post.id);
            setComments(updatedComments || []);
            setCommentsCount(commentsCount + 1);
        } else {
            alert(res.error || "Failed to comment");
        }
    };

    const handleDeletePost = async () => {
        if (!confirm("Are you sure you want to delete this post?")) return;
        setIsDeleting(true);
        const res = await deletePost(centerId, post.id);
        if (res.error) {
            alert(res.error);
            setIsDeleting(false);
        }
        // Parent component should probably handle removal from list, but revalidatePath will refresh the page.
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Delete comment?")) return;
        const res = await deleteCenterPostComment(centerId, commentId);
        if (res.success) {
            setComments(comments.filter(c => c.id !== commentId));
            setCommentsCount(commentsCount - 1);
        }
    };

    const toggleBlock = (blockKey: string) => {
        setExpandedBlocks(prev => ({ ...prev, [blockKey]: !prev[blockKey] }));
    };

    if (isDeleting) return null;

    // Handle WOD content parsing
    let wodData: any = null;
    if (post.post_type === 'wod') {
        try {
            wodData = JSON.parse(post.content);
        } catch (e) {
            wodData = { workout: post.content };
        }
    }

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8 animate-fade-in shadow-lg" ref={postRef}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-border bg-muted/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border">
                        {post.post_as_center && post.organization ? (
                            post.organization.logo_url ? (
                                <img src={post.organization.logo_url} alt="Center" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black text-white"><Building2 className="w-5 h-5" /></div>
                            )
                        ) : post.author?.avatar_url ? (
                            <img src={post.author.avatar_url} alt="Author" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-brand-red text-white text-xs font-bold">
                                {post.author?.full_name?.[0] || "R"}
                            </div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-foreground font-bold text-sm hover:text-brand-red cursor-pointer transition-colors flex items-center gap-2">
                            {post.post_as_center && post.organization ? (
                                <>
                                    {post.organization.name}
                                    <span className="bg-brand-red/10 text-brand-red text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Oficial</span>
                                </>
                            ) : (
                                post.author?.full_name || "Gym Admin"
                            )}
                        </h4>
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                            {isMounted ? (
                                <>
                                    {new Date(post.scheduled_for || post.created_at).toLocaleDateString(undefined, {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                    {new Date(post.scheduled_for) > new Date() && (
                                        <span className="bg-brand-red text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Clock className="w-2 h-2" /> PROGRAMADO
                                        </span>
                                    )}
                                </>
                            ) : '...'}
                        </p>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleDeletePost}
                        className="text-muted-foreground hover:text-red-500 p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {post.post_type === 'wod' && wodData ? (
                    (!isMember && !isAdmin) ? (
                        <div className="bg-muted/10 border border-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center mb-1 shadow-glow border border-brand-red/20">
                                <Dumbbell className="w-5 h-5 text-brand-red" />
                            </div>
                            <div>
                                <h3 className="font-heading font-black italic uppercase text-lg text-foreground">Entrenamiento del Día</h3>
                                <p className="text-xs text-muted-foreground font-medium max-w-[250px] mx-auto mt-1">
                                    Este WOD es exclusivo para los atletas de {post.organization?.name || "este centro"}.
                                </p>
                            </div>
                            <Link href={`/gym/${centerId}`} className="mt-2 px-6 py-3 bg-brand-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg flex items-center gap-2">
                                Ver Planes <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-2">
                            <WodCard
                                data={wodData}
                                userName={post.post_as_center && post.organization ? post.organization.name : (post.author?.full_name || "Coach")}
                                postId={post.id}
                            />
                            <div className="pt-4">
                                <button
                                    onClick={() => setShowWODTracker(true)}
                                    className="flex items-center justify-center gap-2 w-full py-4 bg-brand-red text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-glow-sm hover:shadow-glow group"
                                >
                                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> {hasCompletedWod ? 'Editar mi resultado' : 'Registrar Entrenamiento'}
                                </button>
                            </div>
                        </div>
                    )
                ) : post.content && (
                    <MentionText
                        text={post.content}
                        className="text-sm sm:text-base whitespace-pre-wrap mb-4 leading-relaxed font-accent font-medium tracking-tight text-foreground block"
                    />
                )}
                {post.image_urls && post.image_urls.length > 0 && (
                    <div
                        className="rounded-xl overflow-hidden border border-border bg-muted/50 cursor-pointer group relative shadow-lg"
                        onClick={() => setIsLightboxOpen(true)}
                    >
                        {/\.(mp4|webm|ogg|mov)$/i.test(post.image_urls[0]) ? (
                            <div className="relative w-full h-full">
                                <video
                                    ref={videoRef}
                                    src={post.image_urls[0]}
                                    className="w-full max-h-[600px] object-contain bg-black"
                                    autoPlay
                                    muted={!isVisible || (typeof document !== 'undefined' && document.hidden)}
                                    loop
                                    playsInline
                                    preload="auto"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-transparent transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-glow keep-all">
                                        <Play className="w-5 h-5 text-white fill-white ml-1 opacity-50 keep-white" />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <img
                                src={post.image_urls[0]}
                                alt="Post Media"
                                className="w-full max-h-[600px] object-contain bg-black/5 group-hover:scale-[1.02] transition-transform duration-500"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Stats/Actions */}
            <div className="px-4 py-3 bg-muted/20 border-t border-border">
                <div className="flex items-center gap-6 text-muted-foreground text-xs mb-3 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 transition-colors hover:text-brand-red cursor-default">
                        <Heart className="w-3.5 h-3.5 fill-brand-red text-brand-red" />
                        <span>{likes} {likes === 1 ? 'Me gusta' : 'Me gustas'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-brand-red transition-colors" onClick={toggleComments}>
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{commentsCount} {commentsCount === 1 ? 'Comentario' : 'Comentarios'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-3">
                    <button
                        onClick={handleLike}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-sm ${isLiked ? 'text-brand-red bg-brand-red/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                        Like
                    </button>
                    <button
                        onClick={toggleComments}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-bold text-sm"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Comment
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-bold text-sm">
                        <Share2 className="w-5 h-5" />
                        Share
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="border-t border-border bg-muted/30 p-4">
                    <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar">
                        {loadingComments && <p className="text-center text-muted-foreground text-xs">Loading comments...</p>}
                        {!loadingComments && comments.length === 0 && <p className="text-center text-muted-foreground text-xs text-italic">Be the first to comment!</p>}

                        {comments.map((comment: any) => (
                            <div key={comment.id} className="flex gap-3 group">
                                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                                    {comment.post_as_center && post.organization ? (
                                        post.organization.logo_url ? <img src={post.organization.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-black text-white"><Building2 className="w-4 h-4" /></div>
                                    ) : comment.user?.avatar_url ? (
                                        <img src={comment.user.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted text-[10px] text-foreground font-bold">
                                            {comment.user?.username?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="bg-muted rounded-2xl rounded-tl-none p-3 inline-block min-w-0 sm:min-w-[200px]">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-foreground font-bold text-xs flex items-center gap-1.5">
                                                {comment.post_as_center && post.organization ? (
                                                    <>{post.organization.name} <span className="text-[8px] bg-brand-red text-white px-1 rounded uppercase">Gym</span></>
                                                ) : (
                                                    comment.user?.full_name || comment.user?.username || 'User'
                                                )}
                                            </span>
                                            <span className="text-muted-foreground text-[10px] ml-2">
                                                {isMounted ? new Date(comment.created_at).toLocaleDateString() : '...'}
                                            </span>
                                        </div>
                                        <MentionText text={comment.content} className="text-foreground/90 text-sm font-accent font-medium block" />
                                    </div>
                                    {(isAdmin || currentUserId === comment.user_id) && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-[10px] text-muted-foreground ml-2 mt-1 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                        {isAdmin && (
                            <div className="flex items-center gap-2 px-1 cursor-pointer w-fit" onClick={() => setCommentAsCenter(!commentAsCenter)}>
                                <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center transition-colors ${commentAsCenter ? 'bg-brand-red border-brand-red' : 'border-gray-500 bg-transparent'}`}>
                                    {commentAsCenter && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wide select-none ${commentAsCenter ? 'text-brand-red' : 'text-muted-foreground'}`}>
                                    Comentar como Gym
                                </span>
                            </div>
                        )}
                        <div className="flex gap-3 items-end">
                            <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden shrink-0 mb-1">
                                {commentAsCenter && post.organization ? (
                                    post.organization.logo_url ? <img src={post.organization.logo_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-black text-white"><Building2 className="w-4 h-4" /></div>
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center text-[10px]">Yo</div>
                                )}
                            </div>
                            <div className="flex-1 relative">
                                <MentionInput
                                    as="textarea"
                                    value={newComment}
                                    onChange={setNewComment}
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment(e);
                                        }
                                    }}
                                    placeholder="Write a comment..."
                                    className="w-full bg-background border border-border rounded-2xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-brand-red/50 min-h-[40px] resize-none overflow-hidden"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim()}
                                    className="absolute right-2 bottom-2 text-brand-red hover:text-foreground disabled:opacity-30 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
            {/* Lightbox */}
            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setIsLightboxOpen(false)}
                >
                    <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute right-6 text-white hover:text-brand-red focus:outline-none transition-colors z-[110] bg-black/20 p-2 rounded-full cursor-pointer shadow-lg"
                        style={{ top: 'max(1.5rem, env(safe-area-inset-top))' }}
                    >
                        <X className="w-8 h-8 md:w-10 md:h-10" />
                    </button>
                    <div className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        {/\.(mp4|webm|ogg|mov)$/i.test(post.image_urls?.[0]) ? (
                            <video
                                src={post.image_urls?.[0]}
                                controls
                                autoPlay
                                className="max-w-full max-h-[90vh] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                            />
                        ) : (
                            <img
                                src={post.image_urls?.[0]}
                                alt="Full size"
                                className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                            />
                        )}
                    </div>
                </div>
            )}

            {showWODTracker && (
                <WODTrackerModal
                    wodPostId={post.id}
                    wodTitle={wodData?.title || "WOD"}
                    wodType={wodData?.summary?.scoreType?.toUpperCase() === 'TIME' ? 'time' : 'rounds'}
                    isOpen={showWODTracker}
                    onClose={() => setShowWODTracker(false)}
                    onSuccess={() => {
                        setHasCompletedWod(true);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
}
