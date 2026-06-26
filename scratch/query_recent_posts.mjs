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
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching posts:", error);
    } else {
        console.log("Recent posts:");
        posts.forEach(p => {
            console.log({
                id: p.id,
                user_id: p.user_id,
                post_type: p.post_type,
                media_type: p.media_type,
                original_wod_post_id: p.original_wod_post_id,
                caption: p.caption,
                has_media_url: !!p.media_url,
                media_url_preview: p.media_url ? p.media_url.substring(0, 100) : null,
                has_wod_data: !!p.wod_data,
                wod_data_preview: p.wod_data ? JSON.stringify(p.wod_data).substring(0, 100) : null
            });
        });
    }
}

check();
