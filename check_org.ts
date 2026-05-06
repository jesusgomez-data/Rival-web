
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const supabase = createAdminClient();
    const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, owner_id')
        .ilike('name', '%Rival Madrid%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Found organizations:", JSON.stringify(orgs, null, 2));

    if (orgs.length === 0) {
        // Find an admin user to assign as owner
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, email')
            .in('email', ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com']);
        
        console.log("Potential owners:", JSON.stringify(profiles, null, 2));
    }
}

check();
