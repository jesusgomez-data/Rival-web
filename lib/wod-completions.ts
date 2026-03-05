/**
 * RIVALFIT - WOD Completions & Leaderboard Service
 * Sistema para registrar WODs completados y crear rankings compartidos
 */

import { createClient } from "@/utils/supabase/client";

// ============================================
// TIPOS
// ============================================

export type CompletionType = "time" | "rounds" | "reps" | "weight" | "score";

export interface WODCompletion {
  id: string;
  userId: string;
  originalWodPostId: string;
  completionPostId?: string;
  completionType: CompletionType;

  // Resultados
  completionTimeSeconds?: number; // Para "For Time"
  roundsCompleted?: number; // Para "AMRAP"
  totalReps?: number; // Para conteo de reps
  weightKg?: number; // Para fuerza
  score?: number; // Puntuación general

  // Metadata
  notes?: string;
  rx: boolean; // Rx vs Scaled

  // Timestamps
  startedAt?: string;
  completedAt: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  rank: number;

  // Resultados (según tipo)
  completionTimeSeconds?: number;
  roundsCompleted?: number;
  totalReps?: number;
  weightKg?: number;
  score?: number;

  rx: boolean;
  notes?: string;
  completedAt: string;
}

export interface WODStats {
  totalCompletions: number;
  averageTime?: number; // Tiempo promedio (para For Time)
  averageRounds?: number; // Rounds promedio (para AMRAP)
  fastestTime?: number;
  mostRounds?: number;
  rxPercentage: number; // % que lo hizo Rx
}

// ============================================
// CLASE WOD COMPLETIONS SERVICE
// ============================================

export class WODCompletionsService {
  private supabase = createClient();

  /**
   * Registrar que un usuario completó un WOD
   */
  async completeWOD(data: {
    originalWodPostId: string;
    completionType: CompletionType;
    completionTimeSeconds?: number;
    roundsCompleted?: number;
    totalReps?: number;
    weightKg?: number;
    score?: number;
    notes?: string;
    rx?: boolean;
    startedAt?: Date;
  }): Promise<{ success: boolean; completion?: WODCompletion; error?: string }> {
    try {
      // 1. Verificar autenticación
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "No autenticado" };
      }

      // 2. Verificar que el WOD original existe
      const { data: originalPost, error: postError } = await this.supabase
        .from("posts")
        .select("id, post_type, user_id")
        .eq("id", data.originalWodPostId)
        .single();

      if (postError || !originalPost) {
        return { success: false, error: "WOD no encontrado" };
      }

      if (originalPost.post_type !== "wod") {
        return { success: false, error: "El post no es un WOD" };
      }

