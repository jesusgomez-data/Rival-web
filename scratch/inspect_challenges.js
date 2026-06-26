const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching active community challenges...');
    const { data, error } = await supabase
        .from('community_challenges')
        .select('*');

    if (error) {
        console.error('Error fetching challenges:', error);
    } else {
        console.log('\n--- ACTIVE CHALLENGES ---');
        data.forEach(challenge => {
            console.log(`ID: ${challenge.id}`);
            console.log(`Title: ${challenge.title}`);
            console.log(`Description: ${challenge.description}`);
            console.log(`XP Reward: ${challenge.xp_reward}`);
            console.log(`Goal: ${challenge.goal_value} ${challenge.goal_unit || ''} (${challenge.goal_type})`);
            console.log(`Active: ${challenge.is_active}`);
            console.log('-------------------------');
        });
    }
}

main();
