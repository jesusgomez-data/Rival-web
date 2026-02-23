import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * auto-close-duels
 * 
 * Runs on a cron schedule to automatically finalize expired duels.
 * This ensures duels close even if no user visits the dashboard.
 * 
 * Triggered via: supabase scheduler (cron: every 2 hours)
 * Can also be called manually via HTTP for testing.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Score calculation mirrors the logic in duel-actions.ts
async function getUserScore(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    duel: { start_date: string; end_date: string }
): Promise<number> {
    const endDateTime = new Date(duel.end_date);
    endDateTime.setHours(23, 59, 59, 999);

    const [
        { data: workouts },
        { data: classResults },
        { data: manualPosts },
    ] = await Promise.all([
        supabase
            .from("workouts")
            .select("id, total_volume_kg, duration_seconds, metrics")
            .eq("user_id", userId)
            .gte("start_time", duel.start_date)
            .lte("start_time", endDateTime.toISOString()),
        supabase
            .from("class_results")
            .select("data, date_performed")
            .eq("user_id", userId)
            .gte("date_performed", duel.start_date)
            .lte("date_performed", endDateTime.toISOString()),
        supabase
            .from("posts")
            .select("id, media_type, workout_id")
            .eq("user_id", userId)
            .in("media_type", ["wod", "pr"])
            .is("workout_id", null)
            .gte("created_at", duel.start_date)
            .lte("created_at", endDateTime.toISOString()),
    ]);

    let totalScore = 0;

    // Regular workouts: volume * 0.2 + duration_mins * 30
    if (workouts) {
        totalScore += workouts.reduce((acc: number, w: any) => {
            let vol = w.total_volume_kg || 0;
            if (vol === 0 && w.metrics?.blocks) {
                w.metrics.blocks.forEach((block: any) => {
                    block.exercises?.forEach((ex: any) => {
                        const weight = parseFloat(ex.value || ex.weight) || 0;
                        const sets = parseInt(ex.sets) || 1;
                        const reps = parseInt(ex.reps) || 1;
                        vol += weight * sets * reps;
                    });
                });
            }
            let durationMins = (w.duration_seconds || 0) / 60;
            if (durationMins === 0 && w.metrics?.blocks) {
                durationMins = w.metrics.blocks.length * 12;
            }
            if (durationMins === 0 && (vol > 0 || w.metrics?.blocks?.length > 0)) {
                durationMins = 20;
            }
            return acc + vol * 0.2 + durationMins * 30;
        }, 0);
    }

    // Class results: 1800 base + volume
    if (classResults) {
        totalScore += classResults.reduce((acc: number, c: any) => {
            let classVolume = 0;
            if (c.data && Array.isArray(c.data)) {
                c.data.forEach((block: any) => {
                    if (block.type === "weight" && block.exercises) {
                        block.exercises.forEach((ex: any) => {
                            classVolume +=
                                (parseFloat(ex.value) || 0) *
                                (parseInt(ex.reps) || 0) *
                                (parseInt(ex.sets) || 1);
                        });
                    } else if (block.wod_weight) {
                        classVolume += parseFloat(block.wod_weight) || 0;
                    }
                });
            }
            return acc + classVolume * 0.2 + 1800;
        }, 0);
    }

    // Manual WOD/PR posts: 1800 pts each
    if (manualPosts) {
        totalScore += manualPosts.length * 1800;
    }

    return Math.floor(totalScore);
}

async function createNotificationSafe(
    supabase: ReturnType<typeof createClient>,
    {
        userId,
        type,
        title,
        content,
        link,
    }: {
        userId: string;
        type: string;
        title: string;
        content: string;
        link: string;
    }
) {
    await supabase.from("notifications").insert({
        user_id: userId,
        type,
        title,
        content,
        link,
        read: false,
        created_at: new Date().toISOString(),
    });
}

