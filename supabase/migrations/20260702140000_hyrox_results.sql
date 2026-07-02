-- ═══════════════════════════════════════════════════════════════
-- MÓDULO HYROX: simulacros y carreras con splits por segmento
-- 16 segmentos: 8 runs de 1km + 8 estaciones, en orden oficial.
-- splits = jsonb { run_1: seg, ski_erg: seg, run_2: seg, ... }
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.hyrox_results (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    performed_at date not null default current_date,
    category text not null default 'open',          -- open | pro | doubles | relay
    is_official boolean not null default false,      -- carrera oficial vs simulacro
    total_seconds integer not null check (total_seconds > 0),
    splits jsonb not null default '{}'::jsonb,
    notes text,
    created_at timestamptz not null default now()
);

create index if not exists idx_hyrox_results_user
    on public.hyrox_results (user_id, performed_at desc);

alter table public.hyrox_results enable row level security;

drop policy if exists "hyrox_select_own" on public.hyrox_results;
create policy "hyrox_select_own" on public.hyrox_results
    for select using (auth.uid() = user_id);

drop policy if exists "hyrox_insert_own" on public.hyrox_results;
create policy "hyrox_insert_own" on public.hyrox_results
    for insert with check (auth.uid() = user_id);

drop policy if exists "hyrox_update_own" on public.hyrox_results;
create policy "hyrox_update_own" on public.hyrox_results
    for update using (auth.uid() = user_id);

drop policy if exists "hyrox_delete_own" on public.hyrox_results;
create policy "hyrox_delete_own" on public.hyrox_results
    for delete using (auth.uid() = user_id);
