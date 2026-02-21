
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuels() {
    const { data: duels, error } = await supabase
        .from('duels')
        .select('*');

    if (error) {
        console.error('Error fetching duels:', error);
        return;
    }

    console.log(`Total duels in DB: ${duels.length}`);

    const active = duels.filter(d => d.status === 'active');
    const pending = duels.filter(d => d.status === 'pending');
    const completed = duels.filter(d => d.status === 'completed');

    console.log(`Active: ${active.length}`);
    console.log(`Pending: ${pending.length}`);
    console.log(`Completed: ${completed.length}`);

    console.log(`\nDetailed info for all duels:`);
    for (const d of duels) {
        console.log(`ID: ${d.id}`);
        console.log(`Status: ${d.status}`);
        console.log(`Challenger: ${d.challenger_id}`);
        console.log(`Opponent: ${d.opponent_id}`);
        console.log(`End Date: ${d.end_date}`);

        if (d.status === 'active') {
            console.log('Calculating current scores for this active duel...');
            const scores = await calculateScores(d);
            console.log(`Current Scores -> Challenger: ${scores.challengerScore}, Opponent: ${scores.opponentScore}`);
        }
        console.log('---');
    }
}

async function calculateScores(duel) {
    const getUserScore = async (userId) => {
        const endDateTime = new Date(duel.end_date);
        endDateTime.setHours(23, 59, 59, 999);

        const { data: workouts } = await supabase
            .from('workouts')
            .select('id, total_volume_kg, duration_seconds, metrics')
            .eq('user_id', userId)
            .gte('start_time', duel.start_date)
            .lte('start_time', endDateTime.toISOString());

        // Simple mock of the logic in duel-actions.ts for verification
        let score = 0;
        workouts?.forEach(w => {
            let vol = w.total_volume_kg || 0;
            let durationMins = (w.duration_seconds || 0) / 60;
            if (durationMins === 0) durationMins = 20;
            score += (vol * 0.2) + (durationMins * 30);
        });
        return score;
    };

    const challengerScore = Math.floor(await getUserScore(duel.challenger_id));
    const opponentScore = Math.floor(await getUserScore(duel.opponent_id));
    return { challengerScore, opponentScore };
}

checkDuels();
