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
        "sportType": "OCR | Cross Training | Gym...",
        "exercises": [{"name": "Ejercicio (Carga)", "sets": "X", "reps": "Y"}]
      }
    }
    Si no hay entreno, workout: null.`;

    // Lista de modelos priorizando los de mayor cuota en Free Tier
    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-2.0-flash"
    ];
    let lastError = "";

    for (const modelName of modelsToTry) {
        try {
            console.log(`[COACH AI] Intentando con: ${modelName}`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                }
            });

            const result = await model.generateContent(systemPrompt + "\n\nUsuario: " + userMessage);

            if (!result || !result.response) {
                throw new Error("Respuesta vacía");
            }

            const text = result.response.text();

            try {
                return JSON.parse(text);
            } catch (parseError) {
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanJson);
            }
        } catch (error: any) {
            console.error(`[COACH AI] Error en ${modelName}:`, error.message);
            lastError = error.message;

            // Si es un error de cuota (429), no quemamos más modelos en cadena
            // porque suelen compartir la cuota del mismo proyecto
            if (error.message.includes("429") || error.message.includes("quota")) {
                console.warn("[COACH AI] Cuota excedida detectada. Saltando a protocolo manual.");
                break;
            }

            // Para otros errores, intentamos el siguiente modelo
            continue;
        }
    }

    // Mensaje amigable para el usuario si todo falla
    const friendlyError = lastError.includes("429") || lastError.includes("quota")
        ? "El Cuartel General de IA está saturado en este momento. He activado el Protocolo de Entrenamiento Manual para no perder el ritmo."
        : "Hubo un fallo en las comunicaciones tácticas. Activando protocolo de entrenamiento manual.";

    return {
        replyText: `Soldado, ${friendlyError}`,
        workout: {
            title: "Protocolo de Emergencia",
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

