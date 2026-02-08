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

        // Try both 'media' and 'file' just in case
        const media = (formData.get('media') || formData.get('file')) as File
        if (!media || media.size === 0) return { error: 'No se ha proporcionado ningún archivo' }

        // Sanitize file name
        const fileExt = media.name.split('.').pop() || 'jpg'
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

        const mediaType = media.type.startsWith('video/') ? 'video' : 'image'

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
                media_url: publicUrl,
                media_type: mediaType,
                duration_seconds: 30,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                music_url: formData.get('music_url') as string || null,
                music_title: formData.get('music_title') as string || null,
                music_artist: formData.get('music_artist') as string || null,
                metadata: metadata
            })

        if (dbError) {
            console.error("Story DB insert error:", dbError)
            return { error: `Error de base de datos: ${dbError.message}` }
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

        let mediaUrl = null
        if (media && media.size > 0) {
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
                music_url: formData.get('music_url') as string || null,
                music_title: formData.get('music_title') as string || null,
                music_artist: formData.get('music_artist') as string || null,
                metadata: metadata
            })

        if (dbError) return { error: dbError.message }

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

        // Fetch active stories (not expired)
        const { data, error } = await supabase
            .from('stories')
            .select(`
                *,
                author:user_id (
                    id,
                    username,
                    full_name,
                    avatar_url
                ),
                story_likes (user_id),
                story_views (
                    created_at,
                    profiles:user_id (
                        id, 
                        username, 
                        full_name, 
                        avatar_url
                    )
                )
            `)
            .gt('expires_at', now)
            .order('created_at', { ascending: false })

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

            if (story.story_views?.length > 0) {
                console.log(`Debug Story ${story.id}: views=${story.story_views.length}, owner=${story.user_id}, viewer=${user?.id}, isOwner=${isOwner}`)
            }

            // Temporary fix: enable details for everyone to verify list population
            const showDetails = true; // was isOwner

            const enhancedStory = {
                ...story,
                likes_count: story.story_likes?.length || 0,
                has_liked: story.story_likes?.some((l: any) => l.user_id === user?.id),
                has_seen: story.story_views?.some((v: any) => (v.user_id === user?.id) || (v.profiles?.id === user?.id)),
                views_count: story.story_views?.length || 0,
                viewer_details: showDetails ? (story.story_views || []).map((v: any) => ({
                    created_at: v.created_at,
                    profiles: v.profiles
                })) : []
            }

            groupedStories[userId].stories.push(enhancedStory)
        })

        return Object.values(groupedStories)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Insert view (will fail silently if already exists due to unique constraint)
    await supabase.from('story_views').insert({ story_id: storyId, user_id: user.id })
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
