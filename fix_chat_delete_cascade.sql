
-- Fix foreign key constraints for Chat system to allow User deletion
-- We need to ensure that when a User is deleted, their messages and participations are also deleted.

DO $$
BEGIN
    -- 1. MESSAGES: ensure sender_id foreign key cascades
    -- First, try to drop the constraint if it exists. We check by name pattern or column usage.
    -- To be safe, we'll look up the constraint by the table and column it acts on.
    
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.messages'::regclass 
            AND contype = 'f' 
            AND conkey = ARRAY[
                (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.messages'::regclass AND attname = 'sender_id')
            ]
        LOOP
            EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
    END;

    -- Now add the correct constraint
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


    -- 2. CONVERSATION_PARTICIPANTS: ensure user_id foreign key cascades
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN 
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'public.conversation_participants'::regclass 
            AND contype = 'f' 
            AND conkey = ARRAY[
                (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.conversation_participants'::regclass AND attname = 'user_id')
            ]
        LOOP
            EXECUTE 'ALTER TABLE public.conversation_participants DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
    END;

    -- Now add the correct constraint
    ALTER TABLE public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

END $$;
