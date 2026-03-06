const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// We need two clients: one admin to set up the org, and one anon/user to test the RLS
const admin = createClient(supabaseUrl, supabaseServiceKey);
const publicClient = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
    console.log("--- Testing Centers RLS ---");

    // 1. Create a dummy organization with a specific owner_id (we'll use a random uuid or a real one)
    const testOwnerId = '00000000-0000-0000-0000-000000000000'; // Placeholder

    // Try to find a real user id from profiles to be safe
    const { data: profiles } = await admin.from('profiles').select('id').limit(1);
    const realUserId = profiles?.[0]?.id || testOwnerId;

    console.log(`Using owner_id: ${realUserId}`);

    const { data: org, error: orgError } = await admin.from('organizations').insert({
        name: 'Test Org for Centers RLS',
        email: 'test_rls@rival.fit',
        center_type: 'gym',
        country: 'Spain',
        city: 'Madrid',
        owner_id: realUserId
    }).select().single();

    if (orgError) {
        console.error("Failed to create test organization:", orgError);
        return;
    }

    console.log(`Organization created: ${org.id}`);

    // 2. Try to insert a center into this organization USING PUBLIC CLIENT (unauthenticated)
    // This should FAIL if we don't have a public insert policy (which we shouldn't for centers)
    const { error: publicInsertError } = await publicClient.from('centers').insert({
        organization_id: org.id,
        name: 'Public Test Center'
    });

    if (publicInsertError) {
        console.log("Public insert failed as expected:", publicInsertError.message);
    } else {
        console.warn("WARNING: Public insert into 'centers' SUCCEEDED. This might be a security risk.");
    }

    // 3. Clean up
    await admin.from('organizations').delete().eq('id', org.id);
    console.log("Cleanup complete.");
}

testRLS();
