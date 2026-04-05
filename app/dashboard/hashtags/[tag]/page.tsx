'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import FeedPost from '@/app/dashboard/FeedPost';
import { motion } from 'framer-motion';
import { Hash, ArrowLeft, Search, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
    const { tag } = use(params);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ count: 0 });
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        async function loadContent() {
            const supabase = createClient();
            
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            // Search for posts containing the hashtag in the caption
            // We join with profiles and workouts to get all data needed for FeedPost
            const { data, error, count } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles:user_id (
                        username,
                        full_name,
                        avatar_url,
                        is_official
                    ),
                    workouts:workout_id (
                        *,
                        workout_sets (*)
                    ),
                    likes:likes(user_id)
                `, { count: 'exact' })
                .ilike('caption', `%#${tag}%`)
                .order('created_at', { ascending: false });

            if (data) {
                setPosts(data);
                setStats({ count: count || 0 });
            }
            setLoading(false);
        }

        loadContent();
    }, [tag]);

    const formatTimeAgo = (date: string) => {
        try {
            const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
            if (seconds < 60) return `hace ${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h`;
            return `${Math.floor(hours / 24)}d`;
        } catch (e) {
            return 'reciente';
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Link 
                        href="/dashboard/community" 
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group w-fit"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest text-shadow-sm">Comunidad Rival</span>
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-red/10 rounded-3xl flex items-center justify-center border border-brand-red/20 shadow-[0_0_50px_rgba(230,0,0,0.1)] group relative overflow-hidden transition-all hover:bg-brand-red/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Hash className="w-8 h-8 md:w-10 md:h-10 text-brand-red relative z-10" />
                            </div>
                            <div>
                                <h1 className="text-5xl md:text-7xl font-accent font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">
                                    #{tag}
                                </h1>
                                <div className="flex items-center gap-4 mt-3">
                                    <span className="bg-brand-red/10 text-brand-red px-3 py-1.5 rounded-[12px] text-[10px] font-black uppercase tracking-[0.2em] border border-brand-red/20 backdrop-blur-sm">
                                        {stats.count} Atletas Han Usado Este Tag
                                    </span>
                                    <div className="h-4 w-[1px] bg-white/10" />
                                    <span className="flex items-center gap-1.5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                        <TrendingUp className="w-3.5 h-3.5 text-brand-red animate-pulse" /> Tendencia Rival
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feed */}
                <div className="space-y-12">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Analizando el Feed Rival...</p>
                        </div>
                    ) : posts.length > 0 ? (
                        posts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <FeedPost
                                    postId={post.id}
                                    action="publicó"
                                    time={formatTimeAgo(post.created_at)}
                                    user={post.profiles?.full_name || post.profiles?.username || 'Atleta Rival'}
                                    username={post.profiles?.username}
                                    avatar={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'User')}&background=random`}
                                    image={post.media_url}
                                    mediaType={post.media_type}
                                    caption={post.caption}
                                    initialLikes={post.likes ? post.likes.length : (post.likes_count || 0)}
                                    hasLikedInitial={currentUserId ? post.likes?.some((l: any) => l.user_id === currentUserId) : false}
                                    comments={post.comments_count || 0}
                                    currentUserId={currentUserId || undefined}
                                    authorId={post.user_id}
                                    workoutData={post.workouts}
                                    music_url={post.music_url}
                                    music_title={post.music_title}
                                    music_artist={post.music_artist}
                                    isOfficial={post.profiles?.is_official}
                                    highlight={post.workouts?.title}
                                />
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-24 bg-white/[0.02] rounded-[48px] border border-white/5 border-dashed group hover:bg-white/[0.04] transition-all">
                            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-xl">
                                <Search className="w-10 h-10 text-gray-700" />
                            </div>
                            <h3 className="text-2xl font-accent font-black uppercase tracking-tight mb-3">Zona de Silencio</h3>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed px-6">
                                Nadie ha marcado su territorio con <span className="text-brand-red font-bold">#{tag}</span> todavía. 
                                <br />¡Es tu oportunidad de liderar esta tendencia!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
