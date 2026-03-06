const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectWorkouts() {
    // We already know 'workouts' and 'workout_sets' from list_all_tables
    const { data, error } = await supabase.from('workouts').select('*').limit(1);
    console.log("Workouts columns:", data ? Object.keys(data[0]) : "Empty");
    const { data: sets, error: setsErr } = await supabase.from('workout_sets').select('*').limit(1);
    console.log("Workout Sets columns:", sets ? Object.keys(sets[0]) : "Empty");
}

inspectWorkouts();
