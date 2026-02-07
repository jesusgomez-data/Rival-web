'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { Info, Send, Loader2, MessageSquarePlus, ImagePlus, ChevronLeft, Zap, Trash2, Edit2, X, Check, Heart } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/app/LanguageContext'

interface ChatWindowProps {
    messages: any[]
    otherPerson: any
    currentUserId: string
    onSendMessage: (text: string, imageUrl?: string) => void
    onUploadImage?: (file: File) => Promise<{ url?: string, error?: string }>
    onDeleteMessage?: (id: string) => void
    onEditMessage?: (id: string, text: string) => void
    onToggleLike?: (id: string, currentStatus: boolean) => void
    isLoading?: boolean
    onBack?: () => void
}

export default function ChatWindow({ messages, otherPerson, currentUserId, onSendMessage, onUploadImage, onDeleteMessage, onEditMessage, onToggleLike, isLoading, onBack }: ChatWindowProps) {
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
            {/* Header más contacto/compacto */}
            <header className="px-4 md:px-6 py-4 border-b border-border flex items-center justify-between relative z-30 bg-card/40 backdrop-blur-xl">
                <div className="flex items-center gap-3 md:gap-4">
                    {onBack && (
                        <button onClick={onBack} className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    <div className="relative group cursor-pointer">
                        <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-full md:rounded-2xl overflow-hidden border border-border group-hover:border-brand-red transition-all">
                            <Image src={otherPerson.avatar_url || '/placeholder-avatar.jpg'} alt="" fill className="object-cover" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-lg" />
                    </div>
                    <div>
                        <h4 className="font-accent font-black text-foreground italic uppercase text-base md:text-lg leading-tight tracking-tight">{otherPerson.full_name}</h4>
                        <div className="flex items-center gap-1.5 mt-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] text-green-500 font-black uppercase tracking-[0.15em]">{t.chat.online}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-500 hover:text-white transition-colors">
                        <Info className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Area de mensajes con Ancho Controlado (Para que no se vea vacío) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide relative z-10 custom-scrollbar bg-[radial-gradient(circle_at_top_right,_rgba(239,68,68,0.03)_0%,_transparent_50%)]">
                <div className="max-w-4xl mx-auto flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => {
                            const isMine = msg.sender_id === currentUserId
                            const isEditing = editingId === msg.id
                            const prevMsg = messages[idx - 1]
                            const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id)

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={clsx(
                                        "flex w-full group",
                                        isMine ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div className={clsx(
                                        "flex items-end gap-2 max-w-[85%] sm:max-w-[70%]",
                                        isMine ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        {/* Avatar subtle display only on start of sequence */}
                                        {!isMine && (
                                            <div className="w-6 shrink-0 flex justify-center mb-1">
                                                {showAvatar && (
                                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/10 opacity-60">
                                                        <Image src={otherPerson.avatar_url || '/placeholder-avatar.jpg'} alt="" fill className="object-cover" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex flex-col relative">
                                            {(!isEditing) && (
                                                <div className={clsx(
                                                    "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20",
                                                    isMine ? "-left-20" : "-right-12"
                                                )}>
                                                    <button
                                                        onClick={() => onToggleLike?.(msg.id, !!msg.is_liked)}
                                                        className={clsx(
                                                            "p-1.5 rounded-lg transition-colors",
                                                            msg.is_liked ? "text-brand-red bg-brand-red/10" : "text-gray-500 hover:text-white hover:bg-white/10"
                                                        )}
                                                    >
                                                        <Heart className={clsx("w-3.5 h-3.5", msg.is_liked && "fill-current")} />
                                                    </button>
                                                    {isMine && (
                                                        <>
                                                            <button onClick={() => handleStartEdit(msg)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => onDeleteMessage?.(msg.id)} className="p-1.5 rounded-lg hover:bg-brand-red/10 text-gray-500 hover:text-brand-red transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <div
                                                className={clsx(
                                                    "relative transition-all duration-300 overflow-hidden",
                                                    msg.image_url
                                                        ? "rounded-[1.5rem] p-0 shadow-2xl bg-card border border-border group-hover:scale-[1.01]"
                                                        : clsx(
                                                            "px-5 py-3 shadow-md",
                                                            isMine
                                                                ? "bg-gradient-to-br from-brand-red via-brand-red to-rose-600 text-white rounded-[1.8rem] rounded-br-sm shadow-brand-red/10"
                                                                : "bg-card border border-border text-foreground rounded-[1.8rem] rounded-bl-sm backdrop-blur-sm shadow-sm"
                                                        )
                                                )}
                                                onClick={() => handleMessageClick(msg)}
                                            >
                                                {likedAnimId === msg.id && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: [1, 1.5, 0], opacity: [1, 1, 0] }}
                                                        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                                                    >
                                                        <Heart className="w-20 h-20 text-white fill-white drop-shadow-2xl" />
                                                    </motion.div>
                                                )}

                                                {isEditing ? (
                                                    <div className="flex flex-col gap-2 min-w-[200px] p-1">
                                                        <textarea
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="bg-background/40 border border-border rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-brand-red/20 resize-none font-medium"
                                                            rows={2}
                                                            autoFocus
                                                        />
                                                        <div className="flex justify-end gap-2 pr-1 pb-1">
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
                                                                <div className="relative min-w-[180px] max-w-[280px] sm:max-w-[340px] aspect-[4/5] sm:aspect-auto">
                                                                    <Image
                                                                        src={msg.image_url}
                                                                        alt="Media"
                                                                        width={340}
                                                                        height={340}
                                                                        className="object-cover rounded-[1.5rem]"
                                                                        priority={idx < 10}
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors rounded-[1.5rem]" />
                                                                </div>
                                                                {msg.text && (
                                                                    <div className="p-4 pt-3 pb-2">
                                                                        <span className="text-sm font-medium leading-relaxed block">{msg.text}</span>
                                                                    </div>
                                                                )}
                                                                <div className={clsx(
                                                                    "absolute bottom-2 right-3 text-[10px] font-black tracking-widest text-white/60 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full pointer-events-none flex items-center gap-2",
                                                                    !msg.text && "shadow-xl"
                                                                )}>
                                                                    {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {!msg.image_url && (
                                                            <>
                                                                <span className="text-[13px] md:text-sm font-medium leading-[1.6] block">{msg.text}</span>
                                                                <div className={clsx(
                                                                    "text-[8px] md:text-[9px] mt-1.5 flex items-center gap-2 opacity-60 font-black tracking-widest uppercase italic",
                                                                    isMine ? "justify-end" : "justify-start"
                                                                )}>
                                                                    {msg.is_liked && <Heart className="w-2.5 h-2.5 fill-brand-red text-brand-red" />}
                                                                    {msg.updated_at && <span>{t.chat.edited}</span>}
                                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
                    >
                        <motion.button
                            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-10"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
                        >
                            <X className="w-6 h-6" />
                        </motion.button>
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-5xl h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={lightboxImage}
                                alt="Fullscreen"
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input más cómodo y centrado */}
            <div className="px-4 pb-4 md:pb-8 pt-2 bg-background border-t border-border relative z-20">
                <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4">
                    <div className="flex-1 bg-muted rounded-[2.2rem] border border-border focus-within:border-brand-red/30 transition-all flex items-center px-4 md:px-6 shadow-inner">
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
                            className="text-gray-500 hover:text-brand-red p-2 hover:bg-white/5 rounded-full transition-all"
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                        </button>
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={t.chat.placeholder}
                            className="flex-1 bg-transparent border-none py-4 px-2 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <div className="flex items-center gap-1">
                            <button className="hidden sm:block p-2 text-gray-500 hover:text-white transition-colors">
                                <Zap className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className={clsx(
                            "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shrink-0 shadow-lg",
                            inputValue.trim()
                                ? "bg-brand-red text-white shadow-brand-red/20 scale-100 hover:scale-105 active:scale-95 translate-y-0"
                                : "bg-white/[0.03] text-gray-700 scale-95 opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Send className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>
        </div>
    )
}
