-- Fix RLS to allow public (unauthenticated) INSERT for center signup
-- This allows anyone to create a new center organization

-- Drop existing policies on organizations table
DROP POLICY IF EXISTS "Enable public read access" ON organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON organizations;

-- New policy: Allow anyone to INSERT a new organization (public signup)
CREATE POLICY "Enable public insert for organizations" ON organizations
  FOR INSERT WITH CHECK (true);

-- Policy: Allow anyone to READ organizations (public discovery)
CREATE POLICY "Enable public read access" ON organizations
  FOR SELECT USING (true);

-- Policy: Allow owner/admin to UPDATE their own organization
CREATE POLICY "Enable update for organization members" ON organizations
  FOR UPDATE USING (
    -- Allow if user has a role in this organization
    EXISTS (
      SELECT 1 FROM center_roles
      WHERE center_roles.organization_id = organizations.id
        AND center_roles.user_id = auth.uid()
        AND center_roles.role IN ('head_coach', 'admin')
    )
  );

-- Apply RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
