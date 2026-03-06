const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRegistration() {
    const orgId = '36117009-b263-4cb2-bdd5-dfc8344d549f';
    let output = `--- Verifying Registration for Org ID: ${orgId} ---\n`;

    const { data: org, error: orgError } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    if (orgError) output += `Org Error: ${orgError.message}\n`;
    else output += `Org: ${org.name} | Owner: ${org.owner_id}\n`;

    const { data: centers, error: centerError } = await supabase.from('centers').select('*').eq('organization_id', orgId);
    if (centerError) output += `Center Error: ${centerError.message}\n`;
    else {
        output += `Found ${centers.length} centers\n`;
        centers.forEach(c => output += ` - Center: ${c.name} (${c.id})\n`);
    }

    const { data: roles, error: roleError } = await supabase.from('center_roles').select('*').eq('organization_id', orgId);
    if (roleError) output += `Role Error: ${roleError.message}\n`;
    else {
        output += `Found ${roles.length} roles\n`;
        roles.forEach(r => output += ` - User ${r.user_id}: ${r.role}\n`);
    }

    fs.writeFileSync('final_verify.txt', output);
    console.log("Verification saved to final_verify.txt");
}

verifyRegistration();
