import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern: reuse the same client instance across renders
// This avoids creating a new WebSocket connection on every re-render
let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (clientInstance) return clientInstance;
    clientInstance = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            }
        }
    );
    return clientInstance;
}
