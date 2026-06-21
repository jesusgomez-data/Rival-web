import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("Fetching profiles matching Alfred...");
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, email, is_official')
        .ilike('full_name', '%Alfred%');
        
    if (profileErr) {
        console.error("Profile Error:", profileErr);
        return;
    }
    console.log("Found profiles:", profiles);

    if (profiles.length === 0) {
        console.log("No profile found with name Alfred");
        return;
    }

    for (const profile of profiles) {
        console.log(`\n--- Inspecting memberships for ${profile.full_name} (${profile.id}) ---`);
        const { data: memberships, error: memErr } = await supabase
            .from('members')
            .select(`
                *,
                organizations:center_id (id, name, owner_id, center_type)
            `)
            .eq('user_id', profile.id);

        if (memErr) {
            console.error("Members error:", memErr);
        } else {
            console.log("Memberships:", JSON.stringify(memberships, null, 2));
        }
    }
}

inspect();
