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

const FAKE_EMAILS = [
    "fake_alessia@example.com", "fake_johnm@example.com", "fake_camila@example.com",
    "fake_lukas@example.com", "fake_juju@example.com", "fake_hiroki@example.com",
    "fake_elena@example.com", "fake_mateo@example.com", "fake_sara@example.com",
    "fake_david@example.com", "fake_emily@example.com", "fake_omar@example.com",
    "fake_sophie@example.com", "fake_kofi@example.com", "fake_mia@example.com",
    "fake_noah@example.com", "fake_isa@example.com", "fake_tariq@example.com",
    "fake_chloe@example.com", "fake_carlos@example.com"
];

// High quality HD fitness images from Unsplash
const PREMIUM_IMAGES = [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80",
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80",
    "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80",
    "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&q=80",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
    "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80",
    "https://images.unsplash.com/photo-1526506159807-1c6f08c4d70a?w=800&q=80",
    "https://images.unsplash.com/photo-1636246441747-9d7ca94a5574?w=800&q=80",
    "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?w=800&q=80",
    "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80",
    "https://images.unsplash.com/photo-1581009137042-c552e485697a?w=800&q=80",
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80",
    "https://images.unsplash.com/photo-1522898467493-49726bf28798?w=800&q=80",
    "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800&q=80"
];

const COMMENTS_DB = [
    "🔥 Bro this is insane! Keep it up!",
    "Amazing work, looking strong 💪",
    "I need to try this workout tomorrow. Looks brutal!",
    "Wow, crazy numbers. What's your secret?",
    "So clean! Form is perfect.",
    "Beast mode activated 🦍",
    "Let's gooooo! Unstoppable!",
    "That time is crazy fast. Respect. ⏰",
    "Inspiring! Getting me motivated to hit the gym today.",
    "Brutal WOD, I died just reading it 😂",
    "Good job! Have you tried adding more weight?",
    "This is why you are the best 💥",
    "Level up! 🚀",
    "Felicidades!! Menudo entreno te marcaste!",
    "Increíble, yo habría muerto en la primera ronda jajaja",
    "Pura fuerza!! Te veo en la cima 🙌",
    "Tremendo WOD. Mañana mismo me copio la idea.",
    "Form goals forever ✨",
    "That lighting and pump is everything!",
    "Solid effort! Great job."
];

const CAPTIONS = [
    "Felt amazing today. Hit some new numbers and loving the progress!",
    "Toughest WOD of my life, but we didn't quit.",
    "Consistency is key. Showing up every day.",
    "A smooth sea never made a skilled sailor. Grinding hard!",
    "Enjoying the process! Huge shoutout to the community.",
    "It never gets easier, you just get stronger.",
    "Post-workout vibes. Totally destroyed, but totally happy.",
    "Heavy lifting day! My legs are going to be so sore tomorrow...",
    "Nothing like a good sweaty session to clear the mind. Let's go!",
    "Small progress is still progress. Every rep counts!"
];

const REAL_WORKOUTS = [
    {
        title: "FRAN",
        blocks: [
            { title: "WARMUP", format: "LIBRE", exercises: [{ name: "ROW", reps: "1000m" }, { name: "PVC DISLOCATIONS", reps: "15" }] },
            { title: "FRAN", format: "FOR TIME", result: { time: "05:12" }, exercises: [{ name: "THRUSTERS", reps: "21-15-9", detail: "43kg" }, { name: "PULL UPS", reps: "21-15-9" }] }
        ]
    },
    {
        title: "CINDY",
        blocks: [
            { title: "CINDY", format: "AMRAP", result: { rounds: "18" }, exercises: [{ name: "PULL UPS", reps: "5" }, { name: "PUSH UPS", reps: "10" }, { name: "AIR SQUATS", reps: "15" }] }
        ]
    },
    {
        title: "HEAVY DEADLIFT DAY",
        blocks: [
            { title: "STRENGTH BUILD", format: "LIBRE", exercises: [{ name: "DEADLIFT", reps: "5-5-3-3-1-1", detail: "Working up to 180kg" }] },
            { title: "ACCESSORY", format: "EMOM", result: { rounds: "10" }, exercises: [{ name: "BOX JUMP OVER", reps: "10" }] }
        ]
    },
    {
        title: "MURPH PREP",
        blocks: [
            { title: "WARMUP", format: "LIBRE", exercises: [{ name: "RUN", reps: "800m" }] },
            { title: "PREP SERIES", format: "FOR TIME", result: { time: "18:45" }, exercises: [{ name: "RUN", reps: "800m" }, { name: "PULL UPS", reps: "50" }, { name: "PUSH UPS", reps: "100" }, { name: "AIR SQUATS", reps: "150" }, { name: "RUN", reps: "800m" }] }
        ]
    },
    {
        title: "CARDIO ENGINE",
        blocks: [
            { title: "MACHINE WORK", format: "EMOM", result: { rounds: "20" }, exercises: [{ name: "CAL ASSAULT BIKE", reps: "15" }, { name: "CAL ROW", reps: "15" }] },
            { title: "CORE RUN", format: "FOR TIME", result: { time: "12:10" }, exercises: [{ name: "RUN", reps: "400m" }, { name: "V-UPS", reps: "30" }, { name: "RUN", reps: "400m" }] }
        ]
    },
    {
        title: "DIANE",
        blocks: [
            { title: "WOD", format: "FOR TIME", result: { time: "06:45" }, exercises: [{ name: "DEADLIFT", reps: "21-15-9", detail: "102kg" }, { name: "HSPU", reps: "21-15-9" }] }
        ]
    },
    {
        title: "CHELSEA",
        blocks: [
            { title: "WOD", format: "EMOM", result: { rounds: "30" }, exercises: [{ name: "PULL UPS", reps: "5" }, { name: "PUSH UPS", reps: "10" }, { name: "AIR SQUATS", reps: "15" }] }
        ]
    },
    {
        title: "STRENGTH & SWEAT",
        blocks: [
            { title: "FRONT SQUAT", format: "LIBRE", exercises: [{ name: "FRONT SQUAT", reps: "5x3", detail: "Heavy 85%" }] },
            { title: "METCON", format: "AMRAP", result: { rounds: "5" }, exercises: [{ name: "WALL BALL", reps: "20" }, { name: "KETTLEBELL SWING", reps: "20", detail: "24kg" }] }
        ]
    }
];

