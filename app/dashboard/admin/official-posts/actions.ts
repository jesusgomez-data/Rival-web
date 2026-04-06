'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

/**
 * Gets the list of available marketing assets from the local filesystem (public/instagram).
 * Groups them by carousel name and associates descriptions if available.
 */
export async function getMarketingAssets() {
    const dirPath = path.join(process.cwd(), 'public', 'instagram');
    
    if (!fs.existsSync(dirPath)) return { error: 'Directorio marketing/instagram no encontrado' };

    const allFiles = fs.readdirSync(dirPath);
    const mediaFiles = allFiles.filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.mp4'));
    
    const assetsByGroup: Record<string, { files: string[], description: string }> = {};

    mediaFiles.forEach(file => {
        // Group by prefix (e.g. carrusel-01-motivacional from carrusel-01-motivacional-slide-01.jpg)
        // Works for: carrusel-XX, carousel-sXX, post-XX, story-XX
        const groupMatch = file.match(/^(carrusel-\d+-[^s]+|carousel-s\d+|post-\d+-[^s]+|story-\d+-[^s]+)/i);
        const groupName = groupMatch ? groupMatch[1].toLowerCase() : 'varios';
        
        if (!assetsByGroup[groupName]) {
            assetsByGroup[groupName] = { files: [], description: '' };
            
            // Check for a .txt file with the group name for automatic description
            const txtPath = path.join(dirPath, `${groupName}.txt`);
            if (fs.existsSync(txtPath)) {
                try {
                    assetsByGroup[groupName].description = fs.readFileSync(txtPath, 'utf-8');
                } catch (e) {
                    console.error(`Error reading description for ${groupName}:`, e);
                }
            }
        }
        
        assetsByGroup[groupName].files.push(`/instagram/${file}`);
    });

    // Sort slides within groups
    Object.keys(assetsByGroup).forEach(group => {
        assetsByGroup[group].files.sort();
    });

    return { assets: assetsByGroup };
}

/**
 * Publishes an official post using the marketing assets.
 */
export async function publishOfficialPost(formData: FormData) {
    try {
        const supabase = createAdminClient();
        
        const assetsJson = formData.get('assets') as string;
        const caption = formData.get('caption') as string;
        const scheduledFor = formData.get('scheduled_for') as string;
        
        if (!assetsJson) return { error: 'Faltan los archivos del post' };
        
        const assets = JSON.parse(assetsJson);
        const isCarousel = assets.length > 1;

        // 1. Identify the Official Account
        const { data: officialProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_official', true)
            .limit(1)
            .maybeSingle();

        if (profileError || !officialProfile) {
            return { error: 'No se encontró el perfil oficial' };
        }

        // 2. Insert the post
        const createdAt = scheduledFor ? new Date(`${scheduledFor}T${new Date().toISOString().split('T')[1]}`).toISOString() : new Date().toISOString();

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: officialProfile.id,
                caption: caption,
                media_url: isCarousel ? JSON.stringify(assets) : assets[0],
                media_type: isCarousel ? 'carousel' : (assets[0].endsWith('.mp4') ? 'video' : 'image'),
                created_at: createdAt
            });

        if (insertError) {
            console.error('Insert error:', insertError);
            return { error: `Error al publicar: ${insertError.message}` };
        }

        // 3. CLEANUP: Deactivated for now to avoid broken images in the feed
        // In the future, these will be uploaded to Supabase Storage before deletion
        /*
        try {
            const dirPath = path.join(process.cwd(), 'public', 'instagram');
            ...
        } catch (cleanupErr) { ... }
        */

        revalidatePath('/dashboard/community');
        revalidatePath('/dashboard/profile/rivalfit');
        revalidatePath('/dashboard/admin/official-posts');
        return { success: true };

    } catch (e: any) {
        return { error: `Error interno: ${e.message}` };
    }
}

/**
 * Publishes an official story.
 */
