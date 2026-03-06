const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ORG = '36117009-b263-4cb2-bdd5-dfc8344d549f';

async function checkSales() {
    const { data, error } = await s.from('sales').select('*').limit(1);
    if (error) {
        console.log('Sales table error:', error.message);
        return;
    }
    if (data && data.length > 0) {
        console.log('Sales columns:', Object.keys(data[0]));
    } else {
        console.log('Sales table is empty');
    }
}

checkSales();
