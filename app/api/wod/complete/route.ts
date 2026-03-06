/**
 * RIVALFIT - Complete WOD API
 * Endpoint para registrar que un usuario completó un WOD
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

    // 4. Verificar que el post existe
    const { data: originalPost, error: postError } = await supabase
      .from("posts")
      .select("id")
      .eq("id", originalWodPostId)
      .single();

    if (postError || !originalPost) {
      return NextResponse.json({ error: "WOD no encontrado" }, { status: 404 });
    }

    // 5. Verificar si ya completó este WOD
    const { data: existing } = await supabase
      .from("wod_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("original_wod_post_id", originalWodPostId)
      .maybeSingle();

    if (existing) {
      // 6. Actualizar completion existente
      const { data: updated, error: updateError } = await supabase
        .from("wod_completions")
        .update({
          completion_type: completionType,
          completion_time_seconds: completionTimeSeconds ?? null,
          rounds_completed: roundsCompleted ?? null,
          total_reps: totalReps ?? null,
          weight_kg: weightKg ?? null,
          score: score ?? null,
          notes: notes ?? null,
          rx: rx ?? true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating completion:", updateError);
        return NextResponse.json(
          { error: "Error al actualizar completion: " + updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        completion: updated,
        message: "¡Resultado actualizado exitosamente!",
      });
    }

    // 6. Insertar completion usando el cliente autenticado del servidor
    const { data: completion, error: insertError } = await supabase
      .from("wod_completions")
      .insert({
        user_id: user.id,
        original_wod_post_id: originalWodPostId,
        completion_type: completionType,
        completion_time_seconds: completionTimeSeconds ?? null,
        rounds_completed: roundsCompleted ?? null,
        total_reps: totalReps ?? null,
        weight_kg: weightKg ?? null,
        score: score ?? null,
        notes: notes ?? null,
        rx: rx ?? true,
        started_at: startedAt ? new Date(startedAt).toISOString() : null,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting completion:", insertError);
      return NextResponse.json(
        { error: "Error al registrar completion: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      completion,
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
