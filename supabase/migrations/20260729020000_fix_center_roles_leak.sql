-- ═══════════════════════════════════════════════════════════════
-- center_roles (quien trabaja en cada centro y su nivel de permisos)
-- era legible por cualquiera sin login. Se cierra a: el propio dueño
-- del centro, y cualquiera que YA sea staff de ese mismo centro (asi
-- sigue funcionando la pantalla de gestion de equipo).
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'center_roles' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.center_roles', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.center_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center_roles_owner_and_staff_select" ON public.center_roles
    FOR SELECT USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR organization_id IN (SELECT organization_id FROM public.center_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "center_roles_owner_write" ON public.center_roles
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "center_roles_owner_update" ON public.center_roles
    FOR UPDATE USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    ) WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "center_roles_owner_or_self_delete" ON public.center_roles
    FOR DELETE USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR user_id = auth.uid()
    );
