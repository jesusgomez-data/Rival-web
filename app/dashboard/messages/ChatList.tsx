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
        if (text === '👁 Ver una vez') return { icon: <Eye className="w-3 h-3 shrink-0 text-purple-600" />, label: 'Ver una vez', accent: true }
        if (text === '🎬 Video') return { icon: <Film className="w-3 h-3 shrink-0" />, label: 'Video', accent: false }
        if (text === '📷 Imagen') return { icon: <ImageIcon className="w-3 h-3 shrink-0" />, label: 'Foto', accent: false }
        return { icon: null, label: text, accent: false }
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="px-5 pt-6 pb-4 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex flex-col">
                        <h2 className="text-3xl font-black italic text-foreground uppercase tracking-tighter flex items-center gap-2 leading-none">
                            <div className="w-1.5 h-8 bg-brand-red rounded-full shadow-[0_4px_15px_rgba(220,38,38,0.4)]" />
                            CHATS
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1 ml-3.5 opacity-60">
                            {conversations.length} CONVERSACIONES ACTIVAS
                        </p>
                    </div>
                    <div className="flex gap-2.5">
                        <button
                            onClick={onNewGroup}
                            title="Nuevo grupo"
                            className="w-10 h-10 rounded-2xl bg-muted text-muted-foreground hover:text-brand-red hover:bg-brand-red/5 transition-all border border-border active:scale-90 flex items-center justify-center group"
                        >
                            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={onNewChat}
                            title="Nuevo chat"
                            className="w-10 h-10 rounded-2xl bg-brand-red text-white hover:bg-red-600 transition-all shadow-[0_8px_20px_rgba(220,38,38,0.25)] active:scale-95 flex items-center justify-center group"
                        >
                            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none opacity-40" />
                    <input
                        type="text"
                        placeholder="Buscar en el arena..."
                        onChange={e => onSearch(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-2xl py-3.5 pl-11 pr-5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red/50 transition-all placeholder:text-muted-foreground/30 font-bold uppercase tracking-tight"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                <AnimatePresence mode="popLayout">
                    {conversations.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="py-24 text-center px-4"
                        >
                            <div className="w-20 h-20 rounded-[28px] bg-muted flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 bg-brand-red/5 blur-xl rounded-full" />
                                <Zap className="w-8 h-8 text-brand-red/20 relative animate-pulse" />
                            </div>
                            <p className="text-[12px] text-foreground font-black uppercase tracking-[0.2em] italic">Silencio en el campo</p>
                            <p className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest opacity-60">Reta a un compañero y rompe el hielo</p>
                            <button
                                onClick={onNewChat}
                                className="mt-8 px-7 py-3 bg-brand-red text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                            >
                                INICIAR COMBATE
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
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
                                    onClick={() => onSelect(conv.id, isGroup ? { isGroup: true, groupName: conv.group_name, members: conv.group_members } : person)}
                                    className={clsx(
                                        'w-full flex items-center gap-4 px-4 py-4 rounded-[22px] transition-all relative group overflow-hidden',
                                        isActive
                                            ? 'bg-brand-red/[0.04] border border-brand-red/20 shadow-sm'
                                            : hasUnread
                                                ? 'bg-muted/80 border border-brand-red/20'
                                                : 'border border-transparent hover:bg-muted/40'
                                    )}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="chat-active-bar"
                                            className="absolute left-1 top-4 bottom-4 w-1 bg-brand-red rounded-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                        />
                                    )}

                                    {/* Avatar with unread ring */}
                                    <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
                                        {hasUnread && (
                                            <div className="absolute -inset-[3px] rounded-[20px] z-0 overflow-hidden">
                                                <div className="w-full h-full bg-gradient-to-br from-brand-red via-orange-500 to-red-600 animate-spin-slow" />
                                            </div>
                                        )}
                                        <div
                                            className="relative z-10 overflow-hidden shadow-md"
                                            style={{
                                                width: 56, height: 56,
                                                borderRadius: 18,
                                                border: hasUnread ? '3px solid hsl(var(--background))' : '2px solid hsl(var(--border))',
                                            }}
                                        >
                                            {isGroup
                                                ? <GroupAvatar members={conv.group_members || []} />
                                                : person?.avatar_url
                                                    ? <Image src={person.avatar_url} alt="" fill className="object-cover" />
                                                    : <div className="w-full h-full bg-muted flex items-center justify-center">
                                                        <span className="text-xl font-black text-brand-red opacity-30 italic">
                                                            {(person?.full_name || person?.username || '?')[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                            }
                                        </div>
                                        {isOnline && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full shadow-lg z-20" />
                                        )}
                                        {isGroup && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-muted border-2 border-background rounded-full flex items-center justify-center z-20 shadow-sm">
                                                <Users className="w-2.5 h-2.5 text-brand-red" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h4 className={clsx(
                                                'font-black italic uppercase text-sm truncate leading-none tracking-tight',
                                                hasUnread || isActive ? 'text-foreground' : 'text-muted-foreground'
                                            )}>
                                                {isGroup ? (conv.group_name || 'Grupo de Combate') : (person?.full_name || person?.username)}
                                            </h4>
                                            <span className={clsx(
                                                "text-[9px] font-black uppercase tracking-wider shrink-0 ml-2",
                                                hasUnread ? 'text-brand-red underline' : 'text-muted-foreground/40'
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
                                                "text-[11px] truncate flex-1 flex items-center gap-1.5 font-bold uppercase tracking-tight",
                                                preview?.accent ? 'text-purple-600 font-black italic' : hasUnread ? 'text-foreground' : 'text-muted-foreground/50'
                                            )}>
                                                {preview?.icon}
                                                {preview?.label || 'INVENTARIO DE MENSAJES VACÍO'}
                                            </p>
                                            {hasUnread && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="shrink-0 min-w-[22px] h-5.5 bg-brand-red text-white text-[10px] font-black rounded-lg flex items-center justify-center px-1.5 shadow-[0_4px_10px_rgba(220,38,38,0.3)]"
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
