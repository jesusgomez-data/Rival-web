-- Run this in Supabase SQL Editor
-- Creates the gym_events table for per-center events shown in Community sidebar

CREATE TABLE IF NOT EXISTS public.gym_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    center_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('active', 'upcoming', 'past')),
    event_type TEXT NOT NULL DEFAULT 'social' CHECK (event_type IN ('competition', 'social', 'class', 'challenge')),
    attendees_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.gym_events ENABLE ROW LEVEL SECURITY;

-- Members of the gym can view its events
CREATE POLICY "Members view gym events"
    ON public.gym_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE members.center_id = gym_events.center_id
              AND members.user_id = auth.uid()
              AND members.status IN ('active', 'trial')
        )
    );

-- Gym admins (owners of the organization) can insert/update/delete events
CREATE POLICY "Gym admin manage events"
    ON public.gym_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE organizations.id = gym_events.center_id
              AND organizations.owner_id = auth.uid()
        )
    );

-- Index for fast lookup by center
CREATE INDEX IF NOT EXISTS idx_gym_events_center_id ON public.gym_events(center_id);
CREATE INDEX IF NOT EXISTS idx_gym_events_status ON public.gym_events(status);
