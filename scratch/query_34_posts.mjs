import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, user_id, post_type, media_type, original_wod_post_id, caption, media_url, wod_data')
        .like('media_url', '%34:00%');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${posts.length} posts with 34:00`);
        posts.forEach(p => {
            console.log("Post ID:", p.id);
            console.log("post_type:", p.post_type);
            console.log("media_type:", p.media_type);
            console.log("original_wod_post_id:", p.original_wod_post_id);
            console.log("media_url:", p.media_url);
            console.log("wod_data:", p.wod_data);
            console.log("------------------------");
        });
    }
}

check();
