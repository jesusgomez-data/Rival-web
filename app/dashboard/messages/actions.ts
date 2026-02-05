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

export async function getMessages(conversationId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
    return data || []
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

    const { data: existing } = await supabase.rpc('get_conversation_between_users', {
        user_a: user.id,
        user_b: otherUserId
    })

    if (existing && existing.length > 0) {
        return { conversationId: existing[0].id }
    }

    const { data: newConv } = await supabase.from('conversations').insert({}).select().single()
    if (!newConv) return { error: 'Check RLS' }

    await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: otherUserId }
    ])

    return { conversationId: newConv.id }
}
