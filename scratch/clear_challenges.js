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
    console.log('Clearing all community challenges from the database...');
    
    // Deleting participants first is handled by ON DELETE CASCADE in the database schema,
    // but doing a delete on community_challenges will remove them all.
    const { data, error } = await supabase
        .from('community_challenges')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (error) {
        console.error('Error clearing challenges:', error);
    } else {
        console.log('Successfully deleted all community challenges from the database!');
    }
}

main();
