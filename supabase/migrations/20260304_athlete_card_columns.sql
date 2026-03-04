-- ============================================================
-- Recalculate Athlete Card Stats from existing workout history
-- Run this ONCE to backfill power_stat, endurance_stat, etc.
-- Safe to re-run (uses aggregates, not increments)
-- ============================================================

-- Step 1: Ensure the columns exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='power_stat') THEN
        ALTER TABLE public.profiles ADD COLUMN power_stat INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='endurance_stat') THEN
        ALTER TABLE public.profiles ADD COLUMN endurance_stat INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='agility_stat') THEN
        ALTER TABLE public.profiles ADD COLUMN agility_stat INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='consistency_stat') THEN
        ALTER TABLE public.profiles ADD COLUMN consistency_stat INT DEFAULT 0;
    END IF;
END $$;

-- Step 2: Add is_pr columns if missing
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS is_pr BOOLEAN DEFAULT FALSE;
ALTER TABLE public.workout_sets ADD COLUMN IF NOT EXISTS is_pr BOOLEAN DEFAULT FALSE;

-- Step 3: Backfill stats from actual workout history
-- consistency_stat = total number of workouts (each = +1)
-- power_stat       = sum of floor(max_weight_kg / 50) per workout, min 1
-- endurance_stat   = sum of floor(total_volume_kg / 500) per workout, min 1
-- agility_stat     = 3 per CrossFit/Functional workout, 1 per other

WITH workout_stats AS (
    SELECT
        user_id,
        COUNT(*)                                                                    AS total_workouts,
        COALESCE(SUM(GREATEST(FLOOR(COALESCE(max_weight_kg,0) / 50)::INT, 1)), 0)  AS power_total,
        COALESCE(SUM(GREATEST(FLOOR(COALESCE(total_volume_kg,0) / 500)::INT, 1)), 0) AS endurance_total,
        COALESCE(SUM(
            CASE
                WHEN LOWER(COALESCE(sport_type,'')) LIKE '%cross%'
                  OR LOWER(COALESCE(sport_type,'')) LIKE '%funct%' THEN 3
                ELSE 1
            END
        ), 0) AS agility_total
    FROM public.workouts
    GROUP BY user_id
)
UPDATE public.profiles p
SET
    consistency_stat = ws.total_workouts,
    power_stat       = ws.power_total,
    endurance_stat   = ws.endurance_total,
    agility_stat     = ws.agility_total
FROM workout_stats ws
WHERE p.id = ws.user_id;

-- Step 4: Also count class_results for consistency
WITH class_stats AS (
    SELECT user_id, COUNT(*) AS class_count
    FROM public.class_results
    GROUP BY user_id
)
UPDATE public.profiles p
SET consistency_stat = p.consistency_stat + cs.class_count
FROM class_stats cs
WHERE p.id = cs.user_id;

-- Verify the update
SELECT id, full_name, power_stat, endurance_stat, agility_stat, consistency_stat
FROM public.profiles
WHERE power_stat > 0 OR consistency_stat > 0
LIMIT 20;
