import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('classes').select('*').limit(1);
    if (error) {
        console.error(error);
    } else if (data && data.length > 0) {
        console.log("Classes columns:", Object.keys(data[0]));
        console.log("Sample class:", data[0]);
    } else {
        console.log("No classes found.");
    }
}

check();
