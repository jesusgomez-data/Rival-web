import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  // Check policies
  const { data, error } = await supabase
    .from("pg_policies")
    .select("*");

  if (error) {
    console.error("Error fetching policies:", error);
  } else {
    console.log("Policies:", data);
  }

  // 1. Get trial_requests column structure
  const { data: requestCols, error: err1 } = await supabase
    .from("trial_requests")
    .select("*")
    .limit(1);

  if (err1) {
    console.error("Error fetching trial_requests columns:", err1);
  } else {
    console.log("trial_requests columns:", Object.keys(requestCols[0] || {}));
  }

  // 2. Get classes structure
  const { data: classCols, error: err2 } = await supabase
    .from("classes")
    .select("*")
    .limit(1);

  if (err2) {
    console.error("Error fetching classes columns:", err2);
  } else {
    console.log("classes columns:", Object.keys(classCols[0] || {}));
  }
}

inspect();
