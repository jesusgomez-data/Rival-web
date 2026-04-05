-- ============================================================
-- SOCIAL MEDIA MANAGER TABLES
-- Run in Supabase SQL Editor
-- ============================================================

-- Posts programados para redes sociales
CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    caption TEXT,
    media_urls TEXT[], -- array of image/video URLs
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'all')),
    post_type TEXT DEFAULT 'image' CHECK (post_type IN ('image', 'carousel', 'video', 'reel', 'story')),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'published', 'scheduled')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    thumbnail_url TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ideas rápidas de contenido
CREATE TABLE IF NOT EXISTS public.content_ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    platform TEXT,
    content_type TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guiones generados por IA
CREATE TABLE IF NOT EXISTS public.social_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    topic TEXT,
    hook TEXT,
    key_points TEXT[],
    call_to_action TEXT,
    suggested_duration TEXT,
    suggested_format TEXT,
    full_script TEXT,
    tone TEXT DEFAULT 'professional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Métricas de redes sociales (input manual)
CREATE TABLE IF NOT EXISTS public.social_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
    followers INTEGER DEFAULT 0,
    following INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    avg_engagement NUMERIC DEFAULT 0,
    monthly_views INTEGER DEFAULT 0,
    best_post_url TEXT,
    best_post_likes INTEGER DEFAULT 0,
    recorded_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts_own" ON public.social_posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "content_ideas_own" ON public.content_ideas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "social_scripts_own" ON public.social_scripts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "social_metrics_own" ON public.social_metrics FOR ALL USING (auth.uid() = user_id);
