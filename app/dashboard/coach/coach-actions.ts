'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function publishCoachWorkoutToFeed(workout: {
    title: string;
    duration: string;
    intensity: string;
    description?: string;
    exercises: { name: string; sets: string; reps: string }[];
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    // Format workout as WOD data structure the feed understands
    const wodData = [{
        title: workout.title,
        blocks: [{
            type: 'wod',
            format: 'FREE',
            content: workout.description || workout.exercises.map(ex =>
                `${ex.name}: ${ex.sets && ex.sets !== '---' && ex.sets !== '1' ? ex.sets + ' x ' : ''}${ex.reps}`
            ).join('\n'),
        }]
    }];

    const caption = workout.description
        ? `🏋️ ${workout.title}\n\n${workout.description}`
        : `🏋️ ${workout.title} — ${workout.duration} · ${workout.intensity}\n\n` +
          workout.exercises.map(ex =>
              `• ${ex.name}: ${ex.sets && ex.sets !== '---' && ex.sets !== '1' ? ex.sets + 'x' : ''}${ex.reps}`
          ).join('\n');

    const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        caption,
        media_url: JSON.stringify(wodData),
        media_type: 'wod',
        post_type: 'wod',
        wod_data: wodData[0],
    });

    if (error) return { error: error.message };

    revalidatePath('/dashboard');
    return { success: true };
}
