
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listTables() {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc('get_tables'); // Custom RPC if it exists, else use standard query

    if (error) {
        // Fallback: Query pg_catalog via raw SQL if possible, but standard client doesn't support raw SQL easily unless there's an RPC.
        // Let's try to query some known tables to confirm existence.
        const tables = [
            'organizations', 'centers', 'members', 'classes', 'class_enrollments', 
            'memberships', 'center_roles', 'center_posts', 'team_chat_messages',
            'notifications', 'profiles', 'center_products', 'orders'
        ];
        console.log("Checking tables...");
        for (const t of tables) {
            const { error: tErr } = await supabase.from(t).select('id').limit(1);
            if (!tErr) console.log(`[OK] ${t}`);
            else console.log(`[FAIL] ${t}: ${tErr.message}`);
        }
        return;
    }
}

listTables();
