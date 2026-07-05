-- ═══════════════════════════════════════════════════════════════
-- MIS MARCAS: catálogo de competencias gestionable por el admin
-- (HYROX de serie; Deka, ATHX y futuras las crea el admin desde
-- la propia app sin tocar código). Los resultados existentes de
-- HYROX se conservan y quedan asociados a competition_slug='hyrox'.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.competitions_catalog (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    name text not null,
    description text,
    -- [{ "key": "run_1", "label": "Run 1 · 1 km", "shortLabel": "Run 1", "type": "run" | "station" }]
    segments jsonb not null,
    is_active boolean not null default true,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now()
);

alter table public.competitions_catalog enable row level security;

-- Todos los usuarios autenticados pueden ver el catálogo activo
drop policy if exists "competitions_select_all" on public.competitions_catalog;
create policy "competitions_select_all" on public.competitions_catalog
    for select using (auth.role() = 'authenticated');

-- Escritura: solo el service role (las acciones de admin de la app)

-- Semilla: HYROX oficial (16 segmentos)
insert into public.competitions_catalog (slug, name, description, segments)
values (
    'hyrox',
    'HYROX',
    '8 runs de 1 km + 8 estaciones en orden oficial',
    '[
        {"key":"run_1","label":"Run 1 · 1 km","shortLabel":"Run 1","type":"run"},
        {"key":"ski_erg","label":"1000m SkiErg","shortLabel":"SkiErg","type":"station"},
        {"key":"run_2","label":"Run 2 · 1 km","shortLabel":"Run 2","type":"run"},
        {"key":"sled_push","label":"50m Sled Push","shortLabel":"Sled Push","type":"station"},
        {"key":"run_3","label":"Run 3 · 1 km","shortLabel":"Run 3","type":"run"},
        {"key":"sled_pull","label":"50m Sled Pull","shortLabel":"Sled Pull","type":"station"},
        {"key":"run_4","label":"Run 4 · 1 km","shortLabel":"Run 4","type":"run"},
        {"key":"burpee_broad_jump","label":"80m Burpee Broad Jumps","shortLabel":"Burpee BJ","type":"station"},
        {"key":"run_5","label":"Run 5 · 1 km","shortLabel":"Run 5","type":"run"},
        {"key":"row","label":"1000m Row","shortLabel":"Row","type":"station"},
        {"key":"run_6","label":"Run 6 · 1 km","shortLabel":"Run 6","type":"run"},
        {"key":"farmers_carry","label":"200m Farmers Carry","shortLabel":"Farmers","type":"station"},
        {"key":"run_7","label":"Run 7 · 1 km","shortLabel":"Run 7","type":"run"},
        {"key":"sandbag_lunges","label":"100m Sandbag Lunges","shortLabel":"Lunges","type":"station"},
        {"key":"run_8","label":"Run 8 · 1 km","shortLabel":"Run 8","type":"run"},
        {"key":"wall_balls","label":"100 Wall Balls","shortLabel":"Wall Balls","type":"station"}
    ]'::jsonb
)
on conflict (slug) do nothing;

-- Generalizar la tabla de resultados
alter table public.hyrox_results
    add column if not exists competition_slug text not null default 'hyrox';
alter table public.hyrox_results
    add column if not exists segments_snapshot jsonb;

create index if not exists idx_hyrox_results_user_comp
    on public.hyrox_results (user_id, competition_slug, performed_at desc);

notify pgrst, 'reload schema';
