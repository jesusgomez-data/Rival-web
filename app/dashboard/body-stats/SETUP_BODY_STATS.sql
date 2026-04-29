-- Run this in Supabase SQL Editor

-- 1. Create body_stats table (with proper unique constraint for upsert)
CREATE TABLE IF NOT EXISTS body_stats (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID REFERENCES auth.users NOT NULL,
    recorded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg    NUMERIC(5,2),
    body_fat_pct NUMERIC(4,1),
    chest_cm     NUMERIC(5,1),
    waist_cm     NUMERIC(5,1),
    hips_cm      NUMERIC(5,1),
    bicep_cm     NUMERIC(5,1),
    thigh_cm     NUMERIC(5,1),
    calf_cm      NUMERIC(5,1),
    shoulder_cm  NUMERIC(5,1),
    neck_cm      NUMERIC(5,1),
    notes        TEXT,
    photo_url    TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recorded_at)
);

-- 2. Enable RLS
ALTER TABLE body_stats ENABLE ROW LEVEL SECURITY;

-- 3. RLS policy: users can only access their own data
DROP POLICY IF EXISTS "Users manage own body stats" ON body_stats;
CREATE POLICY "Users manage own body stats"
    ON body_stats FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Enable realtime for instant UI updates
ALTER TABLE body_stats REPLICA IDENTITY FULL;

-- 5. Enable realtime for notifications table (fixes slow notifications)
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 6. User goals table
CREATE TABLE IF NOT EXISTS user_goals (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       UUID REFERENCES auth.users NOT NULL,
    goal_type     TEXT DEFAULT 'weight',
    title         TEXT NOT NULL,
    target_value  NUMERIC(10,2),
    current_value NUMERIC(10,2) DEFAULT 0,
    unit          TEXT DEFAULT 'kg',
    target_date   DATE,
    is_completed  BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own goals" ON user_goals;
CREATE POLICY "Users manage own goals"
    ON user_goals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Storage: allow body-stats photos in 'posts' bucket (already exists)
-- The posts bucket should already have public read + authenticated write policies.
-- If photos still fail, create a dedicated bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('body-stats', 'body-stats', true) ON CONFLICT DO NOTHING;
