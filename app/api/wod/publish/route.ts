/**
 * RIVALFIT - Publish WOD to Feed
 * API endpoint to publish generated WODs to user feed
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { GeneratedWOD } from "@/lib/wod-generator";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const wod = body.wod as GeneratedWOD;

    // Resultado opcional del publicador
    const creatorResult = body.creatorResult as {
      completionType: string;
      completionTimeSeconds?: number;
      roundsCompleted?: number;
      totalReps?: number;
      weightKg?: number;
      score?: number;
      rx?: boolean;
      notes?: string;
    } | undefined;

    if (!wod || !wod.title) {
      return NextResponse.json(
        { error: "WOD inválido" },
        { status: 400 }
      );
    }

    // 3. Formatear contenido del post
    const postContent = formatWODForPost(wod);

    // 4. Insertar post en la base de datos
    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        caption: postContent,
        post_type: "wod",
        wod_data: wod,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting WOD post:", insertError);
      return NextResponse.json(
        { error: "Error al publicar WOD" },
        { status: 500 }
      );
    }

    // 5. Si el publicador envió su resultado, guardarlo en el ranking automáticamente
    if (creatorResult && post) {
      await supabase.from("wod_completions").insert({
        user_id: user.id,
        original_wod_post_id: post.id,
        completion_type: creatorResult.completionType,
        completion_time_seconds: creatorResult.completionTimeSeconds ?? null,
        rounds_completed: creatorResult.roundsCompleted ?? null,
        total_reps: creatorResult.totalReps ?? null,
        weight_kg: creatorResult.weightKg ?? null,
        score: creatorResult.score ?? null,
        notes: creatorResult.notes ?? null,
        rx: creatorResult.rx ?? true,
        completed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      post,
      message: "WOD publicado exitosamente",
    });
  } catch (error: any) {
    console.error("Error in WOD publish:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * Formatea el WOD para display en el feed
 */
function formatWODForPost(wod: GeneratedWOD): string {
  let content = `💪 ${wod.title}\n`;
  if (wod.subtitle) {
    content += `${wod.subtitle}\n`;
  }
  content += `\n`;
  content += `⏱️ ${wod.estimatedDuration} min | `;
  content += `🔥 ${wod.caloriesBurn} kcal | `;
  content += `📊 ${wod.difficulty.toUpperCase()}\n\n`;

  // Agregar bloques principales (saltear warmup/cooldown para el preview)
  const mainBlocks = wod.blocks.filter(
    (b) => b.type === "metcon" || b.type === "strength" || b.type === "conditioning"
  );

  mainBlocks.forEach((block) => {
    content += `🎯 ${block.title.toUpperCase()}\n`;
    block.exercises.forEach((ex) => {
      content += `• ${ex.reps || ""} ${ex.name}\n`;
    });
    content += `\n`;
  });

  // Agregar un tip destacado
  if (wod.tips && wod.tips.length > 0) {
    content += `💡 TIP: ${wod.tips[0]}\n`;
  }

  content += `\n#WOD #Fitness #RivalFit #AIGenerated`;

  return content;
}
