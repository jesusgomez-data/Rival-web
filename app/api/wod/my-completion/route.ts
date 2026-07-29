/**
 * RIVALFIT - Get My WOD Completion API
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const wodPostId = searchParams.get("wodPostId");
    const wodPostIdsParam = searchParams.get("wodPostIds");

    if (!wodPostId && !wodPostIdsParam) {
      return NextResponse.json({ error: "wodPostId es requerido" }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const selectCols = "id, user_id, original_wod_post_id, original_center_post_id, completion_post_id, completion_type, completion_time_seconds, rounds_completed, total_reps, weight_kg, score, rx, notes, partner_id, partner:partner_id(id, username, full_name, avatar_url), completed_at";

    // Modo batch: el dashboard puede mostrar varios WODs a la vez, y cada
    // tarjeta pedía su propio /api/wod/my-completion por separado — Sentry
    // lo marcó como N+1 (7 llamadas distintas en una sola carga, 1.5-3s cada
    // una). Con wodPostIds se resuelven todos en una sola consulta.
    if (wodPostIdsParam) {
      const ids = [...new Set(wodPostIdsParam.split(',').map(s => s.trim()).filter(Boolean))];
      if (ids.length === 0) {
        return NextResponse.json({ success: true, completions: {} });
      }

      const orFilter = ids
        .map(id => `original_wod_post_id.eq.${id},original_center_post_id.eq.${id},completion_post_id.eq.${id}`)
        .join(',');

      const { data: completions, error } = await supabase
        .from("wod_completions")
        .select(selectCols)
        .eq("user_id", user.id)
        .or(orFilter);

      if (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      // Cada WOD pedido se mapea a su completion (o null) por el id que
      // coincida — un post puede matchear por cualquiera de las 3 columnas.
      const byId: Record<string, any> = {};
      for (const id of ids) {
        byId[id] = (completions || []).find((c: any) =>
          c.original_wod_post_id === id || c.original_center_post_id === id || c.completion_post_id === id
        ) || null;
      }

      const res = NextResponse.json({ success: true, completions: byId });
      res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
      return res;
    }

    const { data: completion, error } = await supabase
      .from("wod_completions")
      .select(selectCols)
      .eq("user_id", user.id)
      .or(`original_wod_post_id.eq.${wodPostId},original_center_post_id.eq.${wodPostId},completion_post_id.eq.${wodPostId}`)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const res = NextResponse.json({ success: true, completion });
    res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=30");
    return res;
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
