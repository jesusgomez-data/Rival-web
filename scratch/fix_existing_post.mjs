import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const postId = "c77f651d-9815-417f-be3e-8e2060c95c9d";
    console.log(`Fixing post ${postId}:`);
    const { data: post, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (error) {
        console.error("Error fetching post:", error);
        return;
    }

    if (!post.media_url || typeof post.media_url !== 'string') {
        console.error("Post has no media_url string");
        return;
    }

    try {
        const parsed = JSON.parse(post.media_url);
        parsed.summary = {
            totalTime: parsed.summary?.totalTime || "34:00",
            scoreType: "TIME",
            scoreLabel: "13:37"
        };
        const updatedMediaUrl = JSON.stringify(parsed);

        const { error: updateError } = await supabase
            .from('posts')
            .update({ media_url: updatedMediaUrl })
            .eq('id', postId);

        if (updateError) {
            console.error("Error updating post media_url:", updateError);
        } else {
            console.log("Post media_url updated successfully!");
        }
    } catch (e) {
        console.error("Failed to parse or update:", e);
    }
}

run();
