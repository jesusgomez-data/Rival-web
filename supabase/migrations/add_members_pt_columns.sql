-- Add personal trainer specific columns to members table
ALTER TABLE members
    ADD COLUMN IF NOT EXISTS goal         text,
    ADD COLUMN IF NOT EXISTS modality     text,
    ADD COLUMN IF NOT EXISTS guest_name   text,
    ADD COLUMN IF NOT EXISTS guest_email  text,
    ADD COLUMN IF NOT EXISTS guest_phone  text;
