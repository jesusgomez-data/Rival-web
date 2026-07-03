-- ═══════════════════════════════════════════════════════════════
-- COBRO RECURRENTE DE CUOTAS
-- - Los planes pueden marcarse como "renovación automática"
-- - El miembro guarda su suscripción de Stripe para renovar
--   membership_end_date en cada cobro (webhook)
-- ═══════════════════════════════════════════════════════════════

alter table public.membership_plans
    add column if not exists is_recurring boolean not null default false;

alter table public.members
    add column if not exists stripe_subscription_id text;

create index if not exists idx_members_stripe_subscription
    on public.members (stripe_subscription_id)
    where stripe_subscription_id is not null;
