import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateCoachResponse(userMessage: string, userProfile: any, chatHistory: any[] = []) {
    if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY no configurada");
        return {
            replyText: "Soldado, el cuartel de IA está saturado. Intentalo de nuevo en unos minutos.",
            workout: null
        };
    }

    const { level, main_sport, full_name } = userProfile;

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
<<<<<<< HEAD
=======

    REGLAS ADICIONALES:
    - Si no hay entreno, workout: null
    - La descripción DEBE tener saltos de línea (\\n) para formato limpio
    - SIEMPRE incluir sección de PESOS al final
    - Usar formato Hombre/Mujer para pesos (ej: 43/30kg)
    - Ser específico con tiempos y descansos`;

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
                systemInstruction: systemPrompt
            });

            const chat = model.startChat({ history: chatHistory });
            const resultPromise = chat.sendMessage(userMessage);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), modelCfg.timeout));

            const result = await Promise.race([resultPromise, timeoutPromise]) as any;

            if (!result || !result.response) throw new Error("Respuesta vacía");

            const text = result.response.text();
            try {
                return JSON.parse(text);
            } catch (parseError) {
                console.error(`Error parsing JSON from ${modelCfg.name}:`, text);
                throw parseError;
            }
        } catch (error: any) {
            console.error(`Error con modelo ${modelCfg.name}:`, error.message);
            lastError = error.message;
            continue;
        }
    }

    return {
        replyText: "Lo siento, la central de mando tiene interferencias. Intentalo de nuevo en unos segundos.",
        workout: null
    };
}
