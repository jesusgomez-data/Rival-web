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

export async function generateCoachResponse(userMessage: string, userProfile: CoachProfile) {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error("GEMINI_API_KEY is missing");
        return {
            replyText: "Error de configuración: Clave de API no encontrada.",
            workout: null
        };
    }

    const genAI = new GoogleGenerativeAI(API_KEY);

    const { level, main_sport, full_name, recent_activity_score } = userProfile;

    const systemPrompt = `Eres RIVAL HEAD COACH, un mentor de élite mundial experto en alto rendimiento.
    
    PERFIL DEL ATLETA:
    - Nombre: ${full_name || 'Rival'}
    - Disciplina: ${main_sport}
    - Nivel: ${level}

    REGLAS OCR:
    Si piden OCR, enfócate en Agarre (Grip), Running Técnico y Fuerza Funcional.

    FORMATO JSON OBLIGATORIO:
    {
      "replyText": "Respuesta técnica breve",
      "workout": {
        "title": "Nombre",
        "duration": "Tiempo",
        "intensity": "${level}",
        "sportType": "OCR | CrossFit | Gym...",
        "exercises": [{"name": "Ejercicio (Carga)", "sets": "X", "reps": "Y"}]
      }
    }
    Si no hay entreno, workout: null.`;

    // Intentar con el modelo más rápido y luego fallback al estándar
    const modelsToTry = ["gemini-1.5-flash", "gemini-pro"];
    let errors: string[] = [];

    for (const modelName of modelsToTry) {
        try {
            console.log(`[COACH AI] Intentando con: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\nUsuario: " + userMessage }] }],
            });

            const text = result.response.text();
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);
        } catch (error: any) {
            console.error(`[COACH AI] Error en ${modelName}:`, error.message);
            errors.push(`${modelName}: ${error.message}`);

            // Si es un error de cuota (429), esperamos un poco antes del siguiente modelo
            if (error.message.includes("429")) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            continue;
        }
    }

    return {
        replyText: `Soldado, hubo un error de comunicación con el cuartel general. Detalles: ${errors.join(" | ")}. Protocolo de entrenamiento manual activado.`,
        workout: {
            title: "Plan de Resistencia Civil",
            duration: "20 min",
            intensity: "Alta",
            sportType: "Calistenia",
            exercises: [
                { name: "Burpees", sets: "4", reps: "15" },
                { name: "Flexiones de diamante", sets: "4", reps: "12" },
                { name: "Sentadillas con salto", sets: "4", reps: "20" }
            ]
        }
    };
}
