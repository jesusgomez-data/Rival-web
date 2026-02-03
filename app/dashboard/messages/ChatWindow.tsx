'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Info, Send, Loader2, MessageSquarePlus, ImagePlus, ChevronLeft, Zap, Trash2, Edit2, X, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatWindowProps {
    messages: any[]
    otherPerson: any
    currentUserId: string
    onSendMessage: (text: string, imageUrl?: string) => void
    onUploadImage?: (file: File) => Promise<{ url?: string, error?: string }>
    onDeleteMessage?: (id: string) => void
    onEditMessage?: (id: string, text: string) => void
    isLoading?: boolean
    onBack?: () => void
}

export default function ChatWindow({ messages, otherPerson, currentUserId, onSendMessage, onUploadImage, onDeleteMessage, onEditMessage, isLoading, onBack }: ChatWindowProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [inputValue, setInputValue] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')
    const [isUploading, setIsUploading] = useState(false)
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

    if (!otherPerson) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center bg-[#070707] relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative mb-6"
                >
                    <div className="w-32 h-32 rounded-[2.5rem] bg-brand-red/10 flex items-center justify-center border border-brand-red/20 shadow-glow relative z-10">
                        <MessageSquarePlus className="w-12 h-12 text-brand-red/40" />
                    </div>
                </motion.div>
                <h3 className="text-2xl font-accent font-bold italic text-white mb-2 uppercase tracking-tighter">CENTRO DE MANDO</h3>
                <p className="text-gray-500 text-sm max-w-xs leading-relaxed font-medium">Selecciona a un rival para coordinar vuestro próximo enfrentamiento.</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-[#070707] relative overflow-hidden h-full">
            {/* Header más contacto/compacto */}
            <header className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between relative z-30 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button onClick={onBack} className="lg:hidden p-2 -ml-2 text-gray-400">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="relative">
                        <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-brand-red/40">
                            <Image src={otherPerson.avatar_url || '/placeholder-avatar.jpg'} alt="" fill className="object-cover" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#070707] rounded-full" />
                    </div>
                    <div>
                        <h4 className="font-accent font-bold text-white italic uppercase text-lg leading-none">{otherPerson.full_name}</h4>
                        <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">En Línea</span>
                    </div>
                </div>

                {/* Header actions removed at user request */}
            </header>

            {/* Area de mensajes con Ancho Controlado (Para que no se vea vacío) */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide relative z-10 custom-scrollbar">
                <div className="max-w-4xl mx-auto flex flex-col gap-6">
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => {
                            const isMine = msg.sender_id === currentUserId
                            const isEditing = editingId === msg.id

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={clsx(
                                        "flex flex-col max-w-[85%] sm:max-w-[70%]",
                                        isMine ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    <div className="group relative flex items-center gap-2">
                                        {isMine && !isEditing && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleStartEdit(msg)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500"><Edit2 className="w-3 h-3" /></button>
                                                <button onClick={() => onDeleteMessage?.(msg.id)} className="p-1.5 rounded-lg hover:bg-brand-red/20 text-gray-500"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                        )}

                                        <div className={clsx(
                                            "rounded-3xl text-sm relative transition-all shadow-xl overflow-hidden",
                                            isMine
                                                ? "bg-gradient-to-br from-brand-red to-rose-700 text-white rounded-br-none shadow-brand-red/10"
                                                : "bg-[#141414] border border-white/[0.08] text-gray-100 rounded-bl-none",
                                            msg.image_url ? "p-1 pb-2" : "px-5 py-3"
                                        )}>
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2 min-w-[200px] p-2">
                                                    <textarea
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="bg-black/20 border border-white/10 rounded-xl p-2 text-sm text-white focus:outline-none focus:border-white/20 resize-none"
                                                        rows={2}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={handleCancelEdit} className="p-1 rounded-lg bg-white/5 text-gray-400"><X className="w-4 h-4" /></button>
                                                        <button onClick={handleSaveEdit} className="p-1 rounded-lg bg-white/20 text-white"><Check className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {msg.image_url && (
                                                        <div className="mb-2 relative rounded-2xl overflow-hidden max-w-[300px] aspect-square bg-black/20">
                                                            <Image
                                                                src={msg.image_url}
                                                                alt="Media"
                                                                fill
                                                                className="object-cover"
                                                                sizes="300px"
                                                            />
                                                        </div>
                                                    )}
                                                    {msg.text && <span className="block leading-relaxed px-2">{msg.text}</span>}
                                                    <div className={clsx(
                                                        "text-[9px] mt-1.5 flex items-center gap-2 opacity-50 font-black tracking-widest italic px-2",
                                                        isMine ? "justify-end" : "justify-start"
                                                    )}>
                                                        {msg.updated_at && <span>(editado)</span>}
                                                        {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
                <div ref={messagesEndRef} />
            </div>

            {/* Input más cómodo y centrado */}
            <div className="px-4 pb-6 pt-2 bg-[#070707]">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <div className="flex-1 bg-[#0f0f12] rounded-[1.8rem] border border-white/[0.08] focus-within:border-brand-red/40 transition-all flex items-center px-4">
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
                            className="text-gray-500 hover:text-white p-2"
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                        </button>
                        <input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Mensaje..."
                            className="flex-1 bg-transparent border-none py-4 px-2 text-sm text-white focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                        className={clsx(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
                            inputValue.trim() ? "bg-brand-red text-white shadow-brand-red/20" : "bg-white/[0.03] text-gray-700"
                        )}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
