import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: policies, error } = await s.rpc('execute_sql', {
        query: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'posts'"
    });
    if (error) {
        console.log('Error listing policies:', error);
    } else {
        console.log('Políticas para posts:', policies);
    }
}

check();
