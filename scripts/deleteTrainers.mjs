import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const TRAINER_EMAILS = [
    "coach.marcos@example.com",
    "laura.fit@example.com",
    "hugo.power@example.com",
    "sofia.wellness@example.com",
];

async function deleteTrainers() {
    console.log("Deleting fictitious trainer accounts...\n");

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) { console.error("Error listing users:", listError); process.exit(1); }

    for (const email of TRAINER_EMAILS) {
        const user = users.find(u => u.email === email);
        if (!user) { console.log(`⚠️  Not found: ${email}`); continue; }

        const userId = user.id;
        console.log(`Processing ${email} (${userId})`);

        const { error: rolesError } = await supabase.from('center_roles').delete().eq('user_id', userId);
        if (rolesError) console.warn("  center_roles:", rolesError.message);

        const { error: orgsError } = await supabase.from('organizations').delete().eq('owner_id', userId);
        if (orgsError) console.warn("  organizations:", orgsError.message);

        const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
        if (profileError) console.warn("  profiles:", profileError.message);

        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) { console.error(`  auth delete failed: ${authError.message}`); continue; }

        console.log(`  ✅ Deleted`);
    }

    console.log("\nDone.");
}

deleteTrainers().catch(console.error);
