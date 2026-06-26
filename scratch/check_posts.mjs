import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking last 10 posts:");
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, user_id, media_type, original_wod_post_id, caption, completions_count, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching posts:", error);
    } else {
        console.log(JSON.stringify(posts, null, 2));
    }
}

check();
