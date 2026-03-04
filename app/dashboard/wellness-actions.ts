'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── BODY STATS ───────────────────────────────────────────────────────────────

export async function logBodyStats(data: {
    weight_kg?: number
    body_fat_pct?: number
    chest_cm?: number
    waist_cm?: number
    hips_cm?: number
    bicep_cm?: number
    thigh_cm?: number
    calf_cm?: number
    shoulder_cm?: number
    neck_cm?: number
    notes?: string
    photo_url?: string
    recorded_at?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const today = data.recorded_at || new Date().toISOString().split('T')[0]

    const { error } = await supabase
        .from('body_stats')
        .upsert({
            user_id: user.id,
            recorded_at: today,
            ...data,
        }, { onConflict: 'user_id,recorded_at' })

    if (error) return { error: error.message }

    revalidatePath('/dashboard/body-stats')
    return { success: true }
}

export async function getBodyStatsHistory(limit: number = 90) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('body_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(limit)

    return data || []
}

export async function getLatestBodyStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('body_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return data
}

export async function uploadBodyPhoto(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const file = formData.get('file') as File
    if (!file) return { error: 'No file' }

    const ext = file.name.split('.').pop()
    const path = `body-stats/${user.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('posts').upload(path, file)
    if (error) return { error: error.message }

    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(path)
    return { success: true, url: publicUrl }
}

// ─── NUTRITION ────────────────────────────────────────────────────────────────

export async function getTodayNutrition() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle()

    return data
}

export async function updateNutritionLog(data: {
    actual_calories?: number
    actual_protein_g?: number
    actual_carbs_g?: number
    actual_fat_g?: number
    actual_water_ml?: number
    target_calories?: number
    target_protein_g?: number
    target_carbs_g?: number
    target_fat_g?: number
    target_water_ml?: number
    notes?: string
    log_date?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const today = data.log_date || new Date().toISOString().split('T')[0]

    const { error } = await supabase
        .from('nutrition_logs')
        .upsert({
            user_id: user.id,
            log_date: today,
            ...data,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,log_date' })

    if (error) return { error: error.message }

    revalidatePath('/dashboard/nutrition')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function getNutritionHistory(days: number = 30) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

    const { data } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', from)
        .order('log_date', { ascending: false })

    return data || []
}

// ─── DAILY CHECK-IN ───────────────────────────────────────────────────────────

export async function getTodayCheckin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const today = new Date().toISOString().split('T')[0]

    const { data } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .maybeSingle()

    return data
}

export async function saveCheckin(checkinData: {
    energy_level: number
    sleep_hours: number
    sleep_quality: number
    muscle_soreness: number
    motivation: number
    stress_level: number
    mood: string
    sore_muscles: string[]
    notes?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const today = new Date().toISOString().split('T')[0]

    // Compute recovery score (0-100)
    const recoveryScore = Math.round(
        (checkinData.energy_level / 10) * 30 +
        (checkinData.sleep_quality / 5) * 25 +
        ((checkinData.sleep_hours > 7 ? 10 : checkinData.sleep_hours) / 10) * 15 +
        ((5 - checkinData.muscle_soreness) / 5) * 20 +
        ((10 - checkinData.stress_level) / 10) * 10
    )

    const { error } = await supabase
        .from('daily_checkins')
        .upsert({
            user_id: user.id,
            checkin_date: today,
            ...checkinData,
            recovery_score: recoveryScore
        }, { onConflict: 'user_id,checkin_date' })

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    return { success: true, recoveryScore }
}

export async function getCheckinHistory(days: number = 30) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

    const { data } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('checkin_date', from)
        .order('checkin_date', { ascending: false })

    return data || []
}

// ─── GOALS ────────────────────────────────────────────────────────────────────

export async function getUserGoals() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return data || []
}

export async function createGoal(goal: {
    goal_type: string
    title: string
    description?: string
    target_value: number
    current_value?: number
    unit: string
    target_date?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('user_goals')
        .insert({ user_id: user.id, ...goal })

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/body-stats')
    return { success: true }
}

// ─── ATHLETE CARD STATS ───────────────────────────────────────────────────────

export async function getAthleteCardStats() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Run all queries in parallel
    const [
        { data: profile },
        { data: workouts },
        { data: classResults },
        { count: prCount },
    ] = await Promise.all([
        // Real skill stats stored on profile (updated every workout save)
        supabase
            .from('profiles')
            .select('power_stat, endurance_stat, agility_stat, consistency_stat, xp_points, level, main_sport, full_name, username, avatar_url')
            .eq('id', user.id)
            .single(),

        // All workouts for streak + volume + PR count
        supabase
            .from('workouts')
            .select('created_at, total_volume_kg, is_pr')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),

        // Class results for streak
        supabase
            .from('class_results')
            .select('date_performed')
            .eq('user_id', user.id)
            .order('date_performed', { ascending: false }),

        // Count actual PR sets
        supabase
            .from('workout_sets')
            .select('id', { count: 'exact', head: true })
            .eq('is_pr', true)
            .in(
                'workout_id',
                (await supabase.from('workouts').select('id').eq('user_id', user.id)).data?.map((w: any) => w.id) || []
            ),
    ])

    // ── Calculate streak ─────────────────────────────────────────────────────
    const allDates = [
        ...((workouts || []).map((w: any) => new Date(w.created_at).toISOString().split('T')[0])),
        ...((classResults || []).map((c: any) => new Date(c.date_performed).toISOString().split('T')[0])),
    ]
    const uniqueDates = Array.from(new Set(allDates)).sort((a, b) => b.localeCompare(a))
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let streak = 0
    if (uniqueDates.length > 0 && (uniqueDates[0] === today || uniqueDates[0] === yesterday)) {
        let currentCheck = new Date(uniqueDates[0])
        for (const dateStr of uniqueDates) {
            const date = new Date(dateStr)
            const diffDays = Math.floor((currentCheck.getTime() - date.getTime()) / 86400000)
            if (diffDays <= 1) { streak++; currentCheck = date }
            else break
        }
    }

    // ── Total volume (kg lifted lifetime) ────────────────────────────────────
    const totalVolume = (workouts || []).reduce((sum: number, w: any) => sum + (w.total_volume_kg || 0), 0)
    const totalWorkouts = workouts?.length || 0

    // ── Real stats from profile (set by training/actions.ts on each save) ────
    const power = profile?.power_stat || 0
    const endurance = profile?.endurance_stat || 0
    const agility = profile?.agility_stat || 0
    const consistency = profile?.consistency_stat || 0

    return {
        // Stats for bars (already scaled by training/actions.ts, up to ~990)
        power_stat: power,
        endurance_stat: endurance,
        agility_stat: agility,
        consistency_stat: consistency,
        // Card meta
        totalWorkouts,
        totalVolume: Math.round(totalVolume),
        streak,
        prCount: prCount || (workouts || []).filter((w: any) => w.is_pr).length,
        // Profile info
        xp_points: profile?.xp_points || 0,
        level: profile?.level,
        main_sport: profile?.main_sport,
        full_name: profile?.full_name,
        username: profile?.username,
        avatar_url: profile?.avatar_url,
    }
}

export async function updateGoalProgress(goalId: string, currentValue: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: goal } = await supabase
        .from('user_goals')
        .select('target_value')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single()

    if (!goal) return { error: 'Goal not found' }

    const isCompleted = currentValue >= goal.target_value

    const { error } = await supabase
        .from('user_goals')
        .update({
            current_value: currentValue,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', goalId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    return { success: true, isCompleted }
}
