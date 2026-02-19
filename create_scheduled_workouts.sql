-- Create scheduled_workouts table if not exists
CREATE TABLE IF NOT EXISTS public.scheduled_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    exercises JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own scheduled workouts
CREATE POLICY "Users can view own scheduled workouts" ON public.scheduled_workouts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own scheduled workouts OR coaches can via RPC/Server Actions (handled by Service Role or explicit policies)
-- Since we use Server Actions with Supabase Client (authenticated as user), we need policies for coaches to insert for others?
-- BUT `assignWorkoutToStudent` uses `createClient` from `@/utils/supabase/server`.
-- If `createClient` uses the cookie of the logged in user (the coach), then RLs will block insertion for another user_id unless we allow it.
-- However, if the coach is the logged in user, `auth.uid()` will be the coach.
-- `user_id` column is the student.
-- So `auth.uid() != user_id`.
-- We need a policy that allows coaches to insert workouts for their students.
-- This is complex to do in RLS alone without joining members table.

-- For now, let's allow users to insert for themselves.
CREATE POLICY "Users can insert own scheduled workouts" ON public.scheduled_workouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Check if user is a coach of the target user (via members table)
CREATE POLICY "Coaches can insert/update workouts for their members" ON public.scheduled_workouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.members m
            JOIN public.organizations o ON m.center_id = o.id
            WHERE m.user_id = scheduled_workouts.user_id
            AND (o.owner_id = auth.uid() OR o.head_coach_id = auth.uid())
        )
    );

-- Delete policy
CREATE POLICY "Users can delete own scheduled workouts" ON public.scheduled_workouts
    FOR DELETE USING (auth.uid() = user_id);
