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

    // Official account cannot follow others — antes esto devolvía
    // { success: true } sin campo `following`, así que el botón no tenía
    // forma de saber que la acción se había bloqueado: ni revertía el
    // estado optimista ni avisaba, se quedaba "colgado" sin explicación
    // (justo lo reportado: "le doy seguir y no funciona").
    const { data: currentProfile } = await adminSupabase.from('profiles').select('is_official').eq('id', user.id).single()
    if (currentProfile?.is_official) return { error: 'Las cuentas oficiales no pueden seguir a otros atletas.' }
    if (followingId === user.id) return { error: 'No puedes seguirte a ti mismo' }

    // Check if relationship exists using ADMIN client
    const { data: existingFollow } = await adminSupabase
        .from('follows')
        .select('*')
        .eq('following_id', followingId)
        .eq('follower_id', user.id)
        .maybeSingle()

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

        // El follow en sí ya se guardó arriba — si cualquiera de estos dos
        // efectos secundarios (misión, notificación) lanzaba una excepción
        // sin capturar, esa excepción se propagaba fuera de toggleFollow()
        // ANTES de llegar al `return` de éxito. El cliente (FollowButton)
        // no envuelve su `await toggleFollow(...)` en try/catch, así que
        // eso se convertía en un rechazo de promesa sin manejar: el follow
        // quedaba guardado en la BD pero el usuario nunca veía confirmación
        // — parecía que "no había funcionado" aunque sí funcionó a medias.
        try {
            await updateMissionProgress(user.id, 'social_interactions', 1)
        } catch (e) {
            console.error('[toggleFollow] updateMissionProgress failed:', e)
        }

        try {
            const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
            await createNotification({
                userId: followingId,
                type: 'follow',
                title: '¡Nuevo Rival!',
                content: `${profile?.full_name || 'Alguien'} ha comenzado a seguirte.`,
                link: profile?.username ? `/dashboard/profile/${profile.username}` : '/dashboard/community'
            });
        } catch (e) {
            console.error('[toggleFollow] createNotification failed:', e)
        }
    }

    try {
        revalidatePath('/dashboard/community')
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/explore')
        revalidatePath('/dashboard/profile/[username]', 'page')
    } catch (e) {
        console.error('[toggleFollow] revalidatePath failed:', e)
    }
    return { success: true, following: !existingFollow }
}


export async function getFollows(userId: string, type: 'followers' | 'following', limit = 20) {
    const supabase = createAdminClient()

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
