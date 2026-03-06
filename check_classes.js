const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClasses() {
    const { data, error } = await supabase.from('classes').select('*').limit(1);
    if (data && data.length > 0) {
        console.log(`Table [classes] columns:`, Object.keys(data[0]));
    } else {
        console.log(`Table [classes] is EMPTY`);
    }
}

checkClasses();
