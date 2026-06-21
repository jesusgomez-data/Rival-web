import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('organizations').select('id, name, latitude, longitude, address, city');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Organizations:", data);
    }
}

check();
