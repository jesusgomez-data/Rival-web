-- Add is_official column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT FALSE;

-- Update the Rival Official account to be official (if it exists)
UPDATE public.profiles 
SET is_official = TRUE, 
    full_name = 'Rival Official',
    username = 'rival'
WHERE email = 'rival.app.official@gmail.com';
