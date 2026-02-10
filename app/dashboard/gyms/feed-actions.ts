'use server';

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath, unstable_noStore } from "next/cache";

// Feed Actions - Extracted from management-actions.ts to be client-safe (no stripe import)

export async function getCenterPosts(id: string, allowFuture: boolean = false, isCenterId: boolean = false) {
    unstable_noStore();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
        .from('center_posts')
        .select(`
            *,
            author:author_id (full_name, avatar_url),
            organization:organization_id (name, logo_url),
            likes:center_post_likes(user_id),
            comments_count:center_post_comments(count)
        `);

    if (isCenterId) {
        query = query.eq('center_id', id);
    } else {
        query = query.eq('organization_id', id);
    }

    const now = new Date().toISOString();

    if (!allowFuture) {
        query = query.or(`scheduled_for.lte."${now}",scheduled_for.is.null`);
    }

    const { data, error } = await query
        .order('scheduled_for', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((post: any) => ({
        ...post,
        is_liked: user ? post.likes.some((l: any) => l.user_id === user.id) : false,
        likes_count: post.likes ? post.likes.length : 0, // In case we want real count, better use count in select or aggregate
        comments_count: post.comments_count?.[0]?.count || 0,
        likes: undefined
    }));
}

export async function getCenterPost(postId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from('center_posts')
        .select(`
            *,
            author:author_id (full_name, avatar_url),
            organization:organization_id (name, logo_url),
            likes:center_post_likes(user_id),
            comments_count:center_post_comments(count)
        `)
        .eq('id', postId)
        .single();

    if (error) return null;

    return {
        ...data,
        is_liked: user ? data.likes.some((l: any) => l.user_id === user.id) : false,
        likes_count: data.likes ? data.likes.length : 0,
        comments_count: data.comments_count?.[0]?.count || 0,
        likes: undefined
    };
}

export async function createPost(centerId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const content = formData.get('content') as string;
    const media = formData.get('media') as File;
    let postAsCenter = formData.get('postAsCenter') === 'true';
    let images: string[] = [];

    // SERVER-SIDE PERMISSION CHECK
    if (postAsCenter && user) {
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();
        const isOwnerOrHead = org && (org.owner_id === user.id || org.head_coach_id === user.id);

        if (!isOwnerOrHead) {
            const { data: roleData } = await supabase.from('center_roles').select('role').eq('organization_id', centerId).eq('user_id', user.id).maybeSingle();
            if (roleData?.role !== 'head_coach') {
                postAsCenter = false;
            }
        }
    }

    if (media && media.size > 0) {
        const fileName = `posts/${centerId}/${Date.now()}.${media.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('center-media').upload(fileName, media);
        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('center-media').getPublicUrl(fileName);
            images = [publicUrl];
        }
    }

    const { error } = await supabase.from('center_posts').insert({
        organization_id: centerId,
        author_id: user?.id,
        content,
        post_type: 'post',
        image_urls: images,
        post_as_center: postAsCenter
    });
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}


export async function deletePost(centerId: string, postId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('center_posts').delete().eq('id', postId);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/gyms/${centerId}/wods`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    revalidatePath(`/gym/${centerId}`);
    return { success: true };
}

export async function toggleCenterPostLike(centerId: string, postId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Login required" };

    const { data: existingLike } = await supabase
        .from('center_post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

    if (existingLike) {
        await supabase.from('center_post_likes').delete().eq('id', existingLike.id);
        await supabase.rpc('decrement_center_post_likes', { post_id: postId });
    } else {
        await supabase.from('center_post_likes').insert({ post_id: postId, user_id: user.id });
        await supabase.rpc('increment_center_post_likes', { post_id: postId });

        // Notification
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();

        if (org) {
            const notifications = [];
            const message = `${profile?.full_name || 'Alguien'} le dio like a tu publicación.`;
            const link = `/dashboard/gyms/${centerId}/feed`;

            if (org.owner_id && org.owner_id !== user.id) {
                notifications.push({ user_id: org.owner_id, type: 'post_like', title: 'Nuevo Me Gusta', content: message, link, is_read: false });
            }
            if (org.head_coach_id && org.head_coach_id !== user.id && org.head_coach_id !== org.owner_id) {
                notifications.push({ user_id: org.head_coach_id, type: 'post_like', title: 'Nuevo Me Gusta', content: message, link, is_read: false });
            }
            if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
        }
    }

    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    return { success: true };
}

export async function getCenterPostComments(postId: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('center_post_comments')
        .select(`
            *,
            user:user_id (id, full_name, avatar_url, username)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) return [];
    return data;
}

export async function addCenterPostComment(centerId: string, postId: string, content: string, postAsCenter: boolean = false) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !content.trim()) return { error: "Invalid data" };

    const { error } = await supabase.from('center_post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        post_as_center: postAsCenter
    });
    if (error) return { error: error.message };

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    const { data: org } = await supabase.from('organizations').select('owner_id, head_coach_id').eq('id', centerId).single();

    if (org) {
        const notifications = [];
        const truncated = content.length > 30 ? content.substring(0, 30) + '...' : content;
        const message = `${profile?.full_name || 'Un usuario'} comentó: "${truncated}"`;
        const link = `/dashboard/gyms/${centerId}/feed`;

        if (org.owner_id && org.owner_id !== user.id) {
            notifications.push({ user_id: org.owner_id, type: 'post_comment', title: 'Nuevo Comentario', content: message, link, is_read: false });
        }
        if (org.head_coach_id && org.head_coach_id !== user.id && org.head_coach_id !== org.owner_id) {
            notifications.push({ user_id: org.head_coach_id, type: 'post_comment', title: 'Nuevo Comentario', content: message, link, is_read: false });
        }
        if (notifications.length > 0) await supabase.from('notifications').insert(notifications);
    }

    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    return { success: true };
}

export async function deleteCenterPostComment(centerId: string, commentId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('center_post_comments').delete().eq('id', commentId);
    if (error) return { error: error.message };
    revalidatePath(`/gym/${centerId}`);
    revalidatePath(`/dashboard/gyms/${centerId}/feed`);
    return { success: true };
}
