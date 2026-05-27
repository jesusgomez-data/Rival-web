'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from '../notifications-actions'

export async function createStory(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user

        if (!user) return { error: 'No estás autorizado' }

        let mediaUrl = formData.get('media_url') as string || null
        let mediaType = formData.get('media_type') as string || null

        if (!mediaUrl) {
            // Try both 'media' and 'file' just in case
            const media = (formData.get('media') || formData.get('file')) as File
            if (!media || media.size === 0) return { error: 'No se ha proporcionado ningún archivo' }

            // Sanitize file name
            const fileExt = media.name.split('.').pop()?.toLowerCase() || 'jpg'
            const fileName = `${user.id}/story_${Date.now()}.${fileExt}`

            console.log(`Uploading story for user ${user.id}: ${fileName} (${media.size} bytes)`)

            const { error: uploadError } = await supabase.storage
                .from('posts')
                .upload(fileName, media, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error("Story storage upload error:", uploadError)
                return { error: `Error de almacenamiento: ${uploadError.message}` }
            }

            const { data: { publicUrl } } = supabase.storage
                .from('posts')
                .getPublicUrl(fileName)

            mediaUrl = publicUrl

            // Refined media type detection
            const videoExtensions = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];
            const isVideoByExt = videoExtensions.includes(fileExt);

            if (isVideoByExt || media.type.startsWith('video/')) {
                mediaType = 'video';
            } else {
                mediaType = 'image';
            }
        }

        const metadataStr = formData.get('metadata') as string
        let metadata = {}
        try {
            if (metadataStr) metadata = JSON.parse(metadataStr)
        } catch (e) {
            console.error("Invalid metadata JSON:", e)
        }

        const { error: dbError } = await supabase
            .from('stories')
            .insert({
                user_id: user.id,
                media_url: mediaUrl,
                media_type: mediaType || 'image',
                duration_seconds: 30,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                music_url: (formData.get('music_url') as string) || (metadata as any).music?.url || null,
                music_title: (formData.get('music_title') as string) || (metadata as any).music?.title || null,
                music_artist: (formData.get('music_artist') as string) || (metadata as any).music?.artist || null,
                metadata: metadata
            })

        if (dbError) {
            console.error("Story DB insert error:", dbError)
            return { error: `Error de base de datos: ${dbError.message}` }
        }

        // Check for Mentions/Attribution in Overlays
        try {
            // Cast metadata to any to access overlays
            const meta = metadata as any;
            if (meta.overlays && Array.isArray(meta.overlays)) {
                // Fetch profile once for notification context
                const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
                const mentalUsername = profile?.username || 'Alguien';

                for (const overlay of meta.overlays) {
                    if (overlay.type === 'attribution') {
                        try {
                            const content = JSON.parse(overlay.content);
                            if (content.id && content.id !== user.id) {
                                console.log(`[createStory] Sending mention notification to ${content.id}`);
                                await createNotification({
                                    userId: content.id,
                                    type: 'mention',
                                    title: 'Mención en Historia',
                                    content: `@${mentalUsername} te mencionó en su historia.`,
                                    link: '/dashboard'
                                });
                            }
                        } catch (e) {
                            console.error("Error parsing attribution content:", e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error processing story mentions:", e);
        }

        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        console.error("Critical error in createStory:", err)
        return { error: err.message || 'Error interno del servidor' }
    }
}

export async function createPRStory(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'No estás autorizado' }

        const exercise = formData.get('exercise') as string
        const weight = formData.get('weight') as string
        const sport = formData.get('sport') as string
        const media = formData.get('media') as File

        if (!exercise || !weight) {
            return { error: "Exercise and weight are required" }
        }

        let mediaUrl = formData.get('media_url') as string || null
        if (!mediaUrl && media && media.size > 0) {
            const fileExt = media.name.split('.').pop()
            const fileName = `${user.id}/story_pr_${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('posts')
                .upload(fileName, media)

            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                    .from('posts')
                    .getPublicUrl(fileName)
                mediaUrl = publicUrl
            }
        }

        const prData = JSON.stringify({
            exerciseName: exercise,
            weight: weight,
            sport: sport || 'Cross Training',
            unit: 'kg',
            backgroundImage: mediaUrl
        })

        const metadataStr = formData.get('metadata') as string
        let metadata = {}
        try {
            if (metadataStr) metadata = JSON.parse(metadataStr)
        } catch (e) {
            console.error("Invalid metadata JSON:", e)
        }

        const { error: dbError } = await supabase
            .from('stories')
            .insert({
                user_id: user.id,
                media_url: prData,
                media_type: 'pr',
                duration_seconds: 30,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                music_url: (formData.get('music_url') as string) || (metadata as any).music?.url || null,
                music_title: (formData.get('music_title') as string) || (metadata as any).music?.title || null,
                music_artist: (formData.get('music_artist') as string) || (metadata as any).music?.artist || null,
                metadata: metadata
            })

        if (dbError) return { error: dbError.message }

        // Check for Mentions in PR Story
        try {
            const meta = metadata as any;
            if (meta.overlays && Array.isArray(meta.overlays)) {
                const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
                const mentalUsername = profile?.username || 'Alguien';

                for (const overlay of meta.overlays) {
                    if (overlay.type === 'attribution') {
                        try {
                            const content = JSON.parse(overlay.content);
                            if (content.id && content.id !== user.id) {
                                await createNotification({
                                    userId: content.id,
                                    type: 'mention',
                                    title: 'Mención en Historia',
                                    content: `@${mentalUsername} te mencionó en su historia de PR.`,
                                    link: '/dashboard'
                                });
                            }
                        } catch (e) {
                            console.error("Error parsing attribution content:", e);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error processing story mentions:", e);
        }

        revalidatePath('/dashboard')
        return { success: true }
    } catch (err: any) {
        return { error: err.message }
    }
}

export async function getActiveStories() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const now = new Date().toISOString()

        // Build allowed user IDs: own + followed users
        let allowedUserIds: string[] = []
        if (user) {
            const [followsRes, officialsRes] = await Promise.all([
                supabase.from('follows').select('following_id').eq('follower_id', user.id),
                supabase.from('profiles').select('id').eq('is_official', true),
            ])
            allowedUserIds = [
                user.id,
                ...(followsRes.data || []).map((f: any) => f.following_id),
                ...(officialsRes.data || []).map((p: any) => p.id),
            ]
        }

        const query = supabase
            .from('stories')
            .select(`
                *,
                author:user_id (
                    id,
                    username,
                    full_name,
                    avatar_url,
                    is_official
                ),
                story_likes (user_id),
                story_views (
                    user_id,
                    created_at,
                    profiles:user_id (id, username, full_name, avatar_url)
                )
            `)
            .gt('expires_at', now)
            .order('created_at', { ascending: false })
            .limit(50)

        const { data, error } = allowedUserIds.length > 0
            ? await query.in('user_id', allowedUserIds)
            : await query

        if (error) {
            console.error("Error fetching stories:", error)
            return []
        }

        // Group stories by user
        const groupedStories: { [key: string]: any } = {}
        data?.forEach((story: any) => {
            const userId = story.user_id
            if (!groupedStories[userId]) {
                groupedStories[userId] = {
                    user: story.author,
                    stories: []
                }
            }

            // Enhance story object with likes/views info
            const isOwner = story.user_id === user?.id || story.author?.id === user?.id
            const showDetails = isOwner;

            const enhancedStory = {
                ...story,
                music_url: story.music_url || (story.metadata as any)?.music?.url || null,
                music_title: story.music_title || (story.metadata as any)?.music?.title || null,
                music_artist: story.music_artist || (story.metadata as any)?.music?.artist || null,
                likes_count: story.story_likes?.length || 0,
                has_liked: story.story_likes?.some((l: any) => l.user_id === user?.id),
                has_seen: story.story_views?.some((v: any) => v.user_id === user?.id),
                views_count: story.story_views?.length || 0,
                // For the owner, we include initial viewer profiles (first 3) for the "face pile" UI.
                // Complete details will be fetched on demand via getStoryViewers when clicking.
                viewer_details: isOwner ? (story.story_views?.slice(0, 3).map((v: any) => ({
                    user_id: v.user_id,
                    created_at: v.created_at,
                    profiles: null // We'll need a join check or just accept null for now and solve in StoryBar facepile
                })) || []) : []
            }

            groupedStories[userId].stories.push(enhancedStory)
        })

        return Object.values(groupedStories).sort((a: any, b: any) => {
            if (a.user?.is_official && !b.user?.is_official) return -1;
            if (!a.user?.is_official && b.user?.is_official) return 1;
            return 0;
        })
    } catch (err) {
        console.error("Critical error in getActiveStories:", err)
        return []
    }
}

export async function toggleStoryLike(storyId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check if liked
    const { data: existing } = await supabase
        .from('story_likes')
        .select('*')
        .eq('story_id', storyId)
        .eq('user_id', user.id)
        .single()

    if (existing) {
        await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', user.id)
        return { liked: false }
    } else {
        await supabase.from('story_likes').insert({ story_id: storyId, user_id: user.id })

        // Trigger Notification
        const { data: story } = await supabase.from('stories').select('user_id').eq('id', storyId).single();
        if (story && story.user_id !== user.id) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            await createNotification({
                userId: story.user_id,
                type: 'story_like',
                title: '🔥 Nuevo Like en Story',
                content: `${profile?.full_name || 'Alguien'} le ha dado like a tu story.`,
                link: '/dashboard'
            });
        }

        return { liked: true }
    }
}

export async function recordStoryView(storyId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Use upsert to avoid duplicate key error logs in Postgres when a user views the same story multiple times
        const { error } = await supabase.from('story_views').upsert(
            { story_id: storyId, user_id: user.id },
            { onConflict: 'story_id,user_id' }
        )

        if (error) {
            console.error("Error recording story view:", error)
        }
    } catch (err) {
        console.error("Critical error in recordStoryView:", err)
    }
}

export async function deleteStory(storyId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No estás autorizado' }

    const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', user.id)

    if (error) {
        console.error("Error deleting story:", error)
        return { error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
}

export async function getStoryViewers(storyId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Unauthorized' }

        // Fetch views with profile details
        const { data, error } = await supabase
            .from('story_views')
            .select(`
                user_id,
                created_at,
                profiles:user_id (
                    id,
                    username,
                    full_name,
                    avatar_url
                )
            `)
            .eq('story_id', storyId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error("Error fetching story viewers:", error)
            return { error: error.message }
        }

        return { viewers: data || [] }
    } catch (err: any) {
        console.error("Critical error in getStoryViewers:", err)
        return { error: err.message }
    }
}
