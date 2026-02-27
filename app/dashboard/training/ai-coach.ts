'use server'

import { createClient } from '@/utils/supabase/server'
import { TrainingPlan, WorkoutExercise } from './types';

export async function getAiRecommendation(sport: string, userTier: 'free' | 'premium' = 'free', focus?: string): Promise<TrainingPlan[]> {
    const recommendations: TrainingPlan[] = [];

    if (sport === 'running') {
        recommendations.push({
            id: 'run-tempo',
            title: 'Base y Umbral: RIVAL Runner',
            description: 'Mejora tu capacidad aeróbica y aguante al lactato con cambios de zona.',
            sport: 'running',
            difficulty: 'intermediate',
            duration_min: 50,
            is_premium: false,
            exercises: [],
            blocks: [
                {
                    title: "CALENTAMIENTO: 15' Z2",
                    type: "other",
                    exercises: [{ name: "Trote Suave", target: "Zona 2 / Conversacional", sets: [{ order: 1, weight: 15, reps: 0, unit: 'min' }] }]
                },
                {
                    title: "UMBRAL: 3 x 8' Z4",
                    type: "other",
                    exercises: [{ name: "Tempo Run", target: "Ritmo de 5k-10k", sets: [{ order: 1, weight: 8, reps: 0, unit: 'min' }] }]
                },
                {
                    title: "VUELTA A LA CALMA: 5' Z1",
                    type: "other",
                    exercises: [{ name: "Trote Regenerativo", target: "Muy suave", sets: [{ order: 1, weight: 5, reps: 0, unit: 'min' }] }]
                }
            ]
        });
    } else if (sport === 'gym') {
        recommendations.push({
            id: 'gym-push-max',
            title: 'Fuerza: Empuje Vertical y Horizontal',
            description: 'Enfoque en básicos de empuje con carga progresiva para desarrollo de fuerza absoluta.',
            sport: 'gym',
            difficulty: 'intermediate',
            duration_min: 65,
            is_premium: false,
            exercises: [
                { name: 'Press de Banca', target: '4 series x 6 reps (RPE 8)', prev: '80kg', video_url: 'https://www.youtube.com/watch?v=rT7DgCr-3pg', sets: [{ order: 1, reps: 6, weight: 70 }, { order: 2, reps: 6, weight: 70 }, { order: 3, reps: 6, weight: 70 }, { order: 4, reps: 6, weight: 70 }] },
                { name: 'Press Militar', target: '3 series x 8 reps', prev: '50kg', video_url: 'https://www.youtube.com/watch?v=2yjwXTZQDDI', sets: [{ order: 1, reps: 8, weight: 40 }, { order: 2, reps: 8, weight: 40 }, { order: 3, reps: 8, weight: 40 }] },
                { name: 'Press Inclinado con Mancuernas', target: '3 series x 12 reps', prev: '20kg', video_url: 'https://www.youtube.com/watch?v=8iPEnn-ltC8', sets: [{ order: 1, reps: 12, weight: 22 }, { order: 2, reps: 12, weight: 22 }, { order: 3, reps: 12, weight: 22 }] },
                { name: 'Fondos en Paralelas (Dips)', target: '3 series x al fallo técnico', prev: 'BW', video_url: 'https://www.youtube.com/watch?v=2z8JmcrW-As', sets: [{ order: 1, reps: 12, weight: 0 }, { order: 2, reps: 10, weight: 0 }, { order: 3, reps: 8, weight: 0 }] },
                { name: 'Extensiones de Tríceps en Polea', target: '3 series x 15 reps', prev: '25kg', video_url: 'https://www.youtube.com/watch?v=-zLyUAo1gMw', sets: [{ order: 1, reps: 15, weight: 20 }, { order: 2, reps: 15, weight: 20 }, { order: 3, reps: 15, weight: 20 }] },
                { name: 'Elevaciones Laterales', target: '4 series x 15 reps (PUMP)', prev: '10kg', video_url: 'https://www.youtube.com/watch?v=PzsMitRdI_8', sets: [{ order: 1, reps: 15, weight: 8 }, { order: 2, reps: 15, weight: 8 }, { order: 3, reps: 15, weight: 8 }, { order: 4, reps: 15, weight: 8 }] }
            ]
        });
    } else if (sport === 'hybrid') {
        recommendations.push({
            id: 'hybrid-metcon-1',
            title: 'ENGINE: RIVAL HYBRID RACE 01',
            description: 'Simulación de carrera híbrida combinando capacidad aeróbica y fuerza bajo fatiga.',
            sport: 'hybrid',
            difficulty: 'intermediate',
            duration_min: 55,
            is_premium: false,
            exercises: [],
            blocks: [
                {
                    title: "CALENTAMIENTO",
                    type: "other",
                    exercises: [
                        { name: "Remo 1000m", target: "Ritmo suave", sets: [{ order: 1, weight: 1000, reps: 0, unit: 'm' }] },
                        { name: "3 Rondas: 10 Air Squats + 10 Push Ups", target: "Preparación de movimiento", sets: [] }
                    ]
                },
                {
                    title: "PARTE A: THE ENGINE",
                    type: "fortime",
                    duration: 25,
                    exercises: [
                        { name: "Carrera 1000m", target: "Ritmo de carrera", sets: [{ order: 1, weight: 1000, reps: 1 }] },
                        { name: "Empuje de Trineo 50m", target: "Pesado", sets: [{ order: 1, weight: 50, reps: 1 }] },
                        { name: "Carrera 1000m", target: "Ritmo de carrera", sets: [{ order: 1, weight: 1000, reps: 1 }] },
                        { name: "Burpees sobre Trineo", target: "50 Reps", sets: [{ order: 1, weight: 0, reps: 50 }] }
                    ]
                },
                {
                    title: "OPCIONES DE ESCALADO",
                    type: "scaling",
                    exercises: [
                        { name: "AV: Run 1000m / Trineo 100kg\nINT: Run 800m / Trineo 75kg\nESC: Run 600m / Trineo 50kg", target: "Referencia de nivel", sets: [] }
                    ]
                }
            ]
        });
    } else if (sport === 'cross_training') {
        if (focus === 'halterofilia') {
            recommendations.push({
                id: 'cf-halt-ai-1',
                title: 'Halterofilia: Potencia y Técnica',
                description: 'Desarrollo de los levantamientos olímpicos: Arrancada y Dos Tiempos.',
                sport: 'cross_training',
                difficulty: 'intermediate',
                duration_min: 50,
                is_premium: false,
                exercises: [],
                blocks: [
                    {
                        title: "BLOQUE A: TÉCNICA SNATCH",
                        type: "other",
                        exercises: [
                            { name: "Snatch Balance", target: "4 series x 3 reps (Vacio/Ligero)", sets: [{ order: 1, weight: 20, reps: 3 }] },
                            { name: "Arrancada (Snatch) desde Colgante", target: "5 series x 2 reps @ 65%", sets: [{ order: 1, weight: 45, reps: 2 }] }
                        ]
                    },
                    {
                        title: "BLOQUE B: ACCESORIO FUERZA",
                        type: "other",
                        exercises: [
                            { name: "Sentadilla Overhead", target: "3 series x 5 reps (Control)", sets: [{ order: 1, weight: 40, reps: 5 }] }
                        ]
                    },
                    {
                        title: "ESCALADO / CARGAS",
                        type: "scaling",
                        exercises: [
                            { name: "AV: 50kg / 60kg\nINT: 40kg / 50kg\nESC: 20kg / 30kg", target: "Ajusta según tu PR", sets: [] }
                        ]
                    }
                ]
            });
        } else {
            recommendations.push({
                id: 'cf-hero-1',
                title: 'Benchmark: RIVAL CHAMPION FLOW',
                description: 'Protocolo de alta intensidad estructurado para mejorar VO2 Max y fuerza explosiva.',
                sport: 'cross_training',
                difficulty: 'intermediate',
                duration_min: 45,
                is_premium: false,
                exercises: [],
                blocks: [
                    {
                        title: "WARM UP / SKILL",
                        type: "other",
                        exercises: [
                            { name: "1000m Remo", target: "Ritmo 3:45-4:15", sets: [{ order: 1, weight: 1000, reps: 0, unit: 'm' }] },
                            { name: "Flujo de Movimiento: TTB y Cleans", target: "Practica la técnica", sets: [] }
                        ]
                    },
                    { title: "4' DESCANSO", type: "rest", duration: 4, exercises: [] },
                    {
                        title: "BLOQUE B: AMRAP 13",
                        type: "amrap",
                        duration: 13,
                        exercises: [
                            { name: "15 STOH (Hombro a Techo)", target: "15 Reps (60/40 kg)", sets: [{ order: 1, weight: 60, reps: 15 }] },
                            { name: "20 Reverse Sit Ups", target: "20 Reps (Ritmo constante)", sets: [{ order: 1, weight: 0, reps: 20 }] },
                            { name: "* Cada 3' 10 Burpees", target: "10 Reps (Empieza con burpees)", sets: [{ order: 1, weight: 0, reps: 10 }] }
                        ]
                    },
                    {
                        title: "ESCALADO / NIVELES",
                        type: "scaling",
                        exercises: [
                            { name: "AV: 60/40 kg\nINT: 50/30 kg\nESC: 40/25 kg", target: "Elige tu nivel", sets: [] }
                        ]
                    }
                ]
            });
        }
    } else if (sport === 'calisthenics') {
        recommendations.push({
            id: 'cali-pro-1',
            title: 'Skill: Front Lever y Pull Power',
            description: 'Progresiones de estático combinadas con fuerza explosiva de tracción.',
            sport: 'calisthenics',
            difficulty: 'intermediate',
            duration_min: 55,
            is_premium: false,
            exercises: [],
            blocks: [
                {
                    title: "SKILL: PROGRESIONES FRONT LEVER",
                    type: "other",
                    exercises: [
                        { name: "Tuck Front Lever Hold", target: "4 x 15-20s", sets: [{ order: 1, reps: 20, weight: 0, unit: 'sec' }, { order: 2, reps: 20, weight: 0, unit: 'sec' }] },
                        { name: "Advanced Tuck Swings", target: "3 x 8 reps", sets: [{ order: 1, reps: 8, weight: 0 }] }
                    ]
                },
                {
                    title: "POTENCIA: HIGH PULL UPS",
                    type: "other",
                    exercises: [
                        { name: "Dominadas al pecho", target: "5 x 5 reps (Explosivo)", sets: [{ order: 1, reps: 5, weight: 0 }, { order: 2, reps: 5, weight: 0 }] }
                    ]
                }
            ]
        });
    } else if (sport === 'ocr') {
        recommendations.push({
            id: 'ocr-elite-prep',
            title: 'Trail: Agarre y Resistencia en Carrera',
            description: 'Carrera técnica de montaña con estaciones de suspensión profunda.',
            sport: 'ocr',
            difficulty: 'elite',
            duration_min: 75,
            is_premium: false,
            exercises: [],
            blocks: [
                {
                    title: "BLOQUE 1: RESISTENCIA EN TRAIL",
                    type: "other",
                    exercises: [{ name: "Trail Run 6km", target: "Z3 con desnivel positivo", sets: [{ order: 1, weight: 6, reps: 0, unit: 'km' }] }]
                },
                {
                    title: "BLOQUE 2: FATIGA DE AGARRE",
                    type: "fortime",
                    exercises: [
                        { name: "Dead Hang", target: "90s Acumulativo", sets: [{ order: 1, weight: 90, reps: 1, unit: 'sec' }] },
                        { name: "Farmers Carry", target: "200m Pesado", sets: [{ order: 1, weight: 200, reps: 1, unit: 'm' }] }
                    ]
                }
            ]
        });
    }

    if (userTier === 'premium') {
        recommendations.push({
            id: 'premium-bonus-1',
            title: 'RIVAL COMPLEX X',
            description: 'Diseño avanzado enfocado en levantamientos olímpicos y gimnásticos bajo fatiga.',
            sport: 'cross_training',
            difficulty: 'elite',
            duration_min: 60,
            is_premium: true,
            exercises: [],
            blocks: [
                {
                    title: "BLOQUE A: EMOM 12'",
                    type: "emom",
                    duration: 12,
                    exercises: [
                        { name: "Min 1: 3 Push Press (RIR 2)", target: "3 Reps (70/50 kg)", sets: [{ order: 1, weight: 70, reps: 3 }] },
                        { name: "Min 2: 10 TTB (Pies a la barra)", target: "10 Reps (Eficiencia en el ciclo)", sets: [{ order: 1, weight: 0, reps: 10 }] }
                    ]
                }
            ]
        });
    }

    return recommendations;
}
