const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Testing PostgREST count query...");
    const { data, error } = await supabase
        .from('posts')
        .select(`
            id,
            likes:likes(count),
            comments:comments(count)
        `)
        .limit(3);

    if (error) {
        console.error("Query error:", error);
    } else {
        console.log("Success! Data:");
        console.log(JSON.stringify(data, null, 2));
    }
}

run();
