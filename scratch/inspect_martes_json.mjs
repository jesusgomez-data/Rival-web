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
        .eq('id', 'a810b659-edc2-483a-90b4-0cc37f793c70')
        .single();

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Full post media_url JSON:");
        console.log(JSON.stringify(JSON.parse(post.media_url), null, 2));
    }
}

check();
