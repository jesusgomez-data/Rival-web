-- Add missing columns to scheduled_workouts
ALTER TABLE public.scheduled_workouts
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS duration    TEXT,
    ADD COLUMN IF NOT EXISTS sport_type  TEXT,
    ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);
