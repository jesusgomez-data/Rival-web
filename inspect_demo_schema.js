const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    const tables = ['memberships', 'center_products', 'classes', 'organizations'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error && data.length > 0) {
            console.log(`--- Table: ${table} ---`);
            console.log(Object.keys(data[0]));
        } else {
            // If empty, try to get columns from another way if I have to, but I'll assume standard ones based on earlier greps
        }
    }
}

inspectSchema();
