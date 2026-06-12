const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Testing perfect query solution...");
    const userId = "6eab66e9-3b69-4a97-8f72-f38cad24c7cd";
    
    const { data, error } = await supabase
        .from('posts')
        .select(`
            id,
            likes:likes(user_id),
            comments:comments(count)
        `)
        .limit(3);

    if (error) {
        console.error("Query error:", error);
    } else {
        console.log("Success! Data:");
        data.forEach(p => {
            const likesCount = p.likes ? p.likes.length : 0;
            const commentsCount = p.comments?.[0]?.count || 0;
            const hasLiked = p.likes ? p.likes.some(l => l.user_id === userId) : false;
            console.log(`Post ${p.id}: likes_count=${likesCount}, comments_count=${commentsCount}, hasLiked=${hasLiked}`);
        });
    }
}

run();
