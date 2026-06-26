import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking last 5 records from center_posts:");
    const { data: posts, error } = await supabase
        .from('center_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching center_posts:", error);
    } else {
        if (posts && posts.length > 0) {
            console.log("Columns:", Object.keys(posts[0]));
            console.log("Data:", JSON.stringify(posts, null, 2));
        } else {
            console.log("No center posts found.");
        }
    }
}

check();
