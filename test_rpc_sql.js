const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log("Testing execute_sql RPC...");
    const { data, error } = await supabase.rpc('execute_sql', {
        sql: "SELECT 1 as test_val"
    });
    
    if (error) {
        console.error("RPC Error:", error.message);
    } else {
        console.log("RPC Success! Result:", data);
    }
}

testRpc();
