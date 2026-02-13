"use server";

import { createClient } from "@/utils/supabase/server";

export async function checkAndAwardBadges(userId: string) {
    const supabase = await createClient();

    // 1. Get user's workout history
    const { data: workouts } = await supabase
        .from('workouts')
        .select('start_time')
        .eq('user_id', userId);

    if (!workouts) return;

    const awardedBadges = [];

    // --- LOGIC: Madrugador ---
    const hasEarlyMorning = workouts.some(w => {
        const date = new Date(w.start_time);
        return date.getHours() < 8;
    });

    if (hasEarlyMorning) {
        awardedBadges.push('Madrugador');
    }

    // --- LOGIC: 7 Días Seguidos ---
    const workoutDates = workouts.map(w => {
        const d = new Date(w.start_time);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    });
    const uniqueDates = Array.from(new Set(workoutDates)).sort((a, b) => b - a);

    let currentStreak = 0;
    if (uniqueDates.length >= 7) {
        let streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
            const diff = (uniqueDates[i] - uniqueDates[i + 1]) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                streak++;
                if (streak >= 7) break;
            } else {
                streak = 1;
            }
        }
        if (streak >= 7) awardedBadges.push('7 Días Seguidos');
    }

    // --- Awarding Logic ---
    for (const badgeName of awardedBadges) {
        // Get badge ID
        const { data: badge } = await supabase
            .from('badges')
            .select('id')
            .eq('name', badgeName)
            .single();

        if (badge) {
            // Check if already awarded
            const { data: exists } = await supabase
                .from('user_badges')
                .select('id')
                .eq('user_id', userId)
                .eq('badge_id', badge.id)
                .single();

            if (!exists) {
                await supabase
                    .from('user_badges')
                    .insert({
                        user_id: userId,
                        badge_id: badge.id
                    });
            }
        }
    }
}

export async function seedDemoGear(userId: string) {
    const supabase = await createClient();

    const { data: existing } = await supabase
        .from('user_gear')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

    if (existing && existing.length > 0) return;

    await supabase.from('user_gear').insert([
        {
            user_id: userId,
            name: 'Metcon 9',
            brand: 'Nike',
            model: 'Metcon 9 Amp',
            category: 'Calzado',
            image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop',
            is_active: true
        },
        {
            user_id: userId,
            name: 'Cinturón Rogue',
            brand: 'Rogue',
            model: 'Ohio Lifting Belt',
            category: 'Accesorios',
            image_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=400&auto=format&fit=crop',
            is_active: true
        }
    ]);
}
