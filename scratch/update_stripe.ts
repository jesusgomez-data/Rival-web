import { stripe } from './utils/stripe/config'; 
import { createAdminClient } from './utils/supabase/admin'; 

async function main() { 
    const admin = createAdminClient(); 
    const { data } = await admin.from('organizations').select('stripe_account_id').not('stripe_account_id', 'is', null); 
    for (const org of data) { 
        try { 
            await stripe.accounts.update(org.stripe_account_id, { 
                settings: { payouts: { schedule: { interval: 'manual' } } } 
            }); 
            console.log('Updated', org.stripe_account_id); 
        } catch(e) { 
            console.log('Error updating', org.stripe_account_id, e.message); 
        } 
    } 
} 
main();
