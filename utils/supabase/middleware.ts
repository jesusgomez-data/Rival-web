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
                    cookiesToSet.forEach(({ name, value, options }) => {
                        // Asegurar que la sesión sea persistente (no expire al cerrar pestaña)
                        // Si no hay maxAge, le ponemos uno largo (30 días por defecto en auth)
                        request.cookies.set(name, value)
                    })
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            sameSite: 'lax',
                            secure: process.env.NODE_ENV === 'production',
                        })
                    )
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
