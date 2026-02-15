'use server'

import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function forgotPassword(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const supabase = await createClient()
    const headerList = await headers()
    const origin = headerList.get('origin')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    })

    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
