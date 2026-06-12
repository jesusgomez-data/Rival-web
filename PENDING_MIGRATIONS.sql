-- =====================================================================
-- RIVAL FIT — Migraciones pendientes en produccion (Supabase SQL Editor)
-- =====================================================================
-- El barrido QA detecto que la tabla `gym_events` (eventos del centro que
-- se muestran en la barra lateral de Comunidad) NO existe en produccion,
-- lo que provoca un 404 en /dashboard/community. La app NO crashea (degrada
-- bien), pero para habilitar la funcion y quitar el error, ejecuta esto.
--
-- Ya aplicado por ti previamente: SECURITY_HARDENING.sql (proteccion RLS).
-- =====================================================================

-- ---------- gym_events: eventos por centro ----------
CREATE TABLE IF NOT EXISTS public.gym_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    center_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'past')),
    event_type TEXT NOT NULL DEFAULT 'social' CHECK (event_type IN ('competition', 'social', 'class', 'challenge')),
    attendees_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gym_events ENABLE ROW LEVEL SECURITY;

-- Los miembros del gym ven sus eventos
DROP POLICY IF EXISTS "Members view gym events" ON public.gym_events;
CREATE POLICY "Members view gym events"
    ON public.gym_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.center_id = gym_events.center_id
              AND members.user_id = auth.uid()
              AND members.status IN ('active', 'trial')
        )
    );

-- El dueno del centro gestiona los eventos
DROP POLICY IF EXISTS "Gym admin manage events" ON public.gym_events;
CREATE POLICY "Gym admin manage events"
    ON public.gym_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE organizations.id = gym_events.center_id
              AND organizations.owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_gym_events_center_id ON public.gym_events(center_id);
CREATE INDEX IF NOT EXISTS idx_gym_events_status ON public.gym_events(status);

-- Recargar el cache de esquema de PostgREST
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- Verificacion: tras ejecutar, /dashboard/community ya no debe dar 404.
-- =====================================================================
