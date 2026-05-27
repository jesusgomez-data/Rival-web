import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()

            let redirectPath = next

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', user.id)
                    .maybeSingle()

                if (!profile) {
                    const meta = user.user_metadata
                    const fullName = meta.full_name || meta.name || ''
                    const avatarUrl = meta.avatar_url || meta.picture || null
                    const emailPrefix = (user.email || '').split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
                    const username = `${emailPrefix}_${Math.random().toString(36).slice(2, 6)}`

                    await supabase.from('profiles').insert({
                        id: user.id,
                        full_name: fullName,
                        avatar_url: avatarUrl,
                        username,
                        xp_points: 0,
                    })

                    redirectPath = '/onboarding'
                }
            }

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
            } else {
                return NextResponse.redirect(`${origin}${redirectPath}`)
            }
        }
    }

    return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
}
