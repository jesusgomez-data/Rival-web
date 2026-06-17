-- Member leave request system
-- Members can request to leave a center; admins approve or reject

CREATE TABLE IF NOT EXISTS public.member_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    reason TEXT,
    response_reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(member_id, status) -- only one pending request per member
);

ALTER TABLE public.member_leave_requests ENABLE ROW LEVEL SECURITY;

-- Members can read their own requests
CREATE POLICY "member_leave_requests_select_own" ON public.member_leave_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Members can insert their own requests
CREATE POLICY "member_leave_requests_insert_own" ON public.member_leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read leave requests for their centers (via service role in actions)
-- Handled by admin client in server actions
