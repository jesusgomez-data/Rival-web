'use server'

import { createClient } from '@/utils/supabase/server'

export type TrainingPlan = {
    id: string;
    title: string;
    description: string;
    sport: 'gym' | 'running' | 'crossfit' | 'hyrox';
    difficulty: 'beginner' | 'intermediate' | 'elite';
    duration_min: number;
    exercises: any[]; // Structure matches the one used in GymView/RunningView
    is_premium: boolean;
}

export async function getAiRecommendation(sport: string, userTier: 'free' | 'premium' = 'free'): Promise<TrainingPlan[]> {
    // In a real app, this would query an AI model or a complex algorithm based on user history.
    // For now, we utilize static elite programming logic.

    const recommendations: TrainingPlan[] = [];

    if (sport === 'running') {
        recommendations.push({
            id: 'run-intervals',
            title: 'Intervalos de Velocidad',
            description: 'Mejora tu VO2 Max con series cortas de alta intensidad.',
            sport: 'running',
            difficulty: 'intermediate',
            duration_min: 45,
            is_premium: false,
            exercises: [] // Running view handles logic differently
        });

        if (userTier === 'premium') {
            recommendations.push({
                id: 'run-threshold',
                title: 'Carrera de Umbral (Tempo)',
                description: 'Aumenta tu resistencia al lactato. 10k a ritmo sostenido.',
                sport: 'running',
                difficulty: 'elite',
                duration_min: 60,
                is_premium: true,
                exercises: []
            });
        }
    } else if (sport === 'gym') {
        recommendations.push({
            id: 'gym-push',
            title: 'Push Day: Pecho & Tríceps',
            description: 'Enfoque en hipertrofia y fuerza de empuje.',
            sport: 'gym',
            difficulty: 'beginner',
            duration_min: 60,
            is_premium: false,
            exercises: [
                { id: 'bp', name: 'Press de Banca', target: '4 series x 6-8 reps', prev: '80kg', sets: [{}, {}, {}, {}] },
                { id: 'ip', name: 'Press Inclinado Mancuernas', target: '3 series x 10-12 reps', prev: '24kg', sets: [{}, {}, {}] },
                { id: 'le', name: 'Extensiones Tríceps', target: '3 series x 15 reps', prev: '20kg', sets: [{}, {}, {}] },
            ]
        });

        if (userTier === 'premium') {
            recommendations.push({
                id: 'gym-power',
                title: 'Powerbuilding: Fuerza Máxima',
                description: 'Sistema 5/3/1 para incrementar tus básicos.',
                sport: 'gym',
                difficulty: 'elite',
                duration_min: 75,
                is_premium: true,
                exercises: [
                    { id: 'dl', name: 'Peso Muerto', target: '5 series x 3-5 reps', prev: '140kg', sets: [{}, {}, {}, {}, {}] },
                    { id: 'sq', name: 'Sentadilla Hack', target: '4 series x 8 reps', prev: '100kg', sets: [{}, {}, {}, {}] },
                ]
            });
        }
    } else if (sport === 'crossfit') {
        recommendations.push({
            id: 'cf-fran',
            title: 'WOD: Fran',
            description: '21-15-9 Thrusters + Pull-ups. El clásico test de capacidad.',
            sport: 'crossfit',
            difficulty: 'intermediate',
            duration_min: 10,
            is_premium: false,
            exercises: [] // CrossFit view just needs text usually
        });
    }

    return recommendations;
}
