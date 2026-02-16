
-- FIX FOR STORY VIEWS: Unique Constraint and RLS Policies
-- Execute this in the Supabase SQL Editor

-- 1. Ensure unique constraint for upsert to work correctly
-- First, remove any duplicate views that might exist if the constraint was missing
DELETE FROM public.story_views a
USING public.story_views b
WHERE a.id < b.id 
  AND a.story_id = b.story_id 
  AND a.user_id = b.user_id;

-- Add the unique constraint (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'story_views_story_id_user_id_key'
    ) THEN
        ALTER TABLE public.story_views ADD CONSTRAINT story_views_story_id_user_id_key UNIQUE (story_id, user_id);
    END IF;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public views are viewable by everyone" ON public.story_views;
DROP POLICY IF EXISTS "Users can record their own views" ON public.story_views;
DROP POLICY IF EXISTS "Users can see their own views" ON public.story_views;
DROP POLICY IF EXISTS "Story owners can see views of their stories" ON public.story_views;
DROP POLICY IF EXISTS "Everyone can see story views" ON public.story_views;

-- 4. Create proper policies
-- Anyone authenticated can record a view
CREATE POLICY "Users can record their own views" 
ON public.story_views 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can update their own view (for upsert/timestamp update)
CREATE POLICY "Users can update their own views" 
ON public.story_views 
FOR UPDATE 
USING (auth.uid() = user_id);

-- IMPORTANT: Story owners must be able to see ALL views for their stories
-- Also, individuals should be able to see their own views (already covered by owner policy if they view their own, but let's be explicit)
CREATE POLICY "Story owners can see views of their stories" 
ON public.story_views 
FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.stories s 
        WHERE s.id = story_views.story_id 
        AND s.user_id = auth.uid()
    )
);

-- Alternative simpler approach if privacy isn't a strict requirement for view lists:
-- CREATE POLICY "Everyone can see story views" ON public.story_views FOR SELECT USING (true);
