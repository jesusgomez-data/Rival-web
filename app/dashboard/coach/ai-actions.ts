'use server'

import { checkAndRecordDailyUsage } from '@/lib/ai-usage';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function generateCoachResponse(userMessage: string, userProfile: any, chatHistory: any[] = []) {
    // Daily limit: 1 coach recommendation per user per day
    const { allowed } = await checkAndRecordDailyUsage('coach');
    if (!allowed) {
        return {
            replyText: "Soldado, ya recibiste tu programación de hoy. 🔒 Un entreno al día es la clave de la consistencia. Vuelve mañana y diseñaremos tu próxima misión. ¡Descansa, recupera y prepárate!",
            workout: null,
            dailyLimitReached: true
        };
    }

    if (!process.env.GROQ_API_KEY) {
        console.error("GROQ_API_KEY no configurada");
        return {
            replyText: "Soldado, el cuartel de IA está saturado. Intentalo de nuevo en unos minutos.",
            workout: null
        };
    }

    const { level, main_sport, full_name } = userProfile;
    const seed = Math.random().toString(36).substring(2, 8);

    // Detectar el deporte solicitado en el mensaje del usuario
    const msgLower = userMessage.toLowerCase();
    const detectedSport =
        msgLower.includes('calistenia') || msgLower.includes('calisthenics') || msgLower.includes('cuerpo') && msgLower.includes('peso') ? 'Calistenia' :
        msgLower.includes('hybrid') || msgLower.includes('híbrido') ? 'Hybrid Training' :
        msgLower.includes('cross') || msgLower.includes('crossfit') ? 'Cross Training' :
        msgLower.includes('gym') || msgLower.includes('gimnasio') || msgLower.includes('musculacion') || msgLower.includes('musculación') || msgLower.includes('hipertrofia') ? 'Gym/Musculación' :
        msgLower.includes('fuerza') || msgLower.includes('strength') || msgLower.includes('powerlifting') ? 'Strength' :
        msgLower.includes('cardio') || msgLower.includes('endurance') ? 'Cardio/Endurance' :
        msgLower.includes('natacion') || msgLower.includes('natación') || msgLower.includes('swim') ? 'Swimming' :
        msgLower.includes('ciclismo') || msgLower.includes('bike') || msgLower.includes('bici') ? 'Cycling' :
        msgLower.includes('running') || msgLower.includes('correr') || msgLower.includes('carrera') ? 'Running' :
        msgLower.includes('yoga') || msgLower.includes('movilidad') || msgLower.includes('mobility') ? 'Mobility/Yoga' :
        msgLower.includes('boxeo') || msgLower.includes('boxing') || msgLower.includes('mma') ? 'Boxing/MMA' :
        main_sport || 'Cross Training';

    // Ejercicios específicos por deporte para que la IA no los confunda
    const sportContext: Record<string, string> = {
        'Calistenia': 'SOLO ejercicios de peso corporal: pull-ups, muscle-ups, dips, push-ups, L-sit, pistol squat, handstand, plancha, front lever, back lever, burpees, jumping jacks. PROHIBIDO usar barras olímpicas, mancuernas o pesas externas. Enfoque en progresiones de habilidades y resistencia corporal.',
        'Hybrid Training': 'Combina fuerza (pesas, barbell) + cardio aeróbico (remo, bici, running). Alterna bloques de potencia muscular con bloques metabólicos. Diferente a CrossFit puro: más volumen de fuerza, menos técnica de gimnasia.',
        'Cross Training': 'Movimientos funcionales de CrossFit: kipping, TTB, HSPU, DU, box jumps, snatches, clean & jerk. Intensidad máxima, tiempo corto.',
        'Gym/Musculación': 'Entrenamiento de hipertrofia/fuerza en sala de musculación. Máquinas, mancuernas, barbell. Series de 8-15 reps, grupos musculares específicos. Sin cardio metabólico extremo.',
        'Strength': 'Trabajo de fuerza pura: squat, deadlift, press, row. Series de 3-6 reps con descanso largo (2-4 min). Sin cardio metabólico.',
        'Cardio/Endurance': 'Zonas aeróbicas, intervalos de running/remo/bici. Sin pesas pesadas. Frecuencia cardíaca controlada.',
        'Running': 'Intervalos de velocidad, fartlek, tempo runs, series. No incluir pesas. Distancias y tiempos claros.',
        'Cycling': 'Intervalos en bici (Tabata, FTP tests). No incluir barbell. Potencia en vatios o RPE.',
        'Swimming': 'Series de nado, drills técnicos de estilo. No incluir pesas ni ejercicios terrestres.',
        'Mobility/Yoga': 'Estiramientos dinámicos y estáticos, movilidad articular, respiración. Sin pesas. Posturas yoga y secuencias de movilidad.',
        'Boxing/MMA': 'Combinaciones de golpes, trabajo de saco, shadow boxing, ejercicios de agilidad y explosividad. Sin barbell.',
    };
    const sportGuidance = sportContext[detectedSport] || sportContext[main_sport] || sportContext['Cross Training'];

    const systemPrompt = `Eres RIVAL HEAD COACH, un mentor de élite mundial experto en alto rendimiento deportivo.

PERFIL DEL ATLETA:
- Nombre: ${full_name || 'Rival'}
- Disciplina principal: ${main_sport}
- Nivel: ${level}
- Semilla de variedad (OBLIGATORIO usarla para crear un WOD ÚNICO diferente a cualquier anterior): ${seed}

DEPORTE SOLICITADO HOY: ${detectedSport}
CÓMO PROGRAMAR ESTE DEPORTE: ${sportGuidance}

REGLAS CRÍTICAS:
1. El WOD DEBE ser específico para "${detectedSport}" — usa ejercicios propios de ese deporte
2. NUNCA repitas el mismo WOD. La semilla "${seed}" debe inspirar selección DIFERENTE de ejercicios
3. Formato profesional: EMOM, AMRAP, FOR TIME, TABATA según corresponda al deporte
4. OBLIGATORIO incluir pesos al final: Escalado/Intermedio/Avanzado (Rx)
5. Descansos con formato: "4' REST", "2' REST"
6. Usa saltos de línea (\\n) para separar secciones

ABREVIACIONES ESTÁNDAR:
STOH=Shoulder to Overhead | TTB=Toes to Bar | C2B=Chest to Bar | HSPU=Handstand Push Up | DU=Double Unders | WBS=Wall Ball | RIR=Reps In Reserve

FORMATO JSON OBLIGATORIO (sin texto fuera del JSON):
{
  "replyText": "Mensaje motivador breve del coach (máximo 2 líneas)",
  "workout": {
    "title": "NOMBRE CREATIVO DEL WOD EN MAYÚSCULAS",
    "duration": "Tiempo total estimado (ej: 35 min)",
    "intensity": "${level}",
    "sportType": "${detectedSport}",
    "description": "WOD COMPLETO\\n\\nBLOQUE 1\\nEjercicio - reps\\n\\nX' REST\\n\\nBLOQUE 2\\nEjercicio - reps\\n\\nPESOS:\\nEjercicio - Escalado: X/Ykg | Intermedio: X/Ykg | Avanzado (Rx): X/Ykg",
    "exercises": [
      {
        "name": "Nombre del ejercicio",
        "sets": "Formato (EMOM/AMRAP/FOR TIME)",
        "reps": "Repeticiones o tiempo",
        "weight_scaled": "X/Ykg",
        "weight_intermediate": "X/Ykg",
        "weight_rx": "X/Ykg"
      }
    ]
  }
}

REGLAS ADICIONALES:
- Si no pide entreno: workout: null
- Descripción con saltos de línea (\\n) para formato limpio
- Pesos en formato Hombre/Mujer (ej: 43/30kg)
- Sé específico con tiempos y descansos`;

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
                temperature: 0.9,
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
