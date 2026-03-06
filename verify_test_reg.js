const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRegistration() {
    const orgId = '36117009-b263-4cb2-bdd5-dfc8344d549f';

    console.log(`--- Verifying Registration for Org ID: ${orgId} ---`);

    // 1. Check Organization
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

    if (orgError) {
        console.error("Organization not found:", orgError.message);
    } else {
        console.log("Organization found:", org.name, "| Owner:", org.owner_id);
    }

    // 2. Check Center
    const { data: centers, error: centerError } = await supabase
        .from('centers')
        .select('*')
        .eq('organization_id', orgId);

    if (centerError) {
        console.error("Centers error:", centerError.message);
    } else {
        console.log(`Found ${centers.length} centers for this org.`);
        centers.forEach(c => console.log(` - Center: ${c.name} (${c.id})`));
    }

    // 3. Check Role
    const { data: roles, error: roleError } = await supabase
        .from('center_roles')
        .select('*')
        .eq('organization_id', orgId);

    if (roleError) {
        console.error("Roles error:", roleError.message);
    } else {
        console.log(`Found ${roles.length} roles for this org.`);
        roles.forEach(r => console.log(` - User ${r.user_id} is ${r.role}`));
    }
}

verifyRegistration();
