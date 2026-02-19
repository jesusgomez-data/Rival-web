"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

interface CoachProfile {
    level: string;
    main_sport: string;
    full_name?: string;
    recent_activity_score?: number;
    experience_years?: number;
    injuries?: string;
}

export async function generateCoachResponse(
    userMessage: string,
    userProfile: CoachProfile,
    history: { role: 'user' | 'assistant', content: string }[] = []
) {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error("GEMINI_API_KEY is missing");
        return getFallbackResponse("Error de configuración.", userProfile);
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const { level, main_sport, full_name } = userProfile;

    // Convert history to Gemini format (limiting to last 5 messages for token safety)
    const chatHistory = history.slice(-5).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));

    const systemPrompt = `Eres RIVAL HEAD COACH, un mentor de élite mundial experto en alto rendimiento y CrossFit.
    
    PERFIL DEL ATLETA:
    - Nombre: ${full_name || 'Atleta'}
    - Disciplina: ${main_sport}
    - Nivel: ${level}

    REGLAS DE RESPUESTA:
    1. Sé directivo, motivador y profesional.
    2. Si el usuario pide un entrenamiento, genera uno en formato JSON.
    3. Si el usuario solo charla, responde como coach pero mantén el JSON con workout: null.
    4. Usa SIEMPRE este formato JSON exacto:
    {
      "replyText": "Tu respuesta motivadora",
       "workout": {
         "title": "NOMBRE",
         "duration": "X min",
         "intensity": "${level}",
         "sportType": "Cross Training",
         "description": "Detalle completo con saltos de línea",
         "exercises": [
           { "name": "Ej", "sets": "4", "reps": "12" }
         ]
       }
    }
    Si no hay entreno, workout: null.`;

    const modelsToTry = [
        { name: "gemini-1.5-flash", timeout: 8000 },
        { name: "gemini-1.5-flash-8b", timeout: 6000 },
        { name: "gemini-2.0-flash-exp", timeout: 10000 }
    ];

    let lastError = "";

    for (const modelCfg of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelCfg.name,
                generationConfig: { responseMimeType: "application/json" },
                systemInstruction: systemPrompt // Correct way in latest SDK
            });

            const chat = model.startChat({ history: chatHistory });

            // Manual timeout for robustness
            const resultPromise = chat.sendMessage(userMessage);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), modelCfg.timeout));

            const result = await Promise.race([resultPromise, timeoutPromise]) as any;

            if (!result || !result.response) throw new Error("Respuesta vacía");

            const text = result.response.text();
            try {
                return JSON.parse(text);
            } catch (parseError) {
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            }
        } catch (error: any) {
            console.error(`[COACH AI] Fallo en ${modelCfg.name}:`, error.message);
            lastError = error.message;
            if (error.message === "Timeout") continue;
            if (error.message.includes("429")) {
                await new Promise(r => setTimeout(r, 1000)); // Esperar un poco antes de rotar
                continue;
            }
            break;
        }
    }

    return getFallbackResponse(lastError, userProfile, userMessage);
}

function getFallbackResponse(error: string, profile: CoachProfile, originalMessage?: string) {
    const isQuota = error.includes("429") || error.includes("quota");
    const msg = originalMessage?.toLowerCase() || "";

    let fallbackWorkout: any = {
        title: "PROTOCOLO DE BASE RIVAL",
        duration: "30 min",
        intensity: profile.level,
        sportType: profile.main_sport,
        description: "Enfoque en fuerza y capacidad aeróbica base.",
        exercises: [
            { name: "Sentadillas", sets: "4", reps: "15" },
            { name: "Flexiones", sets: "4", reps: "12" },
            { name: "Plancha", sets: "3", reps: "45s" }
        ]
    };

    if (msg.includes("pierna") || msg.includes("leg")) {
        fallbackWorkout.title = "INFERNO DE PIERNAS";
        fallbackWorkout.exercises = [
            { name: "Sentadilla Goblet", sets: "4", reps: "12" },
            { name: "Zancadas", sets: "3", reps: "12/lado" },
            { name: "Wall Sit", sets: "3", reps: "1 min" }
        ];
    } else if (msg.includes("correr") || msg.includes("run")) {
        fallbackWorkout.title = "UMBRAL DE CARRERA";
        fallbackWorkout.exercises = [
            { name: "Carrera Continua Z2", sets: "1", reps: "20 min" },
            { name: "Sprints 100m", sets: "5", reps: "Max vel" }
        ];
    } else if (msg.includes("crossfit") || msg.includes("wod") || msg.includes("entreno")) {
        fallbackWorkout.title = "EMERGENCE WOD";
        fallbackWorkout.description = "AMRAP 10 MIN:\n10 Burpees\n15 Kettlebell Swings\n20 Air Squats";
        fallbackWorkout.exercises = [
            { name: "Burpees", sets: "AMRAP 10'", reps: "---" },
            { name: "KB Swings", sets: "---", reps: "15" },
            { name: "Air Squats", sets: "---", reps: "20" }
        ];
    }

    return {
        replyText: isQuota
            ? "Atleta, la red está saturada por alta demanda. He activado el Protocolo de Contingencia para que no pierdas el día de combate."
            : "Interferencia detectada. Activando protocolo de entrenamiento manual optimizado para tu rango de combate.",
        workout: fallbackWorkout
    };
}
