const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Let's get a user ID first
    const { data: profiles } = await supabase.from('profiles').select('id').limit(2);
    if (!profiles || profiles.length === 0) {
        console.log('No profiles found');
        return;
    }
    const userId = profiles[0].id;
    console.log('Testing with User ID:', userId);

    // Let's query posts with ALL likes
    const { data: postsAllLikes, error: err1 } = await supabase
        .from('posts')
        .select('id, likes:likes(user_id)')
        .limit(5);

    if (err1) {
        console.error('Error fetching all likes:', err1);
    } else {
        console.log('All likes count per post:');
        postsAllLikes.forEach(p => console.log(`Post ${p.id}: ${p.likes?.length || 0} likes`));
    }

    // Let's query posts with filtered likes for just this user
    // In PostgREST: likes(user_id).eq(user_id, userId)
    // Wait, let's try the eq query parameter:
    const { data: postsFilteredLikes, error: err2 } = await supabase
        .from('posts')
        .select('id, likes:likes(user_id)')
        .eq('likes.user_id', userId)
        .limit(5);

    if (err2) {
        console.error('Error fetching filtered likes:', err2);
    } else {
        console.log('\nFiltered likes per post (eq):');
        postsFilteredLikes.forEach(p => console.log(`Post ${p.id}: ${p.likes?.length || 0} likes`));
    }
}

run();
