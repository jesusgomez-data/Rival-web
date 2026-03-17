'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { format, isToday, isYesterday, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Send, Loader2, MessageSquarePlus, ImagePlus, ChevronLeft, Trash2, Edit2, X, Check, Heart, Copy, Smile, Info, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/app/LanguageContext'
import { useTheme } from '@/app/ThemeContext'
import MentionText from '@/components/MentionText'
import MentionInput from '@/components/MentionInput'
import { createClient } from '@/utils/supabase/client'


const EMOJIS = [
    '😀','😂','🥰','😍','🤣','😊','😎','🥳','🤩','😏',
    '😄','😁','😆','😅','🤔','😮','😱','🙄','😴','🤗',
    '❤️','🔥','💪','🏆','⚡','💯','🎯','🙌','👏','🤝',
    '👍','🎉','✨','💥','🌟','💎','🏅','🥇','🎽','⚽',
]

function DateSeparator({ date }: { date: Date }) {
    const { theme } = useTheme()
    let label: string
    if (isToday(date)) label = 'Hoy'
    else if (isYesterday(date)) label = 'Ayer'
    else label = format(date, "EEEE d 'de' MMMM", { locale: es })
    return (
        <div className="flex items-center gap-3 my-4 px-2">
            <div className="flex-1 h-px bg-border/20" />
            <span className={clsx(
                "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shrink-0",
                theme === 'dark' 
                    ? "text-gray-500 bg-white/[0.04] border-white/[0.06]" 
                    : "text-gray-600 bg-gray-100 border-gray-200"
            )}>
                {label}
            </span>
            <div className="flex-1 h-px bg-border/20" />
        </div>
    )
}

