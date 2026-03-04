-- ============================================================
-- Body Stats Tracker
-- ============================================================
CREATE TABLE IF NOT EXISTS public.body_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg NUMERIC(5,2),
    body_fat_pct NUMERIC(4,1),
    -- Measurements in cm
    chest_cm NUMERIC(5,1),
    waist_cm NUMERIC(5,1),
    hips_cm NUMERIC(5,1),
    bicep_cm NUMERIC(5,1),
    thigh_cm NUMERIC(5,1),
    calf_cm NUMERIC(5,1),
    shoulder_cm NUMERIC(5,1),
    neck_cm NUMERIC(5,1),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.body_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own body stats" ON public.body_stats;
CREATE POLICY "Users can manage their own body stats" ON public.body_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS body_stats_user_date ON public.body_stats(user_id, recorded_at DESC);

-- ============================================================
-- Nutrition Log (Daily Macro Tracker)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- Targets (set by user)
    target_calories INT,
    target_protein_g INT,
    target_carbs_g INT,
    target_fat_g INT,
    target_water_ml INT DEFAULT 2500,
    -- Actuals (logged by user)
    actual_calories INT DEFAULT 0,
    actual_protein_g INT DEFAULT 0,
    actual_carbs_g INT DEFAULT 0,
    actual_fat_g INT DEFAULT 0,
    actual_water_ml INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Users can manage their own nutrition logs" ON public.nutrition_logs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Daily Check-in / Recovery Score
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    energy_level INT CHECK (energy_level BETWEEN 1 AND 10),   -- 1=exhausted, 10=beast
    sleep_hours NUMERIC(3,1),
    sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
    muscle_soreness INT CHECK (muscle_soreness BETWEEN 1 AND 5), -- 1=none, 5=extreme
    motivation INT CHECK (motivation BETWEEN 1 AND 10),
    stress_level INT CHECK (stress_level BETWEEN 1 AND 10),
    recovery_score INT,  -- computed: 0-100
    mood TEXT CHECK (mood IN ('great', 'good', 'ok', 'tired', 'bad')),
    sore_muscles TEXT[],  -- e.g. ['chest','legs']
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, checkin_date)
);

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own checkins" ON public.daily_checkins;
CREATE POLICY "Users can manage their own checkins" ON public.daily_checkins
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- User Goals
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type TEXT NOT NULL, -- 'weight', 'body_fat', 'exercise_pr', 'workout_frequency', 'nutrition'
    title TEXT NOT NULL,
    description TEXT,
    target_value NUMERIC,
    current_value NUMERIC DEFAULT 0,
    unit TEXT,  -- 'kg', '%', 'reps', 'times/week'
    target_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.user_goals;
CREATE POLICY "Users can manage their own goals" ON public.user_goals
  FOR ALL USING (auth.uid() = user_id);
