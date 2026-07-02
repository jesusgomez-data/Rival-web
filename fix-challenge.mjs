import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
    console.log("Fixing Racha Imparable target...");
    const { error: updateErr } = await supabase
        .from('community_challenges')
        .update({ goal_value: 20 })
        .eq('title', 'RACHA IMPARABLE');
    
    if (updateErr) {
        console.error("Error updating challenge:", updateErr);
        return;
    }

    console.log("Fixing is_completed for participants...");
    
    // First, get all participants
    const { data: participants, error: getErr } = await supabase
        .from('challenge_participants')
        .select('*');
        
    if (getErr) {
        console.error("Error getting participants:", getErr);
        return;
    }
    
    let count = 0;
    for (const p of participants) {
        // We only care if they are completed but progress < 20 (assuming goal is 20 for this, or other challenges need fixing too)
        // Wait, let's just fetch the challenge for each participant to be safe
        const { data: challenge } = await supabase
            .from('community_challenges')
            .select('goal_value')
            .eq('id', p.challenge_id)
            .single();
            
        if (challenge && p.is_completed && p.current_progress < challenge.goal_value) {
            console.log(`Fixing participant ${p.user_id} for challenge ${p.challenge_id}`);
            await supabase
                .from('challenge_participants')
                .update({ is_completed: false })
                .eq('id', p.id);
            count++;
        }
    }
    
    console.log(`Fixed ${count} participants. Done.`);
}

main();
