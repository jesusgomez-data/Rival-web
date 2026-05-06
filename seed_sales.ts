
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ORG_ID = 'd1f010aa-628c-4296-bfb1-71c5de4105a1';
const CENTER_ID = 'aebf33d6-e481-4d4d-aa3c-33e63e4edf64';
const OWNER_ID = '0ca3976e-0c51-47ec-9998-004801a2629e';

async function seedSales() {
    const supabase = createAdminClient();
    console.log("💰 Seeding sales with correct FKs...");

    // 1. Get or create product
    let productId;
    const { data: existingProduct } = await supabase.from('center_products').select('id').eq('organization_id', ORG_ID).limit(1).single();
    if (existingProduct) {
        productId = existingProduct.id;
    } else {
        const { data: product } = await supabase.from('center_products').insert({
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            name: 'Membresía Mensual',
            price: 60,
            stock_quantity: 999,
            category: 'Services'
        }).select().single();
        productId = product?.id;
    }

    if (!productId) return;

    // 2. Fetch some members
    const { data: members } = await supabase.from('members').select('id').eq('center_id', ORG_ID).limit(10);
    if (!members) return;

    // 3. Create sales
    const salesData = [];
    const now = new Date();
    for (let m = 0; m < 5; m++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
        for (let s = 0; s < 5; s++) {
            const saleDate = new Date(monthStart);
            saleDate.setDate(1 + Math.floor(Math.random() * 25));
            salesData.push({
                center_id: ORG_ID, // TRYING ORG_ID HERE
                member_id: members[s % members.length].id,
                product_id: productId,
                quantity: 1,
                total_amount: 60,
                created_at: saleDate.toISOString(),
                payment_status: 'completed'
            });
        }
    }

    const { error: sError } = await supabase.from('sales').insert(salesData);
    if (sError) console.error("Error creating sales:", sError);
    else console.log(`✅ Created ${salesData.length} sales records`);
}

seedSales();
