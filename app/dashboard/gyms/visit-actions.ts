'use server'

import { createClient } from '@/utils/supabase/server'

export async function recordProfileVisit(organizationId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase.from('profile_visits').upsert(
            { organization_id: organizationId, visitor_id: user?.id || null },
            { onConflict: 'organization_id,visitor_id,visit_date' }
        )

        if (error) {
            console.error("Error recording profile visit:", error)
        }
    } catch (err) {
        console.error("Critical error in recordProfileVisit:", err)
    }
}
