'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Share2, Music, User, Trophy, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReelPosts, toggleLike } from './community/actions';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
import { useLanguage } from '../LanguageContext';

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

function Reel({ post, isActive }: { post: ReelPost, isActive: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [liked, setLiked] = useState(post.hasLikedInitial);
    const [likes, setLikes] = useState(post.initialLikes);
    const { t } = useLanguage();

    const lastTap = useRef<number>(0);
    const [showHeart, setShowHeart] = useState(false);

    useEffect(() => {
        if (isActive && videoRef.current) {
            videoRef.current.play().catch(e => console.error("Auto-play failed", e));
            setIsPlaying(true);
        } else if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

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
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
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
                onClick={handleTap}
            />

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
                    <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white">
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    <span className="text-white text-xs font-bold shadow-sm">{post.comments_count || 0}</span>
                </div>

                <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white">
                    <Share2 className="w-6 h-6" />
                </button>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
                <div className="flex items-center gap-3 mb-4">
                    <Link href={`/dashboard/profile/${post.profiles?.username || ''}`} className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-brand-red overflow-hidden bg-gray-800">
                            {post.profiles?.avatar_url ? (
                                <Image src={post.profiles.avatar_url} alt={post.profiles.username || 'user'} width={40} height={40} className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                                    {(post.profiles?.username?.[0] || '?').toUpperCase()}
                                </div>
                            )}
                        </div>
                    </Link>
                    <div>
                        <Link href={`/dashboard/profile/${post.profiles?.username || ''}`} className="flex items-center gap-1.5 group">
                            <span className="text-white font-bold group-hover:text-brand-red transition-colors">@{post.profiles?.username || 'user'}</span>
                            {post.profiles?.is_official && (
                                <span className="bg-brand-red p-0.5 rounded-full">
                                    <Trophy className="w-2.5 h-2.5 text-white" />
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                <p className="text-white text-sm mb-4 line-clamp-2">{post.caption}</p>

                {post.music_title && (
                    <div className="flex items-center gap-2">
                        <Music className="w-3.5 h-3.5 text-white animate-spin-slow" />
                        <div className="overflow-hidden flex-1">
                            <div className="text-[10px] text-white font-medium uppercase tracking-widest whitespace-nowrap animate-marquee">
                                {post.music_title} • {post.music_artist || 'Original Audio'}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VideoReelsModal({ isOpen, onClose, initialPostId, context }: VideoReelsModalProps) {
    const [posts, setPosts] = useState<ReelPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadPosts();
            // Prevent body scroll
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
                className="fixed inset-0 z-[200] bg-black flex items-center justify-center md:bg-black/90"
            >
                {/* Desktop Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-[210] p-2 bg-white/10 hover:bg-brand-red text-white rounded-full transition-colors hidden md:block"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Mobile Close Button (floating) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 z-[210] p-2 bg-black/20 text-white rounded-full md:hidden"
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
        </AnimatePresence>
    );
}
