'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

import { updateMissionProgress } from '../training/actions'
import { syncFeaturedRm } from '@/lib/pr-sync'
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

        const dateStr = formData.get('scheduled_for') as string;
        const createdAt = dateStr ? new Date(`${dateStr}T${new Date().toISOString().split('T')[1]}`).toISOString() : undefined;

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                caption: `¡NUEVO PR! ${exercise}: ${weight}kg`,
                media_url: prData,
                media_type: 'pr',
                created_at: createdAt,
                music_url: formData.get('music_url') as string || null,
                music_title: formData.get('music_title') as string || null,
                music_artist: formData.get('music_artist') as string || null
            })

        if (insertError) {
            console.error("Database insert error (PR):", insertError)
            return { error: `Database error: ${insertError.message}` }
        }

        // ── Record PR in workout_sets so it appears in profile Personal Records ──
        // 1. Create a virtual workout entry for this PR
        const weightNum = parseFloat(weight) || 0;
        let isNewPR = false;
        let currentMax = 0;

        if (weightNum > 0) {
            // Check if this is actually a new PR vs existing records
            const { data: existingSets } = await supabase
                .from('workout_sets')
                .select('weight_kg, workouts!inner(user_id)')
                .eq('exercise_name', exercise)
                .eq('workouts.user_id', user.id)
                .order('weight_kg', { ascending: false })
                .limit(1);

            currentMax = existingSets?.[0]?.weight_kg || 0;
            isNewPR = weightNum > currentMax;

            // Create a PR workout entry to record it permanently
            const { data: prWorkout } = await supabase
                .from('workouts')
                .insert({
                    user_id: user.id,
                    title: `PR: ${exercise}`,
                    sport_type: sport || 'gym',
                    duration_seconds: 0,
                    is_pr: true,
                    max_weight_kg: weightNum,
                    start_time: new Date().toISOString(),
                    end_time: new Date().toISOString(),
                    notes: `Récord personal registrado desde el feed`
                })
                .select()
                .single();

            if (prWorkout) {
                await supabase.from('workout_sets').insert({
                    workout_id: prWorkout.id,
                    exercise_name: exercise,
                    set_order: 1,
                    weight_kg: weightNum,
                    reps: 1,
                    is_pr: isNewPR
                });

                // XP for PR
                await supabase.rpc('increment_xp', { amount: 75, profile_id: user.id });

                // Sync with Featured RMs
                await syncFeaturedRm(user.id, exercise, weightNum);
            }

            // ── Send in-app notification ──────────────────────────────────────
            const improvementText = isNewPR && currentMax > 0
                ? ` (+${(weightNum - currentMax).toFixed(1)}kg sobre tu anterior récord de ${currentMax}kg)`
                : '';
            await createNotification({
                userId: user.id,
                type: 'pr_achievement',
                title: `🏆 ¡Nuevo récord personal!`,
                content: `${exercise}: ${weight}kg${improvementText}`,
                link: '/dashboard/profile'
            });
        }

        revalidatePath('/dashboard/community')
        revalidatePath('/dashboard')
        return { 
            success: true,
            prDetails: {
                name: exercise,
                previousMax: currentMax,
                newMax: weightNum,
                improvement: isNewPR && currentMax > 0 ? parseFloat((weightNum - currentMax).toFixed(1)) : 0,
                isNewPR: isNewPR
            }
        }
    } catch (e: any) {
        console.error("Critical error in createPRPost:", e)
        return { error: `Server exception: ${e.message || "Unknown error"}` }
    }
}

