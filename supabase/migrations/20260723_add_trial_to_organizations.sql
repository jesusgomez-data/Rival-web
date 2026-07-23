-- Añadir columna trial_ends_at a organizations para gestionar el periodo de prueba gratuito de 2 meses
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Añadir columna subscription_status para gestionar el estado de la suscripción
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));

-- Para los centros existentes con plan 'free' que aún no tienen trial_ends_at, asignar 2 meses desde su created_at
UPDATE public.organizations
  SET trial_ends_at = created_at + INTERVAL '2 months',
      subscription_status = 'trial'
  WHERE trial_ends_at IS NULL AND plan = 'free';

-- Función para verificar si un centro está en periodo de prueba activo
CREATE OR REPLACE FUNCTION public.is_trial_active(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT trial_ends_at > NOW() FROM public.organizations WHERE id = org_id),
    FALSE
  );
$$;
