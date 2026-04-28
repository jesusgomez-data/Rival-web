-- ============================================
-- FINAL CHAT SYSTEM SETUP (Rival Fit)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create Tables (if they don't exist)
-- ============================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_group BOOLEAN DEFAULT FALSE,
    group_name TEXT,
    group_avatar TEXT,
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_avatar TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_text TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT,
    image_url TEXT,
    video_url TEXT,
    type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'view_once_image', 'view_once_video'
    is_view_once BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    is_liked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_liked BOOLEAN DEFAULT FALSE;

-- 2. Security Functions
-- ============================================

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

CREATE OR REPLACE FUNCTION public.get_conversation_between_users(user_a UUID, user_b UUID)
RETURNS TABLE (id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT p1.conversation_id
    FROM public.conversation_participants p1
    JOIN public.conversation_participants p2 ON p1.conversation_id = p2.conversation_id
    JOIN public.conversations c ON c.id = p1.conversation_id
    WHERE p1.user_id = user_a
      AND p2.user_id = user_b
      AND c.is_group = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable RLS
-- ============================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Conversations
-- ============================================

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (public.is_chat_participant(id));

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations"
ON public.conversations FOR UPDATE
USING (public.is_chat_participant(id));

DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;
CREATE POLICY "Users can delete their conversations"
ON public.conversations FOR DELETE
USING (public.is_chat_participant(id));

-- 5. Policies: Participants
-- ============================================

DROP POLICY IF EXISTS "Users can view their own participant records" ON public.conversation_participants;
CREATE POLICY "Users can view their own participant records"
ON public.conversation_participants FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view other participants in their chats" ON public.conversation_participants;
CREATE POLICY "Users can view other participants in their chats"
ON public.conversation_participants FOR SELECT
USING (public.is_chat_participant(conversation_id));

DROP POLICY IF EXISTS "Users can insert participants" ON public.conversation_participants;
CREATE POLICY "Users can insert participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Policies: Messages
-- ============================================

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (public.is_chat_participant(conversation_id));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id 
    AND public.is_chat_participant(conversation_id)
);

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
ON public.messages FOR DELETE
USING (auth.uid() = sender_id);

-- 7. Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON public.conversation_participants(conversation_id);

-- Force a schema cache reload
NOTIFY pgrst, 'reload config';
