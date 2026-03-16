'use client'


import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, MessageSquarePlus, Zap, User, ImageIcon } from 'lucide-react'
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
    const { t } = useLanguage()
    const { onlineUsers } = usePresence()

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-accent font-bold italic text-foreground uppercase tracking-tighter flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand-red rounded-full" />
                        {t.chat.title}
                    </h2>
                    <button
                        onClick={onNewChat}
                        className="p-2 rounded-xl bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white transition-all border border-brand-red/20 active:scale-90"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder={t.chat.searchPlaceholder}
                        onChange={e => onSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-brand-red/30 transition-colors"
                    />
                </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
                <AnimatePresence mode="popLayout">
                    {conversations.length === 0 ? (
                        <div className="py-16 text-center px-4">
                            <Zap className="w-10 h-10 text-gray-800 mx-auto mb-4 opacity-20" />
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest">{t.chat.noChats}</p>
                        </div>
                    ) : (
                        conversations.map(conv => {
                            const isActive = activeId === conv.id
                            const person = conv.other_person
                            const isOnline = person?.id && onlineUsers.has(person.id)

                            return (
                                <motion.button
                                    key={conv.id}
                                    layout
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    onClick={() => onSelect(conv.id, person)}
                                    className={clsx(
                                        'w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all relative overflow-hidden',
                                        isActive
                                            ? 'bg-muted border border-border/80'
                                            : 'hover:bg-white/[0.03] border border-transparent'
                                    )}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="chat-active"
                                            className="absolute left-0 top-2 bottom-2 w-1 bg-brand-red rounded-full shadow-[0_0_12px_rgba(220,38,38,0.5)]"
                                        />
                                    )}

                                    {/* Avatar */}
                                    <div className="relative shrink-0">
                                        <div
                                            className={clsx(
                                                'w-12 h-12 rounded-2xl overflow-hidden border relative',
                                                isActive ? 'border-brand-red/40' : 'border-border'
                                            )}
                                        >
                                            {person?.avatar_url ? (
                                                <Image src={person.avatar_url} alt="" fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                                    <User className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        {isOnline && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h4
                                                className={clsx(
                                                    'font-bold text-sm truncate leading-none',
                                                    isActive ? 'text-white font-accent italic' : 'text-foreground/90'
                                                )}
                                            >
                                                {person?.full_name || person?.username}
                                            </h4>
                                            <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest shrink-0 ml-2">
                                                {conv.last_message_at
                                                    ? formatDistanceToNow(new Date(conv.last_message_at), { locale: es })
                                                          .replace('hace ', '')
                                                          .replace('menos de un minuto', 'ahora')
                                                    : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs text-gray-500 truncate leading-tight font-medium flex-1 flex items-center gap-1">
                                                {conv.last_message_text ? (
                                                    conv.last_message_text
                                                ) : conv.last_message_at ? (
                                                    <>
                                                        <ImageIcon className="w-3 h-3 shrink-0" />
                                                        <span>Foto</span>
                                                    </>
                                                ) : (
                                                    t.chat.startChat
                                                )}
                                            </p>
                                            {conv.unread_count > 0 && (
                                                <span className="shrink-0 min-w-[18px] h-[18px] bg-brand-red text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                                                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.button>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
