
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ORG_ID = 'd1f010aa-628c-4296-bfb1-71c5de4105a1';

async function findCenter() {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('centers').select('id, name').eq('organization_id', ORG_ID);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Centers for Rival Madrid:", data);
        if (data.length === 0) {
            // Create a default center if none exists
            console.log("No center found. Creating one...");
            const { data: newCenter, error: cErr } = await supabase.from('centers').insert({
                organization_id: ORG_ID,
                name: 'Rival Madrid Principal',
                city: 'Madrid',
                country: 'España',
                address: 'Calle Mayor 1'
            }).select().single();
            if (cErr) console.error("Error creating center:", cErr);
            else console.log("Created center:", newCenter);
        }
    }
}

findCenter();
