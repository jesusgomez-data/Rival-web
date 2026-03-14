import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    return await updateSession(request)
}

export const config = {
    // Only run on routes that need auth — this removes the Supabase round-trip
    // from all public pages (/, /login, /signup, /for-centers, etc.)
    // Each unnecessary getUser() adds ~200-500ms of network latency.
    matcher: [
        '/dashboard/:path*',
        '/auth/:path*',
    ],
}
