// Types for RIVALFIT WODs

export type WorkoutType =
  | "amrap"      // As Many Rounds As Possible
  | "fortime"    // For Time
  | "emom"       // Every Minute On the Minute
  | "tabata"     // Tabata (20s work / 10s rest)
  | "chipper"    // Long list of exercises done once
  | "strength"   // Strength focused
  | "endurance"  // Cardio/endurance
  | "mobility";  // Mobility/flexibility

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";

export type Equipment =
  | "bodyweight"
  | "dumbbells"
  | "barbell"
  | "kettlebell"
  | "pull_up_bar"
  | "rower"
  | "bike"
  | "rope"
  | "box"
  | "full_gym";

export interface WODRequest {
  workoutType: WorkoutType;
  duration: number; // minutos
  fitnessLevel: FitnessLevel;
  equipment: Equipment[];
  targetMuscles?: string[]; // ["legs", "core", "upper body"]
  goals?: string[]; // ["strength", "endurance", "fat loss"]
  excludeMovements?: string[]; // Ejercicios que el usuario NO quiere
  previousWorkouts?: string[]; // Para evitar repeticiones
}

export interface WODBlock {
  type: string; // "warmup", "strength", "metcon", "cooldown"
  title: string;
  duration?: string; // "10 min", "5 rounds", etc.
  exercises: {
    name: string;
    reps?: string | number;
    weight?: string;
    notes?: string;
    videoUrl?: string; // URL de demo del ejercicio
  }[];
  config?: {
    rounds?: number;
    timeLimit?: string;
    restBetweenRounds?: string;
    distance?: string;
    pace?: string;
  };
}

export interface GeneratedWOD {
  title: string;
  subtitle: string;
  difficulty: FitnessLevel;
  estimatedDuration: number; // minutos
  caloriesBurn: number; // estimación
  blocks: WODBlock[];
  tips: string[];
  source?: string; // Para diagnóstico
  scalingOptions?: {
    beginner?: string;
    intermediate?: string;
    advanced?: string;
  };
}
