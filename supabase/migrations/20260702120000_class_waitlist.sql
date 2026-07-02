-- ═══════════════════════════════════════════════════════════════
-- LISTA DE ESPERA DE CLASES (class_waitlist)
-- Cuando una clase está llena, los alumnos pueden apuntarse.
-- Al liberarse una plaza (cancelación o aumento de aforo), el
-- primero de la lista se inscribe automáticamente y recibe aviso.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.class_waitlist (
    id uuid primary key default gen_random_uuid(),
    class_id uuid not null references public.classes(id) on delete cascade,
    member_id uuid not null references public.members(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (class_id, member_id)
);

create index if not exists idx_class_waitlist_class_created
    on public.class_waitlist (class_id, created_at);

alter table public.class_waitlist enable row level security;

-- El alumno gestiona su propia entrada en la lista
drop policy if exists "class_waitlist_insert_own" on public.class_waitlist;
create policy "class_waitlist_insert_own" on public.class_waitlist
    for insert with check (
        member_id in (select id from public.members where user_id = auth.uid())
    );

drop policy if exists "class_waitlist_delete_own" on public.class_waitlist;
create policy "class_waitlist_delete_own" on public.class_waitlist
    for delete using (
        member_id in (select id from public.members where user_id = auth.uid())
    );

-- Pueden VER la lista: miembros del centro y staff (owner/head_coach/coach)
drop policy if exists "class_waitlist_select_center" on public.class_waitlist;
create policy "class_waitlist_select_center" on public.class_waitlist
    for select using (
        exists (
            select 1 from public.classes c
            join public.members m on m.center_id = c.organization_id
            where c.id = class_waitlist.class_id and m.user_id = auth.uid()
        )
        or exists (
            select 1 from public.classes c
            join public.center_roles cr on cr.organization_id = c.organization_id
            where c.id = class_waitlist.class_id and cr.user_id = auth.uid()
        )
        or exists (
            select 1 from public.classes c
            join public.organizations o on o.id = c.organization_id
            where c.id = class_waitlist.class_id
              and (o.owner_id = auth.uid() or o.head_coach_id = auth.uid())
        )
    );
