-- Add post_as_center column to center_posts table if it doesn't exist
ALTER TABLE center_posts 
ADD COLUMN IF NOT EXISTS post_as_center BOOLEAN DEFAULT FALSE;

-- Add post_as_center column to center_post_comments table if it doesn't exist
ALTER TABLE center_post_comments 
ADD COLUMN IF NOT EXISTS post_as_center BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload the schema cache so the new columns are visible immediately
NOTIFY pgrst, 'reload config';
