'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createNotification } from '../notifications-actions'

export async function getConversations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    try {
        const { data: participations, error } = await supabase
            .from('conversation_participants')
            .select(`
                conversation_id,
                last_read_at,
                conversations ( id, last_message_text, last_message_at, updated_at, is_group, group_name, group_avatar )
            `)
            .eq('user_id', user.id)

        if (error || !participations?.length) return []

        const convIds = participations.map(p => p.conversation_id)

        const { data: otherParts } = await supabase
            .from('conversation_participants')
            .select(`conversation_id, profiles:user_id ( id, username, full_name, avatar_url )`)
            .in('conversation_id', convIds)
            .neq('user_id', user.id)

        // Build a map: convId → array of profiles (groups have multiple)
        const otherPartsMap: Record<string, any[]> = {}
        for (const p of otherParts || []) {
            if (!otherPartsMap[p.conversation_id]) otherPartsMap[p.conversation_id] = []
            if (p.profiles) otherPartsMap[p.conversation_id].push(p.profiles)
        }

        return participations
            .map(p => {
                const conv = p.conversations as any
                if (!conv) return null
                const lastMsgAt = conv.last_message_at || conv.updated_at
                const lastReadAt = p.last_read_at
                const isUnread = !!(lastMsgAt && (!lastReadAt || new Date(lastMsgAt) > new Date(lastReadAt)))
                const members = otherPartsMap[p.conversation_id] || []
                return {
                    id: conv.id,
                    last_message_text: conv.last_message_text,
                    last_message_at: lastMsgAt,
                    is_group: conv.is_group || false,
                    group_name: conv.group_name || null,
                    group_avatar: conv.group_avatar || null,
                    group_members: members,
                    other_person: conv.is_group ? null : (members[0] || { full_name: 'Usuario Rival', username: 'rival' }),
                    unread_count: isUnread ? 1 : 0
                }
            })
            .filter(Boolean)
            .sort((a: any, b: any) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime())
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
        .select(`conversation_id, last_read_at, conversations ( last_message_at, updated_at )`)
        .eq('user_id', user.id)

    if (!participations) return 0

    return participations.filter(p => {
        const conv = p.conversations as any
        if (!conv) return false
        const lastMsgAt = conv.last_message_at || conv.updated_at
        const lastReadAt = p.last_read_at
        return lastMsgAt && (!lastReadAt || new Date(lastMsgAt) > new Date(lastReadAt))
    }).length
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

    const futureDate = new Date();
    futureDate.setSeconds(futureDate.getSeconds() + 5);

    const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: futureDate.toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

    if (!error) revalidatePath('/dashboard', 'layout')
    return { error: error?.message }
}

export async function sendMessage(
    conversationId: string,
    text: string,
    imageUrl?: string,
    videoUrl?: string,
    isViewOnce?: boolean
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No user session' }

    let type = 'text'
    if (isViewOnce && imageUrl) type = 'view_once_image'
    else if (isViewOnce && videoUrl) type = 'view_once_video'
    else if (imageUrl) type = 'image'
    else if (videoUrl) type = 'video'

    const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            text: text.trim(),
            image_url: imageUrl || null,
            video_url: videoUrl || null,
            type,
            is_view_once: isViewOnce || false,
        })
        .select()
        .single()

    if (msgError) return { error: msgError.message }

    let lastMsgPreview = text.trim()
    if (isViewOnce) lastMsgPreview = '👁 Ver una vez'
    else if (videoUrl) lastMsgPreview = '🎬 Video'
    else if (imageUrl) lastMsgPreview = '📷 Imagen'

    supabase
        .from('conversations')
        .update({
            last_message_text: lastMsgPreview,
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .then(() => {})

    await markConversationAsRead(conversationId)

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

    // Notify all other participants (supports groups)
    const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)

    if (participants) {
        await Promise.all(participants.map(p =>
            createNotification({
                userId: p.user_id,
                type: 'message',
                title: 'Nuevo Mensaje',
                content: `${profile?.full_name || 'Alguien'} te ha enviado un mensaje.`,
                link: `/dashboard/messages?id=${conversationId}`
            })
        ))
    }

    return { success: true, message: msgData }
}

export async function uploadChatImage(file: File) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No session' }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage.from('chat-media').upload(fileName, file)
    if (error) return { error: error.message }

    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName)
    return { url: publicUrl }
}

export async function uploadChatVideo(file: File) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No session' }

    const fileExt = file.name.split('.').pop() || 'mp4'
    const fileName = `${user.id}/vid_${Date.now()}.${fileExt}`

    const { error } = await supabase.storage.from('chat-media').upload(fileName, file, {
        contentType: file.type || 'video/mp4'
    })
    if (error) return { error: error.message }

    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName)
    return { url: publicUrl }
}

export async function markViewOnceViewed(messageId: string) {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('messages')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('is_view_once', true)
        .is('viewed_at', null)
    return { error: error?.message }
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
    const supabase = createAdminClient()
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
        const { data: existing } = await supabase.rpc('get_conversation_between_users', {
            user_a: user.id,
            user_b: otherUserId
        })

        if (existing && existing.length > 0) return { conversationId: existing[0].id }

        const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({ is_group: false })
            .select()
            .single()

        if (convError || !newConv) return { error: 'No se pudo crear la conversación.' }

        const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert([
                { conversation_id: newConv.id, user_id: user.id },
                { conversation_id: newConv.id, user_id: otherUserId }
            ])

        if (participantsError) {
            await supabase.from('conversations').delete().eq('id', newConv.id)
            return { error: 'No se pudieron añadir los participantes.' }
        }

        return { conversationId: newConv.id }
    } catch (err) {
        return { error: 'Error al crear la conversación.' }
    }
}

export async function createGroupConversation(name: string, memberIds: string[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    try {
        const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({ is_group: true, group_name: name.trim() })
            .select()
            .single()

        if (convError || !newConv) return { error: 'No se pudo crear el grupo.' }

        const allMembers = Array.from(new Set([user.id, ...memberIds]))
        const { error: participantsError } = await supabase
            .from('conversation_participants')
            .insert(allMembers.map(uid => ({ conversation_id: newConv.id, user_id: uid })))

        if (participantsError) {
            await supabase.from('conversations').delete().eq('id', newConv.id)
            return { error: 'No se pudieron añadir los participantes al grupo.' }
        }

        return { conversationId: newConv.id }
    } catch (err) {
        return { error: 'Error al crear el grupo.' }
    }
}
