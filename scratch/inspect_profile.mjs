import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const userId = "0ca3976e-0c51-47ec-9998-004801a2629e";

async function inspect() {
  try {
    // 1. Fetch workouts
    const { data: workouts } = await supabase
      .from("workouts")
      .select("id, title, is_pr, max_weight_kg, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    console.log("Recent Workouts:", workouts);
  } catch (e) {
    console.error("Error w:", e);
  }

  try {
    // 2. Fetch workout sets for Snatch
    const { data: sets } = await supabase
      .from("workout_sets")
      .select("id, workout_id, exercise_name, weight_kg, reps, is_pr")
      .eq("exercise_name", "Snatch")
      .limit(10);
    console.log("\nRecent Snatch Workout Sets:", sets);
  } catch (e) {
    console.error("Error s:", e);
  }

  try {
    // 3. Fetch recent posts
    const { data: posts } = await supabase
      .from("posts")
      .select("id, caption, media_type, media_url, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    console.log("\nRecent Posts:", posts);
  } catch (e) {
    console.error("Error p:", e);
  }
}

inspect();
