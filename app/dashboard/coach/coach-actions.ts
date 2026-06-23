'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

import { WorkoutCategory } from '@/components/training/WodCreator';

export async function publishCoachWorkoutToFeed(workout: {
    title: string;
    duration: string;
    intensity: string;
    sportType?: string;
    description?: string;
    exercises: { name: string; sets: string; reps: string }[];
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    // Detect category from sportType
    const sportLower = (workout.sportType || '').toLowerCase();
    let category: WorkoutCategory = 'CROSS_TRAINING';
    if (sportLower.includes('run')) category = 'RUNNING';
    else if (sportLower.includes('cycl') || sportLower.includes('ciclismo') || sportLower.includes('bike')) category = 'CYCLING';
    else if (sportLower.includes('swim') || sportLower.includes('natac')) category = 'SWIMMING';
    else if (sportLower.includes('gym') || sportLower.includes('muscul') || sportLower.includes('strength') || sportLower.includes('fuerza')) category = 'GYM';
    else if (sportLower.includes('yoga') || sportLower.includes('mobil') || sportLower.includes('movil')) category = 'YOGA';
    else if (sportLower.includes('box') || sportLower.includes('mma') || sportLower.includes('combat')) category = 'BOXING';
    else if (sportLower.includes('hyrox')) category = 'HYROX';
    else if (sportLower.includes('ocr')) category = 'OCR';

    // Normalize intensity/difficulty
    const intensityLower = (workout.intensity || '').toLowerCase();
    let difficulty: 'beginner' | 'intermediate' | 'advanced' | 'elite' = 'intermediate';
    if (intensityLower.includes('princ') || intensityLower.includes('begin') || intensityLower.includes('bajo') || intensityLower.includes('low')) {
        difficulty = 'beginner';
    } else if (intensityLower.includes('avanz') || intensityLower.includes('advanc') || intensityLower.includes('alto') || intensityLower.includes('high')) {
        difficulty = 'advanced';
    } else if (intensityLower.includes('elit')) {
        difficulty = 'elite';
    }

    // Parse duration and calories
    const durationNum = parseInt(workout.duration) || 30;
    const caloriesBurn = durationNum * 10;

    // Detect format
    let format: any = 'LIBRE';
    const titleLower = workout.title.toLowerCase();
    if (titleLower.includes('amrap')) format = 'AMRAP';
    else if (titleLower.includes('emom')) format = 'EMOM';
    else if (titleLower.includes('tabata')) format = 'TABATA';
    else if (titleLower.includes('for time') || titleLower.includes('tiempo')) format = 'FOR TIME';
    else if (titleLower.includes('fuerza') || titleLower.includes('strength')) format = 'FUERZA';
    else {
        for (const ex of workout.exercises) {
            const setLower = (ex.sets || '').toLowerCase();
            if (setLower.includes('amrap')) { format = 'AMRAP'; break; }
            if (setLower.includes('emom')) { format = 'EMOM'; break; }
            if (setLower.includes('tabata')) { format = 'TABATA'; break; }
            if (setLower.includes('for time')) { format = 'FOR TIME'; break; }
        }
    }

    const blockType = format === 'FUERZA' ? 'strength' : 'metcon';

    // Map exercises to both WodCard and WODPostDisplay formats
    const mappedExercises = workout.exercises.map((ex, idx) => {
        const isNumericSets = /^\d+$/.test(ex.sets);
        const detailStr = ex.sets && ex.sets !== '---' && ex.sets !== '1' ? ex.sets : '';
        const notesStr = detailStr ? (isNumericSets ? `${ex.sets} series` : ex.sets) : '';
        
        return {
            id: `coach-ex-${idx}-${Math.random().toString(36).substring(7)}`,
            name: ex.name,
            reps: ex.reps || '',
            detail: detailStr,
            notes: notesStr,
            type: 'exercise' as const
        };
    });

    // Format workout as WOD data structure the feed understands
    const wodData = [{
        title: workout.title,
        subtitle: `${workout.duration} · ${workout.intensity}`,
        difficulty: difficulty,
        estimatedDuration: durationNum,
        caloriesBurn: caloriesBurn,
        category: category,
        summary: {
            totalTime: workout.duration || `${durationNum}:00`,
            scoreType: 'NONE' as const,
            scoreLabel: 'COMPLETADO'
        },
        blocks: [{
            id: `coach-block-${Math.random().toString(36).substring(7)}`,
            type: blockType,
            title: 'TRABAJO PRINCIPAL',
            duration: workout.duration || '',
            format: format,
            config: {
                timecap: workout.duration || ''
            },
            content: workout.description || '',
            exercises: mappedExercises
        }],
        tips: workout.description ? [workout.description.split('\n')[0]] : ["Sigue las indicaciones del coach."]
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
