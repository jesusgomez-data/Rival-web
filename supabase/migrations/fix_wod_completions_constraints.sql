-- Migration: Fix WOD Completions constraints
-- Adds unique constraint on (user_id, original_wod_post_id) to prevent duplicates
-- and adds original_wod_post_id column to posts for repost resolution

-- 1. Add unique constraint on wod_completions so each user can only have one
--    completion per original WOD (prevents duplicates, enables proper upserts)
ALTER TABLE public.wod_completions
  DROP CONSTRAINT IF EXISTS uq_wod_completion_user_wod;

ALTER TABLE public.wod_completions
  ADD CONSTRAINT uq_wod_completion_user_wod UNIQUE (user_id, original_wod_post_id);

-- 2. Add original_wod_post_id column to posts so the leaderboard API can
--    resolve reposts back to the original WOD without parsing media_url JSON
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS original_wod_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_original_wod ON public.posts(original_wod_post_id)
  WHERE original_wod_post_id IS NOT NULL;
