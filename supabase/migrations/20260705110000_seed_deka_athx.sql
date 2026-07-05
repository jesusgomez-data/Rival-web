-- ═══════════════════════════════════════════════════════════════
-- SEMILLAS: DEKA FIT y ATHX GAMES en el catálogo de competencias
-- Formatos verificados en fuentes oficiales (jul 2026):
--  · DEKA FIT: 10 zonas, cada una precedida de 500m de carrera (5K total)
--  · ATHX: 3 eventos puntuados (las pruebas varían por edición)
-- ═══════════════════════════════════════════════════════════════

insert into public.competitions_catalog (slug, name, description, segments)
values (
    'deka-fit',
    'DEKA FIT',
    '10 zonas funcionales, cada una precedida de 500m de carrera (5K total)',
    '[
        {"key":"run_1","label":"Run 1 · 500m","shortLabel":"Run 1","type":"run"},
        {"key":"zone_1","label":"Z1 · 30 Reverse Lunges con peso","shortLabel":"Lunges","type":"station"},
        {"key":"run_2","label":"Run 2 · 500m","shortLabel":"Run 2","type":"run"},
        {"key":"zone_2","label":"Z2 · 500m Row","shortLabel":"Row","type":"station"},
        {"key":"run_3","label":"Run 3 · 500m","shortLabel":"Run 3","type":"run"},
        {"key":"zone_3","label":"Z3 · 20 Box Jump Overs","shortLabel":"Box Jumps","type":"station"},
        {"key":"run_4","label":"Run 4 · 500m","shortLabel":"Run 4","type":"run"},
        {"key":"zone_4","label":"Z4 · 25 Med Ball Sit-Up Throws","shortLabel":"Sit-Up Throw","type":"station"},
        {"key":"run_5","label":"Run 5 · 500m","shortLabel":"Run 5","type":"run"},
        {"key":"zone_5","label":"Z5 · 500m Ski Erg","shortLabel":"Ski Erg","type":"station"},
        {"key":"run_6","label":"Run 6 · 500m","shortLabel":"Run 6","type":"run"},
        {"key":"zone_6","label":"Z6 · 100m Farmers Carry","shortLabel":"Farmers","type":"station"},
        {"key":"run_7","label":"Run 7 · 500m","shortLabel":"Run 7","type":"run"},
        {"key":"zone_7","label":"Z7 · 25 cal Air Bike","shortLabel":"Air Bike","type":"station"},
        {"key":"run_8","label":"Run 8 · 500m","shortLabel":"Run 8","type":"run"},
        {"key":"zone_8","label":"Z8 · 20 Dead Ball Wall Overs","shortLabel":"Wall Overs","type":"station"},
        {"key":"run_9","label":"Run 9 · 500m","shortLabel":"Run 9","type":"run"},
        {"key":"zone_9","label":"Z9 · 100m Tank Push/Pull","shortLabel":"Tank","type":"station"},
        {"key":"run_10","label":"Run 10 · 500m","shortLabel":"Run 10","type":"run"},
        {"key":"zone_10","label":"Z10 · 20 Burpees con peso","shortLabel":"Burpees","type":"station"}
    ]'::jsonb
)
on conflict (slug) do nothing;

insert into public.competitions_catalog (slug, name, description, segments)
values (
    'athx',
    'ATHX GAMES',
    '3 eventos puntuados: Fuerza · Endurance · Metcon X (las pruebas varían por edición)',
    '[
        {"key":"strength","label":"Evento 1 · Strength Zone (levantamientos)","shortLabel":"Fuerza","type":"station"},
        {"key":"endurance","label":"Evento 2 · Endurance Zone (run/row)","shortLabel":"Endurance","type":"run"},
        {"key":"metcon_x","label":"Evento 3 · Metcon X (circuito funcional)","shortLabel":"Metcon X","type":"station"}
    ]'::jsonb
)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
