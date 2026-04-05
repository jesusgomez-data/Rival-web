"use server";

import { createClient } from "@/utils/supabase/server";

export async function sharePostViaMessage(postId: string, receiverId: string, message: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthenticated" };

    try {
        // 1. Buscar si ya existe un chat entre estos dos usuarios
        const { data: chats, error: chatError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', user.id);
            
        let chatId = null;
        
        if (chats && chats.length > 0) {
            const chatIds = chats.map(c => c.chat_id);
            const { data: existingChat } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .in('chat_id', chatIds)
                .eq('user_id', receiverId)
                .limit(1)
                .single();
                
            if (existingChat) {
                chatId = existingChat.chat_id;
            }
        }
        
        // 2. Si no existe, crear chat
        if (!chatId) {
            const { data: newChat, error: newChatErr } = await supabase
                .from('user_chats')
                .insert({})
                .select()
                .single();
                
            if (newChatErr) throw newChatErr;
            chatId = newChat.id;
            
            await supabase.from('chat_participants').insert([
                { chat_id: chatId, user_id: user.id },
                { chat_id: chatId, user_id: receiverId }
            ]);
        }
        
        // 3. Crear mensaje
        const { error: msgErr } = await supabase
            .from('chat_messages')
            .insert({
                chat_id: chatId,
                sender_id: user.id,
                content: message,
                shared_post_id: postId
            });
            
        if (msgErr) throw msgErr;
        
        return { success: true };
    } catch (error: any) {
        console.error("Error sending DM:", error);
        return { error: error.message };
    }
}
