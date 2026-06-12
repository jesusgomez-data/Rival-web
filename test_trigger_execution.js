const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("--- TESTING DATABASE LIKES TRIGGER ---");
    
    // Get a user and a post
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    const { data: posts } = await supabase.from('posts').select('id, likes_count').limit(1);
    
    if (!users || users.length === 0 || !posts || posts.length === 0) {
        console.error("No users or posts found to test");
        return;
    }
    
    const userId = users[0].id;
    const postId = posts[0].id;
    const initialCount = posts[0].likes_count;
    
    console.log(`User ID: ${userId}`);
    console.log(`Post ID: ${postId}`);
    console.log(`Initial likes_count column in posts: ${initialCount}`);
    
    // Count rows in likes table for this post
    const { count: likesTableCountBefore } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
    console.log(`Initial likes rows in likes table: ${likesTableCountBefore}`);

    // Insert a like
    console.log("Inserting a like...");
    const { error: insertError } = await supabase
        .from('likes')
        .insert({ user_id: userId, post_id: postId });
        
    if (insertError) {
        console.error("Insert error:", insertError.message);
    }

    // Check post likes_count column again
    const { data: postAfterInsert } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();
    console.log(`likes_count column after insert: ${postAfterInsert?.likes_count}`);

    // Count rows in likes table after insert
    const { count: likesTableCountAfter } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);
    console.log(`likes rows in likes table after insert: ${likesTableCountAfter}`);

    // Delete the like
    console.log("Deleting the like...");
    const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);
        
    if (deleteError) {
        console.error("Delete error:", deleteError.message);
    }

    // Check post likes_count column again
    const { data: postAfterDelete } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();
    console.log(`likes_count column after delete: ${postAfterDelete?.likes_count}`);
}

test();
