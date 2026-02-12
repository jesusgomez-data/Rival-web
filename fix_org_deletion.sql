
-- FIX FOR ORGANIZATION DELETION (CASCADE)
-- Run this in Supabase SQL Editor to allow organization deletion

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. CENTERS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'centers') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.centers'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.centers'::regclass AND attname = 'organization_id')]
        LOOP EXECUTE 'ALTER TABLE public.centers DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.centers ADD CONSTRAINT centers_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 2. CENTER ROLES
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'center_roles') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.center_roles'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.center_roles'::regclass AND attname = 'organization_id')]
        LOOP EXECUTE 'ALTER TABLE public.center_roles DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.center_roles ADD CONSTRAINT center_roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 3. MEMBERS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'members') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.members'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.members'::regclass AND attname = 'center_id')]
        LOOP EXECUTE 'ALTER TABLE public.members DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.members ADD CONSTRAINT members_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 4. CLASSES
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'classes') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.classes'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.classes'::regclass AND attname = 'organization_id')]
        LOOP EXECUTE 'ALTER TABLE public.classes DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.classes ADD CONSTRAINT classes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 5. MEMBERSHIP PLANS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'membership_plans') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.membership_plans'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.membership_plans'::regclass AND attname = 'organization_id')]
        LOOP EXECUTE 'ALTER TABLE public.membership_plans DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.membership_plans ADD CONSTRAINT membership_plans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 6. WODS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wods') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.wods'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.wods'::regclass AND attname = 'organization_id')]
        LOOP EXECUTE 'ALTER TABLE public.wods DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.wods ADD CONSTRAINT wods_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 7. TRIAL REQUESTS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'trial_requests') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.trial_requests'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.trial_requests'::regclass AND attname = 'organization_id')]
        LOOP EXECUTE 'ALTER TABLE public.trial_requests DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.trial_requests ADD CONSTRAINT trial_requests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- 8. SUPPORT TICKETS
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'support_tickets') THEN
        FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.support_tickets'::regclass AND contype = 'f' AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.support_tickets'::regclass AND attname = 'organization_id')]
        LOOP EXECUTE 'ALTER TABLE public.support_tickets DROP CONSTRAINT ' || quote_ident(r.conname); END LOOP;
        ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

END $$;