export async function syncWodCompletion(supabase: any, user: any, postId: string, wodDataJson: string) {
    try {
        const wodObj = JSON.parse(wodDataJson);
        const w = Array.isArray(wodObj) ? wodObj[0] : wodObj;

        const scoreType = (w.summary?.scoreType || w.metrics?.type || 'SCORE').toUpperCase();
        const scoreStr = w.summary?.scoreLabel || w.metrics?.score;
        const originalWodPostId = w.original_wod_post_id || null;

        let completionType = 'score';
        let completionTimeSeconds = null;
        let roundsCompleted = null;
        let totalReps = null;
        let weightKg = null;
        let score = null;

        if (scoreType === 'TIME' && scoreStr) {
            completionType = 'time';
            const timeMatch = scoreStr.match(/(\d+):(\d+)(?::(\d+))?/);
            if (timeMatch) {
                if (timeMatch[3]) completionTimeSeconds = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
                else completionTimeSeconds = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
            } else {
                completionTimeSeconds = parseFloat(scoreStr.replace(/[^0-9.]/g, '')) || 0;
            }
        } else if ((scoreType === 'AMRAP' || scoreType === 'ROUNDS') && scoreStr) {
            completionType = 'rounds';
            roundsCompleted = parseFloat(scoreStr.replace(/[^0-9.]/g, '')) || 0;
        } else if (scoreType === 'REPS' && scoreStr) {
            completionType = 'reps';
            totalReps = parseInt(scoreStr.replace(/[^0-9]/g, '')) || 0;
        } else if (scoreType === 'WEIGHT' && scoreStr) {
            completionType = 'weight';
            weightKg = parseFloat(scoreStr.replace(/[^0-9.]/g, '')) || 0;
        } else if (scoreStr) {
            // DISTANCE, PACE, WATTS, CALORIES → map to 'score' (valid CHECK values: time/rounds/reps/weight/score)
            completionType = 'score';
            score = parseFloat(scoreStr.replace(/[^0-9.]/g, '')) || 0;
        }

        const finalOriginalId = originalWodPostId || postId;

        const completionData = {
            user_id: user.id,
            original_wod_post_id: finalOriginalId,
            completion_post_id: postId,
            completion_type: completionType,
            completion_time_seconds: completionTimeSeconds,
            rounds_completed: roundsCompleted,
            total_reps: totalReps,
            weight_kg: weightKg,
            score: score !== null ? Math.round(score) : null,
            rx: true,
            completed_at: new Date().toISOString()
        };

        // Check if a completion already exists for this user + original WOD
        const { data: existing } = await supabase
            .from('wod_completions')
            .select('id')
            .eq('user_id', user.id)
            .eq('original_wod_post_id', finalOriginalId)
            .maybeSingle();

        let syncError;
        if (existing) {
            const { error } = await supabase
                .from('wod_completions')
                .update({
                    completion_post_id: postId,
                    completion_type: completionData.completion_type,
                    completion_time_seconds: completionData.completion_time_seconds,
                    rounds_completed: completionData.rounds_completed,
                    total_reps: completionData.total_reps,
                    weight_kg: completionData.weight_kg,
                    score: completionData.score,
                    completed_at: completionData.completed_at,
                })
                .eq('id', existing.id);
            syncError = error;
        } else {
            const { error } = await supabase.from('wod_completions').insert(completionData);
            syncError = error;
        }

        if (syncError) console.error("WOD completion sync error:", syncError);
    } catch (e) {
        console.error("WOD completion sync catch:", e);
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
        if (!wodDataJson) {
            return { error: "WOD data is required" }
        }

        const dateStr = formData.get('scheduled_for') as string;
        const createdAt = dateStr ? new Date(`${dateStr}T${new Date().toISOString().split('T')[1]}`).toISOString() : undefined;

        // Extract original_wod_post_id from the WOD data JSON to store as a real column
        let parsedOriginalId: string | null = null;
        try {
            const wodObj = JSON.parse(wodDataJson);
            const w = Array.isArray(wodObj) ? wodObj[0] : wodObj;
            parsedOriginalId = w.original_wod_post_id || null;
        } catch (_) {}

        const { data: newPost, error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                caption: content || title || '',
                media_url: wodDataJson,
                media_type: 'wod',
                created_at: createdAt,
                original_wod_post_id: parsedOriginalId,
                music_url: formData.get('music_url') as string || null,
                music_title: formData.get('music_title') as string || null,
                music_artist: formData.get('music_artist') as string || null
            })
            .select('id').single()

        if (insertError) {
            console.error("Database insert error (WOD):", insertError)
            return { error: `Database error: ${insertError.message}` }
        }

        // --- Sync WOD completion record for leaderboard ---
        if (newPost) {
            await syncWodCompletion(supabase, user, newPost.id, wodDataJson);
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

        const dateStr = formData.get('scheduled_for') as string;
        const createdAt = dateStr ? new Date(`${dateStr}T${new Date().toISOString().split('T')[1]}`).toISOString() : undefined;

        const { error: insertError } = await supabase
            .from('posts')
            .insert({
                user_id: user.id,
                caption: content,
                media_url: mediaUrl,
                media_type: mediaType,
                created_at: createdAt,
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
        const res = await createNotification({
            userId: post.user_id,
            type: 'comment',
            title: 'Nuevo Comentario',
            content: `${profile?.full_name || 'Alguien'} comentó: "${truncated}"`,
            link: `/dashboard/post/${postId}`
        });
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

export async function updatePost(postId: string, newCaption: string, mediaUrl?: string, scheduledFor?: string, mediaType?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: profile } = await supabase.from('profiles').select('is_official').eq('id', user.id).single();
    const isAdmin = profile?.is_official === true;

    const updateData: any = { caption: newCaption };
    if (mediaUrl) {
        updateData.media_url = mediaUrl;
        if (mediaType) updateData.media_type = mediaType;
        
        // If it's a JSON string that looks like WOD data, also update wod_data column
        try {
            if (mediaUrl.startsWith('{') || mediaUrl.startsWith('[')) {
                updateData.wod_data = JSON.parse(mediaUrl);
                updateData.media_type = 'wod';
            }
        } catch (e) {
            // Not JSON, ignore
        }
    }
    if (scheduledFor) {
        updateData.created_at = new Date(`${scheduledFor}T${new Date().toISOString().split('T')[1]}`).toISOString();
    }

    if (isAdmin) {
        const adminSupabase = createAdminClient();
        const { error: adminError } = await adminSupabase.from('posts').update(updateData).eq('id', postId);
        if (adminError) return { error: 'Error al actualizar el post.' };
    } else {
        const { error } = await supabase.from('posts').update(updateData).eq('id', postId).eq('user_id', user.id);
        if (error) return { error: 'Error al actualizar el post.' };
    }

    // --- NEW: Sync WOD result if it's a WOD post ---
    const { data: post } = await supabase.from('posts').select('media_type, media_url').eq('id', postId).single();
    if (post && post.media_type === 'wod' && post.media_url) {
        await syncWodCompletion(supabase, user, postId, post.media_url);
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
        .select('*, profiles:user_id(*), workouts:workout_id(*, metrics, workout_sets(*)), likes:likes(user_id), comments:comments(count)')
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
        initialLikes: post.likes ? post.likes.length : 0,
        hasLikedInitial: user && post.likes && post.likes.some((l: any) => l.user_id === user.id) ? true : false,
        commentsCount: post.comments?.[0]?.count || 0,
        comments_count: post.comments?.[0]?.count || 0
    }));
}
export async function getWodResults(title: string) {
    const supabase = await createClient()

    // Fetch posts of type 'wod' that contain the title in their media_url JSON
    // Note: title matching is a simple way to group results for the same workout name
    const { data: posts, error } = await supabase
        .from('posts')
        .select(`
            id,
            media_url,
            created_at,
            user_id,
            profiles:user_id (
                username,
                full_name,
                avatar_url
            )
        `)
        .eq('media_type', 'wod')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching WOD results:", error);
        return [];
    }

    // Filter and parse in JS (easier than complex JSON path matching in SQL for this schema)
    const results = posts.filter(post => {
        try {
            const wodDataRaw = JSON.parse(post.media_url || '{}');
            const w = Array.isArray(wodDataRaw) ? wodDataRaw[0] : wodDataRaw;
            // Title normalization matching FeedPost.tsx logic
            const normalizedTitle = w.title || (w.sport_type && w.sport_type !== 'Entrenamiento Libre' ? w.sport_type : 'WORKOUT OF THE DAY');
            return normalizedTitle.toString().toUpperCase() === title.toString().toUpperCase();
        } catch (e) {
            return false;
        }
    }).map(post => {
        try {
            const wodDataRaw = JSON.parse(post.media_url || '{}');
            const w = Array.isArray(wodDataRaw) ? wodDataRaw[0] : wodDataRaw;
            return {
                id: post.id,
                userId: post.user_id,
                username: (post as any).profiles?.username,
                fullName: (post as any).profiles?.full_name,
                avatarUrl: (post as any).profiles?.avatar_url,
                score: w.summary?.scoreLabel || w.metrics?.score || '-',
                time: w.summary?.totalTime || w.metrics?.duration || w.metrics?.time || '--:--',
                scoreType: (w.summary?.scoreType || w.metrics?.type || 'REPS').toUpperCase(),
                createdAt: post.created_at
            };
        } catch (e) {
            return null;
        }
    }).filter(Boolean) as any[];

    // Sort results based on scoreType
    return results.sort((a, b) => {
        if (a.scoreType === 'TIME') {
            // Lower time is better
            const timeA = parseTimeToSeconds(a.score);
            const timeB = parseTimeToSeconds(b.score);
            return timeA - timeB;
        } else {
            // Higher points/reps/weight is better
            const valueA = parseFloat(a.score.replace(/[^0-9.]/g, '')) || 0;
            const valueB = parseFloat(b.score.replace(/[^0-9.]/g, '')) || 0;
            return valueB - valueA;
        }
    });
}

function parseTimeToSeconds(timeStr: string): number {
    if (!timeStr || timeStr === '-' || timeStr === '--:--') return 999999;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return parseFloat(timeStr) || 999999;
}
