/**
 * RIVALFIT - WOD Leaderboard API
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/utils/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Verify the requester is authenticated
    const supabase = await createSessionClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wodPostId = searchParams.get("wodPostId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const rxOnly = searchParams.get("rxOnly") === "true";

    if (!wodPostId) {
      return NextResponse.json({ error: "wodPostId es requerido" }, { status: 400 });
    }

    // 0. Resolve the original WOD post ID if this is a completion/repost
    let targetWodId = wodPostId;
    const { data: initialPost } = await supabaseAdmin
      .from("posts")
      .select("original_wod_post_id")
      .eq("id", wodPostId)
      .single();
    
    if (initialPost?.original_wod_post_id) {
      targetWodId = initialPost.original_wod_post_id;
    }

    // 1. Obtener completions
    let query = supabaseAdmin
      .from("wod_completions")
      .select("id, user_id, completion_type, completion_time_seconds, rounds_completed, total_reps, weight_kg, score, rx, notes, completed_at")
      .or(`original_wod_post_id.eq.${targetWodId},completion_post_id.eq.${targetWodId}`)
      .limit(limit);

    if (rxOnly) query = query.eq("rx", true);

    const { data: completions, error: completionsError } = await query;

    if (completionsError) {
      console.error("Leaderboard completions error:", completionsError);
      return NextResponse.json({ error: completionsError.message }, { status: 500 });
    }

    // Initialize list
    let completionsList = completions ? [...completions] : [];

    // 1.5. Obtener creador del WOD original
    const { data: creatorData } = await supabaseAdmin
      .from("posts")
      .select("user_id, media_url, profiles:user_id(username, full_name, avatar_url)")
      .eq("id", targetWodId)
      .single();

    const creatorRecord = creatorData as any;
    const creator = creatorData ? {
      userId: creatorData.user_id,
      username: creatorRecord.profiles?.username || "Unknown",
      fullName: creatorRecord.profiles?.full_name || "Unknown Creator",
      avatarUrl: creatorRecord.profiles?.avatar_url || null,
    } : null;

    // --- NEW: Add the creator to the ranking if they provided a score in their post but are missing from completions ---
    if (creatorData) {
      const creatorId = creatorData.user_id;
      const alreadyIn = completionsList.some(c => c.user_id === creatorId);
      
      if (!alreadyIn) {
        let added = false;
        if (creatorData.media_url) {
          try {
            const wodObj = JSON.parse(creatorData.media_url);
            const w = Array.isArray(wodObj) ? wodObj[0] : wodObj;
            const scoreStr = w.summary?.scoreLabel || w.metrics?.score;
            const scoreType = (w.summary?.scoreType || w.metrics?.type || 'SCORE').toUpperCase();
            
            if (scoreStr && scoreStr !== '-' && scoreStr !== '--:--') {
               let completionType = 'score';
               let completionTimeSeconds = null;
               let roundsCompleted = null;
               let totalReps = null;
               let weightKg = null;
               let scoreValue = null;

               const cleanScore = scoreStr.toString().replace(/[^0-9.:]/g, '');

               if (scoreType === 'TIME' || scoreStr.includes(':')) {
                  completionType = 'time';
                  const timeMatch = cleanScore.match(/(\d+):(\d+)(?::(\d+))?/);
                  if (timeMatch) {
                      if (timeMatch[3]) completionTimeSeconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
                      else completionTimeSeconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
                  } else {
                      completionTimeSeconds = parseFloat(cleanScore) || 0;
                  }
               } else if (scoreType === 'AMRAP' || scoreType === 'ROUNDS') {
                  completionType = 'rounds';
                  roundsCompleted = parseFloat(cleanScore) || 0;
               } else if (scoreType === 'REPS') {
                  completionType = 'reps';
                  totalReps = parseInt(cleanScore) || 0;
               } else if (scoreType === 'WEIGHT') {
                  completionType = 'weight';
                  weightKg = parseFloat(cleanScore) || 0;
               } else {
                  completionType = 'score';
                  scoreValue = parseFloat(cleanScore) || 0;
               }

               if (completionTimeSeconds || roundsCompleted || totalReps || weightKg || scoreValue) {
                 completionsList.push({
                   id: `creator-${wodPostId}`,
                   user_id: creatorId,
                   completion_type: completionType as any,
                   completion_time_seconds: completionTimeSeconds,
                   rounds_completed: roundsCompleted,
                   total_reps: totalReps,
                   weight_kg: weightKg,
                   score: scoreValue,
                   rx: true, 
                   notes: "Original Creator",
                   completed_at: new Date().toISOString()
                 });
                 added = true;
               }
            }
          } catch (e) {
            console.error("Error adding creator to virtual completions:", e);
          }
        }
        
        // Fallback: If not added but they are the creator, add them with a null score just to ensure they appear
        if (!added && !rxOnly) {
           completionsList.push({
             id: `creator-fallback-${wodPostId}`,
             user_id: creatorId,
             completion_type: 'score',
             completion_time_seconds: null,
             rounds_completed: null,
             total_reps: null,
             weight_kg: null,
             score: null,
             rx: true,
             notes: "Original Creator (No score detected)",
             completed_at: new Date().toISOString()
           });
        }
      }
    }

    if (completionsList.length === 0) {
      return NextResponse.json({ success: true, leaderboard: [], stats: null, total: 0, creator });
    }

    // 2. Obtener perfiles de los usuarios
    const userIds = [...new Set(completionsList.map((c) => c.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Add creator to profile map if missing (safety check)
    if (creator && !profileMap.has(creator.userId)) {
      profileMap.set(creator.userId, {
        id: creator.userId,
        username: creator.username,
        full_name: creator.fullName,
        avatar_url: creator.avatarUrl
      });
    }

    // 3. Ordenar
    const sorted = sortLeaderboard(completionsList);

    // 4. Mapear
    const leaderboard = sorted.map((entry, index) => {
      const profile = profileMap.get(entry.user_id);
      return {
        id: entry.id,
        userId: entry.user_id,
        username: profile?.username || "Unknown",
        fullName: profile?.full_name || "Unknown User",
        avatarUrl: profile?.avatar_url || null,
        rank: index + 1,
        completionTimeSeconds: entry.completion_time_seconds,
        roundsCompleted: entry.rounds_completed,
        totalReps: entry.total_reps,
        weightKg: entry.weight_kg,
        score: entry.score,
        rx: entry.rx,
        notes: entry.notes,
        completedAt: entry.completed_at,
      };
    });

    const stats = buildStats(completionsList);

    return NextResponse.json({ success: true, leaderboard, stats, total: leaderboard.length, creator });
  } catch (error: any) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function sortLeaderboard(data: any[]): any[] {
  if (data.length === 0) return [];
  const hasTime = data.some((e) => e.completion_time_seconds != null);
  const hasRounds = data.some((e) => e.rounds_completed != null);
  const hasReps = data.some((e) => e.total_reps != null);
  const hasWeight = data.some((e) => e.weight_kg != null);

  if (hasTime) return [...data].sort((a, b) => (a.completion_time_seconds ?? Infinity) - (b.completion_time_seconds ?? Infinity));
  if (hasRounds) return [...data].sort((a, b) => (b.rounds_completed ?? 0) - (a.rounds_completed ?? 0));
  if (hasReps) return [...data].sort((a, b) => (b.total_reps ?? 0) - (a.total_reps ?? 0));
  if (hasWeight) return [...data].sort((a, b) => (b.weight_kg ?? 0) - (a.weight_kg ?? 0));
  return [...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function buildStats(data: any[]) {
  const total = data.length;
  const rxCount = data.filter((c) => c.rx).length;
  const times = data.filter((c) => c.completion_time_seconds != null).map((c) => c.completion_time_seconds as number);
  const rounds = data.filter((c) => c.rounds_completed != null).map((c) => c.rounds_completed as number);
  return {
    totalCompletions: total,
    averageTime: times.length ? times.reduce((a, b) => a + b, 0) / times.length : undefined,
    averageRounds: rounds.length ? rounds.reduce((a, b) => a + b, 0) / rounds.length : undefined,
    fastestTime: times.length ? Math.min(...times) : undefined,
    mostRounds: rounds.length ? Math.max(...rounds) : undefined,
    rxPercentage: (rxCount / total) * 100,
  };
}
