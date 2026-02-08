-- Add phone field to profiles table if it doesn't exist
-- This allows storing phone numbers for users during registration and member management

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN phone TEXT;
        
        COMMENT ON COLUMN public.profiles.phone IS 'User phone number for contact purposes';
    END IF;
END $$;