export async function publishOfficialStory(formData: FormData) {
    try {
        const supabase = createAdminClient();
        
        const assetsJson = formData.get('assets') as string;
        if (!assetsJson) return { error: 'Faltan los archivos' };
        
        const assets = JSON.parse(assetsJson);
        const mediaUrl = assets[0]; // Stories are typically single assets in this context
        
        const { data: officialProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_official', true)
            .limit(1)
            .maybeSingle();

        if (profileError || !officialProfile) {
            return { error: 'No se encontró el perfil oficial' };
        }

        const { error: insertError } = await supabase
            .from('stories')
            .insert({
                user_id: officialProfile.id,
                media_url: mediaUrl,
                media_type: mediaUrl.endsWith('.mp4') ? 'video' : 'image',
                duration_seconds: 30,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

        if (insertError) {
            return { error: `Error en base de datos: ${insertError.message}` };
        }

        // 3. CLEANUP: Deactivated for now
        /*
        try { ... } catch (cleanupErr) { ... }
        */

        revalidatePath('/dashboard');
        revalidatePath('/dashboard/admin/official-posts');
        return { success: true };
    } catch (e: any) {
        return { error: `Error interno: ${e.message}` };
    }
}

// ─── IN-APP OFFICIAL POST (Canal Oficial) ────────────────────────────────────

export async function publishInAppOfficialPost(data: {
    caption: string;
    media_url?: string;
    media_type?: string;
    post_type?: string;
}) {
    const supabase = createAdminClient();
    const { data: officialProfile } = await supabase
        .from('profiles').select('id').eq('is_official', true).limit(1).maybeSingle();
    if (!officialProfile) throw new Error('Perfil @rivalfit no encontrado');

    const { data: post, error } = await supabase.from('posts').insert({
        user_id: officialProfile.id,
        caption: data.caption,
        media_url: data.media_url || null,
        media_type: data.media_type || 'text',
        created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile/rivalfit');
    return post;
}

export async function deleteOfficialPost(postId: string) {
    const supabase = createAdminClient();
    await supabase.from('posts').delete().eq('id', postId);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile/rivalfit');
}

export async function updateOfficialProfile(data: { bio?: string; avatar_url?: string; cover_url?: string; full_name?: string }) {
    const supabase = createAdminClient();
    await supabase.from('profiles').update({ ...data, updated_at: new Date().toISOString() }).eq('is_official', true);
    revalidatePath('/dashboard/profile/rivalfit');
}

export async function getOfficialPosts() {
    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('id').eq('is_official', true).limit(1).maybeSingle();
    if (!profile) return [];
    const { data } = await supabase.from('posts').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50);
    return data || [];
}

// ─── CONTENT QUEUE (from Social Media) ───────────────────────────────────────

export async function getQueuedContent() {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from('social_posts')
        .select('*')
        .in('status', ['draft', 'ready', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(100);
    return data || [];
}

export async function publishFromQueue(postId: string) {
    const supabase = createAdminClient();
    const { data: draft } = await supabase.from('social_posts').select('*').eq('id', postId).single();
    if (!draft) throw new Error('Borrador no encontrado');
    const { data: profile } = await supabase.from('profiles').select('id').eq('is_official', true).limit(1).maybeSingle();
    if (!profile) throw new Error('Perfil @rivalfit no encontrado');
    const { error } = await supabase.from('posts').insert({
        user_id: profile.id,
        caption: draft.caption,
        media_type: 'text',
        created_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    await supabase.from('social_posts').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', postId);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile/rivalfit');
    revalidatePath('/dashboard/admin/official-posts');
}

export async function scheduleQueueItem(postId: string, scheduledFor: string) {
    const supabase = createAdminClient();
    await supabase.from('social_posts').update({
        status: 'scheduled',
        scheduled_for: new Date(scheduledFor).toISOString(),
        updated_at: new Date().toISOString(),
    }).eq('id', postId);
    revalidatePath('/dashboard/admin/official-posts');
}

export async function deleteQueueItem(postId: string) {
    const supabase = createAdminClient();
    await supabase.from('social_posts').delete().eq('id', postId);
    revalidatePath('/dashboard/admin/official-posts');
}
