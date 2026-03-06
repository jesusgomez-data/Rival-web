const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables_info'); // Might not exist

    if (error) {
        // Fallback: try to just query common tables to see what exists
        const tables = ['organizations', 'centers', 'members', 'memberships', 'profiles', 'center_roles'];
        console.log("Checking tables existence...");
        for (const table of tables) {
            const { error: tableError } = await supabase.from(table).select('*').limit(1);
            if (tableError) {
                if (tableError.code === '42P01') {
                    console.log(`Table [${table}]: DOES NOT EXIST`);
                } else {
                    console.log(`Table [${table}]: EXISTS (Error: ${tableError.message})`);
                }
            } else {
                console.log(`Table [${table}]: EXISTS`);
            }
        }
    } else {
        console.log("Tables info:", data);
    }
}

listTables();
