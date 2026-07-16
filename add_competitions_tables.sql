-- competitions table
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'OTHER', -- HYROX, CROSSFIT, OCR, RUNNING, TRIATHLON, HYBRID, OTHER
    sport TEXT,
    date TIMESTAMPTZ NOT NULL,
    location TEXT,
    image_url TEXT,
    registration_url TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'finished'
    organizer_id UUID REFERENCES public.profiles(id),
    max_participants INTEGER,
    registration_deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- competition registrations
CREATE TABLE IF NOT EXISTS public.competition_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'confirmed', -- confirmed, cancelled
    UNIQUE(competition_id, user_id)
);

-- competition results
CREATE TABLE IF NOT EXISTS public.competition_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    score TEXT, -- time, points, etc (free text)
    notes TEXT,
    medal_type TEXT, -- 'gold', 'silver', 'bronze', 'fourth' (auto-set based on position)
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(competition_id, user_id)
);

-- RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competitions_public_read" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "competitions_admin_all" ON public.competitions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_official = true)
);
CREATE POLICY "registrations_public_read" ON public.competition_registrations FOR SELECT USING (true);
CREATE POLICY "registrations_own_insert" ON public.competition_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "registrations_own_delete" ON public.competition_registrations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "results_public_read" ON public.competition_results FOR SELECT USING (true);
CREATE POLICY "results_admin_all" ON public.competition_results FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_official = true)
);
