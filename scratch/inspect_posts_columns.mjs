import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('posts').select('*').limit(1);
    if (error) {
        console.error("Error fetching post:", error);
        return;
    }
    if (data && data.length > 0) {
        console.log("Posts table columns:", Object.keys(data[0]));
    } else {
        console.log("No posts found. Let's try inserting a dummy one or querying catalog.");
    }
}

check();
