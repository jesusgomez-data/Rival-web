-- ═══════════════════════════════════════════════════════════════
-- FICHA DE ALUMNO: contacto de emergencia + vencimiento visible
-- ═══════════════════════════════════════════════════════════════

alter table public.members add column if not exists emergency_contact_name text;
alter table public.members add column if not exists emergency_contact_phone text;

-- Ya existe en el esquema base, pero por si el proyecto se creó sin ella:
alter table public.members add column if not exists membership_end_date date;

create index if not exists idx_members_membership_end
    on public.members (center_id, membership_end_date)
    where membership_end_date is not null;
