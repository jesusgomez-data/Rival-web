
import dotenv from 'dotenv';
import path from 'path';
import puppeteer from 'puppeteer';
import { createAdminClient } from '@/utils/supabase/admin';
import * as fs from 'fs';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function publishPromoPost() {
    console.log("🚀 Starting promo post workflow...");
    const supabase = createAdminClient();

    // 0. Delete the previous "Push Your Limits" post to replace it (as requested)
    // We'll search for the last post by the official user.
    const { data: officialUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_official', true)
        .single();

    if (officialUser) {
        const { data: lastPost } = await supabase
            .from('posts')
            .select('id, caption')
            .eq('user_id', officialUser.id)
            .ilike('caption', '%PUSH YOUR LIMITS%') // Find the post we made
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (lastPost) {
            console.log(`🗑️ Deleting previous post ID: ${lastPost.id}`);
            await supabase.from('posts').delete().eq('id', lastPost.id);
        }
    } else {
        console.error("❌ Official user not found.");
        return;
    }

    // 1. Render HTML to Image using Puppeteer
    console.log("📸 Rendering HTML design to image...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set viewport to match the design dimensions
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });

    // Load the local HTML file
    const htmlPath = path.join(process.cwd(), 'rival-promo.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Wait for fonts
    await page.evaluateHandle('document.fonts.ready');

    // Get the element
    const element = await page.$('#promo-asset');
    if (!element) {
        console.error("❌ Could not find #promo-asset element");
        await browser.close();
        return;
    }

    // Take screenshot
    const imageBuffer = await element.screenshot({ type: 'png' });
    console.log("✅ Image rendered successfully.");
    await browser.close();

    // 2. Upload Image to Supabase Storage
    // We'll use the 'posts' bucket. If it doesn't exist, try 'media'.
    const fileName = `official_promo_${Date.now()}.png`;
    const bucketName = 'posts'; // Standard bucket name usually

    // Upload
    console.log(`⬆️ Uploading to storage bucket: ${bucketName}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, imageBuffer as Buffer, {
            contentType: 'image/png',
            upsert: false
        });

    let finalUrl = '';
    if (uploadError) {
        console.error("❌ Upload failed:", uploadError.message);
        // Fallback: try 'media' bucket if 'posts' failed (common in some setups)
        console.log("   Trying fallback bucket 'media'...");
        const { data: mediaUpload, error: mediaError } = await supabase.storage
            .from('media')
            .upload(fileName, imageBuffer as Buffer, {
                contentType: 'image/png'
            });

        if (mediaError) {
            console.error("❌ Fallback upload failed too:", mediaError.message);
            return;
        }
        // Success in fallback
        const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(fileName);
        finalUrl = publicUrlData.publicUrl;
    } else {
        // Success in primary
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
        finalUrl = publicUrlData.publicUrl;
    }

    console.log(`✅ Image uploaded: ${finalUrl}`);

    // 3. Create the Post
    console.log("📝 Creating new post...");
    const { data: newPost, error: createError } = await supabase
        .from('posts')
        .insert({
            user_id: officialUser.id,
            media_url: finalUrl,
            media_type: 'image',
            caption: '🔥 PUSH YOUR LIMITS 🔥\n\nEl verdadero desafío comienza cuando crees que no puedes más. En Rival Fit, no aceptamos excusas.\n\nDemuestra tu fuerza. Sube tu PR hoy.\n\n#RivalFit #PushYourLimits #NoExcuses #FitnessMotivation',
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (createError) {
        console.error("❌ Error creating post:", createError.message);
    } else {
        console.log(`🎉 SUCCESS! Official post updated with custom design.`);
        console.log(`   - New Post ID: ${newPost.id}`);
    }
}

publishPromoPost().catch(console.error);
