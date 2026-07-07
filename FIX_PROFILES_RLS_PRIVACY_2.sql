-- =====================================================================
-- RIVAL FIT — Fix RLS profiles, parte 2: borrar la política fantasma
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- Fecha: 2026-07-07
-- =====================================================================
--
-- CHECK_PROFILES_POLICIES.sql reveló una tercera política de SELECT que
-- no tenía ninguno de los nombres que ya intentamos borrar:
--
--   policyname       = "Public profiles"
--   using_expression = true
--
-- Al ser PERMISSIVE, Postgres combina todas las políticas de SELECT con
-- OR — así que aunque "Public profiles are discoverable" ya filtraba
-- bien por privacy_setting, esta otra decía "true" y ganaba igual.
-- =====================================================================

DROP POLICY IF EXISTS "Public profiles" ON public.profiles;

-- Verificación rápida: debe quedar solo UNA política de SELECT
-- ("Public profiles are discoverable"), no dos.
SELECT policyname, cmd, qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT';
