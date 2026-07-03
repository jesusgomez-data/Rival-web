-- ═══════════════════════════════════════════════════════════════
-- HISTORIAL DE PAGOS DE MEMBRESÍA + FACTURAS DESCARGABLES
-- El webhook de Stripe inserta una fila por cada cobro con los
-- enlaces de factura/recibo que genera el propio Stripe.
--
-- NOTA: existía una tabla membership_payments antigua (creada por
-- stripe_connect.sql) con otro esquema y sin ningún uso en el
-- código. Se reemplaza. Estaba vacía: nada escribía en ella.
-- ═══════════════════════════════════════════════════════════════

drop table if exists public.membership_payments cascade;

create table public.membership_payments (
    id uuid primary key default gen_random_uuid(),
    center_id uuid not null references public.organizations(id) on delete cascade,
    member_id uuid references public.members(id) on delete set null,
    user_id uuid references public.profiles(id) on delete set null,
    plan_name text,
    amount numeric(10,2) not null default 0,
    currency text not null default 'eur',
    stripe_ref text unique,          -- session.id (pago único) o invoice.id (suscripción)
    invoice_url text,                -- factura online de Stripe
    invoice_pdf text,                -- PDF descargable de Stripe
    receipt_url text,                -- recibo (pagos únicos)
    paid_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index idx_membership_payments_user
    on public.membership_payments (user_id, paid_at desc);
create index idx_membership_payments_center
    on public.membership_payments (center_id, paid_at desc);

alter table public.membership_payments enable row level security;

-- El alumno ve sus propios pagos
create policy "membership_payments_select_own" on public.membership_payments
    for select using (auth.uid() = user_id);

-- El staff del centro ve los pagos de su centro
create policy "membership_payments_select_staff" on public.membership_payments
    for select using (
        exists (
            select 1 from public.organizations o
            where o.id = membership_payments.center_id
              and (o.owner_id = auth.uid() or o.head_coach_id = auth.uid())
        )
        or exists (
            select 1 from public.center_roles cr
            where cr.organization_id = membership_payments.center_id
              and cr.user_id = auth.uid()
        )
    );

-- Las inserciones las hace solo el webhook (service role, salta RLS)

notify pgrst, 'reload schema';
