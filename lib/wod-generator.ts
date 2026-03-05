/**
 * RIVALFIT - WOD Generator powered by Gemini AI
 * Genera entrenamientos personalizados basados en preferencias del usuario
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

// ============================================
// TIPOS
// ============================================

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
  scalingOptions?: {
    beginner?: string;
    intermediate?: string;
    advanced?: string;
  };
}

// ============================================
// PROMPT TEMPLATES
// ============================================

const SYSTEM_PROMPT = `Eres un entrenador de CrossFit elite certificado y experto en programación de entrenamientos. Tu misión es crear WODs (Workout of the Day) personalizados, seguros y efectivos.

**REGLAS IMPORTANTES:**
1. **USAR SOLO EL EQUIPAMIENTO ESPECIFICADO**: Si el usuario indica equipamiento específico (ej: barras, mancuernas), TODOS los ejercicios deben usar EXCLUSIVAMENTE ese equipamiento. NO incluyas ejercicios bodyweight si se especificó equipamiento.
2. Siempre incluir calentamiento y enfriamiento (estos sí pueden ser bodyweight)
3. Progresar de ejercicios simples a complejos
4. Balancear grupos musculares
5. Considerar el nivel del atleta para evitar lesiones
6. Incluir opciones de scaling (modificaciones)
7. Ser específico con reps, peso, tiempo
8. Añadir tips de técnica cuando sea necesario
9. Formato de respuesta: JSON estructurado

**FORMATO DE RESPUESTA:**
Devuelve SOLO un objeto JSON válido con esta estructura (sin markdown, sin explicaciones adicionales):
{
  "title": "Nombre creativo del WOD",
  "subtitle": "Descripción corta (1 línea)",
  "difficulty": "beginner|intermediate|advanced|elite",
  "estimatedDuration": 45,
  "caloriesBurn": 450,
  "blocks": [
    {
      "type": "warmup",
      "title": "Calentamiento",
      "duration": "10 min",
      "exercises": [
        { "name": "Movilidad de cadera", "reps": "2 min", "notes": "Círculos amplios" }
      ]
    },
    {
      "type": "metcon",
      "title": "AMRAP 15 min",
      "duration": "15 min",
      "config": { "timeLimit": "15:00" },
      "exercises": [
        { "name": "Burpees", "reps": 10 },
        { "name": "Air Squats", "reps": 20 }
      ]
    }
  ],
  "tips": ["Mantén el core activado", "Respira profundo"],
  "scalingOptions": {
    "beginner": "Reduce reps a 50%",
    "intermediate": "Como está prescrito",
    "advanced": "Añade peso o reps"
  }
}`;

// ============================================
// GENERADOR
// ============================================

export class WODGenerator {
  private model: any;

  constructor() {
    if (!genAI) {
      throw new Error("Gemini API key not configured");
    }
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async generateWOD(request: WODRequest): Promise<GeneratedWOD> {
    const userPrompt = this.buildUserPrompt(request);

    try {
      const result = await this.model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: userPrompt }
      ]);

      const response = await result.response;
      let text = response.text();

      // Limpiar el texto (remover markdown si existe)
      text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      // Parsear JSON
      const wod: GeneratedWOD = JSON.parse(text);

      // Validar estructura básica
      if (!wod.title || !wod.blocks || wod.blocks.length === 0) {
        throw new Error("Invalid WOD structure");
      }

      return wod;
    } catch (error) {
      console.error("Error generating WOD:", error);

      // Fallback: Retornar un WOD básico si falla
      return this.getFallbackWOD(request);
    }
  }

  private buildUserPrompt(request: WODRequest): string {
    const equipmentList = request.equipment.join(", ");
    const targetMusclesList = request.targetMuscles?.join(", ") || "cuerpo completo";
    const goalsList = request.goals?.join(", ") || "fitness general";
    const excludeList = request.excludeMovements?.join(", ") || "ninguno";

    return `
Genera un WOD con las siguientes especificaciones:

**Tipo de Workout:** ${request.workoutType.toUpperCase()}
**Duración:** ${request.duration} minutos
**Nivel:** ${request.fitnessLevel}
**Equipamiento disponible:** ${equipmentList}
**IMPORTANTE:** Usa EXCLUSIVAMENTE el equipamiento mencionado arriba (${equipmentList}) en TODOS los ejercicios del metcon/strength. El calentamiento y enfriamiento pueden ser bodyweight.
**Músculos objetivo:** ${targetMusclesList}
**Objetivos:** ${goalsList}
**Excluir movimientos:** ${excludeList}

${request.previousWorkouts && request.previousWorkouts.length > 0 ? `
**Entrenamientos recientes (evita repetir):**
${request.previousWorkouts.map((w, i) => `${i + 1}. ${w}`).join("\n")}
` : ""}

Crea un WOD completo, seguro y efectivo que cumpla con estas especificaciones.
Recuerda: responder SOLO con el JSON, sin explicaciones adicionales.
    `.trim();
  }

  private getFallbackWOD(request: WODRequest): GeneratedWOD {
    // WOD básico de emergencia
    return {
      title: "WARRIOR WORKOUT",
      subtitle: "Full body conditioning",
      difficulty: request.fitnessLevel,
      estimatedDuration: request.duration,
      caloriesBurn: Math.round(request.duration * 10),
      blocks: [
        {
          type: "warmup",
          title: "Calentamiento Dinámico",
          duration: "8 min",
          exercises: [
            { name: "Jumping Jacks", reps: "2 min" },
            { name: "Movilidad de hombros", reps: "2 min" },
            { name: "Sentadillas lentas", reps: 10 },
            { name: "Flexiones inclinadas", reps: 10 }
          ]
        },
        {
          type: "metcon",
          title: request.workoutType === "amrap" ? "AMRAP 15 min" : "For Time",
          duration: request.workoutType === "amrap" ? "15 min" : undefined,
          config: {
            rounds: request.workoutType === "fortime" ? 5 : undefined,
            timeLimit: request.workoutType === "amrap" ? "15:00" : undefined
          },
          exercises: [
            { name: "Burpees", reps: 10 },
            { name: "Air Squats", reps: 15 },
            { name: "Push-ups", reps: 10 },
            { name: "Sit-ups", reps: 15 }
          ]
        },
        {
          type: "cooldown",
          title: "Enfriamiento",
          duration: "5 min",
          exercises: [
            { name: "Estiramiento de cuádriceps", reps: "1 min/lado" },
            { name: "Estiramiento de pecho", reps: "1 min" },
            { name: "Child's pose", reps: "2 min" }
          ]
        }
      ],
      tips: [
        "Mantén un ritmo constante",
        "Respira profundamente",
        "Hidrata entre rondas"
      ],
      scalingOptions: {
        beginner: "Reduce las reps en un 50% y toma descansos cuando lo necesites",
        intermediate: "Como está prescrito",
        advanced: "Añade 5 reps a cada movimiento"
      }
    };
  }
}

// ============================================
// HELPER: Generar variaciones de WODs
// ============================================

export async function generateWeeklyProgram(
  level: FitnessLevel,
  equipment: Equipment[]
): Promise<GeneratedWOD[]> {
  const generator = new WODGenerator();
  const week: GeneratedWOD[] = [];

  const weeklyPlan = [
    { type: "strength" as WorkoutType, duration: 45, targetMuscles: ["legs", "core"] },
    { type: "amrap" as WorkoutType, duration: 30, targetMuscles: ["upper body"] },
    { type: "fortime" as WorkoutType, duration: 20, targetMuscles: ["full body"] },
    { type: "emom" as WorkoutType, duration: 24, targetMuscles: ["core", "cardio"] },
    { type: "chipper" as WorkoutType, duration: 40, targetMuscles: ["full body"] },
  ];

  for (const day of weeklyPlan) {
    const wod = await generator.generateWOD({
      workoutType: day.type,
      duration: day.duration,
      fitnessLevel: level,
      equipment,
      targetMuscles: day.targetMuscles,
    });
    week.push(wod);
  }

  return week;
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default WODGenerator;
