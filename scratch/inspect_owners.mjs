import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const ownerId = '0ca3976e-0c51-47ec-9998-004801a2629e';
    console.log("Fetching owner profile info for", ownerId);
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', ownerId)
        .single();
    if (error) {
        console.error("Error fetching owner profile:", error);
    } else {
        console.log("Owner profile:", profile);
    }
}

inspect();
