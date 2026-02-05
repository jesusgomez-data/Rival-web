
-- SUPPORT SYSTEM TABLES

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    category TEXT DEFAULT 'technical', -- 'technical', 'billing', 'feature_request', 'other'
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS POLICIES
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Tickets: Users can see their own (or their org's). Admins can see all.
-- For simplicity in this demo, we'll allow authenticated users to select their own.
-- A real admin policy would check a specific role. We will assume anyone with access to /admin page is an admin for now (logic handled in page/layout).
-- Ideally: 
-- CREATE POLICY "Admins view all" ON public.support_tickets FOR ALL USING (auth.jwt()->>'role' = 'service_role' OR auth.uid() IN (SELECT id FROM admins));

-- For this iteration:
-- 1. Users can insert their own tickets.
CREATE POLICY "Users create their own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Users can view their own tickets.
CREATE POLICY "Users view their own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);

-- 3. We need an "Admin" role or just allow public read for the demo account?
-- Let's stick to Server Actions `supabase.rpc` or `service_role` client for Admin dashboard to bypass RLS for simplicity and security, 
-- OR add a policy that allows the specific admin user to see everything.
-- Assuming the current user IS the admin/developer.

CREATE POLICY "Users view messages of their tickets" ON public.support_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = support_messages.ticket_id AND user_id = auth.uid())
);

CREATE POLICY "Users send messages to their tickets" ON public.support_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = support_messages.ticket_id AND user_id = auth.uid())
);
