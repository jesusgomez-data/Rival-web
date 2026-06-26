import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: completions, error } = await supabase
        .from('wod_completions')
        .select('*')
        .eq('original_wod_post_id', 'feb74796-15a5-4da1-8e18-14189a7edbf6');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${completions.length} completions`);
        completions.forEach(c => {
            console.log(c);
        });
    }
}

check();
