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

    const systemPrompt = `Eres RIVAL HEAD COACH, un mentor de élite mundial experto en alto rendimiento y CrossFit.
    
    PERFIL DEL ATLETA:
    - Nombre: ${full_name || 'Rival'}
    - Disciplina: ${main_sport}
    - Nivel: ${level}

    REGLAS CRÍTICAS PARA GENERAR WODS:
    1. Usa SIEMPRE formato profesional: EMOM, AMRAP, FOR TIME, TABATA
    2. OBLIGATORIO incluir niveles de peso al final: Escalado/Intermedio/Avanzado (Rx)
    3. Especifica descansos con formato: "4' REST", "2' REST"
    4. Usa abreviaciones estándar de CrossFit
    5. Incluye notas con asterisco (*) cuando sea necesario
    6. IMPORTANTE: Usa saltos de línea (\\n) para separar secciones

    EJEMPLO EXACTO DEL FORMATO REQUERIDO:
    "EMOM 12'
    1' 3 PUSH PRESS RIR 2
    1' 10 TTB OR PRACTICE THE MOVEMENT

    4' REST

    AMRAP 13'
    15 STOH
    20 REVERSE SIT UPS

    * EVERY 3' 10 BURPEES, START WITH BURPEES

    2' REST

    FOR TIME (3')
    15 PUSH PRESS
    30 SIT UPS
    15 BURPEES

    PESOS:
    Push Press - Escalado: 20/15kg | Intermedio: 30/20kg | Avanzado (Rx): 43/30kg
    STOH - Escalado: 15/10kg | Intermedio: 25/15kg | Avanzado (Rx): 35/25kg"

    ABREVIACIONES ESTÁNDAR:
    - STOH = Shoulder to Overhead
    - TTB = Toes to Bar
    - C2B = Chest to Bar
    - HSPU = Handstand Push Up
    - DU = Double Unders
    - WBS = Wall Ball Shots
    - RIR = Reps In Reserve
    - AMRAP = As Many Rounds As Possible
    - EMOM = Every Minute On the Minute

    FORMATO JSON OBLIGATORIO:
    {
      "replyText": "Mensaje motivador breve del coach (máximo 2 líneas)",
      "workout": {
        "title": "NOMBRE DEL WOD EN MAYÚSCULAS",
        "duration": "Tiempo total estimado (ej: 35 min)",
        "intensity": "${level}",
        "sportType": "Cross Training",
        "description": "AQUÍ VA EL WOD COMPLETO CON FORMATO PROFESIONAL\\n\\nEMOM X'\\nEjercicio 1\\nEjercicio 2\\n\\nX' REST\\n\\nAMRAP Y'\\nEjercicio 3\\nEjercicio 4\\n\\nPESOS:\\nEjercicio - Escalado: X/Ykg | Intermedio: X/Ykg | Avanzado (Rx): X/Ykg",
        "exercises": [
          {
            "name": "Nombre del ejercicio",
            "sets": "EMOM 12' o AMRAP o número",
            "reps": "Repeticiones",
            "weight_scaled": "20/15kg",
            "weight_intermediate": "30/20kg",
            "weight_rx": "43/30kg"
          }
        ]
      }
    }

    REGLAS ADICIONALES:
    - Si no hay entreno, workout: null
    - La descripción DEBE tener saltos de línea (\\n) para formato limpio
    - SIEMPRE incluir sección de PESOS al final
    - Usar formato Hombre/Mujer para pesos (ej: 43/30kg)
    - Ser específico con tiempos y descansos`;


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

