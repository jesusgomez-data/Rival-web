'use server'

import { createClient } from '@/utils/supabase/server'

export type TrainingPlan = {
    id: string;
    title: string;
    description: string;
    sport: 'gym' | 'running' | 'cross_training' | 'hybrid' | 'calisthenics' | 'ocr' | 'other';
    difficulty: 'beginner' | 'intermediate' | 'elite';
    duration_min: number;
    exercises: any[]; // Structure matches the one used in GymView/RunningView
    is_premium: boolean;
}

export async function getAiRecommendation(sport: string, userTier: 'free' | 'premium' = 'free'): Promise<TrainingPlan[]> {
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
            exercises: []
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
                { id: 'bp', name: 'Bench Press', target: '4 series x 6-8 reps', prev: '80kg', video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }] },
                { id: 'ip', name: 'Incline Dumbbell Press', target: '3 series x 10-12 reps', prev: '24kg', video_url: 'https://www.youtube.com/watch?v=8iPEnn-ltC8', sets: [{ reps: 10, weight: 20 }, { reps: 10, weight: 20 }, { reps: 10, weight: 20 }] },
                { id: 'le', name: 'Triceps Extensions', target: '3 series x 15 reps', prev: '20kg', video_url: 'https://www.youtube.com/watch?v=X-iV27N00Xc', sets: [{ reps: 15, weight: 15 }, { reps: 15, weight: 15 }, { reps: 15, weight: 15 }] },
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
                    { id: 'dl', name: 'Deadlift', target: '5 series x 3-5 reps', prev: '140kg', video_url: 'https://www.youtube.com/watch?v=op9kVnSso6Q', sets: [{ reps: 5, weight: 100 }, { reps: 5, weight: 110 }, { reps: 3, weight: 120 }, { reps: 3, weight: 130 }, { reps: 3, weight: 140 }] },
                    { id: 'sq', name: 'Back Squat', target: '4 series x 8 reps', prev: '100kg', video_url: 'https://www.youtube.com/watch?v=MVMh0HiJCXQ', sets: [{ reps: 8, weight: 70 }, { reps: 8, weight: 70 }, { reps: 8, weight: 70 }, { reps: 8, weight: 70 }] },
                ]
            });
        }
    } else if (sport === 'hybrid') {
        recommendations.push({
            id: 'hybrid-power',
            title: 'Hybrid: Power & Run',
            description: 'Combinación de fuerza explosiva y carrera. 1km + 50 Burpee Broad Jumps + 1km.',
            sport: 'hybrid',
            difficulty: 'intermediate',
            duration_min: 45,
            is_premium: false,
            exercises: [
                { id: 'run1', name: 'Run 1km', sets: [{ reps: 1 }] },
                { id: 'bbj', name: 'Burpee Broad Jump', sets: [{ reps: 50 }] },
                { id: 'run2', name: 'Run 1km', sets: [{ reps: 1 }] }
            ]
        });

        if (userTier === 'premium') {
            recommendations.push({
                id: 'hybrid-hyrox',
                title: 'RIVAL Hyrox Prep',
                description: 'Simulación de 3 estaciones Hyrox: Ski, Sled Push y Burpee Broad Jumps con carrera intercalada.',
                sport: 'hybrid',
                difficulty: 'elite',
                duration_min: 60,
                is_premium: true,
                exercises: [
                    { id: 'run1', name: 'Run 1km', sets: [{ reps: 1 }] },
                    { id: 'ski', name: 'Ski Erg 1000m', sets: [{ reps: 1 }] },
                    { id: 'run2', name: 'Run 1km', sets: [{ reps: 1 }] },
                    { id: 'sled', name: 'Sled Push 50m', sets: [{ reps: 1 }] }
                ]
            });
        }
    } else if (sport === 'ocr') {
        recommendations.push({
            id: 'ocr-base',
            title: 'OCR: Obstacle Skills',
            description: 'Enfoque en agarre y técnica de obstáculos.',
            sport: 'ocr',
            difficulty: 'intermediate',
            duration_min: 50,
            is_premium: false,
            exercises: [
                { id: 'hang', name: 'Dead Hang', sets: [{ reps: 3, weight: 60 }] },
                { id: 'pu', name: 'Pull Ups', sets: [{ reps: 10 }] },
                { id: 'run', name: 'Trail Run 5km', sets: [{ reps: 1 }] }
            ]
        });
    } else if (sport === 'calisthenics') {
        recommendations.push({
            id: 'cali-skills',
            title: 'Cali Mastery: Muscle Up Prep',
            description: 'Ejercicios de transferencia para Muscle Up.',
            sport: 'calisthenics',
            difficulty: 'intermediate',
            duration_min: 45,
            is_premium: false,
            exercises: [
                { id: 'hpu', name: 'High Pull Ups', sets: [{ reps: 8 }] },
                { id: 'dips', name: 'Straight Bar Dips', sets: [{ reps: 12 }] },
                { id: 'neg', name: 'Negative Muscle Ups', sets: [{ reps: 5 }] }
            ]
        });
    } else if (sport === 'cross_training') {
        recommendations.push({
            id: 'cf-fran',
            title: 'WOD: Fran',
            description: '21-15-9 Thrusters + Pull-ups. El clásico test de capacidad.',
            sport: 'cross_training',
            difficulty: 'intermediate',
            duration_min: 10,
            is_premium: false,
            exercises: [
                { id: 'thrusters', name: 'Thrusters', sets: [{ reps: 21, weight: 43 }] },
                { id: 'pullups', name: 'Pull Ups', sets: [{ reps: 21 }] }
            ]
        });
    }

    return recommendations;
}
