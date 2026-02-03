"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import { MessageCircle, Heart, Share2, MoreHorizontal, Send, Trash2, X, Building2, Dumbbell, Zap, Flame, TrendingUp, ChevronDown, Plus, Play } from "lucide-react";
import { toggleCenterPostLike, addCenterPostComment, getCenterPostComments, deletePost, deleteCenterPostComment } from "./management-actions";
import Link from "next/link";

export default function GymPostCard({ post, centerId, isAdmin = false, currentUserId }: any) {
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
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8 animate-fade-in shadow-lg">
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
                        <p className="text-muted-foreground text-xs">
                            {isMounted ? new Date(post.created_at).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : '...'}
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
                    <div className="space-y-4">
                        {wodData.warmup && (
                            <div className="bg-black/5 rounded-2xl border border-border overflow-hidden">
                                <button
                                    onClick={() => toggleBlock('warmup')}
                                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                                >
                                    <h5 className="text-brand-red font-heading font-black text-xs uppercase tracking-widest flex items-center gap-2 italic">
                                        <Zap className="w-3.5 h-3.5" /> Calentamiento
                                    </h5>
                                    <ChevronDown className={clsx("w-4 h-4 text-muted-foreground transition-transform", expandedBlocks['warmup'] ? "rotate-180" : "")} />
                                </button>
                                {expandedBlocks['warmup'] && (
                                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="text-foreground/80 text-sm whitespace-pre-wrap font-medium leading-relaxed pl-4 border-l-2 border-brand-red/20">
                                            {wodData.warmup}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(wodData.blocks || []).map((block: any, idx: number) => {
                            const blockKey = `block-${idx}`;
                            const isExpanded = expandedBlocks[blockKey];
                            const lines = (block.exercises && block.exercises.length > 0)
                                ? block.exercises
                                : (block.content || '').split('\n').filter((l: string) => l.trim().length > 0);

                            const title = (block.title || (block.format && block.format !== 'free' ? block.format : (block.type === 'wod' ? 'Workout' : block.type))).toUpperCase();
                            const value = block.duration || block.value || "";

                            return (
                                <div key={idx} className="bg-black/5 rounded-2xl border border-border overflow-hidden">
                                    <button
                                        onClick={() => toggleBlock(blockKey)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-brand-red/10 flex items-center justify-center text-brand-red shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                <Dumbbell className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <h5 className="text-foreground font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
                                                    {title}
                                                    {value && <span className="text-[10px] text-brand-red font-black uppercase tracking-widest opacity-80">{value}</span>}
                                                </h5>
                                            </div>
                                        </div>
                                        <ChevronDown className={clsx("w-4 h-4 text-muted-foreground transition-transform", (expandedBlocks[blockKey] ?? true) ? "rotate-180" : "")} />
                                    </button>
                                    {(expandedBlocks[blockKey] ?? true) && (
                                        <div className="px-4 pb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {lines.map((lineItem: any, i: number) => {
                                                let text;
                                                if (typeof lineItem === 'string') {
                                                    text = lineItem;
                                                } else {
                                                    const prefix = [lineItem.sets, lineItem.reps].filter(Boolean).join('x');
                                                    const suffix = lineItem.value ? `@ ${lineItem.value}` : '';
                                                    text = `${prefix ? prefix + ' ' : ''}${lineItem.name} ${suffix}`.trim();
                                                }
                                                return (
                                                    <div key={i} className="flex items-center gap-2 text-sm font-medium text-foreground/90 pl-4 border-l-2 border-border/50">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0" />
                                                        {text}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div className="pt-2">
                            <Link
                                href={`/dashboard/training/session?wodId=${post.id}`}
                                className="flex items-center justify-center gap-2 w-full py-3 bg-foreground text-background rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all shadow-lg group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Registrar Entrenamiento
                            </Link>
                        </div>
                    </div>
                ) : post.content && (
                    <p className={clsx(
                        "text-sm sm:text-base whitespace-pre-wrap mb-4 leading-relaxed font-accent font-medium tracking-tight",
                        "text-foreground"
                    )}>
                        {post.content}
                    </p>
                )}
                {post.image_urls && post.image_urls.length > 0 && (
                    <div className="rounded-xl overflow-hidden border border-border bg-muted/50">
                        {/\.(mp4|webm|ogg|mov)$/i.test(post.image_urls[0]) ? (
                            <video
                                src={post.image_urls[0]}
                                controls
                                className="w-full max-h-[600px] object-contain bg-black"
                            />
                        ) : (
                            <img
                                src={post.image_urls[0]}
                                alt="Post Media"
                                className="w-full max-h-[600px] object-contain bg-black/5"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Stats/Actions */}
            <div className="px-4 py-3 bg-muted/20 border-t border-border">
                <div className="flex items-center justify-between text-muted-foreground text-sm mb-3">
                    <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 fill-brand-red text-brand-red" />
                        <span>{likes} likes</span>
                    </div>
                    <div className="cursor-pointer hover:text-foreground transition-colors" onClick={toggleComments}>
                        {commentsCount} comments
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
                                    <div className="bg-muted rounded-2xl rounded-tl-none p-3 inline-block min-w-[200px]">
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
                                        <p className="text-foreground/90 text-sm font-accent font-medium">{comment.content}</p>
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
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="w-full bg-background border border-border rounded-2xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-brand-red/50 min-h-[40px] resize-none overflow-hidden"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment(e);
                                        }
                                    }}
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
        </div>
    );
}
