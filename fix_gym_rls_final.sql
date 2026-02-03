-- COMPREHENSIVE RIVAL B2B RLS FIX --

-- 1. FIX: MEMBERS TABLE RLS
-- Use organizations table instead of centers (since organizations is where owners are tracked)
DROP POLICY IF EXISTS "Center owners can read own members" ON public.members;
CREATE POLICY "Center owners can read own members" ON public.members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations 
      WHERE organizations.id = members.center_id 
      AND organizations.owner_id = auth.uid()
    ) OR user_id = auth.uid()
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

-- 2. FIX: CLASSES TABLE RLS
-- Allow owners to see their own classes even if they are not in center_roles
DROP POLICY IF EXISTS "Classes viewable by organization members" ON public.classes;
CREATE POLICY "Classes viewable by organization members" ON public.classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.center_roles 
      WHERE organization_id = classes.organization_id 
      AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = classes.organization_id
      AND owner_id = auth.uid()
    )
  );

-- Also allow owners to MANAGE classes
DROP POLICY IF EXISTS "Owners can manage classes" ON public.classes;
CREATE POLICY "Owners can manage classes" ON public.classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = classes.organization_id
      AND owner_id = auth.uid()
    )
  );

-- 3. FIX: TRIAL REQUESTS RLS
DROP POLICY IF EXISTS "Trial requests viewable by organization" ON public.trial_requests;
CREATE POLICY "Trial requests viewable by organization" ON public.trial_requests 
  FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.center_roles 
        WHERE organization_id = trial_requests.organization_id 
        AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = trial_requests.organization_id
        AND owner_id = auth.uid()
    ) OR user_id = auth.uid()
);

-- 4. FIX: Center products context
DROP POLICY IF EXISTS "Owners manage products" ON public.center_products;
CREATE POLICY "Owners manage products" ON public.center_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = center_products.organization_id
      AND owner_id = auth.uid()
    )
  );

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
