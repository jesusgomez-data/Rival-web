-- =====================================================================
-- RIVAL FIT — Marketplace de Profesionales (Fase 1)
-- Ejecutar en Supabase Dashboard → SQL Editor
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. SERVICIOS DEL PROFESIONAL
--    Cada profesional define los servicios que ofrece con su precio
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.professional_services (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name                TEXT NOT NULL,
    description         TEXT,
    price               NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    duration_minutes    INTEGER NOT NULL DEFAULT 60,
    -- presential | home | online  (puede ser más de uno)
    modalities          TEXT[] NOT NULL DEFAULT ARRAY['presential'],
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services are publicly viewable"
    ON public.professional_services FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Owner manages own services"
    ON public.professional_services FOR ALL
    USING (
        organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_prof_services_org
    ON public.professional_services(organization_id);


-- ─────────────────────────────────────────────────────────────────────
-- 2. DISPONIBILIDAD SEMANAL DEL PROFESIONAL
--    Franjas horarias recurrentes por día de la semana
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.professional_availability (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    day_of_week         INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Lun, 6=Dom
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability is publicly viewable"
    ON public.professional_availability FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Owner manages own availability"
    ON public.professional_availability FOR ALL
    USING (
        organization_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_prof_availability_org
    ON public.professional_availability(organization_id);


-- ─────────────────────────────────────────────────────────────────────
-- 3. RESERVAS DE SERVICIO — ciclo de vida completo
--    pending → accepted → paid → completed → paid_out
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_bookings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id             UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    client_id                   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    service_id                  UUID REFERENCES public.professional_services(id) ON DELETE SET NULL,

    -- Detalles de la cita
    service_name                TEXT NOT NULL,          -- copia en el momento de reservar
    service_price               NUMERIC(10,2) NOT NULL,
    duration_minutes            INTEGER NOT NULL DEFAULT 60,
    modality                    TEXT NOT NULL DEFAULT 'presential', -- presential | home | online
    scheduled_at                TIMESTAMPTZ,
    address                     TEXT,                  -- si es a domicilio
    notes                       TEXT,                  -- notas del cliente

    -- Estado del ciclo de vida
    status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN (
                                    'pending',           -- cliente envió solicitud
                                    'accepted',          -- profesional aceptó, espera pago
                                    'rejected',          -- profesional rechazó
                                    'paid',              -- cliente pagó, fondos en escrow
                                    'in_progress',       -- sesión en curso
                                    'completed_by_pro',  -- profesional confirma que terminó
                                    'completed_by_client',-- cliente confirma que terminó
                                    'completed',         -- ambos confirmaron → listo para payout
                                    'paid_out',          -- dinero enviado al profesional
                                    'cancelled',         -- cancelado por cliente o pro
                                    'disputed'           -- disputa abierta
                                )),
    rejection_reason            TEXT,

    -- Pagos
    platform_fee_pct            NUMERIC(5,2) DEFAULT 10.00, -- % comisión Rival Fit
    platform_fee_amount         NUMERIC(10,2),
    professional_payout_amount  NUMERIC(10,2),
    stripe_payment_intent_id    TEXT,
    stripe_transfer_id          TEXT,
    payment_captured_at         TIMESTAMPTZ,
    paid_out_at                 TIMESTAMPTZ,

    -- Timestamps de confirmación
    accepted_at                 TIMESTAMPTZ,
    rejected_at                 TIMESTAMPTZ,
    professional_completed_at   TIMESTAMPTZ,
    client_completed_at         TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client sees own bookings"
    ON public.service_bookings FOR SELECT
    USING (client_id = auth.uid());

CREATE POLICY "Professional sees bookings for their org"
    ON public.service_bookings FOR SELECT
    USING (
        professional_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Client can create bookings"
    ON public.service_bookings FOR INSERT
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Client can update own bookings"
    ON public.service_bookings FOR UPDATE
    USING (client_id = auth.uid());

CREATE POLICY "Professional can update their bookings"
    ON public.service_bookings FOR UPDATE
    USING (
        professional_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_service_bookings_pro
    ON public.service_bookings(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_client
    ON public.service_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_service_bookings_status
    ON public.service_bookings(status);


-- ─────────────────────────────────────────────────────────────────────
-- 4. CONVERSACIONES (chat 1:1 ligado a una reserva)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID REFERENCES public.service_bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
    professional_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    professional_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    last_message_at     TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see their conversations"
    ON public.service_conversations FOR SELECT
    USING (client_id = auth.uid() OR professional_user_id = auth.uid());

CREATE POLICY "System can insert conversations"
    ON public.service_conversations FOR INSERT
    WITH CHECK (client_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_service_conv_booking
    ON public.service_conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_service_conv_client
    ON public.service_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_service_conv_pro_user
    ON public.service_conversations(professional_user_id);


-- ─────────────────────────────────────────────────────────────────────
-- 5. MENSAJES DEL CHAT
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID REFERENCES public.service_conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content             TEXT NOT NULL,
    media_url           TEXT,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see messages in their conversations"
    ON public.service_messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.service_conversations
            WHERE client_id = auth.uid() OR professional_user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages"
    ON public.service_messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND conversation_id IN (
            SELECT id FROM public.service_conversations
            WHERE client_id = auth.uid() OR professional_user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_service_messages_conv
    ON public.service_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_service_messages_created
    ON public.service_messages(created_at DESC);

-- Habilitar Realtime para mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_conversations;


-- ─────────────────────────────────────────────────────────────────────
-- 6. RESEÑAS DE SERVICIOS (post-servicio completado)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID REFERENCES public.service_bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
    professional_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    client_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating              INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text         TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly viewable"
    ON public.service_reviews FOR SELECT USING (TRUE);

CREATE POLICY "Client can create review for own completed booking"
    ON public.service_reviews FOR INSERT
    WITH CHECK (
        client_id = auth.uid()
        AND booking_id IN (
            SELECT id FROM public.service_bookings
            WHERE client_id = auth.uid() AND status = 'paid_out'
        )
    );

CREATE INDEX IF NOT EXISTS idx_service_reviews_pro
    ON public.service_reviews(professional_id);


-- ─────────────────────────────────────────────────────────────────────
-- 7. TRIGGER: actualizar updated_at automáticamente
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_professional_services_updated_at
    BEFORE UPDATE ON public.professional_services
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_service_bookings_updated_at
    BEFORE UPDATE ON public.service_bookings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────
-- 8. COLUMNA: bank_account_info en organizations (para datos bancarios)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS bank_account_info JSONB;


-- Recargar schema PostgREST
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- FIN — Ejecutar completo en Supabase → SQL Editor
-- =====================================================================
