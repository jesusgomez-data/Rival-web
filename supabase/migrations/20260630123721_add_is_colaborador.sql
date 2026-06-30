-- Add is_colaborador to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_colaborador BOOLEAN DEFAULT false;

-- Add usage_count to ai_daily_usage
ALTER TABLE public.ai_daily_usage ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 1;

-- If ai_daily_usage has a unique constraint on (user_id, feature, usage_date) 
-- that prevents multiple rows, we just update usage_count on the existing row.
