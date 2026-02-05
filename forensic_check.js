
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
    console.log("--- FORENSIC REPORT ---");

    // 1. Members
    const { count: memberCount, error: mErr } = await supabase.from('members').select('*', { count: 'exact', head: true });
    console.log(`Total rows in 'members': ${memberCount} (Error: ${mErr?.message || 'none'})`);

    const { data: allMembers } = await supabase.from('members').select('id, full_name, plan, status, organization_id, center_id, created_at');
    if (allMembers && allMembers.length > 0) {
        console.log("Sample members:");
        allMembers.slice(0, 5).forEach(m => console.log(JSON.stringify(m)));
        const orgCounts = {};
        allMembers.forEach(m => {
            const oid = m.organization_id || 'null';
            orgCounts[oid] = (orgCounts[oid] || 0) + 1;
        });
        console.log("Members per Organization ID:", orgCounts);
    }

    // 2. Organizations
    const { data: orgs } = await supabase.from('organizations').select('id, name, created_at');
    console.log("\nOrganizations:");
    orgs.forEach(o => console.log(`${o.id}: ${o.name} (${o.created_at})`));

    // 3. Centers
    const { data: centers } = await supabase.from('centers').select('id, name, organization_id');
    console.log("\nCenters:");
    centers.forEach(c => console.log(`${c.id}: ${c.name} (Org: ${c.organization_id})`));

    // 4. Profiles (Potential athletes)
    const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    console.log(`\nTotal rows in 'profiles': ${profileCount}`);

    // 5. Imports Logs? Is there an import log? No standard one.

    // 6. Check for soft delete columns if any
    // Not standard in this schema.
}

inspect();
