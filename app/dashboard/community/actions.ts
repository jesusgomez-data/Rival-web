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
                link: `/dashboard/post/${postId}`
            });
        }
    }

    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard')
    return { success: true }
}


export async function createPRPost(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        const exercise = formData.get('exercise') as string
        const weight = formData.get('weight') as string
        const sport = formData.get('sport') as string

        if (!exercise || !weight) {
            return { error: "Exercise and weight are required for a PR post" }
        }

        const media = formData.get('media') as File
        let mediaUrl = formData.get('media_url') as string || null

        // If they uploaded a custom background image via server action (fallback)
        if (!mediaUrl && media && media.size > 0) {
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
            sport: sport || 'Cross Training',
            unit: 'kg',
            backgroundImage: mediaUrl
        })

        const { error: insertError } = await supabase
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

        if (insertError) {
            console.error("Database insert error (PR):", insertError)
            return { error: `Database error: ${insertError.message}` }
        }

        revalidatePath('/dashboard/community')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (e: any) {
        console.error("Critical error in createPRPost:", e)
        return { error: `Server exception: ${e.message || "Unknown error"}` }
    }
}

export async function createWodPost(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        const title = formData.get('title') as string
        const content = formData.get('content') as string
        const wodDataJson = formData.get('wod_data') as string
        const mediaUrl = formData.get('media_url') as string || null

        if (!wodDataJson) {
            return { error: "WOD data is required" }
        }

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                caption: content || title || 'ENTRENAMIENTO COMPLETADO',
                media_url: wodDataJson,
                media_type: 'wod',
                music_url: formData.get('music_url') as string || null,
                music_title: formData.get('music_title') as string || null,
                music_artist: formData.get('music_artist') as string || null
            })

        if (insertError) {
            console.error("Database insert error (WOD):", insertError)
            return { error: `Database error: ${insertError.message}` }
        }

        revalidatePath('/dashboard/community')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (e: any) {
        console.error("Critical error in createWodPost:", e)
        return { error: `Server exception: ${e.message || "Unknown error"}` }
    }
}

