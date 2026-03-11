// AI engine (Groq) is initialized inside the WODGenerator class

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
  source?: string; // Para diagnóstico
  scalingOptions?: {
    beginner?: string;
    intermediate?: string;
    advanced?: string;
  };
}

// ============================================
// PROMPT TEMPLATES
// ============================================

const SYSTEM_PROMPT = `You are an elite CrossFit Coach. 
Create a unique, safe, and effective WOD based on the user's requirements.

RULES:
1. TYPE ADHERENCE: If AMRAP, it MUST be AMRAP. If FOR TIME, it MUST be a task for time. If EMOM, it MUST be every minute.
2. LEVEL: 
   - Beginner: Simple movements, low impact.
   - Intermediate: Standard movements.
   - Advanced/Elite: Complex movements, heavy weights.
3. EQUIPMENT: Use ONLY the specified equipment.
4. VARIETY: Create ORIGINAL WODs. Do not repeat the same movements every time. Use the provided Random Seed to change the selection.
5. LANGUAGE: The training content (titles, exercise names, tips) MUST BE IN SPANISH.
6. JSON: Return ONLY a valid JSON object.

JSON STRUCTURE:
{
  "title": "Creative Name (Spanish)",
  "subtitle": "Short desc like AMRAP 20 or 5 Rounds (Spanish)",
  "difficulty": "beginner|intermediate|advanced|elite",
  "estimatedDuration": number,
  "caloriesBurn": number,
  "blocks": [
    {
      "type": "warmup|strength|metcon|cooldown",
      "title": "Title (Spanish)",
      "exercises": [{ "name": "Name (Spanish)", "reps": "Amount", "notes": "Obs (Spanish)" }]
    }
  ],
  "tips": ["Tip 1 (Spanish)", "Tip 2 (Spanish)"]
}`;

// ============================================
// GENERADOR
// Final build force for Vercel keys - 16:15

export class WODGenerator {
  private groqApiKey: string;

  constructor() {
    this.groqApiKey = (process.env.GROQ_API_KEY || "").trim();
  }

  async generateWOD(request: WODRequest): Promise<GeneratedWOD> {
    const userPrompt = this.buildUserPrompt(request);

    // PRIMERO: Intentar con GROQ
    if (this.groqApiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout (mobile-safe)

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.groqApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            response_format: { type: "json_object" }
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await response.json();
        if (data.error) throw new Error(`Groq: ${data.error.message || 'API Error'}`);

        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error("Groq: Empty content");

        const wod = JSON.parse(text);
        return { ...wod, source: "groq" };
      } catch (error: any) {
        console.error("❌ Groq Error:", error.message);
      }
    }

    // SEGUNDO: Fallback Manual
    return this.getFallbackWOD(request);
  }

  private buildUserPrompt(request: WODRequest): string {
    const equipmentList = request.equipment.join(", ");
    const targetMusclesList = request.targetMuscles?.join(", ") || "cuerpo completo";
    const goalsList = request.goals?.join(", ") || "fitness general";
    const excludeList = request.excludeMovements?.join(", ") || "ninguno";
    const randomSeed = Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();

    return `
Genera un WOD ÚNICO y ORIGINAL con estas especificaciones:

**TIPO OBLIGATORIO:** ${request.workoutType.toUpperCase()} (Respeta este formato estrictamente)
**DURACIÓN OBJETIVO:** ${request.duration} minutos
**NIVEL ATLETA:** ${request.fitnessLevel}
**EQUIPAMIENTO DISPONIBLE:** ${equipmentList}
**SEMILLA DE VARIEDAD:** ${randomSeed} (Usa esta semilla para inspirarte en movimientos diferentes a los habituales)
**FECHA:** ${timestamp}

Instrucciones adicionales:
- Si es FOR TIME: Indica número de rondas o tarea total clara.
- Si es AMRAP: Especifica los minutos claramente en el título del bloque metcon.
- Si es EMOM: Especifica qué se hace en cada minuto.

Responde SOLO el JSON.
    `.trim();
  }

  private getFallbackWOD(request: WODRequest): GeneratedWOD {
    const isAmrap = request.workoutType === "amrap";
    
    // Listas de ejercicios para variar el fallback si la IA falla
    const bodyweight = ["Burpees", "Air Squats", "Push-ups", "Sit-ups", "Jumping Jacks", "Lunges", "Mountain Climbers", "Plank Tap"];
    const shuffled = bodyweight.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);

    return {
      source: "fallback",
      title: "WOD " + request.workoutType.toUpperCase(),
      subtitle: isAmrap ? `AMRAP ${request.duration} min` : "5 Rounds For Time",
      difficulty: request.fitnessLevel,
      estimatedDuration: request.duration,
      caloriesBurn: Math.round(request.duration * 10),
      blocks: [
        {
          type: "warmup",
          title: "Calentamiento",
          exercises: [
            { name: "Movilidad dinámica", reps: "5 min" },
            { name: shuffled[4] || "Jumping Jacks", reps: "20" },
            { name: shuffled[5] || "Air Squats", reps: "15" }
          ]
        },
        {
          type: "metcon",
          title: isAmrap ? `AMRAP ${request.duration} min` : "5 Rounds For Time",
          exercises: selected.map(name => ({ name, reps: (Math.floor(Math.random() * 10) + 10).toString() }))
        }
      ],
      tips: ["Mantén un ritmo constante", "Respira profundo"]
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
