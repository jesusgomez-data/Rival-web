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

    if (!wodPostId) {
      return NextResponse.json({ error: "wodPostId es requerido" }, { status: 400 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: completion, error } = await supabase
      .from("wod_completions")
      .select("*")
      .eq("user_id", user.id)
      .or(`original_wod_post_id.eq.${wodPostId},completion_post_id.eq.${wodPostId}`)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ success: true, completion });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
