'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendServiceMessage } from '@/app/dashboard/gyms/professional-service-actions'
import { BOOKING_STATUS_LABELS, SERVICE_MODALITIES } from '@/lib/professional-types'
import { Send, ArrowLeft, Clock, Euro, Calendar, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

interface Message {
    id: string
    content: string
    sender_id: string
    created_at: string
    sender?: { id: string; full_name: string; avatar_url: string | null }
}

interface Props {
    conversationId: string
    booking: any
    initialMessages: Message[]
    currentUserId: string
    isClient: boolean
    professional: { id: string; name: string | null; avatar: string | null }
    client: { id: string; name: string | null; avatar: string | null }
}

export default function BookingChat({
    conversationId, booking, initialMessages,
    currentUserId, isClient, professional, client
}: Props) {
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const supabase = createClient()

    const other = isClient ? professional : client
    const statusInfo = BOOKING_STATUS_LABELS[booking.status] || { label: booking.status, color: 'gray' }
    const modality = SERVICE_MODALITIES.find(m => m.key === booking.modality)
    const backHref = isClient ? '/dashboard/my-bookings' : `/dashboard/gyms/${professional.id}/bookings`

    // Supabase Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'service_messages', filter: `conversation_id=eq.${conversationId}` },
                async (payload: { new: Record<string, unknown> }) => {
                    const msg = payload.new as unknown as Message
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev
                        // Replace the matching optimistic message instead of appending a duplicate
                        const optIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.sender_id === msg.sender_id && m.content === msg.content)
                        const next = optIdx !== -1
                            ? prev.map((m, i) => i === optIdx ? msg : m)
                            : [...prev, msg]
                        // Fetch sender profile
                        supabase.from('profiles').select('id, full_name, avatar_url').eq('id', msg.sender_id).single()
                            .then((result: { data: { id: string; full_name: string; avatar_url: string | null } | null }) => {
                                setMessages(prev2 => prev2.map(m =>
                                    m.id === msg.id ? { ...m, sender: result.data || undefined } : m
                                ))
                            })
                        return next
                    })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [conversationId, supabase])

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function handleSend() {
        const text = input.trim()
        if (!text || sending) return

        setSending(true)
        setInput('')

        // Optimistic message
        const optimistic: Message = {
            id: `opt-${Date.now()}`,
            content: text,
            sender_id: currentUserId,
            created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimistic])

        const res = await sendServiceMessage(conversationId, text)
        if (res.error) {
            // Rollback optimistic
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
            setInput(text)
        }
        setSending(false)
        inputRef.current?.focus()
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    function groupByDate(msgs: Message[]) {
        const groups: { date: string; items: Message[] }[] = []
        for (const msg of msgs) {
            const d = new Date(msg.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
            const last = groups[groups.length - 1]
            if (last && last.date === d) last.items.push(msg)
            else groups.push({ date: d, items: [msg] })
        }
        return groups
    }

    function getAvatar(msg: Message) {
        const isMine = msg.sender_id === currentUserId
        const src = isMine
            ? (isClient ? null : professional.avatar)
            : (isClient ? professional.avatar : client.avatar)
        const name = isMine
            ? 'Tú'
            : (other.name || '?')
        return { src, name }
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-black">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-black/80 backdrop-blur-sm">
                <Link href={backHref} className="text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>

                {other.avatar
                    ? <img src={other.avatar} className="w-9 h-9 rounded-xl object-cover" alt={other.name || ''} />
                    : <div className="w-9 h-9 rounded-xl bg-brand-red/20 flex items-center justify-center text-brand-red font-black text-sm">
                        {(other.name || '?')[0]}
                      </div>
                }

                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{other.name}</p>
                    <p className="text-gray-500 text-xs truncate">{booking.service_name}</p>
                </div>

                <span className={clsx(
                    'text-[9px] font-black px-2 py-1 rounded-full flex-shrink-0',
                    statusInfo.color === 'green'  ? 'bg-green-500/10 text-green-400'  :
                    statusInfo.color === 'blue'   ? 'bg-blue-500/10 text-blue-400'    :
                    statusInfo.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-400':
                    statusInfo.color === 'purple' ? 'bg-purple-500/10 text-purple-400':
                    'bg-gray-500/10 text-gray-400'
                )}>
                    {statusInfo.label}
                </span>
            </div>

            {/* Booking info bar */}
            <div className="shrink-0 flex gap-4 px-4 py-2 bg-white/2 border-b border-white/5 text-xs text-gray-500 overflow-x-auto no-scrollbar">
                <span className="flex items-center gap-1 flex-shrink-0"><Euro className="w-3 h-3" /> €{Number(booking.service_price).toFixed(2)}</span>
                <span className="flex items-center gap-1 flex-shrink-0"><Clock className="w-3 h-3" /> {booking.duration_minutes} min</span>
                {modality && <span className="flex-shrink-0">{modality.icon} {modality.label}</span>}
                {booking.scheduled_at && (
                    <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="w-3 h-3" />
                        {new Date(booking.scheduled_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
                        <p className="text-sm font-bold">Empieza la conversación</p>
                        <p className="text-xs">Usa el chat para coordinar todos los detalles</p>
                    </div>
                )}

                {groupByDate(messages).map(group => (
                    <div key={group.date}>
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-white/5" />
                            <span className="text-[10px] text-gray-600 font-bold">{group.date}</span>
                            <div className="flex-1 h-px bg-white/5" />
                        </div>

                        {group.items.map((msg, idx) => {
                            const isMine = msg.sender_id === currentUserId
                            const { src, name } = getAvatar(msg)
                            const prevMsg = group.items[idx - 1]
                            const sameAuthor = prevMsg && prevMsg.sender_id === msg.sender_id
                            const isOptimistic = msg.id.startsWith('opt-')

                            return (
                                <div key={msg.id} className={clsx('flex gap-2 items-end', isMine ? 'flex-row-reverse' : 'flex-row', sameAuthor ? 'mt-0.5' : 'mt-3')}>
                                    {/* Avatar — only show for first in a run */}
                                    <div className="w-7 h-7 flex-shrink-0">
                                        {!sameAuthor && (
                                            src
                                                ? <img src={src} className="w-7 h-7 rounded-lg object-cover" alt={name} />
                                                : <div className="w-7 h-7 rounded-lg bg-brand-red/20 flex items-center justify-center text-brand-red font-black text-[10px]">
                                                    {name[0]}
                                                  </div>
                                        )}
                                    </div>

                                    <div className={clsx('max-w-[75%] space-y-0.5', isMine ? 'items-end' : 'items-start', 'flex flex-col')}>
                                        <div className={clsx(
                                            'px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words',
                                            isMine
                                                ? 'bg-brand-red text-white rounded-br-sm'
                                                : 'bg-white/8 text-gray-100 rounded-bl-sm'
                                        )}>
                                            {msg.content}
                                        </div>
                                        <span className={clsx('text-[10px] text-gray-600 flex items-center gap-1', isMine ? 'flex-row-reverse' : '')}>
                                            {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                            {isMine && !isOptimistic && <CheckCheck className="w-3 h-3 text-gray-600" />}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 py-3 border-t border-white/8 bg-black/80 backdrop-blur-sm">
                {['completed', 'paid_out', 'cancelled', 'rejected', 'disputed'].includes(booking.status) ? (
                    <p className="text-center text-gray-600 text-xs py-2">Esta conversación está cerrada</p>
                ) : (
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe un mensaje... (Enter para enviar)"
                            rows={1}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-red/40 resize-none leading-relaxed max-h-32 overflow-y-auto"
                            style={{ fieldSizing: 'content' } as any}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || sending}
                            className="w-10 h-10 bg-brand-red hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center transition-colors shrink-0"
                        >
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
