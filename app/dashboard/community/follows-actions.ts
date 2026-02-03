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
    if (user.id === followingId) return { error: 'Cannot follow yourself' }

    // Check if relationship exists using ADMIN client
    const { data: existingFollow } = await adminSupabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .single()

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
        // Notifications usually require admin rights to write if RLS is strict for 'other' users
        await createNotification({
            userId: followingId,
            type: 'follow',
            title: '¡Nuevo Rival!',
            content: `${user.user_metadata?.full_name || 'Alguien'} ha comenzado a seguirte.`,
            link: '/dashboard/community'
        });
    }

    revalidatePath('/dashboard/community')
    revalidatePath('/dashboard')
    revalidatePath(`/dashboard/profile`)
    return { success: true }
}

