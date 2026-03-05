-- Migration: Add WOD Support to Posts Table
-- Allows posts to contain generated WOD data

-- 1. Add post_type column to differentiate content types
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'standard'
  CHECK (post_type IN ('standard', 'wod', 'workout', 'achievement', 'progress'));

-- 2. Add wod_data column to store full WOD JSON
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS wod_data JSONB;

-- 3. Create index for filtering by post_type
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON public.posts(post_type);

-- 4. Create index for querying WOD posts
CREATE INDEX IF NOT EXISTS idx_posts_wod_data ON public.posts USING GIN (wod_data)
  WHERE post_type = 'wod';

-- 5. Add comment for documentation
COMMENT ON COLUMN public.posts.post_type IS 'Type of post: standard (regular post), wod (AI-generated workout), workout (completed workout), achievement, progress';
COMMENT ON COLUMN public.posts.wod_data IS 'Full WOD data in JSON format (only for post_type = wod)';
