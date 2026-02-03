-- Run this in your Supabase SQL Editor to add the privacy setting

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_setting text DEFAULT 'public';

-- Optional: Add a check constraint to ensure only valid values
ALTER TABLE profiles 
ADD CONSTRAINT check_privacy_setting 
CHECK (privacy_setting IN ('public', 'private'));
