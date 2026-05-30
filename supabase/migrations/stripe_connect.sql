-- ============================================================
-- Stripe Connect: columnas en organizations
-- Ejecuta esto en Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Índice para que el webhook encuentre la org rápido por stripe_account_id
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_account_id
  ON organizations (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- ============================================================
-- (Opcional) Historial de pagos de membresías
-- Útil para mostrar ingresos al centro y recibos al alumno
-- ============================================================

CREATE TABLE IF NOT EXISTS membership_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  plan_id             UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
  stripe_payment_id   TEXT,                      -- pi_XXXX
  amount_cents        INTEGER NOT NULL,          -- total cobrado (céntimos)
  platform_fee_cents  INTEGER NOT NULL DEFAULT 0, -- comisión Rival
  center_amount_cents INTEGER NOT NULL DEFAULT 0, -- lo que recibe el centro
  currency            TEXT NOT NULL DEFAULT 'eur',
  status              TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | failed | refunded
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo el dueño del centro y el propio alumno pueden ver sus pagos
ALTER TABLE membership_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Center owner sees own payments"
  ON membership_payments FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "User sees own payments"
  ON membership_payments FOR SELECT
  USING (user_id = auth.uid());
