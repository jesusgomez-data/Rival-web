'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, ChevronDown, Send, Loader2, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { createPortal } from 'react-dom'

export interface ReelPost {
    postId: string
    src: string
    username: string
    userFullName?: string
    avatar?: string
    caption?: string
    initialLikes: number
    hasLikedInitial: boolean
    commentsCount: number
    currentUserId?: string
    authorId?: string
}

interface VideoReelsViewerProps {
    posts: ReelPost[]
    startIndex: number
    onClose: () => void
}

// ── Comment sheet ─────────────────────────────────────────────────────────────
function CommentSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
    const supabase = createClient()
    const [comments, setComments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setLoading(true)
        supabase
            .from('comments')
            .select('id, content, created_at, profiles:user_id(full_name, username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(30)
            .then((res: { data: any[] | null }) => { setComments(res.data || []); setLoading(false) })
    }, [postId])

    const sendComment = async () => {
        if (!text.trim() || sending) return
        setSending(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSending(false); return }
        await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: text.trim() })
        const { data } = await supabase
            .from('comments')
            .select('id, content, created_at, profiles:user_id(full_name, username, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(30)
        setComments(data || [])
        setText('')
        setSending(false)
    }

    return (
        <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10001] bg-black/40" onClick={onClose} />
            {/* Sheet */}
            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className="fixed bottom-0 left-0 right-0 z-[10002] bg-[#111] rounded-t-[28px] max-h-[70vh] flex flex-col border-t border-white/10"
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>
                <div className="px-5 pb-3 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Comentarios</h3>
                    <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                {/* List */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-red" /></div>
                    ) : comments.length === 0 ? (
                        <p className="text-center text-white/25 text-sm py-8 font-bold">Sé el primero en comentar</p>
                    ) : comments.map(c => {
                        const p = c.profiles as any
                        return (
                            <div key={c.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 relative">
                                    {p?.avatar_url
                                        ? <Image src={p.avatar_url} alt="" fill className="object-cover" />
                                        : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white/40">{(p?.full_name || '?')[0]}</div>
                                    }
                                </div>
                                <div>
                                    <span className="text-[11px] font-black text-brand-red">{p?.username || p?.full_name}</span>
                                    <p className="text-sm text-white/80 leading-tight mt-0.5">{c.content}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {/* Input */}
                <div className="flex gap-3 px-4 py-3 border-t border-white/[0.06] pb-[env(safe-area-inset-bottom,12px)]">
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendComment()}
                        placeholder="Añadir comentario..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red transition-colors placeholder:text-white/20"
                    />
                    <button onClick={sendComment} disabled={!text.trim() || sending}
                        className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center disabled:opacity-40 transition-all shrink-0">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                    </button>
                </div>
            </motion.div>
        </>
    )
}

// ── Single reel item ──────────────────────────────────────────────────────────
function ReelItem({
    post, isActive, isMuted, onCommentOpen, onShare
}: {
    post: ReelPost; isActive: boolean; isMuted: boolean;
    onCommentOpen: () => void; onShare: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const supabase = createClient()
    const [liked, setLiked] = useState(post.hasLikedInitial)
    const [likes, setLikes] = useState(post.initialLikes)
    const [isPlaying, setIsPlaying] = useState(false)
    const [paused, setPaused] = useState(false)
    const [heartAnim, setHeartAnim] = useState(false)
    const lastTapRef = useRef(0)

    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        if (isActive) {
            v.currentTime = 0
            v.play().then(() => setIsPlaying(true)).catch(() => {})
        } else {
            v.pause()
            v.currentTime = 0
            setIsPlaying(false)
            setPaused(false)
        }
    }, [isActive])

    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        v.muted = isMuted
    }, [isMuted])

    const togglePlay = useCallback(() => {
        const v = videoRef.current
        if (!v) return
        if (v.paused) { v.play(); setPaused(false) } else { v.pause(); setPaused(true) }
    }, [])

    const handleDoubleTap = useCallback(() => {
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
            // Double tap — like
            if (!liked) {
                setLiked(true)
                setLikes(l => l + 1)
                setHeartAnim(true)
                setTimeout(() => setHeartAnim(false), 900)
                supabase.rpc('toggle_post_like', { p_post_id: post.postId }).catch(() => {})
            }
        }
        lastTapRef.current = now
    }, [liked, post.postId])

    const handleLike = useCallback(async () => {
        const newLiked = !liked
        setLiked(newLiked)
        setLikes(l => newLiked ? l + 1 : Math.max(0, l - 1))
        if (newLiked) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 900) }
        await supabase.rpc('toggle_post_like', { p_post_id: post.postId }).catch(() => {})
    }, [liked, post.postId])

    return (
        <div className="relative w-full flex-shrink-0 overflow-hidden bg-black" style={{ height: '100dvh' }}>
            {/* Video */}
            <video
                ref={videoRef}
                src={post.src}
                className="absolute inset-0 w-full h-full object-cover"
                loop playsInline muted={isMuted}
                preload={isActive ? 'auto' : 'metadata'}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={handleDoubleTap}
            />

            {/* Tap to play/pause */}
            <div className="absolute inset-0 z-10" onClick={e => { handleDoubleTap(); if (Date.now() - lastTapRef.current > 300) setTimeout(togglePlay, 350) }} />

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none z-20" />

            {/* Paused indicator */}
            <AnimatePresence>
                {paused && (
                    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-white/20">
                            <Play className="w-10 h-10 text-white fill-white" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Double-tap heart animation */}
            <AnimatePresence>
                {heartAnim && (
                    <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [1, 1.6, 0], opacity: [1, 1, 0] }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                        <Heart className="w-28 h-28 text-white fill-white drop-shadow-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Right actions */}
            <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
                {/* Avatar */}
                <div className="flex flex-col items-center">
                    <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden relative shadow-2xl">
                        {post.avatar
                            ? <Image src={post.avatar} alt="" fill className="object-cover" />
                            : <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-sm font-black text-white">{(post.username[0] || '?').toUpperCase()}</div>
                        }
                    </div>
                </div>

                {/* Like */}
                <button onClick={e => { e.stopPropagation(); handleLike() }} className="flex flex-col items-center gap-1">
                    <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 ${liked ? 'bg-brand-red/30' : 'bg-black/30'}`}>
                        <Heart className={`w-6 h-6 ${liked ? 'fill-brand-red text-brand-red' : 'text-white'} transition-all`} />
                    </div>
                    <span className="text-white text-[11px] font-black drop-shadow">{likes}</span>
                </button>

                {/* Comment */}
                <button onClick={e => { e.stopPropagation(); onCommentOpen() }} className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
                        <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white text-[11px] font-black drop-shadow">{post.commentsCount}</span>
                </button>

                {/* Share */}
                <button onClick={e => { e.stopPropagation(); onShare() }} className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
                        <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white text-[11px] font-black drop-shadow">Compartir</span>
                </button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-6 left-4 right-16 z-30">
                <p className="text-white font-black text-sm mb-1 drop-shadow">@{post.username}</p>
                {post.caption && (
                    <p className="text-white/80 text-xs font-medium leading-snug line-clamp-3 drop-shadow">{post.caption}</p>
                )}
            </div>
        </div>
    )
}

// ── Main viewer ───────────────────────────────────────────────────────────────
export default function VideoReelsViewer({ posts, startIndex, onClose }: VideoReelsViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(startIndex)
    const [isMuted, setIsMuted] = useState(false)
    const [commentPostId, setCommentPostId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const itemRefs = useRef<(HTMLDivElement | null)[]>([])

    useEffect(() => { setMounted(true) }, [])

    // Scroll to startIndex on mount
    useEffect(() => {
        if (!containerRef.current) return
        const item = itemRefs.current[startIndex]
        if (item) {
            item.scrollIntoView({ behavior: 'instant' as ScrollBehavior })
        }
    }, [mounted, startIndex])

    // IntersectionObserver to track current video
    useEffect(() => {
        observerRef.current?.disconnect()
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = itemRefs.current.findIndex(r => r === entry.target)
                    if (idx !== -1) setCurrentIndex(idx)
                }
            })
        }, { threshold: 0.6 })

        itemRefs.current.forEach(el => el && obs.observe(el))
        observerRef.current = obs
        return () => obs.disconnect()
    }, [posts.length])

    // Lock body scroll while viewer is open
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [])

    // Keyboard navigation
    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return }
            if (e.key === 'ArrowDown' && currentIndex < posts.length - 1) {
                itemRefs.current[currentIndex + 1]?.scrollIntoView({ behavior: 'smooth' })
            }
            if (e.key === 'ArrowUp' && currentIndex > 0) {
                itemRefs.current[currentIndex - 1]?.scrollIntoView({ behavior: 'smooth' })
            }
        }
        window.addEventListener('keydown', handle)
        return () => window.removeEventListener('keydown', handle)
    }, [currentIndex, posts.length, onClose])

    const handleShare = useCallback(() => {
        const post = posts[currentIndex]
        if (!post) return
        if (navigator.share) {
            navigator.share({ title: `@${post.username} en Rival Fit`, text: post.caption || '', url: window.location.href }).catch(() => {})
        } else {
            navigator.clipboard.writeText(window.location.href).catch(() => {})
        }
    }, [currentIndex, posts])

    if (!mounted) return null

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black"
        >
            {/* Close */}
            <button onClick={onClose}
                className="absolute top-4 left-4 z-50 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/10">
                <X className="w-5 h-5" />
            </button>

            {/* Mute toggle */}
            <button onClick={() => setIsMuted(m => !m)}
                className="absolute top-4 right-4 z-50 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/10">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Progress dots */}
            {posts.length > 1 && posts.length <= 12 && (
                <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex gap-1">
                    {posts.map((_, i) => (
                        <div key={i} className={`h-0.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`} />
                    ))}
                </div>
            )}

            {/* Scroll container */}
            <div
                ref={containerRef}
                className="h-full overflow-y-scroll"
                style={{ scrollSnapType: 'y mandatory', scrollBehavior: 'smooth' }}
            >
                {posts.map((post, i) => (
                    <div
                        key={post.postId}
                        ref={el => { itemRefs.current[i] = el }}
                        style={{ scrollSnapAlign: 'start', height: '100dvh' }}
                    >
                        <ReelItem
                            post={post}
                            isActive={i === currentIndex}
                            isMuted={isMuted}
                            onCommentOpen={() => setCommentPostId(post.postId)}
                            onShare={handleShare}
                        />
                    </div>
                ))}
            </div>

            {/* Swipe hint — first time only */}
            {currentIndex === 0 && posts.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 1, 0], y: [0, -8, -8, 0] }}
                    transition={{ duration: 2.5, delay: 1.5, times: [0, 0.2, 0.8, 1] }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none"
                >
                    <ChevronDown className="w-6 h-6 text-white/60" />
                    <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Desliza para más</span>
                </motion.div>
            )}

            {/* Comment sheet */}
            <AnimatePresence>
                {commentPostId && (
                    <CommentSheet postId={commentPostId} onClose={() => setCommentPostId(null)} />
                )}
            </AnimatePresence>
        </motion.div>,
        document.body
    )
}
