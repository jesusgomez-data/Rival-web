-- ═══════════════════════════════════════════════════════════════
-- CATEGORÍAS PROPIAS POR COMPETENCIA
--  · HYROX: Open, Pro, Doubles, Relay
--  · DEKA FIT: Elite, Age Group, Open (categorías oficiales de registro)
--  · ATHX: Pro, Individual, Parejas, Age Group
-- ═══════════════════════════════════════════════════════════════

alter table public.competitions_catalog
    add column if not exists categories jsonb;

update public.competitions_catalog set categories = '[
    {"value":"open","label":"Open"},
    {"value":"pro","label":"Pro"},
    {"value":"doubles","label":"Doubles"},
    {"value":"relay","label":"Relay"}
]'::jsonb where slug = 'hyrox';

update public.competitions_catalog set categories = '[
    {"value":"elite","label":"Elite"},
    {"value":"age-group","label":"Age Group"},
    {"value":"open","label":"Open"}
]'::jsonb where slug = 'deka-fit';

update public.competitions_catalog set categories = '[
    {"value":"pro","label":"Pro"},
    {"value":"individual","label":"Individual"},
    {"value":"pairs","label":"Parejas"},
    {"value":"age-group","label":"Age Group"}
]'::jsonb where slug = 'athx';

notify pgrst, 'reload schema';
