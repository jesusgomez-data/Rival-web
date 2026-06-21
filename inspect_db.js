const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Inspecting cloud database counts...");
    const tables = [
        'profiles', 
        'organizations', 
        'centers', 
        'members', 
        'memberships', 
        'workouts', 
        'site_visits',
        'subscription_logs',
        'admin_audit_logs',
        'orders',
        'sales',
        'announcements',
        'support_tickets',
        'support_messages',
        'moderation_reports',
        'advertisements'
    ];
    for (const table of tables) {
        try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`- ${table}: error (${error.message})`);
            } else {
                console.log(`- ${table}: ${count} records`);
            }
        } catch (e) {
            console.log(`- ${table}: exception (${e.message})`);
        }
    }
}

inspect();
