export interface WorkoutSet {
    order?: number;
    weight?: number;
    reps: number;
    completed?: boolean;
    unit?: string;
    measure?: string;
    notes?: string;
}

export interface WorkoutExercise {
    id?: string;
    name: string;
    target?: string;
    prev?: string;
    sets: WorkoutSet[];
    video_url?: string;
    muscle_group?: string;
    category?: string;
    group?: string;
    originalName?: string;
    note?: string;
}

export interface WorkoutBlock {
    id?: string;
    title: string;
    type: string;
    duration?: number;
    exercises: WorkoutExercise[];
    result?: {
        time?: string;
        rounds?: number;
        noResult?: boolean;
    };
    rounds?: number;
    notes?: string;
}

export type SportType = 'gym' | 'running' | 'cross_training' | 'hybrid' | 'calisthenics' | 'ocr' | 'other';

export interface TrainingPlan {
    id: string;
    title: string;
    description: string;
    sport: SportType;
    difficulty: 'beginner' | 'intermediate' | 'elite';
    duration_min: number;
    exercises: WorkoutExercise[];
    blocks?: WorkoutBlock[];
    is_premium: boolean;
}
