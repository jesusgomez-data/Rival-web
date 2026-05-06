
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSales() {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('sales').select('*').limit(1);
    if (error) console.error(error);
    else console.log("Sales data example:", data);
}

checkSales();