Deno.serve(async (req: Request) => {
    // Allow both GET (for cron trigger) and POST (for manual testing)
    if (req.method !== "GET" && req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const now = new Date();
        const todayISO = now.toISOString().split("T")[0];

        // Fetch all active duels where end_date < today
        const { data: expiredDuels, error } = await supabase
            .from("duels")
            .select(
                `
        *,
        challenger:challenger_id (username, full_name, avatar_url),
        opponent:opponent_id (username, full_name, avatar_url)
      `
            )
            .eq("status", "active")
            .lt("end_date", todayISO);

        if (error) {
            console.error("Error fetching expired duels:", error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (!expiredDuels || expiredDuels.length === 0) {
            return new Response(
                JSON.stringify({ message: "No expired duels found", processed: 0 }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        console.log(`Processing ${expiredDuels.length} expired duel(s)...`);

        const results = await Promise.all(
            expiredDuels.map(async (duel: any) => {
                try {
                    // Calculate final scores for both participants
                    const [challengerScore, opponentScore] = await Promise.all([
                        getUserScore(supabase, duel.challenger_id, duel),
                        getUserScore(supabase, duel.opponent_id, duel),
                    ]);

                    // Determine winner
                    let winnerId: string | null = null;
                    if (challengerScore > opponentScore) winnerId = duel.challenger_id;
                    else if (opponentScore > challengerScore) winnerId = duel.opponent_id;
                    // null = draw

                    // Mark duel as completed in the DB
                    const { error: updateError } = await supabase
                        .from("duels")
                        .update({
                            status: "completed",
                            winner_id: winnerId,
                            challenger_score: challengerScore,
                            opponent_score: opponentScore,
                        })
                        .eq("id", duel.id);

                    if (updateError) {
                        console.error(`Error updating duel ${duel.id}:`, updateError);
                        return { duelId: duel.id, error: updateError.message };
                    }

                    // Send notifications to both participants
                    if (winnerId) {
                        const loserId =
                            winnerId === duel.challenger_id
                                ? duel.opponent_id
                                : duel.challenger_id;
                        const winnerName =
                            winnerId === duel.challenger_id
                                ? duel.challenger?.full_name
                                : duel.opponent?.full_name;
                        const loserName =
                            loserId === duel.challenger_id
                                ? duel.challenger?.full_name
                                : duel.opponent?.full_name;

                        await Promise.all([
                            createNotificationSafe(supabase, {
                                userId: winnerId,
                                type: "duel_won",
                                title: "🏆 ¡Victoria en el Duelo!",
                                content: `Has derrotado a ${loserName} (${challengerScore} vs ${opponentScore} pts). ¡Sigue dominando!`,
                                link: "/dashboard#duels-section",
                            }),
                            createNotificationSafe(supabase, {
                                userId: loserId,
                                type: "duel_lost",
                                title: "💪 Duelo Finalizado",
                                content: `${winnerName} te ha superado en este duelo (${opponentScore} vs ${challengerScore} pts). ¡Entrena más fuerte para la próxima!`,
                                link: "/dashboard#duels-section",
                            }),
                        ]);
                    } else {
                        // Draw - notify both
                        await Promise.all([
                            createNotificationSafe(supabase, {
                                userId: duel.challenger_id,
                                type: "duel_draw",
                                title: "🤝 Duelo Empatado",
                                content: `Tu duelo contra ${duel.opponent?.full_name} ha terminado en empate (${challengerScore} pts cada uno).`,
                                link: "/dashboard#duels-section",
                            }),
                            createNotificationSafe(supabase, {
                                userId: duel.opponent_id,
                                type: "duel_draw",
                                title: "🤝 Duelo Empatado",
                                content: `Tu duelo contra ${duel.challenger?.full_name} ha terminado en empate (${opponentScore} pts cada uno).`,
                                link: "/dashboard#duels-section",
                            }),
                        ]);
                    }

                    return {
                        duelId: duel.id,
                        challengerScore,
                        opponentScore,
                        winnerId,
                        status: "completed",
                    };
                } catch (err: any) {
                    console.error(`Error processing duel ${duel.id}:`, err);
                    return { duelId: duel.id, error: err.message };
                }
            })
        );

        console.log("Batch complete:", results);

        return new Response(
            JSON.stringify({
                message: `Processed ${expiredDuels.length} expired duel(s)`,
                processed: results.length,
                results,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (err: any) {
        console.error("Unexpected error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
