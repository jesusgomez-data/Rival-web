-- Distingue cuentas nativas de centro (alta directa por /center-signup)
-- de atletas normales que ademas gestionan un centro desde dentro de la app.
-- Solo las primeras deben ver el menu reducido de negocio.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'athlete'
  CHECK (account_type IN ('athlete', 'business'));
