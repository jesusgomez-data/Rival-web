import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

// CONFIGURATION (Add these to your .env)
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;
const SYNC_SECRET = process.env.SYNC_SECRET || 'rival_sync_2024';

/**
 * Automates syncing Instagram posts to the Rival Fit official profile.
 * Expected endpoint: /api/instagram/sync
 * Secure with header: 'x-sync-secret': SYNC_SECRET
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('x-sync-secret');
    
    if (authHeader !== SYNC_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!INSTAGRAM_ACCESS_TOKEN || !INSTAGRAM_USER_ID) {
        return NextResponse.json({ error: 'Instagram credentials missing in environment' }, { status: 500 });
    }

    try {
        const supabase = createAdminClient();

        // 1. Identify the Official Account
        const { data: officialProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_official', true)
            .limit(1)
            .maybeSingle();

        if (profileError || !officialProfile) {
            return NextResponse.json({ error: 'Official profile not found' }, { status: 404 });
        }

        const officialId = officialProfile.id;

        // 2. Fetch Latest Instagram Media
        // Documentation: https://developers.facebook.com/docs/instagram-basic-display-api/reference/media
        const igResponse = await fetch(
            `https://graph.instagram.com/${INSTAGRAM_USER_ID}/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${INSTAGRAM_ACCESS_TOKEN}`
        );

        if (!igResponse.ok) {
            const igError = await igResponse.json();
            console.error('Instagram API Error:', igError);
            return NextResponse.json({ error: 'Failed to fetch Instagram media', details: igError }, { status: 502 });
        }

        const { data: igMedia } = await igResponse.json();

        if (!igMedia || !Array.isArray(igMedia)) {
            return NextResponse.json({ message: 'No media found to sync' });
        }

        let syncedCount = 0;

        // 3. Process and Sync
        for (const item of igMedia.slice(0, 5)) { // Sync last 5 to avoid heavy loads
            // Check if post already exists (by checking caption for IG ID reference)
            const igReference = `[IG_ID:${item.id}]`;
            
            const { data: existingPost } = await supabase
                .from('posts')
                .select('id')
                .eq('user_id', officialId)
                .like('caption', `%${igReference}%`)
                .maybeSingle();

            if (existingPost) continue; // Already synced

            // Download media to persist it (IG URLs expire)
            const mediaResponse = await fetch(item.media_url);
            const mediaBlob = await mediaResponse.blob();
            const fileExt = item.media_type === 'VIDEO' ? 'mp4' : 'jpg';
            const fileName = `official/${item.id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('posts')
                .upload(fileName, mediaBlob, {
                    contentType: item.media_type === 'VIDEO' ? 'video/mp4' : 'image/jpeg'
                });

            if (uploadError) {
                console.error(`Failed to upload media ${item.id}:`, uploadError);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('posts')
                .getPublicUrl(fileName);

            // 4. Insert into Rival Fit Posts
            const { error: insertError } = await supabase
                .from('posts')
                .insert({
                    user_id: officialId,
                    caption: `${item.caption || ''}\n\n${igReference}`,
                    media_url: publicUrl,
                    media_type: item.media_type === 'VIDEO' ? 'video' : 'image',
                    created_at: item.timestamp
                });

            if (insertError) {
                console.error(`Failed to insert post ${item.id}:`, insertError);
            } else {
                syncedCount++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            syncedCount, 
            message: `Successfully synced ${syncedCount} new posts from Instagram.` 
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}