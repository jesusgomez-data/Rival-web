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
const exercise = "Snatch";
const weight = "85";
const sport = "Cross Training";
const weightNum = parseFloat(weight);

async function testPRInsert() {
  try {
    console.log("1. Checking existing sets...");
    const { data: existingSets, error: exError } = await supabase
      .from('workout_sets')
      .select('weight_kg, workouts!inner(user_id)')
      .eq('exercise_name', exercise)
      .eq('workouts.user_id', userId)
      .order('weight_kg', { ascending: false })
      .limit(1);

    if (exError) {
      console.error("Error fetching existing sets:", exError);
    } else {
      console.log("Existing sets:", existingSets);
    }

    const currentMax = existingSets?.[0]?.weight_kg || 0;
    const isNewPR = weightNum > currentMax;
    console.log(`Weight: ${weightNum}, Current Max: ${currentMax}, isNewPR: ${isNewPR}`);

    console.log("\n2. Attempting to insert virtual workout...");
    const { data: prWorkout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        title: `PR: ${exercise}`,
        sport_type: 'gym',
        duration_seconds: 0,
        is_pr: true,
        max_weight_kg: weightNum,
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        notes: `Récord personal registrado desde el feed (TEST)`
      })
      .select()
      .single();

    if (workoutError) {
      console.error("Error inserting workout:", workoutError);
      return;
    }
    console.log("Workout inserted successfully:", prWorkout);

    console.log("\n3. Attempting to insert workout set...");
    const { data: prSet, error: setError } = await supabase
      .from('workout_sets')
      .insert({
        workout_id: prWorkout.id,
        exercise_name: exercise,
        set_order: 1,
        weight_kg: weightNum,
        reps: 1,
        is_pr: isNewPR
      })
      .select()
      .single();

    if (setError) {
      console.error("Error inserting set:", setError);
      return;
    }
    console.log("Set inserted successfully:", prSet);

    console.log("\n4. Running syncFeaturedRm simulation...");
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('featured_rms')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return;
    }
    console.log("Current featured RMs:", profile.featured_rms);

    const featuredRms = profile.featured_rms || [];
    let updated = false;
    const updatedFeaturedRms = featuredRms.map((rm) => {
      if (rm.exercise && rm.exercise.toLowerCase() === exercise.toLowerCase()) {
        const currentWeight = parseFloat(rm.weight) || 0;
        if (weightNum > currentWeight) {
          updated = true;
          return {
            ...rm,
            weight: weightNum.toString(),
            unit: rm.unit || "kg"
          };
        }
      }
      return rm;
    });

    console.log(`Updated flag: ${updated}`);
    if (updated) {
      console.log("Updating featured RMs in DB to:", updatedFeaturedRms);
      const { data: updateRes, error: updateError } = await supabase
        .from('profiles')
        .update({ featured_rms: updatedFeaturedRms })
        .eq('id', userId)
        .select();

      if (updateError) {
        console.error("Error updating profile:", updateError);
      } else {
        console.log("Profile updated successfully!");
      }
    } else {
      console.log("No update performed (weight not greater or exercise not found)");
    }

  } catch (e) {
    console.error("Unhandled test exception:", e);
  }
}

testPRInsert();
