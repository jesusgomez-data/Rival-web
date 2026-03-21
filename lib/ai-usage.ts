import { createClient } from '@/utils/supabase/server';

export type AIFeature = 'coach' | 'wod_generator';

/**
 * Checks if the authenticated user has already used an AI feature today.
 * If not, records the usage and returns allowed: true.
 * If yes, returns allowed: false without recording again.
 */
export async function checkAndRecordDailyUsage(feature: AIFeature): Promise<{
    allowed: boolean;
    userId: string | null;
}> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { allowed: false, userId: null };

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if already used today
    const { data: existing } = await supabase
        .from('ai_daily_usage')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature', feature)
        .eq('usage_date', today)
        .maybeSingle();

    if (existing) return { allowed: false, userId: user.id };

    // Record usage (upsert is safe in case of race condition)
    await supabase.from('ai_daily_usage').insert({
        user_id: user.id,
        feature,
        usage_date: today,
    });

    return { allowed: true, userId: user.id };
}

/**
 * Returns whether the user has already used the feature today (read-only check).
 */
export async function hasUsedToday(feature: AIFeature): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
        .from('ai_daily_usage')
        .select('id')
        .eq('user_id', user.id)
        .eq('feature', feature)
        .eq('usage_date', today)
        .maybeSingle();

    return !!data;
}
