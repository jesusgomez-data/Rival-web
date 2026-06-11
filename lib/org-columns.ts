// Columnas PUBLICAS de la tabla `organizations`: exactamente las concedidas
// al rol `anon` en SECURITY_HARDENING.sql.
//
// IMPORTANTE: en consultas que puede ejecutar un visitante SIN sesion
// (perfiles publicos de centro/entrenador), NO uses `select('*')`. El rol
// anon no tiene acceso a las columnas sensibles (email, monthly_revenue,
// stripe_*) y un `*` devuelve 42501 (permission denied) -> fila nula ->
// 404 / redirect. Usa esta lista en su lugar.
export const PUBLIC_ORG_COLUMNS =
    'id, name, center_type, country, city, address, phone, website, plan, ' +
    'verified, is_public, owner_id, logo_url, cover_photo_url, bio, member_count, ' +
    'followers_count, created_at, updated_at, head_coach_id, instagram, zip_code, ' +
    'cover_position, is_multi_center, latitude, longitude, war_points, gallery_urls, ' +
    'tiktok, youtube, facebook, twitter, amenities, opening_hours, founded_year, ' +
    'capacity, center_specialties, specialties, modality, languages, ' +
    'years_experience, certifications';
