-- FIX FOR INFINITE RECURSION IN CHAT TABLES
-- Run this in your Supabase SQL Editor

-- 1. Create a security definer function to check membership
-- This breaks the recursion by bypassing RLS inside the function
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.conversation_participants 
        WHERE conversation_id = _conversation_id 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update policies for conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own participant records" ON public.conversation_participants;
CREATE POLICY "Users can view their own participant records"
ON public.conversation_participants
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view other participants in their chats" ON public.conversation_participants;
CREATE POLICY "Users can view other participants in their chats"
ON public.conversation_participants
FOR SELECT
USING (public.is_chat_participant(conversation_id));

-- 3. Update policies for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (public.is_chat_participant(id));

-- 4. Update policies for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (public.is_chat_participant(conversation_id));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
    auth.uid() = sender_id 
    AND public.is_chat_participant(conversation_id)
);
