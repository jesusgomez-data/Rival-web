const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Testing PostgREST double select query...");
    const userId = "6eab66e9-3b69-4a97-8f72-f38cad24c7cd"; // A valid test user ID
    
    const { data, error } = await supabase
        .from('posts')
        .select(`
            id,
            likes_count:likes(count),
            user_like:likes(user_id)
        `)
        .eq('user_like.user_id', userId)
        .limit(3);

    if (error) {
        console.error("Query error:", error);
    } else {
        console.log("Success! Data:");
        console.log(JSON.stringify(data, null, 2));
    }
}

run();
