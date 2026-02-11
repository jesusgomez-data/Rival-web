
-- Migration to add is_guided column and tracking for weekly limits
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS is_guided BOOLEAN DEFAULT FALSE;

-- Optional: Index for performance on weekly checks
CREATE INDEX IF NOT EXISTS idx_workouts_user_guided_created ON public.workouts (user_id, is_guided, created_at);
