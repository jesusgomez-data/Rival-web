const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const tables = ['classes', 'class_enrollments', 'members'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (data && data.length > 0) {
            console.log(`Table [${table}] columns:`, Object.keys(data[0]));
        } else {
            // If empty, we can't easily see columns with Supabase JS unless we use RPC or system tables
            const { data: cols, error: colError } = await supabase.rpc('get_column_names', { t_name: table });
            if (colError) {
                console.log(`Table [${table}]: EMPTY and RPC failed`);
            } else {
                console.log(`Table [${table}] columns (from RPC):`, cols);
            }
        }
    }
}

checkColumns();
