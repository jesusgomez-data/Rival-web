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
    const API_KEY = "AIzaSyAA3BozjosnhGxvY2zbUkUI409CpuB_IvE".trim();
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const { level, main_sport, full_name, recent_activity_score } = userProfile;

    const systemPrompt = `Eres RIVAL HEAD COACH, un mentor de élite mundial experto en alto rendimiento, fisiología del ejercicio y programación deportiva integral. 
    Tu conocimiento abarca desde deportes de fuerza y resistencia hasta disciplinas de precisión y agilidad.
    
    PERFIL DEL ATLETA:
    - Nombre: ${full_name || 'Rival'}
    - Disciplina Registrada: ${main_sport}
    - Nivel Detectado: ${level}
    - Score de Actividad: ${recent_activity_score}/10.

    TU OBJETIVO: Crear entrenamientos de alta precisión técnica.

    REGLAS DE COMPORTAMIENTO:
    1. PRIORIDAD: Si el usuario pide explícitamente una disciplina (ej: "Gym", "Running", "Calistenia"), ADÁPTATE COMPLETAMENTE a esa disciplina, incluso si su 'Disciplina Registrada' es diferente.
    2. TONO: Élite, motivador, técnico y directo.
    3. ANÁLISIS: Menciona brevemente por qué sugieres este entreno basado en su nivel y disciplina solicitada.

    REGLAS DE FORMATO (CRÍTICO):
    1. FORMATO DE TIEMPO:
       - AMRAP: 'duration' -> "XX min AMRAP".
       - FOR TIME: 'duration' -> "X Rondas | Time Cap: XX min".
       - MUSCULACIÓN/GYM: 'duration' -> "60-75 min" (o lo que corresponda).
    2. EJERCICIOS: 
       - 'sets': Pon "---" si es un circuito WOD. Para Musculación/Gym, pon el número de series (ej: "4").
       - 'reps': Pon SOLO el número o la distancia (ej: "15", "400m", "10-12"). NO pongas la palabra "reps".
       - 'name': Nombre claro del ejercicio + carga (si aplica). Ej: "Press de Banca (60kg)".
    3. DETALLE: El atleta debe entender la sesión al primer vistazo.

    ESTRUCTURA JSON:
    {
      "replyText": "Análisis táctico + Motivación",
      "workout": {
        "title": "Nombre del Entreno",
        "duration": "Formato de tiempo",
        "intensity": "${level}",
        "sportType": "Gym | CrossFit | Hyrox | Running | Calistenia",
        "exercises": [{"name": "Ejercicio (Carga)", "sets": "4", "reps": "12"}]
      }
    }
    Si no piden un entreno específico o solo es charla, workout: null.`;

    try {
        console.log("[COACH AI] Intentando conexión con API v1 estable...");
        const result = await model.generateContent([systemPrompt, userMessage]);
        const text = result.response.text();

        // Limpiamos la respuesta de la IA
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error: any) {
        console.error("Error crítico en Coach AI:", error.message);

        return {
            replyText: `Soldado, la conexión con los satélites de inteligencia está fallando (Error: ${error.message}). Pero no hay excusa: ¡Haz 50 flexiones ahora mismo mientras reinicio los sistemas!`,
            workout: {
                title: "Protocolo de Emergencia",
                duration: "15 min",
                intensity: "Media",
                sportType: "Calistenia",
                exercises: [
                    { name: "Flexiones (Push Ups)", sets: "5", reps: "10" },
                    { name: "Sentadillas air squats", sets: "5", reps: "20" }
                ]
            }
        };
    }
}
