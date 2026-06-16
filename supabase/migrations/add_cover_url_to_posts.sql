-- Migration: Add thumbnail_url column to posts table  
-- Run this in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/ralskslspvskjqqgzbiv/sql

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN public.posts.thumbnail_url IS 'URL of the auto-generated or user-selected thumbnail for video posts';

-- Backfill: copy cover_url to thumbnail_url for existing posts that have a cover
UPDATE public.posts
SET thumbnail_url = cover_url
WHERE cover_url IS NOT NULL AND thumbnail_url IS NULL;
