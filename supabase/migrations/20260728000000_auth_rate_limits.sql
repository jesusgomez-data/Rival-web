-- ═══════════════════════════════════════════════════════════════
-- RATE LIMITING DE LOGIN Y REGISTRO
-- Cada intento (exitoso o fallido) de login/registro se registra aqui.
-- El server action consulta cuantos intentos recientes hay por email
-- y por IP antes de dejar pasar uno nuevo. Solo el service role
-- (server actions, nunca el cliente) puede leer/escribir esta tabla.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.auth_rate_limits (
    id uuid primary key default gen_random_uuid(),
    identifier text not null,             -- email o IP
    attempt_type text not null,           -- 'login' | 'signup'
    success boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_auth_rate_limits_lookup
    on public.auth_rate_limits (identifier, attempt_type, created_at desc);

-- Borra automaticamente registros de mas de 24h para que la tabla no crezca sin limite
create index if not exists idx_auth_rate_limits_created_at
    on public.auth_rate_limits (created_at);

alter table public.auth_rate_limits enable row level security;

-- Nadie puede leer/escribir directamente desde el cliente (anon/authenticated).
-- Solo el service role (usado exclusivamente en server actions) accede.
drop policy if exists "auth_rate_limits_no_client_access" on public.auth_rate_limits;
create policy "auth_rate_limits_no_client_access" on public.auth_rate_limits
    for all using (false) with check (false);
