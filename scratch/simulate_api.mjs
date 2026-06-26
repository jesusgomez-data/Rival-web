import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const userId = "0ca3976e-0c51-47ec-9998-004801a2629e";
    const wodPostId = "c77f651d-9815-417f-be3e-8e2060c95c9d";

    const { data: completion, error } = await supabase
      .from("wod_completions")
      .select("*")
      .eq("user_id", userId)
      .or(`original_wod_post_id.eq.${wodPostId},completion_post_id.eq.${wodPostId}`)
      .maybeSingle();

    if (error) {
        console.error("Database query error:", error);
    } else {
        console.log("Returned completion:", completion);
    }
}

check();