      // 3. Verificar si ya completó este WOD antes
      const { data: existingCompletion } = await this.supabase
        .from("wod_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("original_wod_post_id", data.originalWodPostId)
        .single();

      if (existingCompletion) {
        return {
          success: false,
          error: "Ya completaste este WOD. Puedes editar tu resultado anterior.",
        };
      }

      // 4. Crear el registro de completion
      const { data: completion, error: insertError } = await this.supabase
        .from("wod_completions")
        .insert({
          user_id: user.id,
          original_wod_post_id: data.originalWodPostId,
          completion_type: data.completionType,
          completion_time_seconds: data.completionTimeSeconds,
          rounds_completed: data.roundsCompleted,
          total_reps: data.totalReps,
          weight_kg: data.weightKg,
          score: data.score,
          notes: data.notes,
          rx: data.rx ?? true,
          started_at: data.startedAt?.toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating completion:", insertError);
        return { success: false, error: "Error al registrar completion" };
      }

      return {
        success: true,
        completion: this.mapCompletion(completion),
      };
    } catch (error: any) {
      console.error("Error in completeWOD:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener leaderboard de un WOD específico
   */
  async getLeaderboard(
    wodPostId: string,
    options?: {
      limit?: number;
      rxOnly?: boolean;
      friendsOnly?: boolean;
      currentUserId?: string;
    }
  ): Promise<LeaderboardEntry[]> {
    try {
      let query = this.supabase
        .from("wod_completions")
        .select(
          `
          id,
          user_id,
          completion_type,
          completion_time_seconds,
          rounds_completed,
          total_reps,
          weight_kg,
          score,
          rx,
          notes,
          completed_at,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `
        )
        .eq("original_wod_post_id", wodPostId);

      // Filtrar solo Rx si se solicita
      if (options?.rxOnly) {
        query = query.eq("rx", true);
      }

      // TODO: Implementar filtro de "solo amigos"
      // if (options?.friendsOnly && options?.currentUserId) {
      //   const friends = await this.getFriendIds(options.currentUserId);
      //   query = query.in('user_id', friends);
      // }

      // Límite
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error("Error fetching leaderboard:", error);
        return [];
      }

      // Ordenar según el tipo de completion
      const sortedData = this.sortLeaderboard(data);

      // Mapear a LeaderboardEntry con rank
      return sortedData.map((entry: any, index: number) => ({
        id: entry.id,
        userId: entry.user_id,
        username: entry.profiles?.username || "Unknown",
        fullName: entry.profiles?.full_name || "Unknown User",
        avatarUrl: entry.profiles?.avatar_url,
        rank: index + 1,
        completionTimeSeconds: entry.completion_time_seconds,
        roundsCompleted: entry.rounds_completed,
        totalReps: entry.total_reps,
        weightKg: entry.weight_kg,
        score: entry.score,
        rx: entry.rx,
        notes: entry.notes,
        completedAt: entry.completed_at,
      }));
    } catch (error) {
      console.error("Error in getLeaderboard:", error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de un WOD
   */
  async getWODStats(wodPostId: string): Promise<WODStats | null> {
    try {
      const { data, error } = await this.supabase
        .from("wod_completions")
        .select("*")
        .eq("original_wod_post_id", wodPostId);

      if (error || !data || data.length === 0) {
        return null;
      }

      const totalCompletions = data.length;
      const rxCount = data.filter((c: any) => c.rx).length;

      // Calcular promedios según el tipo
      const times = data
        .filter((c: any) => c.completion_time_seconds)
        .map((c: any) => c.completion_time_seconds);
      const rounds = data
        .filter((c: any) => c.rounds_completed)
        .map((c: any) => c.rounds_completed);

      return {
        totalCompletions,
        averageTime: times.length
          ? times.reduce((a: number, b: number) => a + b, 0) / times.length
          : undefined,
        averageRounds: rounds.length
          ? rounds.reduce((a: number, b: number) => a + b, 0) / rounds.length
          : undefined,
        fastestTime: times.length ? Math.min(...times) : undefined,
        mostRounds: rounds.length ? Math.max(...rounds) : undefined,
        rxPercentage: (rxCount / totalCompletions) * 100,
      };
    } catch (error) {
      console.error("Error in getWODStats:", error);
      return null;
    }
  }

  /**
   * Verificar si el usuario ya completó un WOD
   */
  async hasUserCompleted(
    userId: string,
    wodPostId: string
  ): Promise<WODCompletion | null> {
    try {
      const { data, error } = await this.supabase
        .from("wod_completions")
        .select("*")
        .eq("user_id", userId)
        .eq("original_wod_post_id", wodPostId)
        .single();

      if (error || !data) return null;

      return this.mapCompletion(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener el ranking del usuario en un WOD
   */
  async getUserRank(
    userId: string,
    wodPostId: string
  ): Promise<{ rank: number; total: number; percentile: number } | null> {
    try {
      const { data, error } = await this.supabase.rpc("get_user_rank_in_wod", {
        p_user_id: userId,
        p_wod_post_id: wodPostId,
      });

      if (error || !data || data.length === 0) return null;

      return {
        rank: data[0].rank,
        total: data[0].total_completions,
        percentile: data[0].percentile,
      };
    } catch (error) {
      console.error("Error getting user rank:", error);
      return null;
    }
  }

  // ============================================
  // HELPERS PRIVADOS
  // ============================================

  private sortLeaderboard(data: any[]): any[] {
    if (data.length === 0) return [];

    const firstEntry = data[0];

    // Ordenar según el tipo de completion
    if (firstEntry.completion_time_seconds !== null) {
      // For Time: menor tiempo = mejor
      return [...data].sort(
        (a, b) =>
          (a.completion_time_seconds || Infinity) -
          (b.completion_time_seconds || Infinity)
      );
    } else if (firstEntry.rounds_completed !== null) {
      // AMRAP: más rounds = mejor
      return [...data].sort(
        (a, b) => (b.rounds_completed || 0) - (a.rounds_completed || 0)
      );
    } else if (firstEntry.total_reps !== null) {
      // Reps: más reps = mejor
      return [...data].sort((a, b) => (b.total_reps || 0) - (a.total_reps || 0));
    } else if (firstEntry.weight_kg !== null) {
      // Peso: más peso = mejor
      return [...data].sort((a, b) => (b.weight_kg || 0) - (a.weight_kg || 0));
    } else {
      // Score: mayor score = mejor
      return [...data].sort((a, b) => (b.score || 0) - (a.score || 0));
    }
  }

  private mapCompletion(data: any): WODCompletion {
    return {
      id: data.id,
      userId: data.user_id,
      originalWodPostId: data.original_wod_post_id,
      completionPostId: data.completion_post_id,
      completionType: data.completion_type,
      completionTimeSeconds: data.completion_time_seconds,
      roundsCompleted: data.rounds_completed,
      totalReps: data.total_reps,
      weightKg: data.weight_kg,
      score: data.score,
      notes: data.notes,
      rx: data.rx,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      createdAt: data.created_at,
    };
  }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatear tiempo en segundos a MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formatear rounds con decimal (ej: 8.5 rounds)
 */
export function formatRounds(rounds: number): string {
  const wholeRounds = Math.floor(rounds);
  const decimal = rounds - wholeRounds;

  if (decimal === 0) {
    return `${wholeRounds} rounds`;
  } else {
    return `${wholeRounds} + ${Math.round(decimal * 100)}%`;
  }
}

export default WODCompletionsService;
