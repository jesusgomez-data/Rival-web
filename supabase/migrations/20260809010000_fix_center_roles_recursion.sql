-- ═══════════════════════════════════════════════════════════════
-- La policy "center_roles_owner_and_staff_select" de la migración
-- anterior (20260729020000) hacía un SELECT sobre center_roles DENTRO
-- de su propia policy para comprobar "¿ya soy staff de este centro?"
-- — eso dispara la misma policy otra vez, y Postgres corta en seco
-- con "infinite recursion detected in policy for relation
-- center_roles". Resultado: ni el dueño ni el staff podían leer la
-- tabla (la pantalla de gestión de equipo se rompió).
--
-- Fix: mover esa comprobación a una función SECURITY DEFINER, que
-- consulta center_roles con los privilegios del dueño de la función
-- (bypassa RLS en esa consulta interna) en vez de re-entrar por la
-- policy normal.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_center_staff(check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.center_roles
    WHERE organization_id = check_org_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "center_roles_owner_and_staff_select" ON public.center_roles;

CREATE POLICY "center_roles_owner_and_staff_select" ON public.center_roles
    FOR SELECT USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR public.is_center_staff(organization_id)
    );
