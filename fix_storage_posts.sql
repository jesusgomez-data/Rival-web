-- 1. Create the 'posts' bucket if it doesn't exist
-- We accept that we might not have permission to UPDATE if we are not the owner, so we rely on INSERT ON CONFLICT DO NOTHING
-- If you need to update limits, you might need to use the Storage UI.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'posts', 
    'posts', 
    true, 
    5368709120, -- 5GB Limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5368709120,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];

-- 2. Create policies
-- NOTE: We skipped 'ALTER TABLE' because it requires being the table owner. 
-- RLS is enabled by default on storage.objects in Supabase.

-- Drop existing policies if they exist (to clean up)
-- If these fail with "must be owner", it means policies exist that we can't touch.
-- In that case, use the Supabase Dashboard UI -> Storage -> Policies.
DO $$
BEGIN
    BEGIN
        DROP POLICY IF EXISTS "Public Access to Posts" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated Users Can Upload Posts" ON storage.objects;
        DROP POLICY IF EXISTS "Users Can Update Own Posts" ON storage.objects;
        DROP POLICY IF EXISTS "Users Can Delete Own Posts" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN
        -- Verify if specific error handling is needed, but mostly we want to proceed to create
        RAISE NOTICE 'Could not drop existing policies, likely due to permission. Attempting to create new ones...';
    END;
END $$;

-- Create policies (using IF NOT EXISTS logic via DO block to avoid errors if they persisted)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access to Posts'
    ) THEN
        CREATE POLICY "Public Access to Posts" ON storage.objects FOR SELECT USING ( bucket_id = 'posts' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated Users Can Upload Posts'
    ) THEN
        CREATE POLICY "Authenticated Users Can Upload Posts" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'posts' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users Can Update Own Posts'
    ) THEN
        CREATE POLICY "Users Can Update Own Posts" ON storage.objects FOR UPDATE TO authenticated USING ( bucket_id = 'posts' AND owner = auth.uid() );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users Can Delete Own Posts'
    ) THEN
        CREATE POLICY "Users Can Delete Own Posts" ON storage.objects FOR DELETE TO authenticated USING ( bucket_id = 'posts' AND owner = auth.uid() );
    END IF;
END $$;
