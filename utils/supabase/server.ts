import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const isDeleteOp = options.maxAge === 0;
                            cookieStore.set(name, value, {
                                ...options,
                                sameSite: 'lax',
                                secure: process.env.NODE_ENV === 'production',
                                // NOTE: do NOT set httpOnly — Supabase client-side SDK must read these cookies
                                ...(isDeleteOp ? {} : { maxAge: 60 * 60 * 24 * 30 }),
                            });
                        })
                    } catch {
                        // Called from a Server Component — safe to ignore.
                    }
                },
            },
        }
    )
}
