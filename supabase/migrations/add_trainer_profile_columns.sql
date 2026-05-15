-- Add personal trainer specific columns to organizations table
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS specialties       text[]  DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS modality          text,
    ADD COLUMN IF NOT EXISTS languages         text[]  DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS years_experience  integer,
    ADD COLUMN IF NOT EXISTS certifications    text;
