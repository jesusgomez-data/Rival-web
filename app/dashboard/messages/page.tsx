'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import ChatList from './ChatList'
import ChatWindow from './ChatWindow'
import NewChatModal from './NewChatModal'
import GroupChatModal from './GroupChatModal'
import {
    getConversations, getMessages, sendMessage, getOrCreateConversation,
    getFriendsToChat, deleteMessage, editMessage, uploadChatImage, uploadChatVideo,
    uploadChatAudio,
    toggleMessageLike, deleteConversation, markConversationAsRead, createGroupConversation
} from './actions'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { Suspense } from 'react'
import { usePresence } from '../PresenceContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-brand-red w-12 h-12" /></div>}>
            <MessagesContent />
        </Suspense>
    )
}

function MessagesContent() {
    const searchParams = useSearchParams()
    const targetUserId = searchParams.get('userId')

    const [conversations, setConversations] = useState<any[]>([])
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [otherPerson, setOtherPerson] = useState<any>(null)
    const [isLoadingConversations, setIsLoadingConversations] = useState(true)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [otherParticipantLastRead, setOtherParticipantLastRead] = useState<string | null>(null)
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
    const [friends, setFriends] = useState<any[]>([])
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [myProfile, setMyProfile] = useState<any>(null)
    // Broadcast channel ref for instant message delivery (no CDC delay)
    const broadcastChannelRef = useRef<any>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const { onlineUsers } = usePresence()

    useEffect(() => {
        if (errorMsg) {
            const t = setTimeout(() => setErrorMsg(null), 4000)
            return () => clearTimeout(t)
        }
    }, [errorMsg])

    const supabase = createClient()

    const loadConversations = useCallback(async () => {
        const data = await getConversations()
        setConversations(data)
    }, [])

    const loadMessages = useCallback(async (id: string) => {
        setIsLoadingMessages(true)
        const { messages: msgs, lastReadAt } = await getMessages(id)
        setMessages(msgs)
        setOtherParticipantLastRead(lastReadAt)
        setIsLoadingMessages(false)
    }, [])

    const handleDeleteConversation = async () => {
        if (!activeConversationId) return
        const result = await deleteConversation(activeConversationId)
        if (result.success) {
            setActiveConversationId(null)
            setOtherPerson(null)
            setMessages([])
            setIsMobileListVisible(true)
            await loadConversations()
        }
    }

    useEffect(() => {
        const init = async () => {
            try {
                const { data: authData } = await supabase.auth.getUser()
                const user = authData?.user
                if (user) {
                    setCurrentUserId(user.id)
                    // Perfil, conversaciones y amigos no dependen entre sí — se piden en
                    // paralelo en vez de en cadena (esto era lo que hacía que entrar a
                    // Mensajes tardase varios segundos: 4 round-trips secuenciales).
                    const [{ data: prof }, , friendsData] = await Promise.all([
                        supabase.from('profiles').select('full_name, username, avatar_url').eq('id', user.id).single(),
                        loadConversations(),
                        getFriendsToChat()
                    ])
                    setMyProfile(prof)
                    setFriends(friendsData)

                    if (targetUserId) {
                        const result = await getOrCreateConversation(targetUserId)
                        if (result.conversationId) {
                            setActiveConversationId(result.conversationId)
                            const person = friendsData.find(f => f.id === targetUserId)
                            setOtherPerson(person || { full_name: 'Rival' })
                            setIsMobileListVisible(false)
                            await loadMessages(result.conversationId)
                            await markConversationAsRead(result.conversationId)
                            await loadConversations()
                        }
                    }
                }
            } catch (error) {
                console.error('Error init:', error)
            } finally {
                setIsLoadingConversations(false)
            }
        }
        init()
    }, [loadConversations, targetUserId, loadMessages])

    // Real-time: user's conversations updates
    useEffect(() => {
        if (!currentUserId) return
        const updatesChannel = supabase
            .channel(`user-updates-${currentUserId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${currentUserId}` },
                async () => { await loadConversations() })
            .subscribe()
        return () => { supabase.removeChannel(updatesChannel) }
    }, [currentUserId, loadConversations])

    // ── Real-time: instant message delivery via BROADCAST + CDC fallback ────────
    useEffect(() => {
        if (!activeConversationId) return

        // Clean up previous broadcast channel
        if (broadcastChannelRef.current) {
            supabase.removeChannel(broadcastChannelRef.current)
        }

        const channel = supabase
            .channel(`active-chat-${activeConversationId}`)
            // ── BROADCAST: instant delivery (no CDC delay) ──────────────────
            .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
                const msg = payload?.message
                if (!msg || msg.sender_id === currentUserId) return
                setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
                if (activeConversationId) {
                    markConversationAsRead(activeConversationId).catch(() => {})
                    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, unread_count: 0, last_message_text: msg.text || '', last_message_at: msg.created_at } : c))
                }
            })
            // ── BROADCAST: typing indicator ─────────────────────────────────
            // (typing is already handled inside ChatWindow, just keep channel open)
            // ── CDC fallback: catches edits, deletes, read receipts ─────────
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => {
                    const msg = payload.new
                    // Only add if broadcast didn't already add it
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev
                        if (msg.sender_id === currentUserId) {
                            const idx = prev.findIndex(m => m.id.toString().startsWith('temp-') && m.text === msg.text && m.sender_id === currentUserId)
                            if (idx !== -1) { const u = [...prev]; u[idx] = msg; return u }
                            return prev
                        }
                        return [...prev, msg]
                    })
                    if (msg.sender_id !== currentUserId && activeConversationId) {
                        markConversationAsRead(activeConversationId).catch(() => {})
                        setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, unread_count: 0 } : c))
                    }
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => { setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)) })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => { const id = payload.old?.id; if (id) setMessages(prev => prev.filter(m => m.id !== id)) })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => { if (payload.new.user_id !== currentUserId) setOtherParticipantLastRead(payload.new.last_read_at) })
            .subscribe()

        broadcastChannelRef.current = channel
        return () => { supabase.removeChannel(channel); broadcastChannelRef.current = null }
    }, [activeConversationId, currentUserId])

    const handleSelectConversation = async (id: string, person: any) => {
        try {
            setActiveConversationId(id)
            setOtherPerson(person)
            setIsMobileListVisible(false)
            await loadMessages(id)
            await markConversationAsRead(id)
            setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c))
            await loadConversations()
        } catch (err) {
            console.error("Error al seleccionar:", err)
        }
    }

    const handleSendMessage = async (
        text: string, imageUrl?: string, videoUrl?: string, isViewOnce?: boolean,
        documentUrl?: string, documentName?: string, audioUrl?: string, replyToId?: string, gifUrl?: string
    ) => {
        if (!activeConversationId) return

        const tempId = `temp-${Date.now()}-${Math.random()}`
        const tempMsg = {
            id: tempId,
            conversation_id: activeConversationId,
            sender_id: currentUserId,
            text,
            image_url: imageUrl || documentUrl || gifUrl || null,
            video_url: videoUrl || null,
            audio_url: audioUrl || null,
            reply_to_message_id: replyToId || null,
            is_view_once: isViewOnce || false,
            type: isViewOnce ? (videoUrl ? 'view_once_video' : 'view_once_image') : audioUrl ? 'audio' : gifUrl ? 'gif' : videoUrl ? 'video' : imageUrl ? 'image' : documentUrl ? 'document' : 'text',
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, tempMsg])

        const result = await sendMessage(
            activeConversationId, text, imageUrl, videoUrl, isViewOnce,
            documentUrl, documentName, audioUrl, replyToId, gifUrl
        )

        if (result.error) {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            setErrorMsg("No se pudo enviar el mensaje")
        } else {
            setMessages(prev => {
                if (prev.find(m => m.id === result.message.id)) return prev.filter(m => m.id !== tempId)
                return prev.map(m => m.id === tempId ? result.message : m)
            })
            // ── Broadcast for INSTANT delivery to recipient (no CDC lag) ──
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { message: result.message }
                }).catch(() => {})
            }
            await loadConversations()
        }
    }

    const handleNewChat = async (userId: string) => {
        setIsNewChatModalOpen(false)
        const result = await getOrCreateConversation(userId)
        if (result.conversationId) {
            await loadConversations()
            const person = friends.find(f => f.id === userId)
            handleSelectConversation(result.conversationId, person || { full_name: 'Nuevo Rival' })
        } else {
            setErrorMsg(result.error || "No se pudo iniciar el chat")
        }
    }

    const handleCreateGroup = async (name: string, memberIds: string[]) => {
        setIsGroupModalOpen(false)
        const result = await createGroupConversation(name, memberIds)
        if (result.conversationId) {
            await loadConversations()
            const members = friends.filter(f => memberIds.includes(f.id))
            handleSelectConversation(result.conversationId, { isGroup: true, groupName: name, members })
        } else {
            setErrorMsg(result.error || "No se pudo crear el grupo")
        }
    }

    const handleToggleLike = async (messageId: string, currentStatus: boolean) => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_liked: !currentStatus } : m))
        const result = await toggleMessageLike(messageId, currentStatus)
        if (result.error) {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_liked: currentStatus } : m))
        }
    }

    const filteredConversations = conversations.filter(conv => {
        const q = searchQuery.toLowerCase()
        if (!q) return true
        if (conv.is_group) return conv.group_name?.toLowerCase().includes(q)
        return conv.other_person?.full_name?.toLowerCase().includes(q) || conv.other_person?.username?.toLowerCase().includes(q)
    })

    if (isLoadingConversations) {
        return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-brand-red w-12 h-12" /></div>
    }

    const activeConv = conversations.find(c => c.id === activeConversationId)
    const isGroupChat = activeConv?.is_group

    return (
        <>
        {/* ── Desktop layout ── */}
        <div className="hidden md:flex h-[calc(100vh-140px)] bg-background text-foreground overflow-hidden rounded-[3rem] border border-border shadow-[0_20px_50px_rgba(0,0,0,0.1)] mx-auto max-w-[1600px] my-4">
            <div className="w-[360px] lg:w-[420px] shrink-0 border-r border-border flex flex-col">
                <ChatList conversations={filteredConversations} activeId={activeConversationId}
                    onSelect={handleSelectConversation} onSearch={setSearchQuery}
                    onNewChat={() => setIsNewChatModalOpen(true)} onNewGroup={() => setIsGroupModalOpen(true)}
                    myProfile={myProfile} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <ChatWindow messages={messages} otherPerson={otherPerson} currentUserId={currentUserId}
                    conversationId={activeConversationId} myProfile={myProfile} onSendMessage={handleSendMessage}
                    onUploadImage={uploadChatImage} onUploadVideo={uploadChatVideo} onUploadAudio={uploadChatAudio}
                    onDeleteMessage={deleteMessage} onEditMessage={editMessage}
                    onToggleLike={handleToggleLike} onDeleteConversation={handleDeleteConversation}
                    isLoading={isLoadingMessages} otherParticipantLastRead={otherParticipantLastRead}
                    onBack={() => setIsMobileListVisible(true)}
                    isOnline={isGroupChat ? false : (otherPerson ? onlineUsers.has(otherPerson.id) : false)} />
            </div>
        </div>

        {/* ── Mobile layout ── */}
        <div className="flex md:hidden flex-col h-[calc(100dvh-80px)] bg-[#0a0a0a] overflow-hidden">
            {/* Contact list */}
            <div className={clsx("flex-1 flex flex-col overflow-hidden", !isMobileListVisible && 'hidden')}>
                <ChatList conversations={filteredConversations} activeId={activeConversationId}
                    onSelect={handleSelectConversation} onSearch={setSearchQuery}
                    onNewChat={() => setIsNewChatModalOpen(true)} onNewGroup={() => setIsGroupModalOpen(true)}
                    myProfile={myProfile} />
            </div>

            {/* Full-screen chat — covers EVERYTHING on mobile */}
            <AnimatePresence>
            {!isMobileListVisible && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'tween', duration: 0.22 }}
                    className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a0a]"
                    style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <ChatWindow
                    messages={messages}
                    otherPerson={otherPerson}
                    currentUserId={currentUserId}
                    conversationId={activeConversationId}
                    onSendMessage={handleSendMessage}
                    onUploadImage={uploadChatImage}
                    onUploadVideo={uploadChatVideo}
                    onUploadAudio={uploadChatAudio}
                    onDeleteMessage={deleteMessage}
                    onEditMessage={editMessage}
                    onToggleLike={handleToggleLike}
                    onDeleteConversation={handleDeleteConversation}
                    isLoading={isLoadingMessages}
                    otherParticipantLastRead={otherParticipantLastRead}
                    onBack={() => setIsMobileListVisible(true)}
                    isOnline={isGroupChat ? false : (otherPerson ? onlineUsers.has(otherPerson.id) : false)}
                    myProfile={myProfile}
                />
                </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>

        {/* ── Modals (shared) ── */}
        <AnimatePresence>
            {isNewChatModalOpen && (
                <NewChatModal friends={friends} onClose={() => setIsNewChatModalOpen(false)} onSelect={handleNewChat} />
            )}
            {isGroupModalOpen && (
                <GroupChatModal friends={friends} onClose={() => setIsGroupModalOpen(false)} onCreate={handleCreateGroup} />
            )}
        </AnimatePresence>

        {/* ── Error toast ── */}
        <AnimatePresence>
            {errorMsg && (
                <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold uppercase italic text-xs tracking-widest border border-white/20 flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    {errorMsg}
                </motion.div>
            )}
        </AnimatePresence>
        </>
    )
}
