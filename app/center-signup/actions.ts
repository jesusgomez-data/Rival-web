'use server'

import { createClient } from '@supabase/supabase-js'

export async function createCenterAction(formData: any, accessToken: string) {
    // 1. Initialize Supabase with Anon Key (assuming Service Role is missing/unavailable)
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 2. Set the user's session explicitly using the token from the client
    // This bypasses cookie propagation delays for Server Actions
    if (accessToken) {
        await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '', // Not needed for a single request usually
        })
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'No se pudo validar la sesión. Por favor intenta nuevamente.' }
    }

    const userId = user.id
    const { email, centerName, centerType, country, city, plan, fullName } = formData

    // 3. Ensure Profile Exists
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            username: email.split('@')[0],
            full_name: fullName,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

    if (profileError) {
        console.error('Profile Upsert Error', profileError)
    }

    // 4. Create Organization
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
            name: centerName,
            email: email,
            center_type: centerType,
            country: country,
            city: city,
            plan: plan || 'free',
            owner_id: userId,
            is_public: true,
            member_count: 0,
            followers_count: 0
        })
        .select()
        .single()

    if (orgError) {
        console.error('Organization Create Error:', orgError)
        return { error: `Error creando centro: ${orgError.message}` }
    }

    // 5. Create Head Coach Role
    const { error: roleError } = await supabase
        .from('center_roles')
        .insert({
            organization_id: org.id,
            user_id: userId,
            role: 'head_coach',
            permissions: ['manage_classes', 'manage_members', 'see_analytics', 'manage_store', 'manage_payments']
        })

    if (roleError) {
        console.error('Role Create Error:', roleError)
    }

    return { success: true, organizationId: org.id }
}
