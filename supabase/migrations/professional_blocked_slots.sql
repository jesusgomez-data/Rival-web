-- =====================================================================
-- RIVAL FIT — Slots bloqueados por el profesional
-- Permite bloquear horas concretas dentro del horario de disponibilidad
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.professional_blocked_slots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    date            DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    reason          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.professional_blocked_slots ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver los bloques (para mostrar "no disponible" en el perfil público)
CREATE POLICY "Blocked slots publicly viewable"
    ON public.professional_blocked_slots FOR SELECT
    USING (true);

-- Solo el propietario puede gestionar sus bloques
CREATE POLICY "Owner manages own blocked slots"
    ON public.professional_blocked_slots FOR ALL
    USING (
        organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_blocked_slots_org_date
    ON public.professional_blocked_slots(organization_id, date);
