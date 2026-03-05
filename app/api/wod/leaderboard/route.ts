/**
 * RIVALFIT - WOD Leaderboard API
 * Endpoint para obtener el ranking de un WOD específico
 */

import { NextRequest, NextResponse } from "next/server";
import WODCompletionsService from "@/lib/wod-completions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const wodPostId = searchParams.get("wodPostId");
    const limit = searchParams.get("limit");
    const rxOnly = searchParams.get("rxOnly") === "true";
    const friendsOnly = searchParams.get("friendsOnly") === "true";

    // Validar wodPostId
    if (!wodPostId) {
      return NextResponse.json(
        { error: "wodPostId es requerido" },
        { status: 400 }
      );
    }

    // Obtener leaderboard
    const service = new WODCompletionsService();
    const leaderboard = await service.getLeaderboard(wodPostId, {
      limit: limit ? parseInt(limit) : 50,
      rxOnly,
      friendsOnly,
    });

    // Obtener estadísticas del WOD
    const stats = await service.getWODStats(wodPostId);

    return NextResponse.json({
      success: true,
      leaderboard,
      stats,
      total: leaderboard.length,
    });
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
