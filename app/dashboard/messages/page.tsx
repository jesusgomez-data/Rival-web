'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import ChatList from './ChatList'
import ChatWindow from './ChatWindow'
import NewChatModal from './NewChatModal'
import GroupChatModal from './GroupChatModal'
import {
    getConversations, getMessages, sendMessage, getOrCreateConversation,
    getFriendsToChat, deleteMessage, editMessage, uploadChatImage, uploadChatVideo,
    toggleMessageLike, deleteConversation, markConversationAsRead, createGroupConversation
} from './actions'
import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { Suspense } from 'react'
import { usePresence } from '../PresenceContext'
import { AnimatePresence } from 'framer-motion'

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#060606]"><Loader2 className="animate-spin text-brand-red w-10 h-10" /></div>}>
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
    const [searchQuery, setSearchQuery] = useState('')
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)
    const { onlineUsers } = usePresence()

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
                    await loadConversations()
                    const friendsData = await getFriendsToChat()
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

    // Real-time: active chat messages
    useEffect(() => {
        if (!activeConversationId) return

        const channel = supabase
            .channel(`active-chat-${activeConversationId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => {
                    const newMessage = payload.new
                    if (newMessage.sender_id !== currentUserId && activeConversationId) {
                        markConversationAsRead(activeConversationId).then(() => {
                            setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, unread_count: 0 } : c))
                        })
                    }
                    setMessages(prev => {
                        if (prev.find(m => m.id === newMessage.id)) return prev
                        if (newMessage.sender_id === currentUserId) {
                            const tempIdx = prev.findIndex(m => m.sender_id === currentUserId && m.text === newMessage.text && m.id.toString().startsWith('temp-'))
                            if (tempIdx !== -1) { const u = [...prev]; u[tempIdx] = newMessage; return u }
                            return prev
                        }
                        return [...prev, newMessage]
                    })
                })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => { setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)) })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => { const id = payload.old?.id; if (id) setMessages(prev => prev.filter(m => m.id !== id)) })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter: `conversation_id=eq.${activeConversationId}` },
                (payload: any) => { if (payload.new.user_id !== currentUserId) setOtherParticipantLastRead(payload.new.last_read_at) })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeConversationId, currentUserId, loadConversations])

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

    const handleSendMessage = async (text: string, imageUrl?: string, videoUrl?: string, isViewOnce?: boolean) => {
        if (!activeConversationId) return

        const tempId = `temp-${Date.now()}-${Math.random()}`
        const tempMsg = {
            id: tempId,
            conversation_id: activeConversationId,
            sender_id: currentUserId,
            text,
            image_url: imageUrl,
            video_url: videoUrl,
            is_view_once: isViewOnce || false,
            type: isViewOnce ? (videoUrl ? 'view_once_video' : 'view_once_image') : videoUrl ? 'video' : imageUrl ? 'image' : 'text',
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, tempMsg])

        const result = await sendMessage(activeConversationId, text, imageUrl, videoUrl, isViewOnce)

        if (result.error) {
            setMessages(prev => prev.filter(m => m.id !== tempId))
        } else {
            setMessages(prev => {
                if (prev.find(m => m.id === result.message.id)) return prev.filter(m => m.id !== tempId)
                return prev.map(m => m.id === tempId ? result.message : m)
            })
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
        }
    }

    const handleCreateGroup = async (name: string, memberIds: string[]) => {
        setIsGroupModalOpen(false)
        const result = await createGroupConversation(name, memberIds)
        if (result.conversationId) {
            await loadConversations()
            const members = friends.filter(f => memberIds.includes(f.id))
            handleSelectConversation(result.conversationId, { isGroup: true, groupName: name, members })
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
        return <div className="h-screen flex items-center justify-center bg-[#060606]"><Loader2 className="animate-spin text-brand-red w-10 h-10" /></div>
    }

    const activeConv = conversations.find(c => c.id === activeConversationId)
    const isGroupChat = activeConv?.is_group

    return (
        <div className="h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] bg-[#060606] flex text-white overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-white/[0.05] shadow-2xl mx-auto max-w-[1600px] my-0 md:my-4">

            {/* Sidebar */}
            <div className={clsx(
                "w-full md:w-[340px] lg:w-[400px] shrink-0 border-r border-white/[0.05] flex flex-col",
                !isMobileListVisible ? 'hidden md:flex' : 'flex'
            )}>
                <ChatList
                    conversations={filteredConversations}
                    activeId={activeConversationId}
                    onSelect={handleSelectConversation}
                    onSearch={setSearchQuery}
                    onNewChat={() => setIsNewChatModalOpen(true)}
                    onNewGroup={() => setIsGroupModalOpen(true)}
                />
            </div>

            {/* Chat window */}
            <div className={clsx(
                "flex-1 flex flex-col overflow-hidden",
                !isMobileListVisible
                    ? "fixed inset-0 z-[110] bg-[#060606] animate-in slide-in-from-right duration-300 lg:relative lg:inset-auto lg:z-auto lg:animate-none"
                    : "hidden md:flex"
            )}>
                <ChatWindow
                    messages={messages}
                    otherPerson={otherPerson}
                    currentUserId={currentUserId}
                    conversationId={activeConversationId}
                    onSendMessage={handleSendMessage}
                    onUploadImage={uploadChatImage}
                    onUploadVideo={uploadChatVideo}
                    onDeleteMessage={deleteMessage}
                    onEditMessage={editMessage}
                    onToggleLike={handleToggleLike}
                    onDeleteConversation={handleDeleteConversation}
                    isLoading={isLoadingMessages}
                    otherParticipantLastRead={otherParticipantLastRead}
                    onBack={() => setIsMobileListVisible(true)}
                    isOnline={isGroupChat ? false : (otherPerson ? onlineUsers.has(otherPerson.id) : false)}
                />
            </div>

            {/* Modals */}
            <AnimatePresence>
                {isNewChatModalOpen && (
                    <NewChatModal
                        friends={friends}
                        onClose={() => setIsNewChatModalOpen(false)}
                        onSelect={handleNewChat}
                    />
                )}
                {isGroupModalOpen && (
                    <GroupChatModal
                        friends={friends}
                        onClose={() => setIsGroupModalOpen(false)}
                        onCreate={handleCreateGroup}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
