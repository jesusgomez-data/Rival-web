
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing Supabase connectivity...');
    console.log('URL:', supabaseUrl);

    const { data, error } = await supabase.from('profiles').select('id, full_name').limit(1);

    if (error) {
        console.error('Error connecting to Supabase:', error);
    } else {
        console.log('Successfully connected! Found profile:', data);
    }
}

test();
