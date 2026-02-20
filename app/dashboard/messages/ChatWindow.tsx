'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { Info, Send, Loader2, MessageSquarePlus, ImagePlus, ChevronLeft, Zap, Trash2, Edit2, X, Check, Heart } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/app/LanguageContext'
import Link from 'next/link'
import MentionText from '@/components/MentionText'
import MentionInput from '@/components/MentionInput'

interface ChatWindowProps {
    messages: any[]
    otherPerson: any
    currentUserId: string
    onSendMessage: (text: string, imageUrl?: string) => void
    onUploadImage?: (file: File) => Promise<{ url?: string, error?: string }>
    onDeleteMessage?: (id: string) => void
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
    onSendMessage,
    onUploadImage,
    onDeleteMessage,
    onEditMessage,
    onToggleLike,
    onDeleteConversation,
    isLoading,
    onBack,
    isOnline,
    otherParticipantLastRead
}: ChatWindowProps) {
    const { t, language } = useLanguage()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [inputValue, setInputValue] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)
    const [lastClickTime, setLastClickTime] = useState(0)
    const [likedAnimId, setLikedAnimId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = () => {
        if (!inputValue.trim()) return
        onSendMessage(inputValue)
        setInputValue('')
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !onUploadImage) return

        setIsUploading(true)
        const result = await onUploadImage(file)
        setIsUploading(false)

        if (result.url) {
            onSendMessage('', result.url)
        } else if (result.error) {
            alert(`Error al subir imagen: ${result.error}`)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (editingId) handleSaveEdit()
            else handleSend()
        }
    }

    const handleStartEdit = (msg: any) => {
        setEditingId(msg.id)
        setEditValue(msg.text)
    }

    const handleSaveEdit = () => {
        if (editingId && editValue.trim()) {
            onEditMessage?.(editingId, editValue)
            setEditingId(null)
            setEditValue('')
        }
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditValue('')
    }

    const handleMessageClick = (msg: any) => {
        const now = Date.now()
        if (now - lastClickTime < 300) {
            // Double click detected
            if (!msg.is_liked) {
                onToggleLike?.(msg.id, false)
                setLikedAnimId(msg.id)
                setTimeout(() => setLikedAnimId(null), 1000)
            }
        }
        setLastClickTime(now)
    }

    if (!otherPerson) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-background relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative mb-6"
                >
                    <div className="w-32 h-32 rounded-[2.5rem] bg-brand-red/10 flex items-center justify-center border border-brand-red/20 shadow-glow relative z-10">
                        <MessageSquarePlus className="w-12 h-12 text-brand-red/40" />
                    </div>
                </motion.div>
                <h3 className="text-2xl font-accent font-bold italic text-foreground mb-2 uppercase tracking-tighter">{t.chat.commandCenter}</h3>
                <p className="text-muted-foreground text-sm max-w-xs leading-relaxed font-medium">{t.chat.commandSubtitle}</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-background relative overflow-hidden h-full">
            {/* Header Estilo WhatsApp */}
            <header className="px-4 md:px-6 py-3 border-b border-border flex items-center justify-between relative z-30 bg-card/80 backdrop-blur-xl shadow-sm">
                <div className="flex items-center gap-3 md:gap-4">
                    {onBack && (
                        <button onClick={onBack} className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div className="relative">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border">
                            <Image src={otherPerson.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherPerson.full_name || 'U')}&background=random`} alt="" fill className="object-cover" />
                        </div>
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full shadow-lg" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-heading font-black text-white italic uppercase text-sm md:text-base leading-none tracking-tight">{otherPerson.full_name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                            {isOnline ? (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[9px] text-green-500 font-black uppercase tracking-widest">{t.chat.online}</span>
                                </>
                            ) : (
                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{t.chat.offline}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {onDeleteConversation && (
                        <button
                            onClick={() => {
                                if (confirm(t.chat.deleteConfirm || '¿Estás seguro de que quieres borrar esta conversación?')) {
                                    onDeleteConversation();
                                }
                            }}
                            className="p-2.5 text-gray-500 hover:text-brand-red hover:bg-white/5 rounded-xl transition-all"
                            title="Borrar conversación"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button className="p-2.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <Info className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Area de mensajes con Patrón de Fondo WhatsApp (Doodle) */}
            <div className="flex-1 overflow-y-auto p-4 md:px-8 md:py-6 space-y-4 scrollbar-hide relative z-10 custom-scrollbar bg-[#070707]">
                {/* Patrón de fondo sutil */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none z-0" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/630/WH-wallpaper-background-whatsapp-doodle-patterns-chat.jpg")', backgroundSize: '400px' }}></div>

                <div className="max-w-4xl mx-auto flex flex-col gap-2 relative z-10">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => {
                            const isMine = msg.sender_id === currentUserId
                            const isEditing = editingId === msg.id
                            const prevMsg = messages[idx - 1]
                            const nextMsg = messages[idx + 1]

                            const isFirstInSequence = !prevMsg || prevMsg.sender_id !== msg.sender_id
                            const isLastInSequence = !nextMsg || nextMsg.sender_id !== msg.sender_id

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={clsx(
                                        "flex w-full mb-0.5",
                                        isMine ? "justify-end" : "justify-start",
                                        isFirstInSequence && "mt-2"
                                    )}
                                >
                                    <div className={clsx(
                                        "flex flex-col relative group max-w-[85%] sm:max-w-[70%]",
                                        isMine ? "items-end" : "items-start"
                                    )}>
                                        {/* Actions Floating */}
                                        <div className={clsx(
                                            "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20",
                                            isMine ? "right-full mr-2" : "left-full ml-2"
                                        )}>
                                            <button
                                                onClick={() => onToggleLike?.(msg.id, !!msg.is_liked)}
                                                className={clsx(
                                                    "p-1.5 rounded-lg transition-colors bg-white/5",
                                                    msg.is_liked ? "text-brand-red" : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                <Heart className={clsx("w-3.5 h-3.5", msg.is_liked && "fill-current")} />
                                            </button>
                                            {isMine && (
                                                <button onClick={() => handleStartEdit(msg)} className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                            )}
                                        </div>

                                        <div
                                            className={clsx(
                                                "relative transition-all duration-300",
                                                msg.image_url
                                                    ? "rounded-2xl p-1 bg-white/5 border border-white/10"
                                                    : clsx(
                                                        "px-4 py-2.5 shadow-sm",
                                                        isMine
                                                            ? "bg-brand-red text-white rounded-2xl rounded-tr-none"
                                                            : "bg-[#1E1E1E] border border-white/5 text-foreground rounded-2xl rounded-tl-none"
                                                    ),
                                                !isFirstInSequence && (isMine ? "rounded-tr-2xl" : "rounded-tl-2xl")
                                            )}
                                            onClick={() => handleMessageClick(msg)}
                                        >
                                            {likedAnimId === msg.id && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: [1, 1.5, 0], opacity: [1, 1, 0] }}
                                                    className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                                                >
                                                    <Heart className="w-12 h-12 text-white fill-white drop-shadow-2xl" />
                                                </motion.div>
                                            )}

                                            {isEditing ? (
                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    <textarea
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none resize-none font-medium"
                                                        rows={2}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={handleCancelEdit} className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                                                        <button onClick={handleSaveEdit} className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"><Check className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    {msg.image_url && (
                                                        <div
                                                            className="relative cursor-pointer group/img"
                                                            onClick={(e) => {
                                                                const now = Date.now()
                                                                if (now - lastClickTime < 300) {
                                                                    e.stopPropagation()
                                                                    handleMessageClick(msg)
                                                                } else {
                                                                    setLightboxImage(msg.image_url)
                                                                }
                                                            }}
                                                        >
                                                            <div className="relative min-w-[150px] max-w-[280px] sm:max-w-[400px]">
                                                                <Image
                                                                    src={msg.image_url}
                                                                    alt="Media"
                                                                    width={400}
                                                                    height={400}
                                                                    className="object-cover rounded-xl"
                                                                    priority={idx < 10}
                                                                />
                                                            </div>
                                                            {msg.text && (
                                                                <div className="px-1 py-2">
                                                                    <MentionText
                                                                        text={msg.text}
                                                                        className="text-sm font-medium leading-relaxed block"
                                                                        mentionClassName="text-brand-red underline"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className={clsx(
                                                                "absolute bottom-1 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full",
                                                                !(otherParticipantLastRead && new Date(msg.created_at).getTime() <= new Date(otherParticipantLastRead).getTime() + 1000) && "opacity-80"
                                                            )}>
                                                                {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                                <span className="text-[9px] font-bold text-white/80">{format(new Date(msg.created_at), 'HH:mm')}</span>
                                                                {isMine && (
                                                                    <div className="flex items-center">
                                                                        {otherParticipantLastRead && new Date(msg.created_at).getTime() <= new Date(otherParticipantLastRead).getTime() + 1000 ? (
                                                                            <div className="flex items-center gap-0.5 ml-1">
                                                                                <div className="flex -space-x-1">
                                                                                    <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                                    <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                                </div>
                                                                                <span className="text-[7px] text-blue-400 font-black uppercase tracking-tighter">VISTO</span>
                                                                            </div>
                                                                        ) : (
                                                                            <Check className="w-2.5 h-2.5 text-white/40 ml-1" />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!msg.image_url && (
                                                        <div className="flex flex-col gap-1">
                                                            <MentionText
                                                                text={msg.text}
                                                                className="text-sm font-medium leading-[1.4] block pr-12"
                                                                mentionClassName={clsx("underline", isMine ? "text-white/90" : "text-brand-red")}
                                                            />
                                                            <div className={clsx(
                                                                "text-[9px] flex items-center gap-1.5 font-black tracking-widest uppercase italic self-end absolute bottom-[-2px] right-[-4px]",
                                                                (otherParticipantLastRead && new Date(msg.created_at).getTime() <= new Date(otherParticipantLastRead).getTime() + 1000) ? "opacity-100" : "opacity-50"
                                                            )}>
                                                                {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                                {format(new Date(msg.created_at), 'HH:mm')}
                                                                {isMine && (
                                                                    <div className="flex items-center ml-1">
                                                                        {otherParticipantLastRead && new Date(msg.created_at).getTime() <= new Date(otherParticipantLastRead).getTime() + 1000 ? (
                                                                            <div className="flex items-center gap-0.5">
                                                                                <div className="flex -space-x-1">
                                                                                    <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                                    <Check className="w-2.5 h-2.5 text-blue-400 stroke-[3px]" />
                                                                                </div>
                                                                                <span className="text-[7px] text-blue-400 font-black uppercase tracking-tighter">VISTO</span>
                                                                            </div>
                                                                        ) : (
                                                                            <Check className="w-2.5 h-2.5 text-white/50" />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Lightbox Instagram-style */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxImage(null)}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <motion.button
                            className="absolute top-6 right-6 text-white hover:text-brand-red focus:outline-none transition-colors z-[110] bg-black/20 p-2 rounded-full shadow-lg"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                        >
                            <X className="w-8 h-8" />
                        </motion.button>
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="relative w-full max-w-5xl h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={lightboxImage}
                                alt="Fullscreen"
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/5"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Estilo WhatsApp (Flotante y Curvo) */}
            <div className="px-4 pb-4 md:pb-6 pt-2 bg-background/80 backdrop-blur-md relative z-20">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className="flex-1 bg-[#1A1A1A] rounded-[1.8rem] border border-white/5 focus-within:border-brand-red/30 transition-all flex items-center px-4 py-1.5 shadow-2xl">
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="text-gray-400 hover:text-brand-red p-2 hover:bg-white/5 rounded-full transition-all"
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-[22px] h-[22px]" />}
                        </button>

                        <MentionInput
                            value={inputValue}
                            onChange={setInputValue}
                            onKeyDown={handleKeyPress}
                            placeholder={t.chat.placeholder}
                            className="flex-1 bg-transparent border-none py-3 px-2 text-sm text-foreground placeholder:text-gray-600 focus:outline-none w-full"
                        />

                        <button className="hidden sm:block p-2 text-gray-500 hover:text-brand-red transition-colors">
                            <Zap className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className={clsx(
                            "w-11 h-11 rounded-full flex items-center justify-center transition-all shrink-0",
                            inputValue.trim()
                                ? "bg-brand-red text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] scale-100 hover:scale-105 active:scale-95"
                                : "bg-white/[0.03] text-gray-700 scale-95 opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
