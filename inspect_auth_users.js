const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAuth() {
    console.log("Inspecting auth.users and profiles...");
    
    // 1. Get Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error("Error listing auth users:", authError.message);
    } else {
        console.log(`Found ${users.length} auth users:`);
        users.forEach(u => {
            console.log(`- ID: ${u.id}, Email: ${u.email}, Created At: ${u.created_at}`);
        });
    }

    // 2. Get Profiles
    const { data: profiles, error: profError } = await supabase.from('profiles').select('id, full_name, email');
    if (profError) {
        console.error("Error listing profiles:", profError.message);
    } else {
        console.log(`Found ${profiles.length} profiles:`);
        profiles.forEach(p => {
            console.log(`- ID: ${p.id}, Email: ${p.email}, Name: ${p.full_name}`);
        });
    }
}

inspectAuth();
