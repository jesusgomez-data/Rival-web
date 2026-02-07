
-- COMPREHENSIVE CASCADE DELETE FIX
-- This script ensures that deleting a user from auth.users (via Dashboard)
-- automatically removes all their associated data in public tables.

DO $$
DECLARE
    r RECORD;
    c RECORD;
BEGIN

    -- 1. PROFILES: The bridge between auth.users and public tables
    -- Ensure public.profiles deletes when auth.users deletes
    
    -- Find and Drop existing FK to auth.users
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
        AND contype = 'f'
        AND confrelid = 'auth.users'::regclass
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Re-add with CASCADE
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
        AND conname = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;


    -- 2. TABLES REFERENCING public.profiles (user_id / id)
    -- We need to check every table that has a foreign key to public.profiles
    -- and ensure it is ON DELETE CASCADE.

    CREATE TEMP TABLE IF NOT EXISTS fk_targets (
        tbl text,
        col text
    );
    
    DELETE FROM fk_targets; -- Clear if exists
    
    INSERT INTO fk_targets (tbl, col) VALUES
    ('public.workouts', 'user_id'),
    ('public.members', 'user_id'),
    ('public.posts', 'user_id'),
    ('public.post_likes', 'user_id'),
    ('public.post_comments', 'user_id'),
    ('public.comments', 'user_id'),
    ('public.class_results', 'user_id'),
    ('public.trial_requests', 'user_id'),
    ('public.notifications', 'user_id'), -- CORRECTED
    ('public.messages', 'sender_id'),
    ('public.conversation_participants', 'user_id'),
    ('public.stories', 'user_id'),
    ('public.story_likes', 'user_id'),
    ('public.story_views', 'user_id'),
    ('public.mission_progress', 'user_id'),
    ('public.user_achievements', 'user_id'),
    ('public.center_reviews', 'user_id'),
    ('public.center_followers', 'user_id'),
    ('public.center_post_comments', 'user_id'),
    ('public.center_post_likes', 'user_id'),
    ('public.orders', 'user_id'),
    ('public.support_tickets', 'user_id'),
    ('public.support_messages', 'sender_id'),
    ('public.follows', 'follower_id'),
    ('public.follows', 'following_id'),
    ('public.memberships', 'user_id');

    FOR r IN SELECT * FROM fk_targets LOOP
        -- Check if table exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = split_part(r.tbl, '.', 2)) THEN
            
            -- Find and Drop existing FK constraints on this column
            FOR c IN 
                SELECT conname 
                FROM pg_constraint 
                WHERE conrelid = r.tbl::regclass 
                AND contype = 'f'
                AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = r.tbl::regclass AND attname = r.col)]
            LOOP
                EXECUTE 'ALTER TABLE ' || r.tbl || ' DROP CONSTRAINT ' || quote_ident(c.conname);
            END LOOP;

            -- Add new FK with CASCADE
            EXECUTE 'ALTER TABLE ' || r.tbl || ' ADD CONSTRAINT ' || replace(split_part(r.tbl, '.', 2), '_', '') || '_' || r.col || '_fkey_cascade FOREIGN KEY (' || r.col || ') REFERENCES public.profiles(id) ON DELETE CASCADE';
            
        END IF;
    END LOOP;


    -- 3. SECONDARY CASCADES (Grandchildren)
    
    -- MEMBERS -> CLASS_ENROLLMENTS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'class_enrollments') THEN
        FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.class_enrollments'::regclass 
            AND contype = 'f'
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.class_enrollments'::regclass AND attname = 'member_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.class_enrollments DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        
        ALTER TABLE public.class_enrollments 
        ADD CONSTRAINT class_enrollments_member_id_fkey_cascade 
        FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
    END IF;

    -- WORKOUTS -> WORKOUT_SETS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_sets') THEN
         FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.workout_sets'::regclass 
            AND contype = 'f'
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.workout_sets'::regclass AND attname = 'workout_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.workout_sets DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        
        ALTER TABLE public.workout_sets 
        ADD CONSTRAINT workout_sets_workout_id_fkey_cascade 
        FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE;
    END IF;

    -- WORKOUTS -> WORKOUT_EXERCISES
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_exercises') THEN
         FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.workout_exercises'::regclass 
            AND contype = 'f'
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.workout_exercises'::regclass AND attname = 'workout_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.workout_exercises DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        
        ALTER TABLE public.workout_exercises 
        ADD CONSTRAINT workout_exercises_workout_id_fkey_cascade 
        FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE;
    END IF;

    -- POSTS -> POST_LIKES
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_likes') THEN
         FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.post_likes'::regclass 
            AND contype = 'f'
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.post_likes'::regclass AND attname = 'post_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.post_likes DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        
        ALTER TABLE public.post_likes 
        ADD CONSTRAINT post_likes_post_id_fkey_cascade 
        FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;

    -- POSTS -> POST_COMMENTS
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'post_comments') THEN
         FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.post_comments'::regclass 
            AND contype = 'f'
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.post_comments'::regclass AND attname = 'post_id')]
        LOOP
            EXECUTE 'ALTER TABLE public.post_comments DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
        
        ALTER TABLE public.post_comments 
        ADD CONSTRAINT post_comments_post_id_fkey_cascade 
        FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
    END IF;

END $$;
