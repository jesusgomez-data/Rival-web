'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import ChatList from './ChatList'
import ChatWindow from './ChatWindow'
import NewChatModal from './NewChatModal'
import { getConversations, getMessages, sendMessage, getOrCreateConversation, getFriendsToChat, deleteMessage, editMessage, uploadChatImage, toggleMessageLike, deleteConversation, markConversationAsRead } from './actions'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { Suspense } from 'react'
import { usePresence } from '../PresenceContext'
import { useLanguage } from '@/app/LanguageContext'

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-brand-red w-10 h-10" /></div>}>
            <MessagesContent />
        </Suspense>
    )
}

function MessagesContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const targetUserId = searchParams.get('userId')

    const [conversations, setConversations] = useState<any[]>([])
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [otherPerson, setOtherPerson] = useState<any>(null)
    const [isLoadingConversations, setIsLoadingConversations] = useState(true)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [otherParticipantLastRead, setOtherParticipantLastRead] = useState<string | null>(null)
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
    const [friends, setFriends] = useState<any[]>([])
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)
    const { onlineUsers } = usePresence()

    const supabase = createClient()

    // Sound effect for new messages
    const playNotificationSound = useCallback(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')
        audio.volume = 0.5
        audio.play().catch(e => console.log('Audio play blocked:', e))
    }, [])

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
        if (!activeConversationId) return;

        const result = await deleteConversation(activeConversationId);
        if (result.success) {
            setActiveConversationId(null);
            setOtherPerson(null);
            setMessages([]);
            setIsMobileListVisible(true);
            await loadConversations();
        } else {
            alert(`Error: ${result.error}`);
        }
    }

    useEffect(() => {
        const init = async () => {
            try {
                // Pedir permiso para notificaciones
                if (typeof Notification !== 'undefined' && Notification.permission === "default") {
                    Notification.requestPermission()
                }

                const { data: authData } = await supabase.auth.getUser()
                const user = authData?.user
                if (user) {
                    setCurrentUserId(user.id)
                    await loadConversations()
                    const friendsData = await getFriendsToChat()
                    setFriends(friendsData)

                    // Si hay un userId en la URL, cargar esa conversación automáticamente
                    if (targetUserId) {
                        const result = await getOrCreateConversation(targetUserId)
                        if (result.conversationId) {
                            setActiveConversationId(result.conversationId)
                            // Buscar a la persona en amigos o cargar sus datos básicos
                            const person = friendsData.find(f => f.id === targetUserId)
                            setOtherPerson(person || { full_name: 'Direct Match' })
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

    // NOTIFICACIONES EN TIEMPO REAL
    useEffect(() => {
        if (!currentUserId) return

        // Global Updates & Sound
        const updatesChannel = supabase
            .channel(`user-updates-${currentUserId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversation_participants',
                filter: `user_id=eq.${currentUserId}`
            }, async () => {
                await loadConversations()
            })
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, async (payload: any) => {
                const newMessage = payload.new
                // Solo sonar si el mensaje pertenece a una conversación del usuario
                // y no es un mensaje enviado por él mismo
                if (newMessage.sender_id !== currentUserId) {
                    playNotificationSound()
                }
                await loadConversations()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(updatesChannel)
        }
    }, [currentUserId, loadConversations, playNotificationSound])

    // ACTUALIZACIÓN DE LA VENTANA DE CHAT ACTIVA
    useEffect(() => {
        if (!activeConversationId) return

        const channel = supabase
            .channel(`active-chat-${activeConversationId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload: any) => {
                const newMessage = payload.new

                // Si el chat está activo y el mensaje es de la otra persona, marcar como leído
                if (newMessage.sender_id !== currentUserId && activeConversationId) {
                    markConversationAsRead(activeConversationId).then(() => {
                        loadConversations() // Recargar para limpiar notificación en lista
                    })
                }

                setMessages(prev => {
                    // 1. Evitar duplicado exacto por ID
                    if (prev.find(m => m.id === newMessage.id)) return prev

                    // 2. Si es nuestro, buscar el mensaje temporal por contenido reciente
                    // Esto evita el duplicado instantáneo que ocurre al recibir el evento
                    // de un mensaje que nosotros mismos acabamos de enviar
                    if (newMessage.sender_id === currentUserId) {
                        const tempMsgIndex = prev.findIndex(m =>
                            m.sender_id === currentUserId &&
                            m.text === newMessage.text &&
                            m.id.toString().startsWith('temp-')
                        )

                        if (tempMsgIndex !== -1) {
                            const updatedMsgs = [...prev]
                            updatedMsgs[tempMsgIndex] = newMessage
                            return updatedMsgs
                        }

                        // Si ya está el mensaje real pero sin ID temporal (raro pero posible)
                        // no lo añadimos de nuevo
                        return prev
                    }

                    return [...prev, newMessage]
                })
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload: any) => {
                setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload: any) => {
                // Nota: DELETE payload.old o payload.new depende de la réplica, usualmente old.id
                const deletedId = payload.old?.id
                if (deletedId) {
                    setMessages(prev => prev.filter(m => m.id !== deletedId))
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'conversation_participants',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload: any) => {
                // Si la otra persona ha leído, actualizamos su timestamp
                if (payload.new.user_id !== currentUserId) {
                    setOtherParticipantLastRead(payload.new.last_read_at)
                }
            })
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
            await loadConversations()
        } catch (err) {
            console.error("Error al seleccionar:", err)
        }
    }

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        if (!activeConversationId) return

        // Optimistic UI: Añadir el mensaje localmente rápido
        const tempId = `temp-${Date.now()}-${Math.random()}`
        const tempMsg = {
            id: tempId,
            conversation_id: activeConversationId,
            sender_id: currentUserId,
            text,
            image_url: imageUrl,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, tempMsg])

        const result = await sendMessage(activeConversationId, text, imageUrl)

        if (result.error) {
            setMessages(prev => prev.filter(m => m.id !== tempId))
            alert(`Error al enviar: ${result.error}`)
        } else {
            // Reemplazar mensaje temporal con el real de forma segura
            setMessages(prev => {
                // Si el listener ya lo reemplazó o lo añadió por ID real
                if (prev.find(m => m.id === result.message.id)) {
                    return prev.filter(m => m.id !== tempId)
                }
                // Si no, reemplazamos el temporal
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
        } else {
            alert(`Error: ${result.error}`)
        }
    }

    const handleToggleLike = async (messageId: string, currentStatus: boolean) => {
        // Optimistic update
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_liked: !currentStatus } : m))

        const result = await toggleMessageLike(messageId, currentStatus)
        if (result.error) {
            // Revert on error
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_liked: currentStatus } : m))
            console.error("Error toggling like:", result.error)
        }
    }

    const filteredConversations = conversations.filter(conv =>
        conv.other_person?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.other_person?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoadingConversations) {
        return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-brand-red w-10 h-10" /></div>
    }

    return (
        <div className="h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] bg-background flex text-foreground overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-border shadow-2xl mx-auto max-w-[1600px] my-0 md:my-4 transition-all duration-500">
            <div className={clsx(
                "w-full md:w-[350px] lg:w-[420px] shrink-0 border-r border-border flex flex-col bg-card",
                !isMobileListVisible ? 'hidden md:flex' : 'flex'
            )}>
                <ChatList
                    conversations={filteredConversations}
                    activeId={activeConversationId}
                    onSelect={handleSelectConversation}
                    onSearch={setSearchQuery}
                    onNewChat={() => setIsNewChatModalOpen(true)}
                />
            </div>

            <div className={clsx(
                "flex-1 flex flex-col transition-all duration-300 bg-background overflow-hidden",
                !isMobileListVisible
                    ? "fixed inset-0 z-[110] bg-background animate-in slide-in-from-right duration-300 lg:relative lg:inset-auto lg:z-auto lg:animate-none top-0 bottom-0 left-0 right-0"
                    : "hidden md:flex"
            )}>
                <ChatWindow
                    messages={messages}
                    otherPerson={otherPerson}
                    currentUserId={currentUserId}
                    onSendMessage={handleSendMessage}
                    onUploadImage={uploadChatImage}
                    onDeleteMessage={deleteMessage}
                    onEditMessage={editMessage}
                    onToggleLike={handleToggleLike}
                    onDeleteConversation={handleDeleteConversation}
                    isLoading={isLoadingMessages}
                    otherParticipantLastRead={otherParticipantLastRead}
                    onBack={() => setIsMobileListVisible(true)}
                    isOnline={otherPerson ? onlineUsers.has(otherPerson.id) : false}
                />
            </div>

            {isNewChatModalOpen && (
                <NewChatModal
                    friends={friends}
                    onClose={() => setIsNewChatModalOpen(false)}
                    onSelect={handleNewChat}
                />
            )}
        </div>
    )
}
