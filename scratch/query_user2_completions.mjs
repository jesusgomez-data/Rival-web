import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: completions, error } = await supabase
        .from('wod_completions')
        .select('*')
        .eq('user_id', '0ca3976e-0c51-47ec-9998-004801a2629e')
        .order('completed_at', { ascending: false });

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${completions.length} completions`);
        completions.forEach(c => {
            console.log({
                id: c.id,
                original_wod_post_id: c.original_wod_post_id,
                completion_post_id: c.completion_post_id,
                completion_type: c.completion_type,
                completion_time_seconds: c.completion_time_seconds,
                rounds_completed: c.rounds_completed,
                score: c.score,
                rx: c.rx,
                completed_at: c.completed_at
            });
        });
    }
}

check();
