'use client'

import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Eye, Film, ImageIcon, Users, Plus, ChevronDown, ChevronRight, Star, MessageSquarePlus } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { usePresence } from '../PresenceContext'
import { useState } from 'react'
import { useTheme } from '../../ThemeContext'

interface ChatListProps {
    conversations: any[]
    activeId: string | null
    onSelect: (id: string, person: any) => void
    onSearch: (query: string) => void
    onNewChat: () => void
    onNewGroup: () => void
    myProfile?: any
}

// ── Avatar cuadrado MSN-style ─────────────────────────────────────────────────
function ContactAvatar({ person, isGroup, members, isOnline, hasUnread, size = 52 }: {
    person?: any; isGroup?: boolean; members?: any[]; isOnline?: boolean; hasUnread?: boolean; size?: number
}) {
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            {/* Unread: animated gradient ring */}
            {hasUnread && (
                <div className="absolute -inset-[2px] rounded-2xl z-0 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-brand-red via-orange-500 to-red-600 animate-spin-slow" />
                </div>
            )}
            {/* Square avatar with rounded corners */}
            <div
                className="relative z-10 overflow-hidden"
                style={{
                    width: size, height: size,
                    borderRadius: 14,
                    border: isOnline
                        ? '2.5px solid rgba(74,222,128,0.9)'
                        : hasUnread
                            ? '2px solid #0a0a0a'
                            : '1.5px solid rgba(255,255,255,0.08)',
                    boxShadow: isOnline ? '0 0 10px rgba(74,222,128,0.35)' : 'none',
                    background: '#111'
                }}
            >
                {isGroup ? (
                    <div className="w-full h-full bg-gradient-to-br from-brand-red/30 to-orange-600/30 flex items-center justify-center">
                        <Users className="text-brand-red/70" style={{ width: size * 0.45, height: size * 0.45 }} />
                    </div>
                ) : person?.avatar_url ? (
                    <Image src={person.avatar_url} alt="" fill className="object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-red to-orange-600 flex items-center justify-center">
                        <span className="text-white font-black" style={{ fontSize: size * 0.38 }}>
                            {(person?.full_name || person?.username || '?')[0].toUpperCase()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Preview text of last message ──────────────────────────────────────────────
function getPreview(conv: any) {
    const t = conv.last_message_text
    if (!t) return ''
    if (t === '👁 Ver una vez') return '📷 Ver una vez'
    if (t === '🎬 Video') return '🎬 Video'
    if (t === '📷 Imagen') return '📷 Foto'
    return t.length > 42 ? t.slice(0, 42) + '…' : t
}

// ── Collapsible group section ─────────────────────────────────────────────────
function GroupSection({ icon, label, online, total, open, onToggle, children, accent, dk }: {
    icon: React.ReactNode; label: string; online: number; total: number;
    open: boolean; onToggle: () => void; children: React.ReactNode; accent: string; dk?: boolean;
}) {
    return (
        <div>
            <button
                onClick={onToggle}
                className={clsx("w-full flex items-center gap-2 px-4 py-2.5 transition-colors", dk ? "hover:bg-white/[0.03]" : "hover:bg-gray-50")}
            >
                <span className="shrink-0">{icon}</span>
                <span className={clsx("font-black text-sm tracking-tight", dk ? "text-white/70" : "text-gray-600")}>{label}</span>
                <span className="text-[11px] font-bold ml-0.5" style={{ color: accent }}>
                    ({online}/{total})
                </span>
                <div className={clsx("flex-1 h-px mx-2", dk ? "bg-white/[0.04]" : "bg-gray-200")} />
                {open
                    ? <ChevronDown className={clsx("w-3.5 h-3.5 shrink-0", dk ? "text-white/20" : "text-gray-300")} />
                    : <ChevronRight className={clsx("w-3.5 h-3.5 shrink-0", dk ? "text-white/20" : "text-gray-300")} />
                }
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ── Single contact row ────────────────────────────────────────────────────────
function ContactRow({ conv, isOnline, activeId, onSelect, dk }: {
    conv: any; isOnline: boolean;
    activeId: string | null;
    onSelect: (id: string, person: any) => void;
    dk?: boolean;
}) {
    const isActive = activeId === conv.id
    const person = conv.other_person
    const isGroup = conv.is_group
    const hasUnread = conv.unread_count > 0
    const preview = getPreview(conv)
    const timeAgo = conv.last_message_at
        ? formatDistanceToNow(new Date(conv.last_message_at), { locale: es })
            .replace('hace ', '').replace('menos de un minuto', 'ahora')
        : ''

    return (
        <button
            onClick={() => onSelect(conv.id, isGroup
                ? { isGroup: true, groupName: conv.group_name, members: conv.group_members }
                : person
            )}
            className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 transition-colors relative',
                isActive
                    ? 'bg-brand-red/10'
                    : hasUnread
                        ? dk ? 'bg-white/[0.025] hover:bg-white/[0.04]' : 'bg-red-50 hover:bg-red-50/70'
                        : dk ? 'hover:bg-white/[0.025]' : 'hover:bg-gray-50'
            )}
        >
            {/* Active indicator */}
            {isActive && <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-brand-red rounded-r-full" />}

            <ContactAvatar
                person={person}
                isGroup={isGroup}
                members={conv.group_members}
                isOnline={isOnline}
                hasUnread={hasUnread}
                size={52}
            />

            <div className="flex-1 min-w-0 text-left">
                {/* Name + time */}
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={clsx(
                        'text-[13px] font-black truncate leading-tight',
                        isActive || hasUnread
                            ? dk ? 'text-white' : 'text-gray-900'
                            : isOnline
                                ? dk ? 'text-white/80' : 'text-gray-700'
                                : dk ? 'text-white/45' : 'text-gray-400'
                    )}>
                        {isGroup ? (conv.group_name || 'Grupo') : (person?.full_name || person?.username || '?')}
                    </span>
                    {timeAgo && (
                        <span className={clsx('text-[10px] font-medium shrink-0', hasUnread ? 'text-brand-red' : dk ? 'text-white/15' : 'text-gray-300')}>
                            {timeAgo}
                        </span>
                    )}
                </div>
                {/* Preview text */}
                <span className={clsx(
                    'text-[11px] truncate block leading-tight',
                    hasUnread ? 'text-brand-red/80 font-semibold' : dk ? 'text-white/25' : 'text-gray-400'
                )}>
                    {preview || (isOnline ? '● En línea' : '○ Sin conexión')}
                </span>
            </div>

            {/* Unread badge */}
            {hasUnread && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="shrink-0 min-w-[20px] h-5 bg-brand-red text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 shadow-glow">
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                </motion.div>
            )}
        </button>
    )
}

// ── Main ChatList ─────────────────────────────────────────────────────────────
export default function ChatList({ conversations, activeId, onSearch, onSelect, onNewChat, onNewGroup, myProfile }: ChatListProps) {
    const { onlineUsers } = usePresence()
    const { theme } = useTheme()
    const dk = theme === 'dark'
    const [myStatus, setMyStatus] = useState('')
    const [favOpen, setFavOpen] = useState(true)
    const [onlineOpen, setOnlineOpen] = useState(true)
    const [offlineOpen, setOfflineOpen] = useState(false)
    const [groupsOpen, setGroupsOpen] = useState(false)

    // Separate conversations
    const groups = conversations.filter(c => c.is_group)
    const dms = conversations.filter(c => !c.is_group)
    const onlineConvs = dms.filter(c => c.other_person?.id && onlineUsers.has(c.other_person.id))
    const offlineConvs = dms.filter(c => !c.other_person?.id || !onlineUsers.has(c.other_person.id))

    // "Favorites" = contacts with unread messages (like MSN favorites = recent active)
    const favorites = [...onlineConvs, ...offlineConvs.filter(c => c.unread_count > 0)].slice(0, 5)

    return (
        <div className={clsx("flex flex-col h-full", dk ? "bg-[#0a0a0a]" : "bg-white")}>

            {/* ── MY PROFILE — MSN mobile header ── */}
            <div className="shrink-0" style={{ background: dk ? 'linear-gradient(180deg, #200808 0%, #140404 100%)' : 'linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)' }}>
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    {/* My avatar — square with green online border */}
                    <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-[2.5px] border-green-400/80 shadow-[0_0_12px_rgba(74,222,128,0.4)] relative">
                            {myProfile?.avatar_url
                                ? <Image src={myProfile.avatar_url} alt="" fill className="object-cover" />
                                : <div className="w-full h-full bg-gradient-to-br from-brand-red to-orange-600 flex items-center justify-center">
                                    <span className="text-white font-black text-xl">{(myProfile?.full_name || 'Y')[0]}</span>
                                </div>
                            }
                        </div>
                        <div className={clsx("absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.9)]", dk ? "border-2 border-[#140404]" : "border-2 border-white")} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={clsx("font-black text-base leading-tight truncate", dk ? "text-white" : "text-gray-900")}>
                                {myProfile?.full_name || 'Atleta'}
                            </span>
                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider shrink-0">Activo</span>
                        </div>
                        <input
                            type="text"
                            value={myStatus}
                            onChange={e => setMyStatus(e.target.value)}
                            placeholder="¿Cuál es tu estado?"
                            maxLength={60}
                            className={clsx("w-full bg-transparent text-[11px] italic focus:outline-none transition-colors mt-0.5", dk ? "text-white/35 placeholder:text-white/20 focus:text-white/70" : "text-gray-400 placeholder:text-gray-300 focus:text-gray-600")}
                        />
                    </div>

                    {/* New chat button */}
                    <button onClick={onNewChat}
                        className="w-9 h-9 rounded-xl bg-brand-red flex items-center justify-center shadow-glow hover:bg-red-600 active:scale-90 transition-all shrink-0">
                        <Plus className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="px-4 pb-3">
                    <div className={clsx("flex items-center gap-2 rounded-xl px-3 py-2.5 border", dk ? "bg-black/50 border-white/[0.08]" : "bg-gray-100 border-gray-200")}>
                        <Search className={clsx("w-4 h-4 shrink-0", dk ? "text-white/25" : "text-gray-400")} />
                        <input
                            type="text"
                            placeholder="Buscar contacto..."
                            onChange={e => onSearch(e.target.value)}
                            className={clsx("flex-1 bg-transparent text-sm focus:outline-none font-medium", dk ? "text-white/80 placeholder:text-white/20" : "text-gray-700 placeholder:text-gray-400")}
                        />
                        <button onClick={onNewGroup} className={clsx("shrink-0 hover:text-brand-red transition-colors", dk ? "text-white/20" : "text-gray-400")}>
                            <Users className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CONTACT GROUPS ── */}
            <div className={clsx("flex-1 overflow-y-auto custom-scrollbar", dk ? "bg-[#0a0a0a]" : "bg-white")}>
                {conversations.length === 0 ? (
                    <div className="py-16 text-center px-6">
                        <div className="text-5xl mb-3">💬</div>
                        <p className={clsx("text-sm font-bold uppercase tracking-widest", dk ? "text-white/25" : "text-gray-400")}>Sin contactos</p>
                        <button onClick={onNewChat}
                            className="mt-4 px-6 py-2.5 bg-brand-red text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 active:scale-95 transition-all shadow-glow">
                            Nuevo Chat
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ⭐ Favoritos — unread + online (MSN favorites section) */}
                        {favorites.length > 0 && (
                            <GroupSection
                                icon={<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                                label="Favoritos"
                                online={favorites.filter(c => c.other_person?.id && onlineUsers.has(c.other_person.id)).length}
                                total={favorites.length}
                                open={favOpen}
                                onToggle={() => setFavOpen(v => !v)}
                                accent="#facc15"
                                dk={dk}
                            >
                                {favorites.map(conv => (
                                    <ContactRow key={conv.id} conv={conv}
                                        isOnline={!conv.is_group && conv.other_person?.id && onlineUsers.has(conv.other_person.id)}
                                        activeId={activeId} onSelect={onSelect} dk={dk} />
                                ))}
                            </GroupSection>
                        )}

                        {/* 🟢 En línea */}
                        {onlineConvs.length > 0 && (
                            <GroupSection
                                icon={<span className="w-3 h-3 rounded-full bg-green-400 inline-block shadow-[0_0_6px_rgba(74,222,128,0.7)]" />}
                                label="En línea"
                                online={onlineConvs.length}
                                total={dms.length}
                                open={onlineOpen}
                                onToggle={() => setOnlineOpen(v => !v)}
                                accent="#4ade80"
                                dk={dk}
                            >
                                {onlineConvs.map(conv => (
                                    <ContactRow key={conv.id} conv={conv} isOnline
                                        activeId={activeId} onSelect={onSelect} dk={dk} />
                                ))}
                            </GroupSection>
                        )}

                        {/* ⚫ Sin conexión */}
                        {offlineConvs.length > 0 && (
                            <GroupSection
                                icon={<span className={clsx("w-3 h-3 rounded-full inline-block", dk ? "bg-white/15" : "bg-gray-300")} />}
                                label="Sin conexión"
                                online={0}
                                total={offlineConvs.length}
                                open={offlineOpen}
                                onToggle={() => setOfflineOpen(v => !v)}
                                accent={dk ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                                dk={dk}
                            >
                                {offlineConvs.map(conv => (
                                    <ContactRow key={conv.id} conv={conv} isOnline={false}
                                        activeId={activeId} onSelect={onSelect} dk={dk} />
                                ))}
                            </GroupSection>
                        )}

                        {/* 👥 Grupos */}
                        {groups.length > 0 && (
                            <GroupSection
                                icon={<Users className="w-4 h-4 text-brand-red" />}
                                label="Grupos"
                                online={groups.length}
                                total={groups.length}
                                open={groupsOpen}
                                onToggle={() => setGroupsOpen(v => !v)}
                                accent="#ef4444"
                                dk={dk}
                            >
                                {groups.map(conv => (
                                    <ContactRow key={conv.id} conv={conv} isOnline={false}
                                        activeId={activeId} onSelect={onSelect} dk={dk} />
                                ))}
                            </GroupSection>
                        )}

                        {/* Padding final */}
                        <div className="h-6" />
                    </>
                )}
            </div>
        </div>
    )
}
