-- Run this in Supabase SQL Editor
-- Creates the ai_daily_usage table for per-user daily limits on AI features

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    feature TEXT NOT NULL CHECK (feature IN ('coach', 'wod_generator')),
    usage_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, feature, usage_date)
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users view own ai usage"
    ON public.ai_daily_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own usage records
CREATE POLICY "Users insert own ai usage"
    ON public.ai_daily_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);
