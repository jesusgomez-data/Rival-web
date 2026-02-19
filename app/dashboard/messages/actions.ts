'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '../notifications-actions'

export async function getConversations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    try {
        // 1. Obtener participaciones de forma simple
        const { data: participations, error } = await supabase
            .from('conversation_participants')
            .select('conversation_id, last_read_at')
            .eq('user_id', user.id)

        if (error || !participations) return []

        // 2. Cargar detalles de cada conversación por separado (más lento pero infalible)
        const conversationsWithDetails = await Promise.all(participations.map(async (p) => {
            const { data: conv } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', p.conversation_id)
                .single()

            if (!conv) return null

            // Buscar al otro usuario
            const { data: otherParts } = await supabase
                .from('conversation_participants')
                .select(`
                    user_id,
                    profiles:user_id ( id, username, full_name, avatar_url )
                `)
                .eq('conversation_id', p.conversation_id)
                .neq('user_id', user.id)
                .maybeSingle()

            const hasUnread = conv.last_message_at && p.last_read_at
                ? new Date(conv.last_message_at) > new Date(p.last_read_at)
                : false;

            return {
                id: conv.id,
                last_message_text: conv.last_message_text,
                last_message_at: conv.last_message_at || conv.updated_at,
                other_person: otherParts?.profiles || { full_name: 'Usuario Rival', username: 'rival' },
                unread_count: hasUnread ? 1 : 0
            }
        }))

        return conversationsWithDetails
            .filter(Boolean)
            .sort((a: any, b: any) => {
                const dateA = new Date(a.last_message_at || 0).getTime()
                const dateB = new Date(b.last_message_at || 0).getTime()
                return dateB - dateA
            })
    } catch (err) {
        console.error("Critical error fetching conversations:", err)
        return []
    }
}

export async function getUnreadMessageCount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, conversations(last_message_at)')
        .eq('user_id', user.id)

    if (!participations) return 0

    const unreadCount = participations.filter((p: any) => {
        const lastMsgAt = p.conversations?.last_message_at
        if (!lastMsgAt) return false
        if (!p.last_read_at) return true
        return new Date(lastMsgAt) > new Date(p.last_read_at)
    }).length

    return unreadCount
}

export async function getMessages(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { messages: [], lastReadAt: null }

    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

    // Obtener la última vez que la OTRA persona leyó
    const { data: otherParticipant } = await supabase
        .from('conversation_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .maybeSingle()

    return {
        messages: messages || [],
        lastReadAt: otherParticipant?.last_read_at || null
    }
}

export async function markConversationAsRead(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

    return { error: error?.message }
}

export async function sendMessage(conversationId: string, text: string, imageUrl?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No user session' }

    const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            text: text.trim(),
            image_url: imageUrl || null,
            type: imageUrl ? 'image' : 'text'
        })
        .select()
        .single()

    if (msgError) return { error: msgError.message }

    // Actualizar cabecera (sin bloquear)
    supabase
        .from('conversations')
        .update({
            last_message_text: imageUrl ? '📷 Imagen' : text.trim(),
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .then(() => { })

    // Trigger Notification
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const { data: participant } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .maybeSingle();

    if (participant) {
        await createNotification({
            userId: participant.user_id,
            type: 'message',
            title: 'Nuevo Mensaje',
            content: `${profile?.full_name || 'Alguien'} te ha enviado un mensaje.`,
            link: `/dashboard/messages?id=${conversationId}`
        });
    }

    return { success: true, message: msgData }
}

export async function uploadChatImage(file: File) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No session' }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file)

    if (error) return { error: error.message }

    const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName)

    return { url: publicUrl }
}

export async function deleteMessage(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('messages').delete().eq('id', id)
    return { error: error?.message }
}

export async function editMessage(id: string, text: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('messages').update({ text: text.trim(), updated_at: new Date().toISOString() }).eq('id', id)
    return { error: error?.message }
}

export async function deleteConversation(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('conversations').delete().eq('id', id)
    if (error) return { error: error.message }
    return { success: true }
}

export async function toggleMessageLike(id: string, currentStatus: boolean) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('messages')
        .update({ is_liked: !currentStatus })
        .eq('id', id)

    return { error: error?.message }
}

export async function getFriendsToChat() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: follows } = await supabase
        .from('follows')
        .select('profiles!following_id(id, username, full_name, avatar_url)')
        .eq('follower_id', user.id)

    return follows?.map((f: any) => f.profiles).filter(Boolean) || []
}

export async function getOrCreateConversation(otherUserId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    try {
        // Try to find existing conversation using RPC
        const { data: existing, error: rpcError } = await supabase.rpc('get_conversation_between_users', {
            user_a: user.id,
            user_b: otherUserId
        })

        if (existing && existing.length > 0) {
            return { conversationId: existing[0].id }
        }

        // Create new conversation
        const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({})
            .select()
            .single()

        if (convError || !newConv) {
            console.error('Error creating conversation:', convError)
            return { error: 'No se pudo crear la conversación. Por favor, intenta de nuevo.' }
        }

        // Add participants
        const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert([
                { conversation_id: newConv.id, user_id: user.id },
                { conversation_id: newConv.id, user_id: otherUserId }
            ])

        if (participantsError) {
            console.error('Error adding participants:', participantsError)
            // Try to clean up the conversation if participants couldn't be added
            await supabase.from('conversations').delete().eq('id', newConv.id)
            return { error: 'No se pudieron añadir los participantes. Por favor, intenta de nuevo.' }
        }

        return { conversationId: newConv.id }
    } catch (err) {
        console.error('Critical error in getOrCreateConversation:', err)
        return { error: 'Error al crear la conversación. Por favor, verifica los permisos de la base de datos.' }
    }
}

