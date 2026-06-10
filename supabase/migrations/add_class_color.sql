-- Add color column to classes table for calendar visual differentiation
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#dc2626';
