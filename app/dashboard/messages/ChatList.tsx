'use client'

import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, MessageSquarePlus, Zap, ImageIcon, Film, Eye, Users, Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { usePresence } from '../PresenceContext'

interface ChatListProps {
    conversations: any[]
    activeId: string | null
    onSelect: (id: string, person: any) => void
    onSearch: (query: string) => void
    onNewChat: () => void
    onNewGroup: () => void
}

function GroupAvatar({ members }: { members: any[] }) {
    const shown = members.slice(0, 3)
    return (
        <div className="relative w-full h-full">
            {shown.length === 0 && (
                <div className="w-full h-full bg-gradient-to-br from-brand-red/50 to-orange-500/50 flex items-center justify-center rounded-[14px]">
                    <Users className="w-6 h-6 text-white/60" />
                </div>
            )}
            {shown.length === 1 && (
                shown[0]?.avatar_url
                    ? <Image src={shown[0].avatar_url} alt="" fill className="object-cover rounded-[14px]" />
                    : <div className="w-full h-full bg-gradient-to-br from-brand-red/40 to-orange-400/40 rounded-[14px] flex items-center justify-center">
                        <span className="font-black text-white/60 text-lg">{(shown[0]?.full_name || '?')[0]}</span>
                    </div>
            )}
            {shown.length >= 2 && (
                <div className="grid grid-cols-2 gap-0.5 w-full h-full rounded-[14px] overflow-hidden">
                    {shown.slice(0, shown.length === 3 ? 3 : 2).map((m: any, i: number) => (
                        <div key={i} className={clsx("relative overflow-hidden", shown.length === 3 && i === 0 && "row-span-2")}>
                            {m?.avatar_url
                                ? <Image src={m.avatar_url} alt="" fill className="object-cover" />
                                : <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                    <span className="font-black text-white/40 text-[10px]">{(m?.full_name || '?')[0]}</span>
                                </div>
                            }
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ChatList({ conversations, activeId, onSearch, onSelect, onNewChat, onNewGroup }: ChatListProps) {
    const { onlineUsers } = usePresence()

    const getLastMsgPreview = (conv: any) => {
        const text = conv.last_message_text
        if (!text) return null
        if (text === '👁 Ver una vez') return { icon: <Eye className="w-3 h-3 shrink-0 text-purple-400" />, label: 'Ver una vez', accent: true }
        if (text === '🎬 Video') return { icon: <Film className="w-3 h-3 shrink-0" />, label: 'Video', accent: false }
        if (text === '📷 Imagen') return { icon: <ImageIcon className="w-3 h-3 shrink-0" />, label: 'Foto', accent: false }
        return { icon: null, label: text, accent: false }
    }

    return (
        <div className="flex flex-col h-full bg-[#080808]">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter flex items-center gap-2 leading-none">
                            <div className="w-1 h-7 bg-brand-red rounded-full shadow-[0_0_12px_rgba(220,38,38,0.9)]" />
                            MENSAJES
                        </h2>
                        <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.3em] mt-1 ml-3">
                            {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onNewGroup}
                            title="Nuevo grupo"
                            className="w-9 h-9 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 active:scale-90 flex items-center justify-center"
                        >
                            <Users className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onNewChat}
                            title="Nuevo chat"
                            className="w-9 h-9 rounded-xl bg-brand-red text-white hover:bg-red-600 transition-all shadow-[0_0_16px_rgba(220,38,38,0.35)] active:scale-90 flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar rival..."
                        onChange={e => onSearch(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-brand-red/30 transition-colors placeholder:text-white/15 font-medium"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                <AnimatePresence mode="popLayout">
                    {conversations.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-20 text-center px-4"
                        >
                            <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-4">
                                <Zap className="w-7 h-7 text-white/10" />
                            </div>
                            <p className="text-[11px] text-white/20 font-black uppercase tracking-widest">Sin conversaciones</p>
                            <p className="text-[9px] text-white/10 font-bold mt-1">Inicia un chat con un rival</p>
                            <button
                                onClick={onNewChat}
                                className="mt-5 px-5 py-2.5 bg-brand-red text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                            >
                                Nuevo Chat
                            </button>
                        </motion.div>
                    ) : (
                        conversations.map((conv, idx) => {
                            const isActive = activeId === conv.id
                            const person = conv.other_person
                            const isGroup = conv.is_group
                            const isOnline = !isGroup && person?.id && onlineUsers.has(person.id)
                            const hasUnread = conv.unread_count > 0
                            const preview = getLastMsgPreview(conv)

                            return (
                                <motion.button
                                    key={conv.id}
                                    layout
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -12, scale: 0.95 }}
                                    transition={{ delay: idx * 0.025, type: 'spring', stiffness: 400, damping: 30 }}
                                    onClick={() => onSelect(conv.id, isGroup ? { isGroup: true, groupName: conv.group_name, members: conv.group_members } : person)}
                                    className={clsx(
                                        'w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-2xl transition-all relative group',
                                        isActive
                                            ? 'bg-white/[0.07] border border-white/10'
                                            : hasUnread
                                                ? 'bg-brand-red/[0.05] border border-brand-red/10 hover:bg-brand-red/[0.08]'
                                                : 'border border-transparent hover:bg-white/[0.04]'
                                    )}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="chat-active-bar"
                                            className="absolute left-0 top-3 bottom-3 w-0.5 bg-brand-red rounded-full shadow-[0_0_8px_rgba(220,38,38,0.8)]"
                                        />
                                    )}

                                    {/* Avatar with unread ring */}
                                    <div className="relative shrink-0" style={{ width: 52, height: 52 }}>
                                        {hasUnread && (
                                            <div className="absolute -inset-[3px] rounded-[17px] z-0 overflow-hidden">
                                                <div className="w-full h-full bg-gradient-to-br from-brand-red via-orange-400 to-red-700" />
                                            </div>
                                        )}
                                        <div
                                            className="relative z-10 overflow-hidden"
                                            style={{
                                                width: 52, height: 52,
                                                borderRadius: 14,
                                                border: hasUnread ? '2px solid #080808' : '2px solid rgba(255,255,255,0.05)',
                                            }}
                                        >
                                            {isGroup
                                                ? <GroupAvatar members={conv.group_members || []} />
                                                : person?.avatar_url
                                                    ? <Image src={person.avatar_url} alt="" fill className="object-cover" />
                                                    : <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center">
                                                        <span className="text-lg font-black text-white/30">
                                                            {(person?.full_name || person?.username || '?')[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                            }
                                        </div>
                                        {isOnline && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#080808] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)] z-20" />
                                        )}
                                        {isGroup && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-zinc-700 border-2 border-[#080808] rounded-full flex items-center justify-center z-20">
                                                <Users className="w-2 h-2 text-white/60" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className={clsx(
                                                'font-black text-sm truncate leading-none tracking-tight',
                                                hasUnread || isActive ? 'text-white' : 'text-white/55'
                                            )}>
                                                {isGroup ? (conv.group_name || 'Grupo') : (person?.full_name || person?.username)}
                                            </h4>
                                            <span className={clsx(
                                                "text-[9px] font-bold uppercase tracking-wider shrink-0 ml-2",
                                                hasUnread ? 'text-brand-red' : 'text-white/15'
                                            )}>
                                                {conv.last_message_at
                                                    ? formatDistanceToNow(new Date(conv.last_message_at), { locale: es })
                                                          .replace('hace ', '')
                                                          .replace('menos de un minuto', 'ahora')
                                                    : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className={clsx(
                                                "text-[11px] truncate flex-1 flex items-center gap-1.5 font-medium",
                                                preview?.accent ? 'text-purple-400' : hasUnread ? 'text-white/50' : 'text-white/20'
                                            )}>
                                                {preview?.icon}
                                                {preview?.label || 'Iniciar conversación'}
                                            </p>
                                            {hasUnread && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="shrink-0 min-w-[20px] h-5 bg-brand-red text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                                >
                                                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                </motion.div>
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
