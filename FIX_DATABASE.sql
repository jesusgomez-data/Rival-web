-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR --

-- 1. Add the missing parent_id column for replies
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Create the comment_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comment_likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, comment_id)
);

-- 3. Enable security for new table
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (Drop first to avoid errors)
DROP POLICY IF EXISTS "Everyone can read comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;

CREATE POLICY "Everyone can read comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- 5. Force a schema cache reload (This is a trick to notify PostgREST)
NOTIFY pgrst, 'reload config';
