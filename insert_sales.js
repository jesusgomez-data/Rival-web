const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ORG = '36117009-b263-4cb2-bdd5-dfc8344d549f';

async function insertSales() {
    // Get products to create sales for
    const { data: prods, error: pErr } = await s.from('center_products').select('id, price').eq('organization_id', ORG);
    if (pErr || !prods?.length) {
        console.error('No products found:', pErr?.message);
        return;
    }
    console.log('Products found:', prods.length);

    const now = new Date();
    const salesBatch = [];
    for (let i = 1; i <= 5; i++) {
        const baseDate = new Date(now.getFullYear(), now.getMonth() - i, 10);
        const count = 4 + i;
        for (let j = 0; j < count; j++) {
            const prod = prods[j % prods.length];
            salesBatch.push({
                organization_id: ORG,
                product_id: prod.id,
                quantity: 1,
                total_amount: prod.price,
                payment_status: 'completed',
                created_at: new Date(baseDate.getTime() + j * 86400000 * 2).toISOString()
            });
        }
    }

    // Try without center_id first (since we don't know schema)
    const { data, error } = await s.from('sales').insert(salesBatch).select('id');
    if (error) {
        console.error('Sales insert error:', error.message, '|', error.details);
        // Try with minimal fields
        const minimal = salesBatch.slice(0, 1);
        const { error: e2 } = await s.from('sales').insert(minimal).select();
        console.log('Minimal insert error:', e2?.message);
    } else {
        console.log('✅ Inserted', data?.length, 'sales records');
    }
}

insertSales().catch(console.error);
