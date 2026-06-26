import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: post, error } = await supabase
        .from('posts')
        .select('id, media_url, wod_data')
        .eq('id', 'c53ac6cb-b22a-4809-b289-90d0ed7ed0c1')
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Full post media_url JSON:");
        console.log(JSON.stringify(JSON.parse(post.media_url), null, 2));
        console.log("Full post wod_data JSON:", post.wod_data);
    }
}

check();
