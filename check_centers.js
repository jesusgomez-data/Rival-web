const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCenters() {
    const { data, error } = await supabase.from('centers').select('*').limit(1);
    if (data && data.length > 0) {
        console.log(`Table [centers] columns:`, Object.keys(data[0]));
    } else {
        console.log(`Table [centers] is EMPTY`);
    }
}

checkCenters();
