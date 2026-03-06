const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
    const { data, error } = await supabase.rpc('get_table_triggers', { t_name: 'organizations' });
    if (error) {
        const { data: q, error: qe } = await supabase.from('organizations').select('id').limit(1);
        console.log("Checking for triggers manually...");
        // Using a query to check system tables if possible via raw SQL if rpc fails
        const { data: pg, error: pge } = await supabase.rpc('execute_sql', {
            sql: "SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'organizations'"
        });
        if (pge) console.log("SQL Error:", pge.message);
        else console.log("Triggers:", pg);
    } else {
        console.log("Triggers:", data);
    }
}

// Alternatively, let's just check the migrations for any 'CREATE TRIGGER' on organizations
checkTriggers();
