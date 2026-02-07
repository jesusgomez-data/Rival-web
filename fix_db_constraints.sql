
-- COMPREHENSIVE FIX for Missing CASCADE Deletes
-- Run this in Supabase SQL Editor to allow user deletion

DO $$
DECLARE
    r RECORD;
BEGIN
    -- =================================================================
    -- 1. MESSAGES TABLE
    -- =================================================================
    FOR r IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'public.messages'::regclass AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.messages'::regclass AND attname = 'sender_id')]
    LOOP
        EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- =================================================================
    -- 2. CONVERSATION PARTICIPANTS
    -- =================================================================
    FOR r IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'public.conversation_participants'::regclass AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.conversation_participants'::regclass AND attname = 'user_id')]
    LOOP
        EXECUTE 'ALTER TABLE public.conversation_participants DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE public.conversation_participants ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    -- =================================================================
    -- 3. STORIES
    -- =================================================================
    -- Check if table exists first
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'stories') THEN
        FOR r IN 
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'public.stories'::regclass AND contype = 'f' 
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.stories'::regclass AND attname = 'user_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.stories DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        ALTER TABLE public.stories ADD CONSTRAINT stories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- =================================================================
    -- 4. STORY LIKES
    -- =================================================================
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'story_likes') THEN
        -- user_id
        FOR r IN 
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'public.story_likes'::regclass AND contype = 'f' 
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.story_likes'::regclass AND attname = 'user_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.story_likes DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        ALTER TABLE public.story_likes ADD CONSTRAINT story_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

        -- story_id (just in case)
        FOR r IN 
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'public.story_likes'::regclass AND contype = 'f' 
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.story_likes'::regclass AND attname = 'story_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.story_likes DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        ALTER TABLE public.story_likes ADD CONSTRAINT story_likes_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;
    END IF;

    -- =================================================================
    -- 5. STORY VIEWS
    -- =================================================================
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'story_views') THEN
        -- user_id
        FOR r IN 
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'public.story_views'::regclass AND contype = 'f' 
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.story_views'::regclass AND attname = 'user_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.story_views DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        ALTER TABLE public.story_views ADD CONSTRAINT story_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

        -- story_id (just in case)
        FOR r IN 
            SELECT conname FROM pg_constraint 
            WHERE conrelid = 'public.story_views'::regclass AND contype = 'f' 
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.story_views'::regclass AND attname = 'story_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.story_views DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        ALTER TABLE public.story_views ADD CONSTRAINT story_views_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;
    END IF;

END $$;
