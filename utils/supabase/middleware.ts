import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Create client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // Supabase deletes cookies by setting maxAge:0 — preserve that.
                        // For all other auth cookies (undefined or positive maxAge),
                        // force 30 days so the session survives browser close/reopen.
                        const isDeleteOp = options.maxAge === 0;
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            sameSite: 'lax',
                            secure: process.env.NODE_ENV === 'production',
                            // NOTE: do NOT set httpOnly — Supabase client-side SDK must read these cookies
                            ...(isDeleteOp ? {} : { maxAge: 60 * 60 * 24 * 30 }),
                        });
                    })
                },
            },
        }
    )

    // Refresh session if needed
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
