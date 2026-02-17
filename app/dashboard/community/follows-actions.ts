'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

import { updateMissionProgress } from '../training/actions'
import { createNotification } from '../notifications-actions'

export async function toggleFollow(followingId: string) {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }
    // if (user.id === followingId) return { error: 'Cannot follow yourself' }

    // Check if relationship exists using ADMIN client
    const { data: existingFollow } = await adminSupabase
        .from('follows')
        .select('*')
        .eq('following_id', followingId)
        .eq('follower_id', user.id)
        .single() // Use single() to get one record or error if none/multiple

    // If exists, delete. If not, insert.
    if (existingFollow) {
        // Unfollow
        const { error } = await adminSupabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', followingId)

        if (error) return { error: error.message }
    } else {
        // Follow
        const { error } = await adminSupabase
            .from('follows')
            .insert({
                follower_id: user.id,
                following_id: followingId
            })

        if (error) return { error: error.message }

        // Update mission progress (assuming this action handles its own perms or is safe)
        await updateMissionProgress(user.id, 'social_interactions', 1)

        // Trigger Notification
        const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
        await createNotification({
            userId: followingId,
            type: 'follow',
            title: '¡Nuevo Rival!',
            content: `${profile?.full_name || 'Alguien'} ha comenzado a seguirte.`,
            link: profile?.username ? `/dashboard/profile/${profile.username}` : '/dashboard/community'
        });
    }

    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/profile`)
    return { success: true }
}

export async function getFollows(userId: string, type: 'followers' | 'following', limit = 20) {
    const supabase = await createClient()

    let data
    let error

    if (type === 'followers') {
        // We want who follows userId
        const result = await supabase.from('follows').select(`
            created_at,
            profile:follower_id (id, full_name, username, avatar_url, level, main_sport)
        `).eq('following_id', userId).limit(limit)
        data = result.data
        error = result.error
    } else {
        // following
        // We want who userId is following
        const result = await supabase.from('follows').select(`
            created_at,
            profile:following_id (id, full_name, username, avatar_url, level, main_sport)
        `).eq('follower_id', userId).limit(limit)
        data = result.data
        error = result.error
    }

    if (error) {
        console.error('Error fetching follows:', error)
        return []
    }

    // Return just the profile objects
    return data?.map((item: any) => item.profile).filter(Boolean) || []
}
