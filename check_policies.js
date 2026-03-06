const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await s.rpc('get_policies', { table_name: 'organizations' });
    if (error) {
        // If get_policies doesn't exist, use raw SQL via RPC (assuming executive permissions)
        const { data: policies, error: sqlError } = await s.rpc('execute_sql', {
            query: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'organizations'"
        });
        if (sqlError) {
            console.log('Error listing policies:', sqlError);
        } else {
            console.log('Políticas para organizations:', policies);
        }
    } else {
        console.log('Políticas para organizations:', data);
    }
}

check();