interface ChatWindowProps {
    messages: any[]
    otherPerson: any
    currentUserId: string
    conversationId?: string | null
    onSendMessage: (text: string, imageUrl?: string) => void
    onUploadImage?: (file: File) => Promise<{ url?: string; error?: string }>
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
    messages,
    otherPerson,
    currentUserId,
    conversationId,
    onSendMessage,
    onUploadImage,
    onDeleteMessage,
    onEditMessage,
    onToggleLike,
    onDeleteConversation,
    isLoading,
    onBack,
    isOnline,
    otherParticipantLastRead,
}: ChatWindowProps) {
    const { t } = useLanguage()
    const { theme } = useTheme()
    const [search, setSearch] = React.useState('')


    const scrollRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const typingChannelRef = useRef<any>(null)
    const lastTypingSentRef = useRef(0)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const prevMsgLenRef = useRef(0)
    const doubleTapRef = useRef<{ id: string; time: number } | null>(null)

    const [inputValue, setInputValue] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)
    const [likedAnimId, setLikedAnimId] = useState<string | null>(null)
    const [showEmoji, setShowEmoji] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmDeleteConv, setConfirmDeleteConv] = useState(false)
    const [isOtherTyping, setIsOtherTyping] = useState(false)
    const [actionSheet, setActionSheet] = useState<{ msg: any; isMine: boolean } | null>(null)
    const [showScrollBtn, setShowScrollBtn] = useState(false)
    const [unreadBadge, setUnreadBadge] = useState(0)

    const supabase = createClient()

    // --- Typing indicator ---
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

        return () => {
            if (timeout) clearTimeout(timeout)
            supabase.removeChannel(channel)
            typingChannelRef.current = null
        }
    }, [conversationId, currentUserId])

    const sendTypingEvent = useCallback(() => {
        const now = Date.now()
        if (now - lastTypingSentRef.current < 2000) return
        lastTypingSentRef.current = now
        typingChannelRef.current?.send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: currentUserId },
        }).catch(() => {})
    }, [currentUserId])

    // --- Auto-scroll ---
    useEffect(() => {
        const el = scrollRef.current
        if (!el || messages.length === 0) return

        const isNew = messages.length > prevMsgLenRef.current
        const isInitial = prevMsgLenRef.current === 0
        prevMsgLenRef.current = messages.length

        if (!isNew) return

        const dist = el.scrollHeight - el.scrollTop - el.clientHeight
        if (isInitial || dist < 150) {
            el.scrollTop = el.scrollHeight
            setUnreadBadge(0)
            setShowScrollBtn(false)
        } else {
            setUnreadBadge(c => c + 1)
            setShowScrollBtn(true)
        }
    }, [messages.length])

    const handleScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight
        if (dist < 60) {
            setShowScrollBtn(false)
            setUnreadBadge(0)
        } else {
            setShowScrollBtn(true)
        }
    }, [])

    const scrollToBottom = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        setUnreadBadge(0)
        setShowScrollBtn(false)
    }, [])

    // --- Image paste ---
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

    // --- Close emoji on outside click ---
    useEffect(() => {
        if (!showEmoji) return
        const handle = (e: MouseEvent) => {
            const t = e.target as Element
            if (!t.closest('[data-emoji-picker]') && !t.closest('[data-emoji-btn]')) {
                setShowEmoji(false)
            }
        }
        document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [showEmoji])

    // --- Handlers ---
    const handleSend = useCallback(() => {
        if (!inputValue.trim()) return
        onSendMessage(inputValue.trim())
        setInputValue('')
    }, [inputValue, onSendMessage])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (editingId) handleSaveEdit()
            else handleSend()
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !onUploadImage) return
        e.target.value = ''
        setIsUploading(true)
        const result = await onUploadImage(file)
        setIsUploading(false)
        if (result.url) onSendMessage('', result.url)
    }

    const handleStartEdit = (msg: any) => {
        setEditingId(msg.id)
        setEditValue(msg.text || '')
        setActionSheet(null)
    }

    const handleSaveEdit = () => {
        if (editingId && editValue.trim()) {
            onEditMessage?.(editingId, editValue.trim())
            setEditingId(null)
            setEditValue('')
        }
    }

    const handleMessageTap = (msg: any) => {
        const now = Date.now()
        if (doubleTapRef.current?.id === msg.id && now - (doubleTapRef.current?.time ?? 0) < 350) {
            doubleTapRef.current = null
            if (!msg.is_liked) {
                onToggleLike?.(msg.id, false)
                setLikedAnimId(msg.id)
                setTimeout(() => setLikedAnimId(null), 900)
            }
        } else {
            doubleTapRef.current = { id: msg.id, time: now }
        }
    }

    const handleLongPress = (msg: any, isMine: boolean) => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = setTimeout(() => {
            setActionSheet({ msg, isMine })
            if ('vibrate' in navigator) navigator.vibrate(8)
        }, 450)
    }

    const cancelLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }

    const handleDeleteMsg = async (id: string) => {
        setDeletingId(null)
        setActionSheet(null)
        await onDeleteMessage?.(id)
    }

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).catch(() => {})
        setActionSheet(null)
    }

    // --- Empty state ---
    if (!otherPerson) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-background">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-28 h-28 rounded-[2.5rem] bg-brand-red/10 flex items-center justify-center border border-brand-red/20 mb-6"
                >
                    <MessageSquarePlus className="w-12 h-12 text-brand-red/40" />
                </motion.div>
                <h3 className="text-2xl font-accent font-bold italic text-foreground mb-2 uppercase tracking-tighter">
                    {t.chat.commandCenter}
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-medium">
                    {t.chat.commandSubtitle}
                </p>
            </div>
        )
    }

    // Build items with date separators
    type Item =
        | { type: 'date'; date: Date; key: string }
        | { type: 'msg'; msg: any; key: string }

    const items: Item[] = []
    messages.forEach((msg, i) => {
        const d = new Date(msg.created_at)
        const prev = messages[i - 1]
        if (!prev || !isSameDay(d, new Date(prev.created_at))) {
            items.push({ type: 'date', date: d, key: `date-${d.toDateString()}-${i}` })
        }
        items.push({ type: 'msg', msg, key: msg.id })
    })

    return (
        <div className="flex-1 flex flex-col bg-background relative overflow-hidden h-full">
            {/* ── Header ── */}
            <header className={clsx(
                "px-4 py-3 flex items-center justify-between z-30 shrink-0",
                theme === 'dark' ? "bg-card/80 backdrop-blur-xl border-b border-white/5" : "bg-white border-b border-gray-100"
            )}>
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors active:scale-90"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border relative">
                            <Image
                                src={
                                    otherPerson.avatar_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson.full_name || 'U')}&background=random`
                                }
                                alt=""
                                fill
                                className="object-cover"
                            />
                        </div>
                        {isOnline && (
                            <div className={clsx(
                                "absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full",
                                theme === 'dark' ? "border-card" : "border-white"
                            )} />
                        )}

                    </div>
                    <div>
                        <h4 className={clsx(
                            "font-heading font-black italic uppercase text-sm leading-none tracking-tight",
                            theme === 'dark' ? "text-white" : "text-gray-900"
                        )}>
                            {otherPerson.full_name}
                        </h4>
                        <div className="mt-0.5 h-4 flex items-center">
                            {isOtherTyping ? (
                                <span className="flex items-center gap-1.5 text-[10px] text-brand-red font-bold">
                                    <span className="flex gap-0.5 items-end">
                                        {[0, 1, 2].map(i => (
                                            <motion.span
                                                key={i}
                                                className="w-1 rounded-full bg-brand-red inline-block"
                                                animate={{ height: ['3px', '9px', '3px'] }}
                                                transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18 }}
                                            />
                                        ))}
                                    </span>
                                    escribiendo…
                                </span>
                            ) : isOnline ? (
                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest">En línea</span>
                            ) : (
                                <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Desconectado</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onDeleteConversation && (
                        confirmDeleteConv ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-xl px-2 py-1.5"
                            >
                                <span className="text-[10px] text-red-400 font-black uppercase">¿Borrar?</span>
                                <button
                                    onClick={() => { setConfirmDeleteConv(false); onDeleteConversation() }}
                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setConfirmDeleteConv(false)}
                                    className="p-1 text-gray-500 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ) : (
                            <button
                                onClick={() => setConfirmDeleteConv(true)}
                                className="p-2.5 text-gray-600 hover:text-brand-red hover:bg-white/5 rounded-xl transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )
                    )}
                    <button className="p-2.5 text-gray-600 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <Info className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* ── Messages ── */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className={clsx(
                    "flex-1 overflow-y-auto px-4 md:px-8 py-4 relative custom-scrollbar",
                    theme === 'dark' ? "bg-[#070707]" : "bg-white"
                )}

            >
                {/* Subtle doodle BG */}
                <div
                    className="absolute inset-0 opacity-[0.025] pointer-events-none z-0"
                    style={{
                        backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/630/WH-wallpaper-background-whatsapp-doodle-patterns-chat.jpg")',
                        backgroundSize: '400px',
                    }}
                />

                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto flex flex-col gap-px relative z-10">
                        <AnimatePresence initial={false}>
                            {items.map((item) => {
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

                                const isRead =
                                    !!otherParticipantLastRead &&
                                    new Date(msg.created_at).getTime() <=
                                        new Date(otherParticipantLastRead).getTime() + 1000

                                return (
                                    <motion.div
                                        key={item.key}
                                        layout="position"
                                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.92 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                        className={clsx('flex w-full', isMine ? 'justify-end' : 'justify-start', isFirst && 'mt-3')}
                                    >
                                        <div
                                            className={clsx(
                                                'flex flex-col relative group max-w-[82%] sm:max-w-[65%]',
                                                isMine ? 'items-end' : 'items-start'
                                            )}
                                        >
                                            {/* Desktop hover actions */}
                                            <div
                                                className={clsx(
                                                    'absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 pointer-events-none group-hover:pointer-events-auto',
                                                    isMine ? 'right-full mr-2' : 'left-full ml-2'
                                                )}
                                            >
                                                <button
                                                    onClick={() => {
                                                        onToggleLike?.(msg.id, !!msg.is_liked)
                                                        if (!msg.is_liked) {
                                                            setLikedAnimId(msg.id)
                                                            setTimeout(() => setLikedAnimId(null), 900)
                                                        }
                                                    }}
                                                    className={clsx(
                                                        'p-1.5 rounded-lg bg-white/5 transition-colors',
                                                        msg.is_liked ? 'text-brand-red' : 'text-gray-500 hover:text-white'
                                                    )}
                                                >
                                                    <Heart className={clsx('w-3.5 h-3.5', msg.is_liked && 'fill-current')} />
                                                </button>
                                                {msg.text && (
                                                    <button
                                                        onClick={() => handleCopy(msg.text)}
                                                        className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isMine && !msg.image_url && (
                                                    <button
                                                        onClick={() => handleStartEdit(msg)}
                                                        className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {isMine && (
                                                    <button
                                                        onClick={() => setDeletingId(msg.id)}
                                                        className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline delete confirm */}
                                            <AnimatePresence>
                                                {isDeleting && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className={clsx(
                                                            'flex items-center gap-2 mb-1 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1',
                                                            isMine ? 'self-end' : 'self-start'
                                                        )}
                                                    >
                                                        <span className="text-[10px] text-red-400 font-black uppercase">¿Eliminar?</span>
                                                        <button
                                                            onClick={() => handleDeleteMsg(msg.id)}
                                                            className="text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(null)}
                                                            className="text-gray-500 hover:text-white transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Bubble */}
                                            <div
                                                className={clsx(
                                                    'relative transition-colors select-none',
                                                    msg.image_url
                                                        ? 'rounded-2xl p-1 bg-white/[0.04] border border-white/[0.08]'
                                                        : clsx(
                                                              'px-4 py-2.5 shadow-sm',
                                                                    isMine
                                                                        ? 'bg-brand-red text-white rounded-[18px]'
                                                                        : (theme === 'dark' 
                                                                            ? 'bg-[#1E1E1E] border border-white/[0.06] text-foreground rounded-[18px]' 
                                                                            : 'bg-gray-100 border-none text-gray-900 rounded-[18px]'),
                                                              // Tail on last message
                                                              isLast && isMine && 'rounded-br-[4px]',
                                                              isLast && !isMine && 'rounded-bl-[4px]'
                                                          )
                                                )}
                                                onClick={() => handleMessageTap(msg)}
                                                onTouchStart={() => handleLongPress(msg, isMine)}
                                                onTouchEnd={cancelLongPress}
                                                onTouchMove={cancelLongPress}
                                                onContextMenu={e => {
                                                    e.preventDefault()
                                                    setActionSheet({ msg, isMine })
                                                }}
                                            >
                                                {/* Double-tap heart anim */}
                                                {likedAnimId === msg.id && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: [1, 1.5, 0], opacity: [1, 1, 0] }}
                                                        transition={{ duration: 0.8 }}
                                                        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                                                    >
                                                        <Heart className="w-12 h-12 text-white fill-white drop-shadow-2xl" />
                                                    </motion.div>
                                                )}

                                                {isEditing ? (
                                                    <div className="flex flex-col gap-2 min-w-[180px]">
                                                        <textarea
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            className="bg-black/20 border border-white/10 rounded-xl p-2 text-sm text-white focus:outline-none resize-none"
                                                            rows={2}
                                                            autoFocus
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                                                                if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                                                            }}
                                                        />
                                                        <div className="flex justify-end gap-1.5">
                                                            <button
                                                                onClick={() => { setEditingId(null); setEditValue('') }}
                                                                className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={handleSaveEdit}
                                                                className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {msg.image_url && (
                                                            <div
                                                                className="relative cursor-pointer"
                                                                onClick={e => { e.stopPropagation(); setLightboxImage(msg.image_url) }}
                                                            >
                                                                <div className="relative min-w-[150px] max-w-[280px] sm:max-w-[360px]">
                                                                    <Image
                                                                        src={msg.image_url}
                                                                        alt="Media"
                                                                        width={360}
                                                                        height={360}
                                                                        className="object-cover rounded-xl"
                                                                    />
                                                                </div>
                                                                {msg.text && (
                                                                    <div className="px-1 pt-2 pb-1">
                                                                        <MentionText
                                                                            text={msg.text}
                                                                            className="text-sm font-medium leading-relaxed block"
                                                                            mentionClassName="text-brand-red underline"
                                                                        />
                                                                    </div>
                                                                )}
                                                                {/* Timestamp overlay */}
                                                                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                                                                    {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                                    <span className="text-[9px] font-bold text-white/80">
                                                                        {format(new Date(msg.created_at), 'HH:mm')}
                                                                    </span>
                                                                    {isMine && (
                                                                        isRead ? (
                                                                            <div className="flex -space-x-1">
                                                                                <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                                <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                            </div>
                                                                        ) : (
                                                                            <Check className="w-2.5 h-2.5 text-white/40" />
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {!msg.image_url && (
                                                            <div className="relative flex flex-col">
                                                                <MentionText
                                                                    text={msg.text || ''}
                                                                    className="text-sm font-medium leading-[1.45] pr-[4.5rem]"
                                                                    mentionClassName={clsx(
                                                                        'underline',
                                                                        isMine ? 'text-white/80' : 'text-brand-red'
                                                                    )}
                                                                />
                                                                {/* Inline timestamp */}
                                                                <div
                                                                    className={clsx(
                                                                        'absolute bottom-0 right-0 flex items-center gap-1 text-[9px] font-bold',
                                                                        isMine ? 'text-white/50' : 'text-gray-600'
                                                                    )}
                                                                >
                                                                    {msg.is_liked && (
                                                                        <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />
                                                                    )}
                                                                    <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                                    {isMine && (
                                                                        isRead ? (
                                                                            <div className="flex -space-x-1.5">
                                                                                <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                                <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                            </div>
                                                                        ) : (
                                                                            <Check className="w-2.5 h-2.5 opacity-50" />
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Heart reaction badge */}
                                            <AnimatePresence>
                                                {msg.is_liked && !isEditing && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        exit={{ scale: 0 }}
                                                        className={clsx(
                                                            'mt-0.5 px-1.5 py-0.5 rounded-full flex items-center gap-0.5',
                                                            theme === 'dark' ? 'bg-[#1A1A1A] border border-white/[0.06]' : 'bg-gray-100 border-gray-200',
                                                            isMine ? 'self-end' : 'self-start'
                                                        )}
                                                    >
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

            {/* Scroll-to-bottom FAB */}
            <AnimatePresence>
                {showScrollBtn && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-24 right-5 z-30 w-10 h-10 bg-card border border-border rounded-full shadow-xl flex items-center justify-center hover:bg-brand-red hover:border-brand-red transition-all"
                    >
                        {unreadBadge > 0 ? (
                            <span className="text-xs font-black text-white">{unreadBadge > 9 ? '9+' : unreadBadge}</span>
                        ) : (
                            <ChevronDown className="w-5 h-5 text-white" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxImage(null)}
                        className="fixed inset-0 z-[100] bg-black/96 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <button
                            className="absolute top-6 right-6 z-[110] bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors"
                            onClick={e => { e.stopPropagation(); setLightboxImage(null) }}
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <motion.div
                            initial={{ scale: 0.88 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.88 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={lightboxImage}
                                alt="Full"
                                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile action sheet */}
            <AnimatePresence>
                {actionSheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
                            onClick={() => setActionSheet(null)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 z-[91] bg-card border-t border-border rounded-t-[2rem] p-4 pb-10 shadow-2xl"
                        >
                            {/* Quick reactions */}
                            <div className="flex justify-center gap-4 py-3 mb-2">
                                {['❤️', '😂', '😮', '😢', '👍', '🔥'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            onToggleLike?.(actionSheet.msg.id, !!actionSheet.msg.is_liked)
                                            setActionSheet(null)
                                        }}
                                        className="text-2xl hover:scale-125 active:scale-90 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <div className="h-px bg-border mb-2 mx-2" />
                            <div className="space-y-0.5">
                                {actionSheet.msg.text && (
                                    <button
                                        onClick={() => handleCopy(actionSheet.msg.text)}
                                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                                    >
                                        <Copy className="w-5 h-5 text-gray-400 shrink-0" />
                                        <span className="text-sm font-semibold text-foreground">Copiar texto</span>
                                    </button>
                                )}
                                {actionSheet.isMine && !actionSheet.msg.image_url && (
                                    <button
                                        onClick={() => handleStartEdit(actionSheet.msg)}
                                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                                    >
                                        <Edit2 className="w-5 h-5 text-gray-400 shrink-0" />
                                        <span className="text-sm font-semibold text-foreground">Editar mensaje</span>
                                    </button>
                                )}
                                {actionSheet.isMine && (
                                    <button
                                        onClick={() => { setDeletingId(actionSheet.msg.id); setActionSheet(null) }}
                                        className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-500/10 active:bg-red-500/20 transition-colors text-left"
                                    >
                                        <Trash2 className="w-5 h-5 text-red-400 shrink-0" />
                                        <span className="text-sm font-semibold text-red-400">Eliminar mensaje</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setActionSheet(null)}
                                    className="w-full flex items-center justify-center px-4 py-3 mt-1 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <span className="text-sm font-bold text-gray-500">Cancelar</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Emoji picker */}
            <AnimatePresence>
                {showEmoji && (
                    <motion.div
                        data-emoji-picker
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-[76px] left-4 md:left-8 bg-card border border-border rounded-2xl p-3 shadow-2xl z-40 w-72"
                    >
                        <div className="grid grid-cols-8 gap-0.5">
                            {EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { setInputValue(v => v + emoji); setShowEmoji(false) }}
                                    className="text-xl hover:bg-white/10 active:bg-white/20 rounded-lg p-1 transition-colors aspect-square flex items-center justify-center"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Input bar ── */}
            <div className="px-4 pb-4 pt-2 bg-background/90 backdrop-blur-md border-t border-border/20 relative z-20 shrink-0">
                <div className="max-w-4xl mx-auto flex items-end gap-2">
                    <div className={clsx(
                        "flex-1 rounded-[1.5rem] border transition-colors flex items-end px-3 py-2 gap-1.5 shadow-inner",
                        theme === 'dark' ? "bg-[#181818] border-white/[0.06] focus-within:border-brand-red/25" : "bg-gray-100 border-gray-200 focus-within:border-brand-red/20"
                    )}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="text-gray-500 hover:text-brand-red p-1.5 rounded-full transition-colors shrink-0 mb-0.5"
                        >
                            {isUploading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-brand-red" />
                            ) : (
                                <ImagePlus className="w-5 h-5" />
                            )}
                        </button>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <MentionInput
                            value={inputValue}
                            onChange={(v: string) => { setInputValue(v); sendTypingEvent() }}
                            onKeyDown={handleKeyDown}
                            placeholder={t.chat.placeholder}
                            className="flex-1 bg-transparent border-none py-2 px-1 text-sm text-foreground placeholder:text-gray-600 focus:outline-none w-full"
                        />
                        <button
                            data-emoji-btn
                            onClick={() => setShowEmoji(v => !v)}
                            className={clsx(
                                'p-1.5 rounded-full transition-colors shrink-0 mb-0.5',
                                showEmoji ? 'text-brand-red' : 'text-gray-500 hover:text-brand-red'
                            )}
                        >
                            <Smile className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className={clsx(
                            'w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0',
                            inputValue.trim()
                                ? 'bg-brand-red text-white shadow-[0_0_18px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95'
                                : 'bg-white/[0.04] text-gray-700 cursor-not-allowed opacity-50'
                        )}
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
