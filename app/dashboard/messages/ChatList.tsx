'use client'

import React from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, MessageSquarePlus, Zap, Trophy, ChevronRight, User } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/app/LanguageContext'
import { usePresence } from '../PresenceContext'

interface ChatListProps {
    conversations: any[]
    activeId: string | null
    onSelect: (id: string, otherPerson: any) => void
    onSearch: (query: string) => void
    onNewChat: () => void
}

export default function ChatList({ conversations, activeId, onSearch, onSelect, onNewChat }: ChatListProps) {
    const { t, language } = useLanguage()
    const { onlineUsers } = usePresence()

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Cabecera compacta */}
            <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-accent font-bold italic text-foreground uppercase tracking-tighter flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand-red rounded-full" />
                        {t.chat.title}
                    </h2>
                    <button
                        onClick={onNewChat}
                        className="p-2 rounded-xl bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white transition-all border border-brand-red/20"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t.chat.searchPlaceholder}
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-brand-red/40 transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Scroll de Conversaciones */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                <AnimatePresence mode='popLayout'>
                    {conversations.length === 0 ? (
                        <div className="py-10 text-center px-4">
                            <Zap className="w-10 h-10 text-gray-800 mx-auto mb-4 opacity-20" />
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{t.chat.noChats}</p>
                        </div>
                    ) : (
                        conversations.map((conv) => {
                            const isActive = activeId === conv.id;
                            const person = conv.other_person;
                            const isOnline = person?.id && onlineUsers.has(person.id);

                            return (
                                <motion.button
                                    key={conv.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => onSelect(conv.id, person)}
                                    className={clsx(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all relative group overflow-hidden border",
                                        isActive
                                            ? "bg-muted border-border shadow-xl"
                                            : "bg-transparent border-transparent hover:bg-muted/50"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-indicator"
                                            className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red shadow-[0_0_15px_rgba(220,38,38,0.5)]"
                                        />
                                    )}

                                    <div className="relative shrink-0">
                                        <div className={clsx(
                                            "w-12 h-12 rounded-xl overflow-hidden border relative",
                                            isActive ? "border-brand-red/50 shadow-glow-sm" : "border-border"
                                        )}>
                                            {person?.avatar_url ? (
                                                <Image src={person.avatar_url} alt="" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                                    <User className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        {isOnline && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <h4 className={clsx(
                                                    "font-bold text-sm truncate",
                                                    isActive ? "text-foreground font-accent italic tracking-tight" : "text-foreground/80"
                                                )}>
                                                    {person?.full_name || person?.username}
                                                </h4>
                                                {conv.unread_count > 0 && (
                                                    <span className="w-2 h-2 bg-brand-red rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                                )}
                                            </div>
                                            <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest shrink-0">
                                                {conv.last_message_at
                                                    ? formatDistanceToNow(new Date(conv.last_message_at), { locale: es }).replace('hace ', '')
                                                    : 'Ahora'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate leading-tight font-medium">
                                            {conv.last_message_text || t.chat.startChat}
                                        </p>
                                    </div>

                                    <ChevronRight className={clsx(
                                        "w-4 h-4 transition-all shrink-0",
                                        isActive ? "text-brand-red translate-x-0" : "text-gray-800 opacity-0 group-hover:opacity-100 translate-x-[-4px]"
                                    )} />
                                </motion.button>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