function randomDate(daysBack = 30) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
    d.setHours(d.getHours() - Math.floor(Math.random() * 12));
    return d.toISOString();
}

function getRandomElements(arr, num) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

async function enhance() {
    console.log("Starting DB Enhancement for Fictitious Users...");

    // 1. Get all fake users to have their Profile IDs
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', [
            "alessia_fit", "john_strong", "camila.wod", "lukas_lifts", "juju_fit",
            "hiroki_jp", "elena_v", "mateo_garcia", "sara.kim", "david_osei",
            "emily_chen", "omar.rx", "sophie.fit", "kofi_moves", "mia_gym",
            "noah.j", "isa.martinez", "tariq_strong", "chloe._", "carlos_m"
        ]);

    if (profileErr || !profiles || profiles.length === 0) {
        console.error("Could not fetch fake user profiles", profileErr);
        return;
    }

    const userIds = profiles.map(p => p.id);
    console.log(`Found ${userIds.length} fake users.`);

    // 2. Create high-quality interactions: FOLLOWS
    console.log("Adding extensive follows...");
    for (const user of profiles) {
        const others = profiles.filter(p => p.id !== user.id);
        const followsToCreate = getRandomElements(others, Math.floor(Math.random() * 8) + 7); // 7 to 14 follows

        for (const target of followsToCreate) {
            // Use upsert to avoid duplicate errors, or try catch
            await supabase.from('follows').upsert(
                { follower_id: user.id, following_id: target.id },
                { onConflict: 'follower_id, following_id' }
            );
        }
    }

    // 3. Create High-Quality NEW posts
    console.log("Adding new high quality posts...");
    const newPosts = [];
    for (const user of profiles) {
        const numNewPosts = Math.floor(Math.random() * 3) + 2; // 2 to 4 posts each

        for (let i = 0; i < numNewPosts; i++) {
            const isWod = Math.random() > 0.4; // 60% chance WOD
            const caption = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
            const date = randomDate();

            let postDef = {
                user_id: user.id,
                caption: caption,
                created_at: date
            };

            if (isWod) {
                const wod = REAL_WORKOUTS[Math.floor(Math.random() * REAL_WORKOUTS.length)];
                postDef.media_type = 'wod';
                postDef.media_url = JSON.stringify(wod);
            } else {
                const img = PREMIUM_IMAGES[Math.floor(Math.random() * PREMIUM_IMAGES.length)];
                postDef.media_type = 'image';
                postDef.media_url = img;
            }

            const { data: insertedPost, error: err } = await supabase.from('posts').insert(postDef).select('id').single();
            if (insertedPost) {
                newPosts.push(insertedPost.id);
            }
        }
    }

    // 4. Fetch ALL posts from these fake users (old + new) to spam likes and comments
    console.log("Fetching all fake user posts to add interactions...");
    const { data: allFakePosts } = await supabase
        .from('posts')
        .select('id, user_id')
        .in('user_id', userIds);

    if (allFakePosts) {
        console.log(`Found ${allFakePosts.length} posts to interact with.`);
        for (const post of allFakePosts) {

            const others = profiles.filter(p => p.id !== post.user_id);

            // Add LIKES (5-15 likes per post!)
            const likers = getRandomElements(others, Math.floor(Math.random() * 11) + 5);
            for (const liker of likers) {
                await supabase.from('likes').upsert(
                    { user_id: liker.id, post_id: post.id },
                    { onConflict: 'user_id, post_id' }
                );
            }

            // Add COMMENTS (1-4 comments per post)
            const commenters = getRandomElements(others, Math.floor(Math.random() * 4) + 1);
            for (const commenter of commenters) {
                const commentText = COMMENTS_DB[Math.floor(Math.random() * COMMENTS_DB.length)];
                const { error: ce } = await supabase.from('comments').insert({
                    post_id: post.id,
                    user_id: commenter.id,
                    content: commentText,
                    created_at: randomDate(7) // recent comment
                });

                // If comments table does not exist or fails, just ignore
                if (ce) {
                    // console.error("Comment error (maybe comments table doesn't exist?):", ce.message);
                }
            }
        }
    }

    console.log("Enhancement complete! Fake users are now hyper-realistic.");
}

enhance().catch(console.error);
