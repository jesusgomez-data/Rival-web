const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ORG_ID = '36117009-b263-4cb2-bdd5-dfc8344d549f';

async function diagnose() {
    // Centers for demo org
    const { data: centers } = await s.from('centers').select('id,name,organization_id');
    console.log('ALL CENTERS:');
    centers?.forEach(c => console.log(`  ${c.id.substring(0, 8)} | ${c.name} | org: ${c.organization_id?.substring(0, 8)}`));

    const ourCenters = centers?.filter(c => c.organization_id === ORG_ID);
    console.log('\nOUR ORG CENTERS:', ourCenters?.map(c => c.id));

    // Members in our centers
    const ourCenterIds = ourCenters?.map(c => c.id) || [];
    if (ourCenterIds.length > 0) {
        const { data: members } = await s.from('members').select('id,full_name,center_id').in('center_id', ourCenterIds);
        console.log('MEMBERS IN OUR CENTERS:', members?.length);
    }

    // Members in the other center
    const { data: allMembers } = await s.from('members').select('id,full_name,center_id');
    console.log('ALL MEMBERS:');
    allMembers?.forEach(m => console.log(`  ${m.full_name} -> center: ${m.center_id?.substring(0, 8)}`));
}

diagnose();
