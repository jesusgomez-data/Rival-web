-- Run this in Supabase SQL Editor to add center profile columns

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS gallery_urls    TEXT[]          DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS latitude        NUMERIC(10,7);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS longitude       NUMERIC(10,7);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tiktok          TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS youtube         TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS facebook        TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS twitter         TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS amenities       JSONB           DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS opening_hours   JSONB           DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS founded_year    INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS capacity        INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS center_specialties TEXT[]       DEFAULT '{}';

-- Allow gallery photos in the center-logos bucket (or create center-gallery bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('center-gallery', 'center-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for center-gallery
CREATE POLICY "Authenticated users can upload center gallery"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'center-gallery');

CREATE POLICY "Public read center gallery"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'center-gallery');

CREATE POLICY "Users can delete own center gallery"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'center-gallery');
