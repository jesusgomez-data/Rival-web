-- Run this in Supabase SQL Editor

-- 1. Video messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 2. View-once messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_view_once BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- 3. Group conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_avatar TEXT;

-- 4. Allow video uploads in chat-media bucket (bucket already exists)
-- Storage policies already cover authenticated users, no change needed.

-- 5. Index for view-once queries
CREATE INDEX IF NOT EXISTS idx_messages_is_view_once ON messages(is_view_once) WHERE is_view_once = TRUE;

-- 6. RLS: allow any participant to mark view-once as viewed
CREATE OR REPLACE FUNCTION mark_view_once_viewed(message_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE messages
    SET viewed_at = NOW()
    WHERE id = message_id
      AND is_view_once = TRUE
      AND viewed_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
