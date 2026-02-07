"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MoreHorizontal, MessageCircle, Share2, Trophy, X, Send, Smile, Play, Trash2, Edit2, Save, Heart, Dumbbell, Activity, ChevronDown, ChevronUp, Music } from "lucide-react";
import LikeButton from "./community/LikeButton";
import { addComment, getComments, deletePost, updatePost, toggleCommentLike, toggleLike } from "./community/actions";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { clsx } from "clsx";
import { useTheme } from "../ThemeContext";
import { useStories } from "./stories/StoryContext";
import PRCard from "./community/PRCard";

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
    workoutData?: {
        title: string;
        total_volume_kg?: number;
        workout_sets?: any[];
        location_name?: string;
    };
    music_url?: string | null;
    music_title?: string | null;
    music_artist?: string | null;
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
    workoutData, music_url, music_title, music_artist
}: FeedPostProps) {
    const { theme } = useTheme();
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
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
    // Edit/Delete state
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editCaption, setEditCaption] = useState(caption || "");
    const [displayCaption, setDisplayCaption] = useState(caption || "");
    const [isDeleting, setIsDeleting] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const commentInputRef = useRef<HTMLInputElement>(null);

    const isVideo = image && (/\.(mp4|webm|ogg|mov)$/i.test(image) || (mediaType && mediaType === 'video'));
    const isOwner = currentUserId && authorId && currentUserId === authorId;

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

    if (isDeleting) return null;

    const CommentNode = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => (
        <div className={clsx("flex gap-3", depth > 0 && "mt-3")}>
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden shrink-0">
                    {comment.user?.avatar_url ? (
                        <Image src={comment.user.avatar_url} alt={comment.user.username} width={32} height={32} className="object-cover w-full h-full" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">?</div>
                    )}
                </div>
                {comment.replies && comment.replies.length > 0 && (
                    <div className="w-px h-full bg-white/10 my-2" />
                )}
            </div>
            <div className="flex-1">
                <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 text-sm group relative">
                    <span className="font-bold text-gray-200 mr-2">{comment.user?.username || "Usuario"}</span>
                    <span className="text-gray-300 whitespace-pre-wrap">{comment.content}</span>
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
        <div className={clsx(
            "border rounded-2xl overflow-hidden transition-colors mb-6",
            theme === 'dark' ? "bg-brand-gray border-white/5" : "bg-white border-gray-200 shadow-sm"
        )}>
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
                        <Image src={avatar} alt={user} fill className="object-cover" />
                    </div>
                </div>
                <Link href={`/dashboard/profile/${username || user.toLowerCase().replace(/\s+/g, '')}`} className="flex-1 group">
                    <div>
                        <p className={clsx(
                            "text-base font-black group-hover:text-brand-red transition-colors leading-tight uppercase font-heading italic tracking-tight",
                            theme === 'dark' ? "text-white" : "text-gray-900"
                        )}>{user}</p>
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
                    {isOwner && (
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
                                        <Edit2 className="w-4 h-4" /> Editar
                                    </button>
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

            {/* Caption - Only show if not a class_result (unless editing) */}
            {((displayCaption && mediaType !== 'class_result') || isEditing) && (
                <div className="px-4 pb-3">
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
                    ) : (
                        <p className={clsx(
                            "text-sm sm:text-base whitespace-pre-wrap font-accent font-medium tracking-tight leading-relaxed",
                            theme === 'dark' ? "text-gray-100" : "text-black"
                        )}>{displayCaption}</p>
                    )}
                </div>
            )}

            {/* Media Content */}
            {mediaType === 'pr' ? (
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
                                sport={prData.sport || "CrossFit"}
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
            ) : (image || workoutData) ? (
                <div className="flex flex-col gap-4">
                    {image && (
                        <div className="px-2">
                            <div className="relative aspect-video bg-black cursor-pointer group shadow-2xl overflow-hidden rounded-xl" onClick={() => setIsLightboxOpen(true)}>
                                {isVideo ? (
                                    <div className="relative w-full h-full">
                                        <video src={image} className="w-full h-full object-cover" autoPlay loop playsInline />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-glow">
                                                <Play className="w-5 h-5 text-white fill-white ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <Image src={image} alt="Post content" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {workoutData && ((() => {
                        const w = Array.isArray(workoutData) ? workoutData[0] : workoutData;
                        if (!w) return null;

                        // CHECK FOR MULTI-BLOCK METRICS
                        if (w.metrics && w.metrics.blocks && w.metrics.blocks.length > 0) {
                            const blocks = w.metrics.blocks;
                            const centerName = w.location_name || 'Gimnasio';
                            const displayCenterName = centerName && !['Centro Deportivo', 'Gimnasio', 'Gimnasio RIVAL HQ'].includes(centerName) ? ` @ ${centerName}` : '';

                            const summary = `${blocks.length} BLOQUES`;

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
                                                    <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                </div>
                                                <div className="text-left flex-1 min-w-0">
                                                    <h4 className={clsx(
                                                        "text-xs md:text-sm font-heading font-black italic uppercase tracking-tighter group-hover:text-brand-red transition-colors leading-none truncate pr-2",
                                                        theme === 'dark' ? "text-white" : "text-gray-900"
                                                    )}>
                                                        RESUMEN DE SESIÓN
                                                    </h4>
                                                    <p className="text-[7px] md:text-[8px] text-brand-red/70 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5 truncate">
                                                        <span className="w-1 h-1 shrink-0 rounded-full bg-brand-red"></span>
                                                        {summary}{displayCenterName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex bg-white/5 rounded-lg p-1.5 group-hover:bg-brand-red group-hover:text-white transition-all border border-white/5 shrink-0">
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
                                                    <p className="text-[7px] md:text-[8px] text-gray-500 font-black uppercase tracking-[0.3em] italic">RESULTADOS POR BLOQUE</p>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                                                        className="text-[7px] md:text-[8px] text-brand-red font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                                                    >
                                                        CERRAR <ChevronUp className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <div className="relative z-10 space-y-3">
                                                    {blocks.map((block: any, idx: number) => {
                                                        const isInnerExpanded = expandedInnerBlocks.includes(idx + 1000); // Unique ID offset
                                                        const resultStr = block.type === 'fortime' ? block.result?.time : (block.type === 'emom' ? `${block.duration}' - ${block.result?.rounds || 0} Rds` : `${block.result?.rounds} Rds`);

                                                        return (
                                                            <div key={idx} className={clsx(
                                                                "border rounded-xl md:rounded-2xl relative overflow-hidden group/card transition-all",
                                                                theme === 'dark' ? "bg-[#121212] border-white/5" : "bg-white border-gray-100 shadow-sm",
                                                                isInnerExpanded ? "p-3 md:p-4" : "p-2 md:p-3 hover:bg-white/[0.02] cursor-pointer"
                                                            )} onClick={() => !isInnerExpanded && toggleInnerBlock(idx + 1000)}>
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="min-w-0 flex-1">
                                                                        <h3 className={clsx(
                                                                            "text-sm md:text-base font-heading font-black italic uppercase tracking-tighter leading-none truncate pr-2",
                                                                            theme === 'dark' ? "text-white" : "text-gray-900"
                                                                        )}>
                                                                            {block.title || `BLOQUE ${idx + 1}`} <span className="text-[9px] text-gray-500 ml-1 not-italic font-bold tracking-widest">({block.type.toUpperCase()})</span>
                                                                        </h3>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="text-right shrink-0">
                                                                            <span className="text-sm md:text-lg font-heading font-black text-brand-red italic tracking-tighter leading-none">
                                                                                {resultStr}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); toggleInnerBlock(idx + 1000); }}
                                                                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                                                                        >
                                                                            {isInnerExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {isInnerExpanded && (
                                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-3 mt-2 border-t border-white/5">
                                                                        {block.notes && <p className="text-xs text-gray-400 italic mb-2">"{block.notes}"</p>}
                                                                        <div className="space-y-2">
                                                                            {block.exercises?.map((ex: any, eIdx: number) => (
                                                                                <div key={eIdx} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                                                                                    <span className={clsx("text-xs font-bold uppercase", theme === 'dark' ? "text-white" : "text-black")}>{ex.name}</span>
                                                                                    {/* Try to show some detail if avail */}
                                                                                    <span className="text-xs text-brand-red font-mono font-bold">
                                                                                        {ex.sets?.[0]?.weight > 0 ? `${ex.sets[0].weight}kg` : ''}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const sets = w.workout_sets || [];
                        const centerName = w.location_name || 'Gimnasio';

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
                                                <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <h4 className={clsx(
                                                    "text-xs md:text-sm font-heading font-black italic uppercase tracking-tighter group-hover:text-brand-red transition-colors leading-none truncate pr-2",
                                                    theme === 'dark' ? "text-white" : "text-gray-900"
                                                )}>
                                                    {summary}
                                                </h4>
                                                <p className="text-[7px] md:text-[8px] text-brand-red/70 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5 truncate">
                                                    <span className="w-1 h-1 shrink-0 rounded-full bg-brand-red"></span>
                                                    {displayCenterName || 'ENTRENAMIENTO'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex bg-white/5 rounded-lg p-1.5 group-hover:bg-brand-red group-hover:text-white transition-all border border-white/5 shrink-0">
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
                {(workoutData || mediaType === 'class_result') ? (
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
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/dashboard`;
                                if (navigator.share) navigator.share({ title: 'RIVAL', url });
                                else { navigator.clipboard.writeText(url); alert("Copiado!"); }
                            }}
                            className="p-3 md:p-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl md:rounded-2xl border border-white/5 transition-all"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
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
                        <button
                            onClick={() => {
                                const url = `${window.location.origin}/dashboard`;
                                if (navigator.share) navigator.share({ title: 'RIVAL', url });
                                else { navigator.clipboard.writeText(url); alert("Copiado!"); }
                            }}
                            className="ml-auto text-gray-400 hover:text-white"
                        >
                            <Share2 className="w-6 h-6" />
                        </button>
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
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
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

            {/* Lightbox */}
            {
                isLightboxOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsLightboxOpen(false)}>
                        <button className="absolute top-6 right-6 text-white/50 hover:text-white focus:outline-none transition-colors">
                            <X className="w-10 h-10" />
                        </button>
                        <div className="relative w-full max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {isVideo ? (
                                <video src={image} controls autoPlay className="max-w-full max-h-[90vh] rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]" />
                            ) : (
                                <img src={image} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]" />
                            )}
                        </div>
                    </div>
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
