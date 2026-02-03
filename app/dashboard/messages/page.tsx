'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import ChatList from './ChatList'
import ChatWindow from './ChatWindow'
import NewChatModal from './NewChatModal'
import { getConversations, getMessages, sendMessage, getOrCreateConversation, getFriendsToChat, deleteMessage, editMessage, uploadChatImage } from './actions'
import { Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

export default function MessagesPage() {
    const [conversations, setConversations] = useState<any[]>([])
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [otherPerson, setOtherPerson] = useState<any>(null)
    const [isLoadingConversations, setIsLoadingConversations] = useState(true)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
    const [friends, setFriends] = useState<any[]>([])
    const [currentUserId, setCurrentUserId] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [isMobileListVisible, setIsMobileListVisible] = useState(true)

    const supabase = createClient()

    const loadConversations = useCallback(async () => {
        const data = await getConversations()
        setConversations(data)
    }, [])

    const loadMessages = useCallback(async (id: string) => {
        setIsLoadingMessages(true)
        const data = await getMessages(id)
        setMessages(data)
        setIsLoadingMessages(false)
    }, [])

    useEffect(() => {
        const init = async () => {
            try {
                // Pedir permiso para notificaciones
                if ("Notification" in window && Notification.permission === "default") {
                    Notification.requestPermission()
                }

                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    setCurrentUserId(user.id)
                    await loadConversations()
                    const friendsData = await getFriendsToChat()
                    setFriends(friendsData)
                }
            } catch (error) {
                console.error('Error init:', error)
            } finally {
                setIsLoadingConversations(false)
            }
        }
        init()
    }, [loadConversations])

    // SISTEMA DE NOTIFICACIÓN Y ACTUALIZACIÓN EN TIEMPO REAL
    useEffect(() => {
        if (!currentUserId) return

        const channel = supabase
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
            }, async (payload) => {
                // Refrescamos siempre la lista para que aparezca el punto rojo
                await loadConversations()

                // Si el mensaje no es del usuario actual, avisar
                if (payload.new.sender_id !== currentUserId) {
                    if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("Rival: Nuevo mensaje", {
                            body: payload.new.text,
                            icon: "/logo.svg"
                        })
                    }
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [currentUserId, loadConversations, conversations])

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
            }, (payload) => {
                setMessages(prev => {
                    if (prev.find(m => m.id === payload.new.id)) return prev
                    const newMsgs = [...prev, payload.new]
                    return newMsgs
                })
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload) => {
                setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${activeConversationId}`
            }, (payload) => {
                // Nota: DELETE payload.old o payload.new depende de la réplica, usualmente old.id
                const deletedId = payload.old?.id
                if (deletedId) {
                    setMessages(prev => prev.filter(m => m.id !== deletedId))
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeConversationId])

    const handleSelectConversation = async (id: string, person: any) => {
        try {
            setActiveConversationId(id)
            setOtherPerson(person)
            setIsMobileListVisible(false)
            await loadMessages(id)
        } catch (err) {
            console.error("Error al seleccionar:", err)
        }
    }

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        if (!activeConversationId) return

        // Optimistic UI: Añadir el mensaje localmente rápido
        const tempId = Math.random().toString()
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
            // Revertir si falla
            setMessages(prev => prev.filter(m => m.id !== tempId))
            alert(`Error al enviar: ${result.error}`)
        } else {
            // Reemplazar mensaje temporal con el real (el listener también lo hará)
            setMessages(prev => prev.map(m => m.id === tempId ? result.message : m))
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

    const filteredConversations = conversations.filter(conv =>
        conv.other_person?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.other_person?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoadingConversations) {
        return <div className="h-screen flex items-center justify-center bg-[#090909]"><Loader2 className="animate-spin text-brand-red w-10 h-10" /></div>
    }

    return (
        <div className="h-[calc(100vh-120px)] bg-[#090909] flex text-white overflow-hidden rounded-[2.5rem] border border-white/5 shadow-2xl mx-auto max-w-[1600px] my-4">
            <div className={`${isMobileListVisible ? 'w-full' : 'hidden'} md:flex md:w-[350px] lg:w-[400px] shrink-0 border-r border-white/5`}>
                <ChatList
                    conversations={filteredConversations}
                    activeId={activeConversationId}
                    onSelect={handleSelectConversation}
                    onSearch={setSearchQuery}
                    onNewChat={() => setIsNewChatModalOpen(true)}
                />
            </div>

            <div className={clsx(
                "flex-1 flex flex-col transition-all duration-300 bg-[#070707]",
                !isMobileListVisible ? "fixed inset-0 z-[150] bg-[#070707] lg:relative lg:inset-auto" : "hidden md:flex"
            )}>
                <ChatWindow
                    messages={messages}
                    otherPerson={otherPerson}
                    currentUserId={currentUserId}
                    onSendMessage={handleSendMessage}
                    onUploadImage={uploadChatImage}
                    onDeleteMessage={deleteMessage}
                    onEditMessage={editMessage}
                    isLoading={isLoadingMessages}
                    onBack={() => setIsMobileListVisible(true)}
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
