
import { createAdminClient } from './utils/supabase/admin';

async function checkAdmins() {
    const adminEmails = ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com'];
    const adminSupabase = createAdminClient();

    console.log("Checking emails:", adminEmails);

    const { data: profiles, error: pError } = await adminSupabase
        .from('profiles')
        .select('id, email, username')
        .in('email', adminEmails);

    if (pError) console.error("Error fetching profiles:", pError);
    else console.log("Profiles found:", profiles);

    const { data: authUsers, error: aError } = await adminSupabase.auth.admin.listUsers();
    if (aError) console.error("Error listing auth users:", aError);
    else {
        const found = authUsers.users.filter(u => adminEmails.includes(u.email || ''));
        console.log("Auth Users found:", found.map(u => ({ id: u.id, email: u.email })));
    }
}

checkAdmins();