export async function createUserPost(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return { error: 'Unauthorized' }

        const content = formData.get('content') as string
        const media = formData.get('media') as File
        let mediaUrl = formData.get('media_url') as string || null
        let mediaType = formData.get('media_type') as string || null

        if (!content && (!media || media.size === 0) && !mediaUrl) {
            return { error: "Post cannot be empty" }
        }

        if (!mediaUrl && media && media.size > 0) {
            const fileExt = media.name.split('.').pop()
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

            // Robust media type detection
            const videoExtensions = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];
            const fileExtLower = fileExt ? fileExt.toLowerCase() : '';
            const isVideo = media.type.startsWith('video/') || videoExtensions.includes(fileExtLower);
            mediaType = isVideo ? 'video' : 'image'
        }

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                caption: content,
                media_url: mediaUrl,
                media_type: mediaType,
                music_url: formData.get('music_url') as string || null,
                music_title: formData.get('music_title') as string || null,
                music_artist: formData.get('music_artist') as string || null
            })

        if (insertError) {
            console.error("Database insert error:", insertError)
            return { error: `Database error: ${insertError.message}` }
        }

        revalidatePath('/dashboard/community')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (e: any) {
        console.error("Critical error in createUserPost:", e)
        return { error: `Server exception: ${e.message || "Unknown error"}` }
    }
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
    const { data: profile } = await adminSupabase.from('profiles').select('full_name').eq('id', user.id).single();
    const truncated = content.length > 30 ? content.substring(0, 30) + '...' : content;
    const { data: post } = await adminSupabase.from('posts').select('user_id').eq('id', postId).single();

    // Notify Post Author
    if (post && post.user_id !== user.id) {
        console.log(`[addComment] Notifying author ${post.user_id} of comment from ${user.id}`);
        const res = await createNotification({
            userId: post.user_id,
            type: 'comment',
            title: 'Nuevo Comentario',
            content: `${profile?.full_name || 'Alguien'} comentó: "${truncated}"`,
            link: `/dashboard/post/${postId}`
        });
        console.log(`[addComment] Notification result:`, res);
    } else {
        console.log(`[addComment] No notification sent. Post author: ${post?.user_id}, Current user: ${user.id}`);
    }

    // Notify Parent Comment Author (if it's a reply)
    if (parentId) {
        const { data: parentComment } = await adminSupabase.from('comments').select('user_id').eq('id', parentId).single();
        if (parentComment && parentComment.user_id !== user.id && parentComment.user_id !== post?.user_id) {
            await createNotification({
                userId: parentComment.user_id,
                type: 'comment_reply',
                title: 'Respuesta a tu comentario',
                content: `${profile?.full_name || 'Alguien'} ha respondido a tu comentario.`,
                link: `/dashboard/post/${postId}`
            });
        }
    }

    // Notify Mentioned Users
    const mentionRegex = /(?:^|\s)@([\w.-]+)/g;
    let match;
    const usernames = new Set<string>();
    while ((match = mentionRegex.exec(content)) !== null) {
        usernames.add(match[1].toLowerCase()); // Usernames are typically case-insensitive in search
    }

    if (usernames.size > 0) {
        const { data: mentionedUsers } = await adminSupabase
            .from('profiles')
            .select('id, full_name')
            .in('username', Array.from(usernames));

        if (mentionedUsers) {
            for (const mentionedUser of mentionedUsers) {
                // Don't notify yourself or people already notified as post author/parent author
                if (mentionedUser.id !== user.id && mentionedUser.id !== post?.user_id) {
                    await createNotification({
                        userId: mentionedUser.id,
                        type: 'mention',
                        title: 'Has sido mencionado',
                        content: `${profile?.full_name || 'Alguien'} te mencionó en un comentario.`,
                        link: `/dashboard/post/${postId}`
                    });
                }
            }
        }
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
            user_id,
            user:user_id (
                username,
                avatar_url
            ),
            likes:comment_likes(user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error("[getComments] Error:", error);
        return [];
    }

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
        const { data: comment } = await supabase.from('comments').select('user_id, post_id').eq('id', commentId).single();
        if (comment && comment.user_id !== user.id) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
            await createNotification({
                userId: comment.user_id,
                type: 'comment_like',
                title: 'Like en tu comentario',
                content: `${profile?.full_name || 'Alguien'} le dio like a tu comentario.`,
                link: `/dashboard/post/${comment.post_id}`
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

    const { data: profile } = await supabase.from('profiles').select('is_official').eq('id', user.id).single();
    const isAdmin = profile?.is_official === true;

    const { data: post } = await supabase.from('posts').select('user_id, media_url').eq('id', postId).single()
    if (!post) return { error: 'Post not found' }

    if (post.user_id !== user.id && !isAdmin) return { error: 'Unauthorized' }

    const adminSupabase = createAdminClient();

    // Delete media from storage if it exists
    if (post.media_url) {
        const urlParts = post.media_url.split('/posts/')
        if (urlParts.length > 1) {
            const filePath = urlParts[1]
            await adminSupabase.storage.from('posts').remove([filePath])
        }
    }

    const { error } = await adminSupabase.from('posts').delete().eq('id', postId)
    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    return { success: true }
}

export async function deleteComment(commentId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('is_official').eq('id', user.id).single();
    const isAdmin = profile?.is_official === true;

    const { data: comment } = await supabase.from('comments').select('user_id').eq('id', commentId).single()
    if (!comment) return { error: 'Comment not found' }

    if (comment.user_id !== user.id && !isAdmin) return { error: 'Unauthorized' }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from('comments').delete().eq('id', commentId)

    if (error) return { error: error.message }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/community')
    return { success: true }
}

export async function updatePost(postId: string, newCaption: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('is_official').eq('id', user.id).single();
    const isAdmin = profile?.is_official === true;

    const { error } = await supabase
        .from('posts')
        .update({ caption: newCaption })
        .eq('id', postId)
        .eq('user_id', isAdmin ? undefined : user.id) // This is tricky for RLS, but if admin, we should maybe use admin client

    if (isAdmin) {
        const adminSupabase = createAdminClient();
        const { error: adminError } = await adminSupabase.from('posts').update({ caption: newCaption }).eq('id', postId);
        if (adminError) return { error: adminError.message };
    } else {
        if (error) return { error: error.message }
    }

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

export async function getReelPosts(context: 'following' | 'global') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
        .from('posts')
        .select('*, profiles:user_id(*), workouts:workout_id(*, metrics, workout_sets(*)), likes:likes(user_id)')
        .eq('media_type', 'video')
        .order('created_at', { ascending: false })
        .limit(20);

    if (context === 'following') {
        const { data: myFollows } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

        const followedIds = myFollows?.map(f => f.following_id) || [];

        // 1. Fetch official accounts IDs
        const { data: officialProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_official', true);
        const officialIds = officialProfiles?.map(p => p.id) || [];

        const idsToFetch = Array.from(new Set([...followedIds, user.id, ...officialIds]));
        query = query.in('user_id', idsToFetch);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching reel posts:", error);
        return [];
    }

    return data.map((post: any) => ({
        ...post,
        initialLikes: post.likes ? post.likes.length : (post.likes_count || 0),
        hasLikedInitial: user ? post.likes?.some((l: any) => l.user_id === user.id) : false
    }));
}
