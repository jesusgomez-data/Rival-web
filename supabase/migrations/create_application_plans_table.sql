-- Migration: Create application_plans table and seed initial data
create table if not exists public.application_plans (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    price text not null,
    features text[] not null,
    type text not null check (type in ('center', 'user')),
    plan_key text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.application_plans enable row level security;

-- Policies
drop policy if exists "Permitir lectura pública de planes" on public.application_plans;
create policy "Permitir lectura pública de planes" on public.application_plans
    for select using (true);

drop policy if exists "Permitir gestión total a administradores" on public.application_plans;
create policy "Permitir gestión total a administradores" on public.application_plans
    for all using (
        (auth.jwt() ->> 'email') in ('rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com')
    );

-- Seed initial plans
insert into public.application_plans (name, price, features, type, plan_key) values
('Starter (Centro)', '49.99€', array['Hasta 50 miembros', '10 clases/sem'], 'center', 'starter'),
('Pro (Centro)', '99.99€', array['Ilimitado', 'WOD Generator'], 'center', 'pro'),
('Premium (Atleta)', '4.99€', array['Sin anuncios', 'Analíticas Pro'], 'user', 'premium'),
('Elite (Atleta)', '9.99€', array['Coach 1-a-1', 'Acceso Global'], 'user', 'elite')
on conflict (plan_key) do update set
    name = excluded.name,
    price = excluded.price,
    features = excluded.features,
    type = excluded.type;
