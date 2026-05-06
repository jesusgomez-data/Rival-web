'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    Send, Loader2, MessageSquarePlus, ChevronLeft, Trash2, Edit2,
    X, Check, Heart, Copy, Smile, ChevronDown, Film, Eye, EyeOff,
    Camera, Video, Mic, Users, ImagePlus
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import MentionText from '@/components/MentionText'
import MentionInput from '@/components/MentionInput'
import { createClient } from '@/utils/supabase/client'
import { markViewOnceViewed } from './actions'

const QUICK_EMOJIS = ['❤️', '🔥', '💪', '😂', '😮', '👏', '🏆', '⚡']

function DateSeparator({ date }: { date: Date }) {
    let label: string
    if (isToday(date)) label = 'Hoy'
    else if (isYesterday(date)) label = 'Ayer'
    else label = format(date, "EEEE d 'de' MMMM", { locale: es })
    return (
        <div className="flex items-center gap-3 my-5 px-2">
            <div className="flex-1 h-px bg-white/[0.05]" />
            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.03] text-white/25 shrink-0">
                {label}
            </span>
            <div className="flex-1 h-px bg-white/[0.05]" />
        </div>
    )
}

// View-once fullscreen viewer with 30-second countdown
function ViewOnceViewer({ msg, onClose, onViewed }: { msg: any; onClose: () => void; onViewed: () => void }) {
    const [seconds, setSeconds] = useState(30)
    const [hasMarked, setHasMarked] = useState(false)

    useEffect(() => {
        if (!hasMarked) {
            setHasMarked(true)
            onViewed()
        }
        const t = setInterval(() => {
            setSeconds(s => {
                if (s <= 1) { clearInterval(t); onClose(); return 0 }
                return s - 1
            })
        }, 1000)
        return () => clearInterval(t)
    }, [])

    const isVideo = msg.type === 'view_once_video'

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-gradient-to-b from-black to-transparent absolute top-0 left-0 right-0 z-10">
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl">
                    <Eye className="w-4 h-4 text-brand-red animate-pulse" />
                    <span className="text-white font-black text-sm">{seconds}s</span>
                    <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden ml-2">
                        <motion.div
                            className="h-full bg-brand-red rounded-full"
                            style={{ width: `${(seconds / 30) * 100}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>
                <div className="w-9" />
            </div>

            {/* Media */}
            <div className="flex-1 flex items-center justify-center p-4">
                {isVideo ? (
                    <video
                        src={msg.video_url}
                        autoPlay
                        playsInline
                        controls={false}
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)]"
                    />
                ) : (
                    <Image
                        src={msg.image_url}
                        alt="Ver una vez"
                        width={1000}
                        height={1000}
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)]"
                    />
                )}
            </div>

            <p className="text-center text-white/30 text-[10px] font-black uppercase tracking-widest pb-8 italic">
                Solo puedes ver esto una vez
            </p>
        </motion.div>
    )
}

interface ChatWindowProps {
    messages: any[]
    otherPerson: any
    currentUserId: string
    conversationId?: string | null
    onSendMessage: (text: string, imageUrl?: string, videoUrl?: string, isViewOnce?: boolean) => void
    onUploadImage?: (file: File) => Promise<{ url?: string; error?: string }>
    onUploadVideo?: (file: File) => Promise<{ url?: string; error?: string }>
    onDeleteMessage?: (id: string) => Promise<any> | void
    onEditMessage?: (id: string, text: string) => void
    onToggleLike?: (id: string, currentStatus: boolean) => void
    onDeleteConversation?: () => void
    isLoading?: boolean
    onBack?: () => void
    isOnline?: boolean
    otherParticipantLastRead?: string | null
}

export default function ChatWindow({
    messages, otherPerson, currentUserId, conversationId,
    onSendMessage, onUploadImage, onUploadVideo,
    onDeleteMessage, onEditMessage, onToggleLike, onDeleteConversation,
    isLoading, onBack, isOnline, otherParticipantLastRead,
}: ChatWindowProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoInputRef = useRef<HTMLInputElement>(null)
    const typingChannelRef = useRef<any>(null)
    const lastTypingSentRef = useRef(0)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevMsgLenRef = useRef(0)
    const doubleTapRef = useRef<{ id: string; time: number } | null>(null)

    const [inputValue, setInputValue] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
    const [lightboxIsVideo, setLightboxIsVideo] = useState(false)
    const [likedAnimId, setLikedAnimId] = useState<string | null>(null)
    const [showEmoji, setShowEmoji] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDeleteConv, setConfirmDeleteConv] = useState(false)
    const [isOtherTyping, setIsOtherTyping] = useState(false)
    const [actionSheet, setActionSheet] = useState<{ msg: any; isMine: boolean } | null>(null)
    const [showScrollBtn, setShowScrollBtn] = useState(false)
    const [unreadBadge, setUnreadBadge] = useState(0)
    const [isViewOnceMode, setIsViewOnceMode] = useState(false)
    const [viewOnceMsg, setViewOnceMsg] = useState<any | null>(null)
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
    const [showMediaPicker, setShowMediaPicker] = useState(false)
    const [pendingMediaPreview, setPendingMediaPreview] = useState<{ url: string; type: 'image' | 'video' } | null>(null)
    const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null)

    const supabase = createClient()

    const isGroup = otherPerson?.isGroup
    const groupName = otherPerson?.groupName
    const groupMembers: any[] = otherPerson?.members || []

    const getSenderProfile = useCallback((senderId: string) => {
        return groupMembers.find(m => m.id === senderId)
    }, [groupMembers])

    // Typing indicator
    useEffect(() => {
        if (!conversationId) return
        let timeout: ReturnType<typeof setTimeout> | null = null
        const channel = supabase
            .channel(`typing:${conversationId}`)
            .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
                if (payload?.userId !== currentUserId) {
                    setIsOtherTyping(true)
                    if (timeout) clearTimeout(timeout)
                    timeout = setTimeout(() => setIsOtherTyping(false), 3000)
                }
            })
            .subscribe()
        typingChannelRef.current = channel
        return () => { if (timeout) clearTimeout(timeout); supabase.removeChannel(channel) }
    }, [conversationId, currentUserId])

    const sendTypingEvent = useCallback(() => {
        const now = Date.now()
        if (now - lastTypingSentRef.current < 2000) return
        lastTypingSentRef.current = now
        typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId } }).catch(() => {})
    }, [currentUserId])

    // Auto-scroll
    useEffect(() => {
        const el = scrollRef.current
        if (!el || messages.length === 0) return
        const isNew = messages.length > prevMsgLenRef.current
        const isInitial = prevMsgLenRef.current === 0
        prevMsgLenRef.current = messages.length
        if (!isNew) return
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight
        if (isInitial || dist < 150) { el.scrollTop = el.scrollHeight; setUnreadBadge(0); setShowScrollBtn(false) }
        else { setUnreadBadge(c => c + 1); setShowScrollBtn(true) }
    }, [messages.length])

    const handleScroll = useCallback(() => {
        const el = scrollRef.current; if (!el) return
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight
        if (dist < 60) { setShowScrollBtn(false); setUnreadBadge(0) } else { setShowScrollBtn(true) }
    }, [])

    const scrollToBottom = useCallback(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
        setUnreadBadge(0); setShowScrollBtn(false)
    }, [])

    // Paste image
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const file = e.clipboardData?.files[0]
            if (!file?.type.startsWith('image/') || !onUploadImage) return
            e.preventDefault()
            setIsUploading(true)
            const result = await onUploadImage(file)
            setIsUploading(false)
            if (result.url) onSendMessage('', result.url)
        }
        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [onUploadImage, onSendMessage])

    // Close emoji
    useEffect(() => {
        if (!showEmoji) return
        const handle = (e: MouseEvent) => {
            const t = e.target as Element
            if (!t.closest('[data-emoji-picker]') && !t.closest('[data-emoji-btn]')) setShowEmoji(false)
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [showEmoji])

    const handleSend = useCallback(() => {
        if (pendingMediaFile) {
            handleSendMedia()
            return
        }
        if (!inputValue.trim()) return
        onSendMessage(inputValue.trim())
        setInputValue('')
    }, [inputValue, onSendMessage, pendingMediaFile])

    const handleSendMedia = useCallback(async () => {
        if (!pendingMediaFile) return
        setIsUploading(true)
        let result: { url?: string; error?: string } = {}
        if (pendingMediaPreview?.type === 'video') {
            result = await (onUploadVideo?.(pendingMediaFile) || Promise.resolve({ error: 'No video upload' }))
            if (result.url) onSendMessage(inputValue.trim(), undefined, result.url, isViewOnceMode)
        } else {
            result = await (onUploadImage?.(pendingMediaFile) || Promise.resolve({ error: 'No upload' }))
            if (result.url) onSendMessage(inputValue.trim(), result.url, undefined, isViewOnceMode)
        }
        setIsUploading(false)
        setPendingMediaPreview(null)
        setPendingMediaFile(null)
        setInputValue('')
        setIsViewOnceMode(false)
    }, [pendingMediaFile, pendingMediaPreview, inputValue, isViewOnceMode, onUploadImage, onUploadVideo, onSendMessage])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (editingId) handleSaveEdit()
            else handleSend()
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const file = e.target.files?.[0]
        if (!file) return
        e.target.value = ''
        const url = URL.createObjectURL(file)
        setPendingMediaPreview({ url, type })
        setPendingMediaFile(file)
        setShowMediaPicker(false)
    }

    const cancelPendingMedia = () => {
        if (pendingMediaPreview) URL.revokeObjectURL(pendingMediaPreview.url)
        setPendingMediaPreview(null)
        setPendingMediaFile(null)
    }

    const handleStartEdit = (msg: any) => { setEditingId(msg.id); setEditValue(msg.text || ''); setActionSheet(null) }
    const handleSaveEdit = () => {
        if (editingId && editValue.trim()) { onEditMessage?.(editingId, editValue.trim()); setEditingId(null); setEditValue('') }
    }

    const handleMessageTap = (msg: any) => {
        const now = Date.now()
        if (doubleTapRef.current?.id === msg.id && now - (doubleTapRef.current?.time ?? 0) < 350) {
            doubleTapRef.current = null
            if (!msg.is_liked) { onToggleLike?.(msg.id, false); setLikedAnimId(msg.id); setTimeout(() => setLikedAnimId(null), 900) }
        } else { doubleTapRef.current = { id: msg.id, time: now } }
    }

    const handleLongPress = (msg: any, isMine: boolean) => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = setTimeout(() => {
            setActionSheet({ msg, isMine })
            if ('vibrate' in navigator) navigator.vibrate(8)
        }, 450)
    }
    const cancelLongPress = () => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null } }
    const handleDeleteMsg = async (id: string) => { setDeletingId(null); setActionSheet(null); await onDeleteMessage?.(id) }
    const handleCopy = (text: string) => { navigator.clipboard.writeText(text).catch(() => {}); setActionSheet(null) }

    const handleViewOnce = async (msg: any) => {
        setViewOnceMsg(msg)
        await markViewOnceViewed(msg.id)
        setViewedIds(prev => new Set([...prev, msg.id]))
    }

    if (!otherPerson) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-background relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-red/[0.03] to-transparent pointer-events-none" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    className="w-32 h-32 rounded-[3rem] bg-brand-red/10 flex items-center justify-center border border-brand-red/20 mb-8 relative shadow-2xl"
                >
                    <div className="absolute inset-0 bg-brand-red/5 blur-2xl rounded-full" />
                    <MessageSquarePlus className="w-14 h-14 text-brand-red relative" />
                </motion.div>
                <h3 className="text-3xl font-black italic text-foreground mb-3 uppercase tracking-tighter mix-blend-difference md:mix-blend-normal">RIVAL CHAT</h3>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-bold uppercase tracking-widest opacity-60">
                    Selecciona un rival para entrar en la arena de mensajes
                </p>
            </div>
        )
    }

    // Build items with date separators
    type Item = { type: 'date'; date: Date; key: string } | { type: 'msg'; msg: any; key: string }
    const items: Item[] = []
    messages.forEach((msg, i) => {
        const d = new Date(msg.created_at)
        const prev = messages[i - 1]
        if (!prev || !isSameDay(d, new Date(prev.created_at))) items.push({ type: 'date', date: d, key: `date-${d.toDateString()}-${i}` })
        items.push({ type: 'msg', msg, key: msg.id })
    })

    return (
        <div className="flex-1 flex flex-col bg-background relative overflow-hidden h-full">

            {/* ── Header ── */}
            <header className="px-4 py-3 flex items-center justify-between z-30 shrink-0 bg-background/80 backdrop-blur-2xl border-b border-border shadow-sm">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="lg:hidden p-2.5 -ml-1 text-muted-foreground hover:text-brand-red transition-all active:scale-90 bg-muted/30 rounded-xl">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div className="relative shrink-0">
                        {isGroup ? (
                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-red to-orange-600 flex items-center justify-center border border-white/10 shadow-lg">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                        ) : (
                            <>
                                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-red/20 p-0.5 relative shadow-md">
                                    <div className="w-full h-full rounded-full overflow-hidden relative">
                                        <Image
                                            src={otherPerson.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson.full_name || 'U')}&background=random`}
                                            alt="" fill className="object-cover"
                                        />
                                    </div>
                                </div>
                                {isOnline && (
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#0C0C0C] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                )}
                            </>
                        )}
                    </div>
                    <div>
                        <h4 className="font-black italic uppercase text-base leading-none tracking-tight text-foreground">
                            {isGroup ? (groupName || 'Grupo') : (otherPerson.full_name || otherPerson.username)}
                        </h4>
                        <div className="mt-1 h-4 flex items-center">
                            {isOtherTyping ? (
                                <span className="flex items-center gap-1.5 text-[10px] text-brand-red font-black uppercase tracking-widest animate-pulse">
                                    Escribiendo…
                                </span>
                            ) : isGroup ? (
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{groupMembers.length + 1} atletas</span>
                            ) : isOnline ? (
                                <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest inline-flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-green-500" /> En línea
                                </span>
                            ) : (
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Fuera de combate</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onDeleteConversation && (
                        confirmDeleteConv ? (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                                <span className="text-[10px] text-red-500 font-black uppercase">¿Borrar?</span>
                                <button onClick={() => { setConfirmDeleteConv(false); onDeleteConversation() }} className="p-1 text-red-500 hover:scale-110">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setConfirmDeleteConv(false)} className="p-1 text-muted-foreground hover:text-foreground">
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ) : (
                            <button onClick={() => setConfirmDeleteConv(true)} className="p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )
                    )}
                </div>
            </header>

            {/* ── Messages ── */}
            <div ref={scrollRef} onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 md:px-6 py-6 relative custom-scrollbar bg-background">
                {/* Visual texture for background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto flex flex-col gap-px">
                        <AnimatePresence initial={false}>
                            {items.map(item => {
                                if (item.type === 'date') {
                                    return (
                                        <motion.div key={item.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <DateSeparator date={item.date} />
                                        </motion.div>
                                    )
                                }

                                const { msg } = item
                                const isMine = msg.sender_id === currentUserId
                                const isEditing = editingId === msg.id
                                const isDeleting = deletingId === msg.id
                                const msgIdx = messages.findIndex(m => m.id === msg.id)
                                const prevMsg = messages[msgIdx - 1]
                                const nextMsg = messages[msgIdx + 1]
                                const isFirst = !prevMsg || prevMsg.sender_id !== msg.sender_id
                                const isLast = !nextMsg || nextMsg.sender_id !== msg.sender_id
                                const isRead = !!otherParticipantLastRead &&
                                    new Date(msg.created_at).getTime() <= new Date(otherParticipantLastRead).getTime() + 1000

                                const isViewOnce = msg.is_view_once
                                const isViewed = viewedIds.has(msg.id) || !!msg.viewed_at
                                const isVideoMsg = msg.type === 'video' || msg.type === 'view_once_video'
                                const sender = isGroup && !isMine ? getSenderProfile(msg.sender_id) : null

                                return (
                                    <motion.div key={item.key} layout="position"
                                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                        className={clsx('flex w-full', isMine ? 'justify-end' : 'justify-start', isFirst && 'mt-4')}
                                    >
                                        {/* Group sender avatar */}
                                        {isGroup && !isMine && isFirst && (
                                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mr-2 mt-auto mb-1 border border-white/10 relative">
                                                {sender?.avatar_url
                                                    ? <Image src={sender.avatar_url} alt="" fill className="object-cover" />
                                                    : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] font-black text-white/40">
                                                        {(sender?.full_name || '?')[0]}
                                                    </div>
                                                }
                                            </div>
                                        )}
                                        {isGroup && !isMine && !isFirst && <div className="w-10 shrink-0" />}

                                        <div className={clsx('flex flex-col relative group', isMine ? 'items-end' : 'items-start', 'max-w-[80%] sm:max-w-[60%]')}>
                                            {/* Sender name in group */}
                                            {isGroup && !isMine && isFirst && (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-brand-red ml-1 mb-1">
                                                    {sender?.full_name || sender?.username || 'Rival'}
                                                </span>
                                            )}

                                            {/* Desktop hover actions */}
                                            <div className={clsx(
                                                'absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none group-hover:pointer-events-auto',
                                                isMine ? 'right-full mr-2' : 'left-full ml-2'
                                            )}>
                                                <button onClick={() => { onToggleLike?.(msg.id, !!msg.is_liked); if (!msg.is_liked) { setLikedAnimId(msg.id); setTimeout(() => setLikedAnimId(null), 900) } }}
                                                    className={clsx('p-1.5 rounded-xl bg-white/5 transition-colors border border-white/5', msg.is_liked ? 'text-brand-red' : 'text-white/30 hover:text-white')}>
                                                    <Heart className={clsx('w-3.5 h-3.5', msg.is_liked && 'fill-current')} />
                                                </button>
                                                {msg.text && (
                                                    <button onClick={() => handleCopy(msg.text)} className="p-1.5 rounded-xl bg-white/5 text-white/30 hover:text-white border border-white/5">
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isMine && !msg.image_url && !msg.video_url && (
                                                    <button onClick={() => handleStartEdit(msg)} className="p-1.5 rounded-xl bg-white/5 text-white/30 hover:text-white border border-white/5">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isMine && (
                                                    <button onClick={() => setDeletingId(msg.id)} className="p-1.5 rounded-xl bg-white/5 text-white/30 hover:text-red-400 border border-white/5">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Delete confirm */}
                                            <AnimatePresence>
                                                {isDeleting && (
                                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                        className={clsx('flex items-center gap-2 mb-1 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1', isMine ? 'self-end' : 'self-start')}>
                                                        <span className="text-[10px] text-red-400 font-black uppercase">¿Eliminar?</span>
                                                        <button onClick={() => handleDeleteMsg(msg.id)} className="text-red-400 hover:text-red-300"><Check className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => setDeletingId(null)} className="text-white/30 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Bubble */}
                                            <div
                                                className={clsx(
                                                    'relative transition-all select-none',
                                                    isViewOnce
                                                        ? 'rounded-[22px] overflow-hidden'
                                                        : (msg.image_url || msg.video_url)
                                                            ? 'rounded-[22px] p-0.5 bg-muted/40 border border-border shadow-sm'
                                                            : clsx(
                                                                'px-4 py-3 shadow-md border',
                                                                isMine
                                                                    ? 'bg-brand-red border-brand-red text-white rounded-[22px] shadow-[0_4px_15px_rgba(220,38,38,0.2)]'
                                                                    : 'bg-muted border-border text-foreground rounded-[22px]',
                                                                isLast && isMine && 'rounded-br-[4px]',
                                                                isLast && !isMine && 'rounded-bl-[4px]'
                                                            )
                                                )}
                                                onClick={() => handleMessageTap(msg)}
                                                onTouchStart={() => handleLongPress(msg, isMine)}
                                                onTouchEnd={cancelLongPress}
                                                onTouchMove={cancelLongPress}
                                                onContextMenu={e => { e.preventDefault(); setActionSheet({ msg, isMine }) }}
                                            >
                                                {/* Double-tap heart anim */}
                                                {likedAnimId === msg.id && (
                                                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [1, 1.8, 0], opacity: [1, 1, 0] }}
                                                        transition={{ duration: 0.8 }}
                                                        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                                                        <Heart className="w-14 h-14 text-white fill-white drop-shadow-2xl" />
                                                    </motion.div>
                                                )}

                                                {isEditing ? (
                                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                                        <textarea value={editValue} onChange={e => setEditValue(e.target.value)}
                                                            className="bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-2 focus:ring-brand-red/20 outline-none resize-none" rows={3} autoFocus
                                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() } if (e.key === 'Escape') { setEditingId(null); setEditValue('') } }} />
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => { setEditingId(null); setEditValue('') }} className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-[10px] font-black uppercase">Cancelar</button>
                                                            <button onClick={handleSaveEdit} className="px-3 py-1.5 rounded-lg bg-brand-red text-white text-[10px] font-black uppercase">Guardar</button>
                                                        </div>
                                                    </div>
                                                ) : isViewOnce ? (
                                                    // View-once bubble
                                                    isMine ? (
                                                        <div className={clsx("flex items-center gap-4 px-5 py-4 rounded-[22px]", "bg-purple-600/10 border-2 border-dashed border-purple-500/30")}>
                                                            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shadow-inner">
                                                                <Eye className="w-6 h-6 text-purple-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-600 italic">
                                                                    {isVideoMsg ? 'Video' : 'Foto'} · 1 VEZ
                                                                </p>
                                                                <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                                                                    {isViewed ? 'ABIERTO ✓' : 'ENVIADO'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : isViewed ? (
                                                        <div className="flex items-center gap-4 px-5 py-4 rounded-[22px] bg-muted/60 border border-border">
                                                            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center opacity-30">
                                                                <EyeOff className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">EXPIRADO</p>
                                                                <p className="text-[10px] text-muted-foreground/20 font-bold mt-0.5">ELIMINADO AUTOMÁTICAMENTE</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handleViewOnce(msg) }}
                                                            className="group flex items-center gap-4 px-5 py-4 rounded-[22px] bg-gradient-to-br from-purple-600 to-brand-red border-none text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                                        >
                                                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                                                                <Eye className="w-6 h-6" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[11px] font-black uppercase tracking-[0.2em] italic">
                                                                    {isVideoMsg ? 'Video' : 'Foto'} · PULVARIZAR
                                                                </p>
                                                                <p className="text-[10px] text-white/70 font-bold mt-0.5">TOCA PARA VER • 30 SEGUNDOS</p>
                                                            </div>
                                                        </button>
                                                    )
                                                ) : msg.video_url ? (
                                                    // Video message
                                                    <div className="relative cursor-pointer" onClick={e => { e.stopPropagation(); setLightboxUrl(msg.video_url); setLightboxIsVideo(true) }}>
                                                        <div className="relative min-w-[180px] max-w-[280px] sm:max-w-[340px] rounded-xl overflow-hidden">
                                                            <video src={msg.video_url} className="w-full object-cover max-h-60" playsInline muted preload="metadata" />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                                <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur border border-white/20 flex items-center justify-center">
                                                                    <Film className="w-6 h-6 text-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded-full">
                                                            {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                            <span className="text-[9px] font-bold text-white/80">{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                        </div>
                                                    </div>
                                                ) : msg.image_url ? (
                                                    // Image message
                                                    <div className="relative cursor-pointer" onClick={e => { e.stopPropagation(); setLightboxUrl(msg.image_url); setLightboxIsVideo(false) }}>
                                                        <div className="relative min-w-[150px] max-w-[280px] sm:max-w-[340px]">
                                                            <Image src={msg.image_url} alt="Media" width={340} height={340} className="object-cover rounded-xl" />
                                                        </div>
                                                        {msg.text && (
                                                            <div className="px-2 pt-2 pb-1">
                                                                <MentionText text={msg.text} className="text-sm font-medium leading-relaxed block text-white" mentionClassName="text-brand-red underline" />
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded-full">
                                                            {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                            <span className="text-[9px] font-bold text-white/80">{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                            {isMine && (isRead ? <div className="flex -space-x-1"><Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" /><Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" /></div> : <Check className="w-2.5 h-2.5 text-white/40" />)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Text message
                                                    <div className="relative flex flex-col">
                                                        <MentionText text={msg.text || ''} className="text-sm font-medium leading-[1.45] pr-[4.5rem]"
                                                            mentionClassName={clsx('underline', isMine ? 'text-white/70' : 'text-brand-red')} />
                                                        <div className={clsx('absolute bottom-0 right-0 flex items-center gap-1 text-[9px] font-bold', isMine ? 'text-white/40' : 'text-white/20')}>
                                                            {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                            {msg.updated_at && msg.updated_at !== msg.created_at && <span className="text-[8px] opacity-60">editado</span>}
                                                            <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                            {isMine && (isRead
                                                                ? <div className="flex -space-x-1.5"><Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" /><Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" /></div>
                                                                : <Check className="w-2.5 h-2.5 opacity-40" />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Heart reaction */}
                                            <AnimatePresence>
                                                {msg.is_liked && !isEditing && !isViewOnce && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                                        className={clsx('mt-0.5 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 bg-[#1A1A1A] border border-white/[0.05]', isMine ? 'self-end' : 'self-start')}>
                                                        <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                        <div className="h-2" />
                    </div>
                )}
            </div>

            {/* Scroll to bottom */}
            <AnimatePresence>
                {showScrollBtn && (
                    <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-24 right-5 z-30 w-10 h-10 bg-[#1A1A1A] border border-white/10 rounded-full shadow-xl flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-all">
                        {unreadBadge > 0
                            ? <span className="text-xs font-black text-white">{unreadBadge > 9 ? '9+' : unreadBadge}</span>
                            : <ChevronDown className="w-5 h-5 text-white" />}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxUrl && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setLightboxUrl(null)}
                        className="fixed inset-0 z-[100] bg-black/97 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out">
                        <button onClick={e => { e.stopPropagation(); setLightboxUrl(null) }}
                            className="absolute top-6 right-6 z-[110] bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                        <motion.div initial={{ scale: 0.88 }} animate={{ scale: 1 }} exit={{ scale: 0.88 }} onClick={e => e.stopPropagation()}>
                            {lightboxIsVideo
                                ? <video src={lightboxUrl} controls autoPlay playsInline className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
                                : <img src={lightboxUrl} alt="Full" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
                            }
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* View-once viewer */}
            <AnimatePresence>
                {viewOnceMsg && (
                    <ViewOnceViewer
                        msg={viewOnceMsg}
                        onClose={() => setViewOnceMsg(null)}
                        onViewed={() => {}}
                    />
                )}
            </AnimatePresence>

            {/* Action sheet */}
            <AnimatePresence>
                {actionSheet && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm" onClick={() => setActionSheet(null)} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 z-[91] bg-[#111] border-t border-white/5 rounded-t-[2rem] p-4 pb-10 shadow-2xl">
                            <div className="flex justify-center gap-5 py-3 mb-2">
                                {QUICK_EMOJIS.map(emoji => (
                                    <button key={emoji} onClick={() => { onToggleLike?.(actionSheet.msg.id, !!actionSheet.msg.is_liked); setActionSheet(null) }}
                                        className="text-2xl hover:scale-125 active:scale-90 transition-transform">{emoji}</button>
                                ))}
                            </div>
                            <div className="h-px bg-white/5 mb-2 mx-2" />
                            <div className="space-y-0.5">
                                {actionSheet.msg.text && (
                                    <button onClick={() => handleCopy(actionSheet.msg.text)} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 active:bg-white/10 text-left">
                                        <Copy className="w-5 h-5 text-white/30 shrink-0" />
                                        <span className="text-sm font-semibold text-white/70">Copiar texto</span>
                                    </button>
                                )}
                                {actionSheet.isMine && !actionSheet.msg.image_url && !actionSheet.msg.video_url && (
                                    <button onClick={() => handleStartEdit(actionSheet.msg)} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 active:bg-white/10 text-left">
                                        <Edit2 className="w-5 h-5 text-white/30 shrink-0" />
                                        <span className="text-sm font-semibold text-white/70">Editar mensaje</span>
                                    </button>
                                )}
                                {actionSheet.isMine && (
                                    <button onClick={() => { setDeletingId(actionSheet.msg.id); setActionSheet(null) }} className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-500/10 text-left">
                                        <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
                                        <span className="text-sm font-semibold text-red-400">Eliminar mensaje</span>
                                    </button>
                                )}
                                <button onClick={() => setActionSheet(null)} className="w-full flex items-center justify-center px-4 py-3 mt-1 rounded-xl hover:bg-white/5">
                                    <span className="text-sm font-bold text-white/25">Cancelar</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Emoji picker */}
            <AnimatePresence>
                {showEmoji && (
                    <motion.div data-emoji-picker initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-[80px] left-4 md:left-6 bg-[#111] border border-white/5 rounded-2xl p-3 shadow-2xl z-40 w-72">
                        <div className="grid grid-cols-8 gap-0.5">
                            {['😀','😂','🥰','😍','🤣','😊','😎','🥳','🤩','😏','😄','😁','😆','😅','🤔','😮','😱','🙄','😴','🤗',
                              '❤️','🔥','💪','🏆','⚡','💯','🎯','🙌','👏','🤝','👍','🎉','✨','💥','🌟','💎','🏅','🥇','🎽','⚽'].map(emoji => (
                                <button key={emoji} onClick={() => { setInputValue(v => v + emoji); setShowEmoji(false) }}
                                    className="text-xl hover:bg-white/10 active:bg-white/20 rounded-lg p-1 transition-colors aspect-square flex items-center justify-center">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Media picker popup ── */}
            <AnimatePresence>
                {showMediaPicker && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40" onClick={() => setShowMediaPicker(false)} />
                        <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
                            className="absolute bottom-[80px] left-4 md:left-6 z-50 bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden min-w-[180px]">
                            <button onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors text-left">
                                <ImagePlus className="w-5 h-5 text-brand-red shrink-0" />
                                <span className="text-sm font-black text-white/70 uppercase tracking-wide">Foto</span>
                            </button>
                            <div className="h-px bg-white/[0.05]" />
                            <button onClick={() => videoInputRef.current?.click()}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors text-left">
                                <Video className="w-5 h-5 text-blue-400 shrink-0" />
                                <span className="text-sm font-black text-white/70 uppercase tracking-wide">Video</span>
                            </button>
                            <div className="h-px bg-white/[0.05]" />
                            <button onClick={() => { setIsViewOnceMode(v => !v); fileInputRef.current?.click(); setShowMediaPicker(false) }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors text-left">
                                <Eye className="w-5 h-5 text-purple-400 shrink-0" />
                                <div>
                                    <span className="text-sm font-black text-white/70 uppercase tracking-wide block">Ver 1 vez</span>
                                    <span className="text-[9px] text-purple-400/60 font-bold">Desaparece en 30s</span>
                                </div>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Input bar ── */}
            <div className="px-4 pb-4 pt-2 bg-[#0C0C0C]/90 backdrop-blur-md border-t border-white/[0.04] relative z-20 shrink-0">
                {/* Pending media preview */}
                <AnimatePresence>
                    {pendingMediaPreview && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                            className="mb-2 relative inline-block">
                            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-lg max-w-[120px]">
                                {pendingMediaPreview.type === 'video'
                                    ? <video src={pendingMediaPreview.url} className="w-full h-20 object-cover" muted playsInline />
                                    : <img src={pendingMediaPreview.url} alt="" className="w-full h-20 object-cover" />
                                }
                                {isViewOnceMode && (
                                    <div className="absolute inset-0 bg-purple-900/50 flex items-center justify-center">
                                        <Eye className="w-6 h-6 text-purple-300" />
                                    </div>
                                )}
                            </div>
                            <button onClick={cancelPendingMedia} className="absolute -top-2 -right-2 w-5 h-5 bg-brand-red rounded-full flex items-center justify-center shadow-lg">
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* View-once mode indicator */}
                {isViewOnceMode && !pendingMediaPreview && (
                    <div className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Modo ver una vez</span>
                        <button onClick={() => setIsViewOnceMode(false)} className="ml-auto text-purple-400/60 hover:text-purple-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}

                <div className="max-w-3xl mx-auto flex items-end gap-2">
                    <div className="flex-1 rounded-[1.5rem] border border-white/[0.06] bg-[#141414] flex items-end px-3 py-2 gap-1.5 shadow-inner focus-within:border-brand-red/20 transition-colors">
                        {/* Media picker button */}
                        <button onClick={() => setShowMediaPicker(v => !v)} disabled={isUploading}
                            className={clsx("text-white/30 hover:text-brand-red p-1.5 rounded-full transition-colors shrink-0 mb-0.5", showMediaPicker && "text-brand-red")}>
                            {isUploading
                                ? <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                                : <Camera className="w-5 h-5" />
                            }
                        </button>

                        <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={e => handleFileChange(e, 'image')} />
                        <input type="file" className="hidden" ref={videoInputRef} accept="video/*" onChange={e => handleFileChange(e, 'video')} />

                        <MentionInput
                            value={inputValue}
                            onChange={(v: string) => { setInputValue(v); sendTypingEvent() }}
                            onKeyDown={handleKeyDown}
                            placeholder="Mensaje..."
                            className="flex-1 bg-transparent border-none py-2 px-1 text-sm text-white placeholder:text-white/15 focus:outline-none w-full font-medium"
                        />

                        <button data-emoji-btn onClick={() => setShowEmoji(v => !v)}
                            className={clsx('p-1.5 rounded-full transition-colors shrink-0 mb-0.5', showEmoji ? 'text-brand-red' : 'text-white/25 hover:text-brand-red')}>
                            <Smile className="w-5 h-5" />
                        </button>
                    </div>

                    <button onClick={handleSend}
                        disabled={!inputValue.trim() && !pendingMediaFile}
                        className={clsx(
                            'w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0',
                            (inputValue.trim() || pendingMediaFile)
                                ? 'bg-brand-red text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] hover:scale-105 active:scale-90'
                                : 'bg-white/[0.04] text-white/15 cursor-not-allowed'
                        )}>
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
