const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ORG_ID = '36117009-b263-4cb2-bdd5-dfc8344d549f';
const CENTER_ID = '993edb6b-a081-49c9-bca8-57955498e55e';

async function addHistoricalData() {
    console.log("📈 Adding Historical Data for Analytics...");

    // 1. Get products for sales
    const { data: products } = await supabase.from('center_products').select('id, price').eq('organization_id', ORG_ID);
    if (!products || products.length === 0) return;

    const salesData = [];
    const now = new Date();

    // Add random sales for the last 5 months
    for (let i = 1; i <= 5; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
        const salesCount = Math.floor(Math.random() * 5) + 3;

        for (let j = 0; j < salesCount; j++) {
            const prod = products[Math.floor(Math.random() * products.length)];
            salesData.push({
                organization_id: ORG_ID,
                center_id: CENTER_ID,
                product_id: prod.id,
                quantity: 1,
                total_amount: prod.price,
                payment_status: 'completed',
                created_at: new Date(monthDate.getTime() + Math.random() * 86400000 * 10).toISOString()
            });
        }
    }
    await supabase.from('sales').insert(salesData);

    // 2. Add Trial Requests
    console.log("Adding trial requests...");
    const trialData = [
        { organization_id: ORG_ID, center_id: CENTER_ID, full_name: 'Roberto Gómez', email: 'roberto@external.com', status: 'pending', created_at: new Date().toISOString() },
        { organization_id: ORG_ID, center_id: CENTER_ID, full_name: 'Sara Mínguez', email: 'sara@external.com', status: 'contacted', created_at: new Date(Date.now() - 86400000).toISOString() },
        { organization_id: ORG_ID, center_id: CENTER_ID, full_name: 'Tomás Hierro', email: 'tomas@external.com', status: 'completed', created_at: new Date(Date.now() - 172800000).toISOString() }
    ];
    await supabase.from('trial_requests').insert(trialData);

    // 3. Update members with spread start dates
    const { data: members } = await supabase.from('members').select('id').eq('center_id', CENTER_ID);
    if (members) {
        for (let i = 0; i < members.length; i++) {
            const pastDate = new Date(now.getFullYear(), now.getMonth() - (i + 1), 10).toISOString();
            await supabase.from('members').update({ membership_start_date: pastDate }).eq('id', members[i].id);
        }
    }

    console.log("✅ Historical Data Added!");
}

addHistoricalData().catch(console.error);
