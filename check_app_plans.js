const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    const { data, error } = await supabase.from('application_plans').select('*').limit(1);
    if (error) {
        if (error.code === '42P01') {
            console.log("Table 'application_plans' DOES NOT exist.");
        } else {
            console.log("Error querying 'application_plans':", error.message);
        }
    } else {
        console.log("Table 'application_plans' EXISTS! Found data:", data);
    }
}

checkTable();
