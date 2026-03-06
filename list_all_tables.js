const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
    const tables = [
        'organizations',
        'centers',
        'members',
        'memberships',
        'center_roles',
        'classes',
        'class_enrollments',
        'trial_requests',
        'center_products',
        'products',
        'orders',
        'order_items',
        'center_posts',
        'posts',
        'workouts',
        'workout_sets',
        'profiles'
    ];

    const results = [];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42P01') {
            results.push({ table, exists: false });
        } else {
            results.push({ table, exists: true, error: error ? error.message : null });
        }
    }
    console.log(JSON.stringify(results, null, 2));
}

listAllTables();
