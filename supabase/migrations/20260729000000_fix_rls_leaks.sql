-- ═══════════════════════════════════════════════════════════════
-- CIERRA DOS FUGAS DE RLS CONFIRMADAS (auditoria 2026-07-29)
--
-- Verificado leyendo estas tablas SIN sesion, solo con la anon key
-- publica (exactamente lo que ve cualquier visitante o script):
--
-- 1. public.centers: email/telefono/direccion de cada gimnasio
--    legibles por cualquiera. Nada en la app actual necesita leer
--    esta tabla en publico (el listado publico usa "organizations",
--    ya correctamente restringido) — se cierra a solo el dueño/staff
--    del centro.
--
-- 2. public.workouts / public.workout_sets: entrenos, pesos y notas
--    de CUALQUIER usuario legibles sin haber iniciado sesion siquiera.
--    La app SI permite ver el entreno de otro usuario desde su perfil
--    (funcion real, no bug), pero eso deberia requerir estar logueado
--    como minimo — no publico para cualquiera con la key anon.
--
-- El bloque DO se usa porque no se puede saber con certeza que
-- policies existen ahora mismo (varios scripts SQL antiguos crearon
-- este esquema con nombres distintos) — se borran todas las que haya
-- en cada tabla, sea cual sea su nombre, y se crean limpias.
-- ═══════════════════════════════════════════════════════════════

-- ── centers: solo el dueño del centro o su staff ──────────────────
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'centers' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.centers', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "centers_owner_and_staff_select" ON public.centers
    FOR SELECT USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR organization_id IN (SELECT organization_id FROM public.center_roles WHERE user_id = auth.uid())
    );

CREATE POLICY "centers_owner_write" ON public.centers
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "centers_owner_update" ON public.centers
    FOR UPDATE USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    ) WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "centers_owner_delete" ON public.centers
    FOR DELETE USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

-- ── workouts: visible para cualquier usuario CON sesion (asi ya      ──
-- funciona hoy la app: ver el entreno de otro atleta desde su perfil ──
-- es una funcion real), pero ya NO para visitantes sin login ─────────
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workouts', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workouts_select_authenticated" ON public.workouts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "workouts_owner_write" ON public.workouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_owner_update" ON public.workouts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workouts_owner_delete" ON public.workouts
    FOR DELETE USING (auth.uid() = user_id);

-- ── workout_sets: mismo criterio, a traves del workout padre ──────
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_sets' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.workout_sets', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_sets_select_authenticated" ON public.workout_sets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "workout_sets_owner_write" ON public.workout_sets
    FOR INSERT WITH CHECK (
        workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid())
    );

CREATE POLICY "workout_sets_owner_update" ON public.workout_sets
    FOR UPDATE USING (
        workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid())
    ) WITH CHECK (
        workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid())
    );

CREATE POLICY "workout_sets_owner_delete" ON public.workout_sets
    FOR DELETE USING (
        workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid())
    );
