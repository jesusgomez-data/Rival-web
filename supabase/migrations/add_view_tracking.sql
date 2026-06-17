-- ============================================================
-- View Tracking: post/video views + profile visits (centros/profesionales)
-- ============================================================

-- 1. Post / video views ----------------------------------------------------
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.post_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'post_views_post_id_user_id_key'
    ) THEN
        ALTER TABLE public.post_views ADD CONSTRAINT post_views_post_id_user_id_key UNIQUE (post_id, user_id);
    END IF;
END $$;

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can record their own post views" ON public.post_views;
CREATE POLICY "Users can record their own post views"
ON public.post_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Post owners can see views of their posts" ON public.post_views;
CREATE POLICY "Post owners can see views of their posts"
ON public.post_views FOR SELECT
USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_views.post_id AND p.user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.handle_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.posts SET view_count = view_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_view_insert ON public.post_views;
CREATE TRIGGER on_post_view_insert
    AFTER INSERT ON public.post_views
    FOR EACH ROW EXECUTE PROCEDURE public.handle_post_view_count();

-- 2. Profile visits (perfiles de centro / profesional individual) ----------
CREATE TABLE IF NOT EXISTS public.profile_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    visitor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    visit_date DATE DEFAULT current_date NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profile_visits_org_visitor_date_key'
    ) THEN
        ALTER TABLE public.profile_visits ADD CONSTRAINT profile_visits_org_visitor_date_key UNIQUE (organization_id, visitor_id, visit_date);
    END IF;
END $$;

ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record a profile visit" ON public.profile_visits;
CREATE POLICY "Anyone can record a profile visit"
ON public.profile_visits FOR INSERT
WITH CHECK (visitor_id IS NULL OR visitor_id = auth.uid());

DROP POLICY IF EXISTS "Org owners can see their own profile visits" ON public.profile_visits;
CREATE POLICY "Org owners can see their own profile visits"
ON public.profile_visits FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = profile_visits.organization_id AND o.owner_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_profile_visits_org ON public.profile_visits(organization_id);
