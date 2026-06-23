import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    console.log("=== Testing Booking Validation Logic ===");

    // Test 1: Time difference helper validation
    const now = new Date();
    
    // Class in 10 minutes
    const classTimeClose = new Date(now.getTime() + 10 * 60 * 1000);
    const diffMinsClose = (classTimeClose.getTime() - now.getTime()) / (1000 * 60);
    console.log(`Test 1.1 (Booking inside 20m window): Diff is ${diffMinsClose.toFixed(1)} mins. Should block: ${diffMinsClose < 20}`);

    // Class in 25 minutes
    const classTimeFar = new Date(now.getTime() + 25 * 60 * 1000);
    const diffMinsFar = (classTimeFar.getTime() - now.getTime()) / (1000 * 60);
    console.log(`Test 1.2 (Booking outside 20m window): Diff is ${diffMinsFar.toFixed(1)} mins. Should block: ${diffMinsFar < 20}`);

    // Class in 5 minutes (Cancellation inside 15m window)
    const cancelTimeClose = new Date(now.getTime() + 5 * 60 * 1000);
    const diffCancelClose = (cancelTimeClose.getTime() - now.getTime()) / (1000 * 60);
    console.log(`Test 2.1 (Cancellation inside 15m window): Diff is ${diffCancelClose.toFixed(1)} mins. Should block: ${diffCancelClose < 15}`);

    // Class in 30 minutes (Cancellation outside 15m window)
    const cancelTimeFar = new Date(now.getTime() + 30 * 60 * 1000);
    const diffCancelFar = (cancelTimeFar.getTime() - now.getTime()) / (1000 * 60);
    console.log(`Test 2.2 (Cancellation outside 15m window): Diff is ${diffCancelFar.toFixed(1)} mins. Should block: ${diffCancelFar < 15}`);

    // Test 3: No-Show Penalty calculations
    console.log("\n=== Testing No-Show Suspension Calculations ===");
    // Mock past class enrollments
    const pastEnrollmentsMock = [
        { attended: false, class: { scheduled_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() } }, // 2 hours ago
        { attended: false, class: { scheduled_time: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() } }, // 24 hours ago
        { attended: false, class: { scheduled_time: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString() } }, // 30 hours ago
    ];

    const past = pastEnrollmentsMock
        .filter(e => e.class && e.class.scheduled_time < now.toISOString())
        .sort((a, b) => new Date(b.class.scheduled_time).getTime() - new Date(a.class.scheduled_time).getTime());

    console.log("Mock past enrollments (latest first):", past.map(p => ({ time: p.class.scheduled_time, attended: p.attended })));

    if (past.length >= 3) {
        const last3NoShows = past.slice(0, 3).every(e => e.attended === false);
        console.log(`Are last 3 no-shows? ${last3NoShows}`);
        if (last3NoShows) {
            const lastMissedTime = new Date(past[0].class.scheduled_time);
            const penaltyEndTime = new Date(lastMissedTime.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days penalty
            const active = now < penaltyEndTime;
            console.log(`Penalty start: ${lastMissedTime.toISOString()}`);
            console.log(`Penalty end: ${penaltyEndTime.toISOString()}`);
            console.log(`Is penalty currently active? ${active}`);
            if (active) {
                const diffTime = penaltyEndTime.getTime() - now.getTime();
                const hoursLeft = Math.ceil(diffTime / (1000 * 60 * 60));
                console.log(`Blocks booking. Hours left of suspension: ${hoursLeft} hours`);
            }
        }
    }
}

runTests();
