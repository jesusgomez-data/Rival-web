
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const supabase = createAdminClient();
    const { error } = await supabase.from('sales').select('id').limit(1);
    if (!error) console.log("[OK] sales");
    else console.log("[FAIL] sales: " + error.message);
}

check();
