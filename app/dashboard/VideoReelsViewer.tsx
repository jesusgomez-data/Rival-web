'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Heart, MessageCircle, Share2, Volume2, VolumeX, ChevronDown, Send, Loader2, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { createPortal } from 'react-dom'
import { useVideo } from './VideoContext'
import { getComments, addComment, toggleCommentLike } from './community/actions'
import { clsx } from 'clsx'

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

// ── Inline comment sheet ──────────────────────────────────────────────────────
function CommentSheet({ postId, onClose }: { postId: string; onClose: () => void }) {
    const [comments, setComments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null)

    const loadComments = async () => {
        setLoading(true)
        const data = await getComments(postId)
        setComments(data || [])
        setLoading(false)
    }

    useEffect(() => {
        loadComments()
    }, [postId])

    const send = async () => {
        if (!text.trim() || sending) return
        setSending(true)
        const result = await addComment(postId, text.trim(), replyingTo?.id)
        if (result?.success) {
            setText('')
            setReplyingTo(null)
            const updated = await getComments(postId)
            setComments(updated || [])
        } else {
            alert(result?.error || 'Error al añadir comentario')
        }
        setSending(false)
    }

    const handleCommentLike = async (commentId: string) => {
        // Optimistically toggle comment like
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    has_liked: !c.has_liked,
                    likes_count: c.has_liked ? c.likes_count - 1 : c.likes_count + 1
                }
            }
            return c
        }))
        await toggleCommentLike(commentId)
    }

    // Process comments to group replies under parent comments
    const roots = comments.filter(c => !c.parent_id)
    const repliesMap = new Map<string, any[]>()
    comments.forEach(c => {
        if (c.parent_id) {
            if (!repliesMap.has(c.parent_id)) {
                repliesMap.set(c.parent_id, [])
            }
            repliesMap.get(c.parent_id)!.push(c)
        }
    })

    const getDescendants = (commentId: string): any[] => {
        const list: any[] = []
        const direct = repliesMap.get(commentId) || []
        direct.forEach(child => {
            list.push(child)
            list.push(...getDescendants(child.id))
        })
        return list
    }

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10001] bg-black/40" onClick={onClose} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                className="fixed bottom-0 left-0 right-0 z-[10002] bg-[#111] rounded-t-[28px] max-h-[70vh] flex flex-col border-t border-white/10">
                <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1 bg-white/20 rounded-full" /></div>
                <div className="px-5 pb-3 border-b border-white/[0.06] flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Comentarios</h3>
                    <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-red" /></div>
                        : roots.length === 0 ? <p className="text-center text-white/25 text-sm py-8 font-bold">Sé el primero</p>
                            : roots.map(c => {
                                const p = c.user as any
                                const replies = getDescendants(c.id)

                                return (
                                    <div key={c.id} className="space-y-3">
                                        {/* Parent Comment */}
                                        <div className="flex gap-3 items-start justify-between group">
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 relative bg-zinc-900">
                                                    {p?.avatar_url ? <Image src={p.avatar_url} alt="" fill className="object-cover" />
                                                        : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white/40">{(p?.username || '?')[0].toUpperCase()}</div>}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-black text-brand-red">@{p?.username || 'Usuario'}</span>
                                                        <span className="text-[9px] text-white/30 font-semibold">{new Date(c.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-sm text-white/90 leading-tight mt-0.5">{c.content}</p>
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

                                        {/* Nested Replies */}
                                        {replies.length > 0 && (
                                            <div className="pl-11 space-y-3 border-l-2 border-white/5 ml-4">
                                                {replies.map(reply => {
                                                    const rp = reply.user as any
                                                    return (
                                                        <div key={reply.id} className="flex gap-2.5 items-start justify-between group">
                                                            <div className="flex gap-2.5">
                                                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/10 relative bg-zinc-900">
                                                                    {rp?.avatar_url ? <Image src={rp.avatar_url} alt="" fill className="object-cover" />
                                                                        : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[8px] font-black text-white/40">{(rp?.username || '?')[0].toUpperCase()}</div>}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-brand-red">@{rp?.username || 'Usuario'}</span>
                                                                        <span className="text-[8px] text-white/30 font-semibold">{new Date(reply.created_at).toLocaleDateString()}</span>
                                                                    </div>
                                                                    <p className="text-xs text-white/80 leading-tight mt-0.5">{reply.content}</p>
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
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
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
                <div className="flex gap-3 px-4 py-3 border-t border-white/[0.06] pb-[env(safe-area-inset-bottom,12px)]">
                    <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
                        placeholder={replyingTo ? `Responder a @${replyingTo.username}...` : "Añadir comentario..."}
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red transition-colors placeholder:text-white/20" />
                    <button onClick={send} disabled={!text.trim() || sending}
                        className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center disabled:opacity-40 shrink-0">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                    </button>
                </div>
            </motion.div>
        </>
    )
}

// ── Single reel — pure UI, no video control logic ─────────────────────────────
function ReelItem({ post, isActive, isNear, onCommentOpen, onShare }: {
    post: ReelPost; isActive: boolean; isNear: boolean;
    onCommentOpen: () => void; onShare: () => void;
}) {
    const supabase = createClient()
    const [liked, setLiked] = useState(post.hasLikedInitial)
    const [likes, setLikes] = useState(post.initialLikes)
    const [heartAnim, setHeartAnim] = useState(false)
    const [videoPaused, setVideoPaused] = useState(false)
    const [videoLoading, setVideoLoading] = useState(true)
    const lastTapRef = useRef(0)
    const videoRef = useRef<HTMLVideoElement>(null)

    // Reset state when this reel goes inactive
    useEffect(() => {
        if (!isActive) { setVideoPaused(false); setVideoLoading(true) }
    }, [isActive])

    const handleTap = useCallback(() => {
        const now = Date.now()
        const dt = now - lastTapRef.current
        lastTapRef.current = now
        if (dt < 280) {
            // double-tap → like
            if (!liked) {
                setLiked(true); setLikes(l => l + 1)
                setHeartAnim(true); setTimeout(() => setHeartAnim(false), 900)
                supabase.rpc('toggle_post_like', { p_post_id: post.postId }).catch(() => {})
            }
        } else {
            // single tap → play/pause (delayed to distinguish from double-tap)
            setTimeout(() => {
                if (Date.now() - lastTapRef.current < 280) return // was double-tap
                const v = videoRef.current
                if (!v) return
                if (v.paused) { v.play().catch(() => {}); setVideoPaused(false) }
                else { v.pause(); setVideoPaused(true) }
            }, 300)
        }
    }, [liked, post.postId])

    const handleLike = useCallback(async () => {
        const next = !liked
        setLiked(next); setLikes(l => next ? l + 1 : Math.max(0, l - 1))
        if (next) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 900) }
        await supabase.rpc('toggle_post_like', { p_post_id: post.postId }).catch(() => {})
    }, [liked, post.postId])

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {/* Video — parent controls play/pause via ref, not React state */}
            <video
                ref={videoRef}
                src={isNear ? post.src : undefined}
                data-reel-video
                className="absolute inset-0 w-full h-full object-cover"
                loop playsInline muted
                preload={isNear ? "auto" : "none"}
                onPlay={() => { setVideoLoading(false); setVideoPaused(false) }}
                onPause={() => setVideoPaused(true)}
                onWaiting={() => setVideoLoading(true)}
                onCanPlayThrough={() => setVideoLoading(false)}
                onClick={handleTap}
            />

            {/* Spinner while buffering */}
            <AnimatePresence>
                {isActive && videoLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Paused icon */}
            <AnimatePresence>
                {isActive && videoPaused && (
                    <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 rounded-full bg-black/50 backdrop-blur flex items-center justify-center border border-white/20">
                            <Play className="w-9 h-9 text-white fill-white ml-1" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tap overlay (invisible, on top of video for taps) */}
            <div className="absolute inset-0 z-10" onClick={handleTap} />

            {/* Double-tap heart */}
            <AnimatePresence>
                {heartAnim && (
                    <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [1, 1.6, 0], opacity: [1, 1, 0] }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                        <Heart className="w-28 h-28 text-white fill-white drop-shadow-2xl" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none z-20" />

            {/* Right actions */}
            <div className="absolute right-3 bottom-28 z-30 flex flex-col items-center gap-5">
                <div className="w-11 h-11 rounded-full border-2 border-white overflow-hidden relative shadow-2xl">
                    {post.avatar ? <Image src={post.avatar} alt="" fill className="object-cover" />
                        : <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-sm font-black text-white">{(post.username[0] || '?').toUpperCase()}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); handleLike() }} className="flex flex-col items-center gap-1">
                    <div className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform ${liked ? 'bg-brand-red/30' : 'bg-black/30'}`}>
                        <Heart className={`w-6 h-6 transition-all ${liked ? 'fill-brand-red text-brand-red' : 'text-white'}`} />
                    </div>
                    <span className="text-white text-[11px] font-black drop-shadow">{likes}</span>
                </button>
                <button onClick={e => { e.stopPropagation(); onCommentOpen() }} className="flex flex-col items-center gap-1">
                    <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
                        <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white text-[11px] font-black drop-shadow">{post.commentsCount}</span>
                </button>
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
                {post.caption && <p className="text-white/80 text-xs font-medium leading-snug line-clamp-3 drop-shadow">{post.caption}</p>}
            </div>
        </div>
    )
}

// ── Helper: play video, fallback muted if autoplay blocked ────────────────────
function playVideo(v: HTMLVideoElement, muted: boolean) {
    v.muted = muted
    const p = v.play()
    if (!p) return
    p.catch(() => {
        v.muted = true   // retry muted — browser autoplay policy
        v.play().catch(() => {})
    })
}

// ── Main viewer ───────────────────────────────────────────────────────────────
export default function VideoReelsViewer({ posts, startIndex, onClose }: VideoReelsViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(startIndex)
    const [isMuted, setIsMuted] = useState(true)
    const isMutedRef = useRef(true)
    const [commentPostId, setCommentPostId] = useState<string | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const itemRefs = useRef<(HTMLDivElement | null)[]>([])

    // Silence feed videos while reels viewer is open
    const { setIsMuted: setFeedMuted } = useVideo()
    useEffect(() => {
        setFeedMuted(true)
        return () => setFeedMuted(false)
    }, [setFeedMuted])

    // Lock body scroll
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [])

    // ── Core: play the video at `idx`, pause all others ───────────────────────
    const activateIndex = useCallback((idx: number) => {
        if (idx < 0 || idx >= posts.length) return
        setCurrentIndex(idx)
        itemRefs.current.forEach((item, i) => {
            const v = item?.querySelector<HTMLVideoElement>('video')
            if (!v) return
            if (i === idx) {
                v.currentTime = 0
                playVideo(v, isMutedRef.current)
            } else {
                if (!v.paused) v.pause()
            }
        })
    }, [posts.length])

    // ── Scroll → detect settled index → activateIndex ────────────────────────
    // Uses scrollend (native) + debounced scroll fallback for older browsers.
    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        // Calculate which index is fully in view from scroll position
        const getIndex = () => Math.round(el.scrollTop / el.clientHeight)

        let debounce: ReturnType<typeof setTimeout>

        const onScrollEnd = () => {
            clearTimeout(debounce)
            activateIndex(getIndex())
        }

        // Debounced scroll — fires ~80ms after scroll stops (fallback for browsers without scrollend)
        const onScroll = () => {
            clearTimeout(debounce)
            debounce = setTimeout(onScrollEnd, 80)
        }

        el.addEventListener('scrollend', onScrollEnd)
        el.addEventListener('scroll', onScroll, { passive: true })

        return () => {
            el.removeEventListener('scrollend', onScrollEnd)
            el.removeEventListener('scroll', onScroll)
            clearTimeout(debounce)
        }
    }, [activateIndex])

    // ── On mount: scroll to startIndex and play immediately ──────────────────
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        // Instant scroll to correct position
        el.scrollTop = startIndex * el.clientHeight
        // Play without waiting for scroll events
        activateIndex(startIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])   // runs once on mount

    // ── Mute toggle ──────────────────────────────────────────────────────────
    const toggleMute = useCallback(() => {
        const next = !isMutedRef.current
        isMutedRef.current = next
        setIsMuted(next)
        // Apply to all videos immediately
        itemRefs.current.forEach(item => {
            const v = item?.querySelector<HTMLVideoElement>('video')
            if (v) v.muted = next
        })
    }, [])

    // ── Keyboard nav ─────────────────────────────────────────────────────────
    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return }
            const el = containerRef.current
            if (!el) return
            if (e.key === 'ArrowDown') el.scrollBy({ top: el.clientHeight, behavior: 'smooth' })
            if (e.key === 'ArrowUp')   el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' })
        }
        window.addEventListener('keydown', handle)
        return () => window.removeEventListener('keydown', handle)
    }, [onClose])

    const handleShare = useCallback(() => {
        const post = posts[currentIndex]
        if (!post) return
        if (navigator.share) navigator.share({ title: `@${post.username}`, url: window.location.href }).catch(() => {})
        else navigator.clipboard.writeText(window.location.href).catch(() => {})
    }, [currentIndex, posts])

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black">
            {/* Close */}
            <button onClick={onClose}
                className="absolute top-4 left-4 z-50 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/10">
                <X className="w-5 h-5" />
            </button>

            {/* Mute */}
            <button onClick={toggleMute}
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

            {/* Scroll container — snap-scroll, no smooth scroll (causes lag) */}
            <div
                ref={containerRef}
                className="h-full w-full overflow-y-scroll"
                style={{ scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}
            >
                {posts.map((post, i) => (
                    <div
                        key={post.postId}
                        ref={el => { itemRefs.current[i] = el }}
                        className="w-full"
                        style={{ scrollSnapAlign: 'start', height: '100dvh' }}
                    >
                        <ReelItem
                            post={post}
                            isActive={i === currentIndex}
                            isNear={Math.abs(i - currentIndex) <= 1}
                            onCommentOpen={() => setCommentPostId(post.postId)}
                            onShare={handleShare}
                        />
                    </div>
                ))}
            </div>

            {/* Swipe hint */}
            {currentIndex === 0 && posts.length > 1 && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.5, delay: 1.5 }}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none"
                >
                    <ChevronDown className="w-6 h-6 text-white/60" />
                    <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">Desliza para más</span>
                </motion.div>
            )}

            {/* Comments sheet */}
            <AnimatePresence>
                {commentPostId && (
                    <CommentSheet postId={commentPostId} onClose={() => setCommentPostId(null)} />
                )}
            </AnimatePresence>
        </div>,
        document.body
    )
}
