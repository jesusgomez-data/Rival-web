-- Run this migration in Supabase SQL Editor to fix comment issues

-- 1. Robustly handle 'comments' table creation/update
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
        -- Create if missing
        CREATE TABLE public.comments (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
            content TEXT NOT NULL,
            parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        -- Enable RLS
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
        
        -- Create policies (safe to run here as table is new)
        CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
        CREATE POLICY "Users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
    ELSE
        -- Table exists. Fix columns.
        
        -- Rename 'comment_text' to 'content' if it exists (legacy support)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'comment_text') THEN
            ALTER TABLE public.comments RENAME COLUMN comment_text TO content;
        END IF;

        -- Add 'parent_id' for nesting if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'parent_id') THEN
            ALTER TABLE public.comments ADD COLUMN parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
        END IF;

        -- Ensure 'content' column exists (if rename didn't happen and it wasn't there)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'content') THEN
             ALTER TABLE public.comments ADD COLUMN content TEXT;
             -- Note: Existing rows might have null content if we just added it without migration strategy, 
             -- but 'comment_text' rename covers existing data.
        END IF;
    END IF;
END $$;

-- 2. Create 'comment_likes' table request
CREATE TABLE IF NOT EXISTS public.comment_likes (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (user_id, comment_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 3. Policies for comment_likes (Drop first to avoid "already exists" error on re-run)
DROP POLICY IF EXISTS "Everyone can read comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike comments" ON public.comment_likes;

CREATE POLICY "Everyone can read comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);
