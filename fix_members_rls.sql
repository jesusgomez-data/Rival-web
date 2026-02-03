-- Fix RLS policies for members to use organizations table instead of centers
DROP POLICY IF EXISTS "Center owners can read own members" ON public.members;
CREATE POLICY "Center owners can read own members" ON public.members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE organizations.id = members.center_id 
      AND organizations.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can update own members" ON public.members;
CREATE POLICY "Center owners can update own members" ON public.members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE organizations.id = members.center_id 
      AND organizations.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can create members" ON public.members;
CREATE POLICY "Center owners can create members" ON public.members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE organizations.id = center_id 
      AND organizations.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Center owners can delete own members" ON public.members;
CREATE POLICY "Center owners can delete own members" ON public.members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE organizations.id = members.center_id 
      AND organizations.owner_id = auth.uid()
    )
  );

-- Ensure center_id in members can reference organizations
-- This might fail if the FK is already set to 'centers', but we'll try to be safe.
-- ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_center_id_fkey;
-- ALTER TABLE public.members ADD CONSTRAINT members_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
