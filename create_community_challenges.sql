-- =====================================================
-- COMMUNITY CHALLENGES SYSTEM
-- Complete database setup for community challenges
-- =====================================================

-- 1. Create community_challenges table
CREATE TABLE IF NOT EXISTS public.community_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    goal_type TEXT NOT NULL, -- 'distance', 'volume', 'workouts', 'streak', etc.
    goal_value NUMERIC NOT NULL, -- Target value (e.g., 100 for 100km)
    goal_unit TEXT, -- 'km', 'kg', 'workouts', 'days', etc.
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create challenge_participants table
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.community_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_progress NUMERIC DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(challenge_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_active ON public.community_challenges(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_challenge ON public.challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_completed ON public.challenge_participants(is_completed);

-- 4. Enable Row Level Security
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for community_challenges

-- Everyone can view active challenges
DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.community_challenges;
CREATE POLICY "Anyone can view active challenges"
    ON public.community_challenges
    FOR SELECT
    USING (is_active = true);

-- Admins can insert challenges
DROP POLICY IF EXISTS "Admins can create challenges" ON public.community_challenges;
CREATE POLICY "Admins can create challenges"
    ON public.community_challenges
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admins can update challenges
DROP POLICY IF EXISTS "Admins can update challenges" ON public.community_challenges;
CREATE POLICY "Admins can update challenges"
    ON public.community_challenges
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admins can delete challenges
DROP POLICY IF EXISTS "Admins can delete challenges" ON public.community_challenges;
CREATE POLICY "Admins can delete challenges"
    ON public.community_challenges
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 6. RLS Policies for challenge_participants

-- Users can view all participants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.challenge_participants;
CREATE POLICY "Anyone can view participants"
    ON public.challenge_participants
    FOR SELECT
    USING (true);

-- Users can join challenges
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
CREATE POLICY "Users can join challenges"
    ON public.challenge_participants
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
DROP POLICY IF EXISTS "Users can update own progress" ON public.challenge_participants;
CREATE POLICY "Users can update own progress"
    ON public.challenge_participants
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can leave challenges (delete their participation)
DROP POLICY IF EXISTS "Users can leave challenges" ON public.challenge_participants;
CREATE POLICY "Users can leave challenges"
    ON public.challenge_participants
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Create function to update challenge progress automatically
CREATE OR REPLACE FUNCTION update_challenge_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as completed if goal is reached
    IF NEW.current_progress >= (
        SELECT goal_value FROM public.community_challenges WHERE id = NEW.challenge_id
    ) THEN
        NEW.is_completed = true;
        NEW.completed_at = NOW();
        
        -- Award XP to user
        UPDATE public.profiles
        SET xp_points = xp_points + (
            SELECT xp_reward FROM public.community_challenges WHERE id = NEW.challenge_id
        )
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger for automatic progress updates
DROP TRIGGER IF EXISTS trigger_update_challenge_progress ON public.challenge_participants;
CREATE TRIGGER trigger_update_challenge_progress
    BEFORE UPDATE ON public.challenge_participants
    FOR EACH ROW
    WHEN (OLD.current_progress IS DISTINCT FROM NEW.current_progress)
    EXECUTE FUNCTION update_challenge_progress();

-- 9. Insert sample challenges for testing
INSERT INTO public.community_challenges (title, description, xp_reward, goal_type, goal_value, goal_unit, is_active)
VALUES 
    ('RUTA DE LOS 100KM', 'Corre un total de 100km este mes.', 2500, 'distance', 100, 'km', true),
    ('VOLUMEN EXTREMO', 'Mueve 100,000kg en total entre todos tus entrenos.', 5000, 'volume', 100000, 'kg', true),
    ('GUERRERO CONSTANTE', 'Completa 20 entrenamientos este mes.', 3000, 'workouts', 20, 'sesiones', true),
    ('RACHA IMPARABLE', 'Entrena 7 días seguidos sin fallar.', 1500, 'streak', 7, 'días', true)
ON CONFLICT DO NOTHING;

-- 10. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- The community challenges system is now fully functional!
-- Users can:
-- - View active challenges
-- - Join challenges
-- - Track their progress
-- - Earn XP rewards automatically when completing challenges
-- =====================================================
