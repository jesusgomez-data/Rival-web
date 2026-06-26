import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', '31e0170f-0d5f-4557-b93d-02f16b75f7d5')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${posts.length} posts`);
        posts.forEach(p => {
            console.log({
                id: p.id,
                post_type: p.post_type,
                media_type: p.media_type,
                original_wod_post_id: p.original_wod_post_id,
                media_url_preview: p.media_url ? p.media_url.substring(0, 150) : null
            });
        });
    }
}

check();
