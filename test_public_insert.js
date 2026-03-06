const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use ANON key to simulate a public user
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPublicInsert() {
    console.log('Testing Public Insert on organizations table...');

    const testOrg = {
        name: 'Public Test Box ' + Math.floor(Math.random() * 1000),
        email: 'test_public_' + Date.now() + '@example.com',
        center_type: 'crossfit',
        country: 'España',
        city: 'Madrid',
        is_public: true
    };

    const { data, error } = await supabase
        .from('organizations')
        .insert(testOrg)
        .select();

    if (error) {
        console.error('❌ Public Insert FAILED:', error.message);
        if (error.message.includes('row-level security')) {
            console.log('💡 This confirms RLS is still blocking public signups.');
        }
    } else {
        console.log('✅ Public Insert SUCCESS! RLS is correctly configured.');
        console.log('Created Org ID:', data[0].id);

        // Clean up
        const { createClient: createAdminClient } = require('@supabase/supabase-js');
        const admin = createAdminClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        await admin.from('organizations').delete().eq('id', data[0].id);
        console.log('Restored state: Deleted test organization.');
    }
}

testPublicInsert();
