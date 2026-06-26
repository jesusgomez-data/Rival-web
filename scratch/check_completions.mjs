import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const postId = "c77f651d-9815-417f-be3e-8e2060c95c9d";
    console.log(`Checking post ${postId} content and wod_data:`);
    const { data: post, error } = await supabase
        .from('posts')
        .select('id, user_id, content, media_url, wod_data')
        .eq('id', postId)
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("content:", post.content);
        console.log("media_url:", post.media_url);
        console.log("wod_data:", post.wod_data);
    }
}

check();
