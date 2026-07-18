import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type CompletionFields = {
  completionType: string;
  completionTimeSeconds?: number;
  roundsCompleted?: number;
  totalReps?: number;
  weightKg?: number;
  score?: number;
};

function buildSummary(f: CompletionFields) {
  let totalTime = "";
  let scoreType = f.completionType.toUpperCase();
  let scoreLabel = "";

  if (f.completionType === "time") {
    const mins = Math.floor((f.completionTimeSeconds || 0) / 60);
    const secs = (f.completionTimeSeconds || 0) % 60;
    totalTime = `${mins}:${String(secs).padStart(2, "0")}`;
    scoreLabel = totalTime;
    scoreType = "TIME";
  } else if (f.completionType === "rounds") {
    scoreLabel = `${f.roundsCompleted || 0} Rds`;
    scoreType = "AMRAP";
  } else if (f.completionType === "reps") {
    scoreLabel = `${f.totalReps || 0} Reps`;
    scoreType = "REPS";
  } else if (f.completionType === "weight") {
    scoreLabel = `${f.weightKg || 0} kg`;
    scoreType = "WEIGHT";
  } else {
    scoreLabel = `${f.score || 0}`;
    scoreType = "SCORE";
  }
  return { totalTime, scoreType, scoreLabel };
}

async function syncPostsForCompletion(
  supabase: SupabaseClient,
  userId: string,
  originalWodPostId: string,
  fields: CompletionFields
) {
  const { data: posts } = await supabase
    .from("posts")
    .select("id, media_url, wod_data")
    .eq("user_id", userId)
    .or(`original_wod_post_id.eq.${originalWodPostId},id.eq.${originalWodPostId}`);

  if (!posts || posts.length === 0) return;

  const summary = buildSummary(fields);

  await Promise.all(
    posts.map(async (post) => {
      let updatedMediaUrl = post.media_url;
      let updatedWodData = post.wod_data;
      let changed = false;

      if (typeof post.media_url === "string" && post.media_url.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(post.media_url);
          updatedMediaUrl = JSON.stringify({ ...parsed, summary });
          changed = true;
        } catch {}
      } else if (typeof post.media_url === "string" && post.media_url.trim().startsWith("[")) {
        try {
          const arr = JSON.parse(post.media_url);
          if (Array.isArray(arr) && arr.length > 0) {
            arr[0] = { ...arr[0], summary };
            updatedMediaUrl = JSON.stringify(arr);
            changed = true;
          }
        } catch {}
      }

      if (post.wod_data && typeof post.wod_data === "object") {
        updatedWodData = { ...post.wod_data, summary };
        changed = true;
      }

      if (changed) {
        await supabase
          .from("posts")
          .update({ media_url: updatedMediaUrl, wod_data: updatedWodData })
          .eq("id", post.id);
      }
    })
  );
}

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
      partnerId,
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

    // 5. No te puedes etiquetar a ti mismo como compañero
    if (partnerId && partnerId === user.id) {
      return NextResponse.json(
        { error: "No puedes etiquetarte a ti mismo como compañero" },
        { status: 400 }
      );
    }

    // 6. Verificar si ya completó este WOD
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
          partner_id: partnerId ?? null,
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

      // Sync updated score to matching posts
      await syncPostsForCompletion(supabase, user.id, originalWodPostId, {
        completionType, completionTimeSeconds, roundsCompleted, totalReps, weightKg, score,
      });

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
        partner_id: partnerId ?? null,
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

    // Sync newly inserted score to matching posts
    await syncPostsForCompletion(supabase, user.id, originalWodPostId, {
      completionType, completionTimeSeconds, roundsCompleted, totalReps, weightKg, score,
    });

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
