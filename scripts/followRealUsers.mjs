import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

async function followRealUsers() {
    console.log("Starting to follow real users...");

    const fakeUsernames = [
        "alessia_fit", "john_strong", "camila.wod", "lukas_lifts", "juju_fit",
        "hiroki_jp", "elena_v", "mateo_garcia", "sara.kim", "david_osei",
        "emily_chen", "omar.rx", "sophie.fit", "kofi_moves", "mia_gym",
        "noah.j", "isa.martinez", "tariq_strong", "chloe._", "carlos_m"
    ];

    // 1. Get Fake Users
    const { data: fakeUsers, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', fakeUsernames);

    if (profileErr || !fakeUsers) {
        console.error("Could not fetch fake user profiles", profileErr);
        return;
    }

    // 2. Get Real Users
    const { data: realUsers, error: realErr } = await supabase
        .from('profiles')
        .select('id, username')
        .not('username', 'in', `(${fakeUsernames.join(',')})`);

    if (realErr || !realUsers) {
        console.error("Could not fetch real user profiles", realErr);
        return;
    }

    console.log(`Found ${fakeUsers.length} fake users and ${realUsers.length} real users.`);

    // 3. Make Fake Users follow Real Users
    let followsCreated = 0;

    for (const realUser of realUsers) {
        // We'll have almost ALL fake users follow the real users to give them a boost.
        // Let's say between 15 to 20 fake users will follow each real user.
        const shuffledFakes = [...fakeUsers].sort(() => 0.5 - Math.random());
        const numFollowers = Math.floor(Math.random() * 6) + 15; // 15 to 20
        const followersToAdd = shuffledFakes.slice(0, numFollowers);

        for (const fake of followersToAdd) {
            const { error } = await supabase.from('follows').upsert(
                { follower_id: fake.id, following_id: realUser.id },
                { onConflict: 'follower_id, following_id' }
            );

            if (!error) {
                followsCreated++;
            }
        }

        console.log(`✅ Added ${followersToAdd.length} new followers to @${realUser.username}`);
    }

    console.log(`Success! Created ${followsCreated} new follows towards real users.`);
}

followRealUsers().catch(console.error);
