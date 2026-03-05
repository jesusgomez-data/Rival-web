/**
 * RIVALFIT - Complete WOD API
 * Endpoint para registrar que un usuario completó un WOD
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import WODCompletionsService from "@/lib/wod-completions";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();

    const {
      originalWodPostId,
      completionType,
      completionTimeSeconds,
      roundsCompleted,
      totalReps,
      weightKg,
      score,
      notes,
      rx,
      startedAt,
    } = body;

    // 3. Validar datos requeridos
    if (!originalWodPostId || !completionType) {
      return NextResponse.json(
        { error: "originalWodPostId y completionType son requeridos" },
        { status: 400 }
      );
    }

    // 4. Registrar completion
    const service = new WODCompletionsService();
    const result = await service.completeWOD({
      originalWodPostId,
      completionType,
      completionTimeSeconds,
      roundsCompleted,
      totalReps,
      weightKg,
      score,
      notes,
      rx: rx ?? true,
      startedAt: startedAt ? new Date(startedAt) : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al completar WOD" },
        { status: 400 }
      );
    }

    // 5. Opcional: Crear post en el feed del usuario
    // (Puedes activar esto si quieres que se publique automáticamente)
    /*
    const completionPost = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        caption: `¡Completé este WOD! ⏱️ ${formatResult(result.completion)}`,
        post_type: "workout_completion",
        // Link al WOD original
      })
      .select()
      .single();
    */

    return NextResponse.json({
      success: true,
      completion: result.completion,
      message: "¡WOD completado exitosamente!",
    });
  } catch (error: any) {
    console.error("Error in complete WOD:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Helper para formatear el resultado
function formatResult(completion: any): string {
  if (completion.completionTimeSeconds) {
    const mins = Math.floor(completion.completionTimeSeconds / 60);
    const secs = completion.completionTimeSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  } else if (completion.roundsCompleted) {
    return `${completion.roundsCompleted} rounds`;
  } else if (completion.totalReps) {
    return `${completion.totalReps} reps`;
  } else if (completion.weightKg) {
    return `${completion.weightKg} kg`;
  } else {
    return `Score: ${completion.score}`;
  }
}
