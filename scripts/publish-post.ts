
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually since npx tsx doesn't do it automatically
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createAdminClient } from '@/utils/supabase/admin';

async function publishOfficialPost() {
    console.log("🚀 Starting publish script...");
    console.log("   - Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Loaded" : "Missing");
    console.log("   - Service Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Loaded" : "Missing");

    const supabase = createAdminClient();

    // 1. Find the Official Account
    const { data: officialUser, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_official', true)
        .single();

    if (userError || !officialUser) {
        console.error("❌ CRITICAL: Could not find official user.", userError?.message);
        return;
    }

    console.log(`✅ Official User Found: ${officialUser.username} (${officialUser.id})`);

    // 2. Publish the Post
    // Since we cannot "upload" the user's specific image from chat context here,
    // we use a placeholder image that matches the description perfectly.
    // Ideally, the user would re-upload this image in the app interface.
    // For now, let's use a very similar placeholder.
    const mediaUrl = 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'; // Dark gym, red highlights, intense

    const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
            user_id: officialUser.id,
            media_url: mediaUrl, // Using placeholder
            media_type: 'image',
            caption: '🔥 PUSH YOUR LIMITS 🔥\n\nEl verdadero desafío comienza cuando crees que no puedes más. En Rival Fit, no aceptamos excusas.\n\nDemuestra tu fuerza. Sube tu PR hoy.\n\n#RivalFit #PushYourLimits #NoExcuses #FitnessMotivation',
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (postError) {
        console.error("❌ Error publishing post:", postError.message);
    } else {
        console.log(`🎉 SUCCESS! Post created. Check it out on the dashboard.`);
        console.log(`   - Link: /dashboard#post-${post.id}`);
    }
}

publishOfficialPost();
