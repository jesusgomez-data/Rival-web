-- =====================================================================
-- RIVAL FIT — Endurecimiento de seguridad v2 (column-level privacy)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- Fecha: 2026-06-11
-- =====================================================================
--
-- POR QUE LA v1 NO FUNCIONO:
--   En PostgreSQL, un `GRANT SELECT ON tabla` cubre TODAS las columnas.
--   Un `REVOKE SELECT (columna)` NO puede restar de ese grant de tabla.
--   La forma correcta es: revocar el SELECT de TABLA al rol `anon` y
--   volver a conceder SELECT solo sobre las columnas seguras.
--
-- QUE OCULTAMOS AL VISITANTE ANONIMO (sin login):
--   profiles      -> phone, email, birth_date, stripe_customer_id
--   organizations -> email, monthly_revenue, stripe_customer_id,
--                    stripe_account_id, stripe_onboarding_complete
--
-- El rol `authenticated` (usuarios con sesion) NO se toca: la app sigue
-- funcionando igual. Esto cierra el agujero real: cualquiera en internet
-- con la anon key (que viaja en el bundle) podia volcar estos datos.
-- =====================================================================

-- ---------- PROFILES ----------
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT (
  id, username, full_name, avatar_url, bio, main_sport, level, gym_home,
  xp_points, created_at, updated_at, privacy_setting, cover_url, cover_position,
  subscription_tier, status, featured_rms, is_official, birth_date_public,
  power_stat, endurance_stat, agility_stat, consistency_stat, gender,
  location, website
) ON public.profiles TO anon;

-- ---------- ORGANIZATIONS ----------
REVOKE SELECT ON public.organizations FROM anon;

GRANT SELECT (
  id, name, center_type, country, city, address, phone, website, plan,
  verified, is_public, owner_id, logo_url, cover_photo_url, bio, member_count,
  followers_count, created_at, updated_at, head_coach_id, instagram, zip_code,
  cover_position, is_multi_center, latitude, longitude, war_points, gallery_urls,
  tiktok, youtube, facebook, twitter, amenities, opening_hours, founded_year,
  capacity, center_specialties, specialties, modality, languages,
  years_experience, certifications
) ON public.organizations TO anon;

-- ---------- Recargar el cache de esquema de PostgREST ----------
-- (sin esto, el cambio puede tardar en aplicarse en la API REST)
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- VERIFICACION:
--   Vuelve a ejecutar en tu terminal:
--     node security_rls_probe.js
--   profiles y organizations deben aparecer SIN la columna phone/email
--   (las filas siguen siendo visibles, pero phone/email/revenue ya NO).
--
-- Si el probe hace `select('id, phone')` y ahora da error de permiso en
-- esa columna, es exactamente lo que queremos: el dato esta protegido.
-- =====================================================================
