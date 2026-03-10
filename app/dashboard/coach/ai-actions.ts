const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function generateCoachResponse(userMessage: string, userProfile: any, chatHistory: any[] = []) {
    if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY no configurada");
        return {
            replyText: "Soldado, el cuartel de IA está saturado. Intentalo de nuevo en unos minutos.",
            workout: null
        };
    }

    const { level, main_sport, full_name } = userProfile;
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

    // Convertir historial de chat al formato OpenAI (compatible con Groq)
    // Gemini usa role "model", OpenAI/Groq usa "assistant"
    const history = chatHistory.map((msg: any) => ({
        role: msg.role === "model" ? "assistant" : msg.role,
        content: Array.isArray(msg.parts)
            ? msg.parts.map((p: any) => p.text ?? p).join("")
            : (msg.content ?? "")
    }));

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...history,
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        const data = await response.json();
        if (data.error) throw new Error(`Groq: ${data.error.message || "API Error"}`);

        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error("Groq: respuesta vacía");

        return JSON.parse(text);
    } catch (error: any) {
        console.error("Error con Groq coach:", error.message);
        return {
            replyText: "Lo siento, la central de mando tiene interferencias. Intentalo de nuevo en unos segundos.",
            workout: null
        };
    }
}
