import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
    console.error("Missing anonymous credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function checkAnonCounts() {
    console.log("=== Testing Anonymous DB Counts ===");
    
    const { count: profilesCount, error: pErr } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
    console.log("Profiles count:", profilesCount, "Error:", pErr);

    const { count: orgCount, error: oErr } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true });
    console.log("Organizations count:", orgCount, "Error:", oErr);

    const { count: wodsCount, error: wErr } = await supabase
        .from('wod_completions')
        .select('id', { count: 'exact', head: true });
    console.log("WOD completions count:", wodsCount, "Error:", wErr);
}

checkAnonCounts();
