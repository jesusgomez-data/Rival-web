'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

import { updateMissionProgress } from '../training/actions'
import { createNotification } from '../notifications-actions'

export async function toggleLike(postId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Check if like exists
    const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single()

    if (existingLike) {
        // Unlike
        const { error } = await supabase
            .from('likes')
            .delete()
            .eq('user_id', user.id)
            .eq('post_id', postId)

        if (error) return { error: error.message }

        // Decrement like count on post (managed by trigger now, but keeping if needed)
        // await supabase.rpc('decrement_likes', { post_uuid: postId })
    } else {
        // Like
        const { error } = await supabase
            .from('likes')
            .insert({ user_id: user.id, post_id: postId })

        if (error) return { error: error.message }

        // Update mission progress
        await updateMissionProgress(user.id, 'social_interactions', 1)

        // Trigger Notification
        const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single();
        if (post && post.user_id !== user.id) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            await createNotification({
                userId: post.user_id,
                type: 'like',
                title: 'Nuevo Me Gusta',
                content: `${profile?.full_name || 'Alguien'} le ha dado like a tu publicación.`,
                link: '/dashboard/community'
            });
        }
    }

    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard')
    return { success: true }
}


export async function createPRPost(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const exercise = formData.get('exercise') as string
    const weight = formData.get('weight') as string
    const sport = formData.get('sport') as string
    const media = formData.get('media') as File

    if (!exercise || !weight) {
        return { error: "Exercise and weight are required for a PR post" }
    }

    let mediaUrl = null

    // If they uploaded a custom background image
    if (media && media.size > 0) {
        const fileExt = media.name.split('.').pop()
        const fileName = `${user.id}/pr_${Date.now()}.${fileExt}`

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

    // Wrap PR data in JSON
    const prData = JSON.stringify({
        exerciseName: exercise,
        weight: weight,
        sport: sport || 'CrossFit',
        unit: 'kg',
        backgroundImage: mediaUrl
    })

    const { error } = await supabase
        .from('posts')
        .insert({
            user_id: user.id,
            caption: `¡NUEVO PR! ${exercise}: ${weight}kg`,
            media_url: prData,
            media_type: 'pr',
            music_url: formData.get('music_url') as string || null,
            music_title: formData.get('music_title') as string || null,
            music_artist: formData.get('music_artist') as string || null
        })

    if (error) return { error: error.message }

    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function createUserPost(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const content = formData.get('content') as string
    const media = formData.get('media') as File

    if (!content && (!media || media.size === 0)) {
        return { error: "Post cannot be empty" }
    }

    let mediaUrl = null
    let mediaType = null

    if (media && media.size > 0) {
        const fileExt = media.name.split('.').pop()
        // Simplify path to match potential RLS restrictions (avoiding deeply nested folders if not explicitly allowed)
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, media)

        if (uploadError) {
            console.error("Upload error:", uploadError)
            return { error: "Failed to upload media. Please try again." }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName)

        mediaUrl = publicUrl
        mediaType = media.type.startsWith('video/') ? 'video' : 'image'
    }

    const { error } = await supabase
        .from('posts')
        .insert({
            user_id: user.id,
            caption: content,
            media_url: mediaUrl, // Table column is media_url, schema says singular
            media_type: mediaType,
            music_url: formData.get('music_url') as string || null,
            music_title: formData.get('music_title') as string || null,
            music_artist: formData.get('music_artist') as string || null
        })

    if (error) return { error: error.message }

    revalidatePath('/dashboard/community')
    return { success: true }
}

export async function addComment(postId: string, content: string, parentId?: string) {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    if (!content.trim()) return { error: "Comment cannot be empty" }

    const { error } = await adminSupabase
        .from('comments')
        .insert({
            post_id: postId,
            user_id: user.id,
            content: content,
            parent_id: parentId || null
        })

    if (error) return { error: error.message }

    // Trigger Notification
    const { data: post } = await adminSupabase.from('posts').select('user_id').eq('id', postId).single();
    if (post && post.user_id !== user.id) {
        const { data: profile } = await adminSupabase.from('profiles').select('full_name').eq('id', user.id).single();
        const truncated = content.length > 30 ? content.substring(0, 30) + '...' : content;
        await createNotification({
            userId: post.user_id,
            type: 'comment',
            title: 'Nuevo Comentario',
            content: `${profile?.full_name || 'Alguien'} comentó: "${truncated}"`,
            link: '/dashboard/community'
        });
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    return { success: true, user_id: user.id }
}

export async function getComments(postId: string) {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await adminSupabase
        .from('comments')
        .select(`
            id,
            content,
            created_at,
            parent_id,
            user:user_id (
                username,
                avatar_url
            ),
            likes:comment_likes(user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

    if (error) return []

    // Process data to add nice properties
    return data.map((comment: any) => ({
        ...comment,
        likes_count: comment.likes ? comment.likes.length : 0,
        has_liked: user ? comment.likes.some((l: any) => l.user_id === user.id) : false
    }))
}

export async function toggleCommentLike(commentId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .single()

    if (existingLike) {
        await supabase.from('comment_likes').delete().eq('user_id', user.id).eq('comment_id', commentId)
    } else {
        await supabase.from('comment_likes').insert({ user_id: user.id, comment_id: commentId })

        // Trigger Notification
        const { data: comment } = await supabase.from('comments').select('user_id').eq('id', commentId).single();
        if (comment && comment.user_id !== user.id) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            await createNotification({
                userId: comment.user_id,
                type: 'comment_like',
                title: 'Like en tu comentario',
                content: `${profile?.full_name || 'Alguien'} le dio like a tu comentario.`,
                link: '/dashboard/community'
            });
        }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    return { success: true }
}

export async function deletePost(postId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // RLS policies should handle the 'only delete own posts' check, 
    // but explicit check is good practice or if we need to clean up storage manually.
    const { data: post } = await supabase.from('posts').select('user_id, media_url').eq('id', postId).single()
    if (!post) return { error: 'Post not found' }
    if (post.user_id !== user.id) return { error: 'Unauthorized' }

    // Delete media from storage if it exists (optional, but keeps bucket clean)
    if (post.media_url) {
        // Extract filename from URL. URL format: .../storage/v1/object/public/posts/userId/timestamp.ext
        // We stored it as `userId/timestamp.ext`
        const urlParts = post.media_url.split('/posts/')
        if (urlParts.length > 1) {
            const filePath = urlParts[1]
            await supabase.storage.from('posts').remove([filePath])
        }
    }

    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    return { success: true }
}

export async function updatePost(postId: string, newCaption: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('posts')
        .update({ caption: newCaption })
        .eq('id', postId)
        .eq('user_id', user.id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    return { success: true }
}

export async function getUserMedia(userId: string) {
    const supabase = await createClient()

    // Only fetch posts that have media_url not null
    const { data, error } = await supabase
        .from('posts')
        .select('id, media_url, media_type')
        .eq('user_id', userId)
        .not('media_url', 'is', null)
        .neq('media_type', 'class_result') // Avoid parsing JSON as URL
        .order('created_at', { ascending: false })

    if (error) return []
    return data
}
