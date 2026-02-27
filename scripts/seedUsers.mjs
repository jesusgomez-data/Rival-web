import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';

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

const FAKE_USERS = [
    { name: "Alessia Romano", username: "alessia_fit", email: "fake_alessia@example.com", avatar: "women/44", country: "IT", bio: "Crossfit enthusiast. Milan 🇮🇹", level: 8, xp: 8500 },
    { name: "John Miller", username: "john_strong", email: "fake_johnm@example.com", avatar: "men/22", country: "US", bio: "Lifting heavy and eating well. 🇺🇸", level: 12, xp: 12400 },
    { name: "Camila Silva", username: "camila.wod", email: "fake_camila@example.com", avatar: "women/25", country: "BR", bio: "Rio de Janeiro 🌴 WOD addict", level: 5, xp: 5200 },
    { name: "Lukas Weber", username: "lukas_lifts", email: "fake_lukas@example.com", avatar: "men/45", country: "DE", bio: "Berlin. Always grinding.", level: 15, xp: 20000 },
    { name: "Juliette Dubois", username: "juju_fit", email: "fake_juju@example.com", avatar: "women/68", country: "FR", bio: "Trainer @ Paris 👊", level: 9, xp: 9500 },
    { name: "Hiroki Tanaka", username: "hiroki_jp", email: "fake_hiroki@example.com", avatar: "men/65", country: "JP", bio: "Marathon runner and hybrid athlete.", level: 18, xp: 23000 },
    { name: "Elena Volkov", username: "elena_v", email: "fake_elena@example.com", avatar: "women/12", country: "RU", bio: "Powerlifting 🏋️‍♀️", level: 7, xp: 7100 },
    { name: "Mateo Garcia", username: "mateo_garcia", email: "fake_mateo@example.com", avatar: "men/32", country: "ES", bio: "Madrid. Fitness is life!", level: 6, xp: 6000 },
    { name: "Sara Kim", username: "sara.kim", email: "fake_sara@example.com", avatar: "women/34", country: "KR", bio: "Seoul running club. 🏃‍♀️", level: 4, xp: 4000 },
    { name: "David Osei", username: "david_osei", email: "fake_david@example.com", avatar: "men/11", country: "GH", bio: "Calisthenics & strength.", level: 11, xp: 11800 },
    { name: "Emily Chen", username: "emily_chen", email: "fake_emily@example.com", avatar: "women/76", country: "CA", bio: "Toronto. Pilates and CrossFit.", level: 10, xp: 10500 },
    { name: "Omar Farooq", username: "omar.rx", email: "fake_omar@example.com", avatar: "men/85", country: "AE", bio: "Dubai Fit ☀️", level: 14, xp: 15300 },
    { name: "Sophie Van Der Berg", username: "sophie.fit", email: "fake_sophie@example.com", avatar: "women/54", country: "NL", bio: "Cycling and lifting. 🇳🇱", level: 8, xp: 8200 },
    { name: "Kofi Mensah", username: "kofi_moves", email: "fake_kofi@example.com", avatar: "men/33", country: "UK", bio: "London. Bodybuilding 🦾", level: 16, xp: 21500 },
    { name: "Mia Rossi", username: "mia_gym", email: "fake_mia@example.com", avatar: "women/90", country: "IT", bio: "Rome. Gym lover.", level: 3, xp: 3000 },
    { name: "Noah Jensen", username: "noah.j", email: "fake_noah@example.com", avatar: "men/1", country: "DK", bio: "Copenhagen. Cold plunges and kettlebells.", level: 19, xp: 25000 },
    { name: "Isabella Martinez", username: "isa.martinez", email: "fake_isa@example.com", avatar: "women/11", country: "MX", bio: "CDMX. Amo entrenar fuerte 🔥", level: 7, xp: 7800 },
    { name: "Tariq Ali", username: "tariq_strong", email: "fake_tariq@example.com", avatar: "men/52", country: "EG", bio: "Cairo. Olympic Weightlifting.", level: 13, xp: 14000 },
    { name: "Chloe Smith", username: "chloe._", email: "fake_chloe@example.com", avatar: "women/60", country: "AU", bio: "Sydney. Surf & Turf workout.", level: 5, xp: 5500 },
    { name: "Carlos Mendoza", username: "carlos_m", email: "fake_carlos@example.com", avatar: "men/40", country: "AR", bio: "Buenos Aires. Nunca un día de descanso.", level: 9, xp: 9900 },
];

const WORKOUT_COMMENTS = [
    "Great session today, felt strong! 💪",
    "Fue un WOD muy duro pero se logró! 💦",
    "Hardest workout of the week by far. My legs are dead.",
    "Entreno brutal. Siempre empujando los límites!",
    "Amazing pump!",
    "Trop difficile aujourd'hui mais on l'a fait 🇫🇷🔥",
    "Feeling the burn! Great energy at the box today.",
    "Amo empezar el día con este nivel de intensidad.",
    "Not my best time, but happy I finished.",
    "Best way to relieve stress 💯"
];

const WOD_EXAMPLES = [
    {
        title: "MURPH PREP",
        blocks: [
            { title: "WARMUP", format: "LIBRE", exercises: [{ name: "RUN", reps: "800m" }, { name: "PULL UPS", reps: "3x10" }] },
            { title: "METCON", format: "FOR TIME", result: { time: "32:15" }, exercises: [{ name: "AIR SQUAT", reps: "150" }, { name: "PUSH UP", reps: "100" }] }
        ]
    },
    {
        title: "LOWER BODY BURNER",
        blocks: [
            { title: "STRENGTH", format: "LIBRE", exercises: [{ name: "BACK SQUAT", reps: "5x5", detail: "100kg" }] },
            { title: "SWEAT", format: "AMRAP", result: { rounds: "5" }, exercises: [{ name: "BOX JUMP", reps: "15" }, { name: "WALL BALL", reps: "20" }] }
        ]
    },
    {
        title: "UPPER BODY BEAST",
        blocks: [
            { title: "BUILD", format: "LIBRE", exercises: [{ name: "BENCH PRESS", reps: "4x8", detail: "80kg" }] },
            { title: "PUMP", format: "EMOM", result: { rounds: "10" }, exercises: [{ name: "PUSH UPS", reps: "15" }, { name: "PULL UPS", reps: "10" }] }
        ]
    }
];

const IMAGES = [
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
    "https://images.unsplash.com/photo-1526506159807-1c6f08c4d70a?w=800&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
    "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80",
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80",
    "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80",
    "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=800&q=80"
];

async function seed() {
    console.log("Starting DB seeding...");

    for (let i = 0; i < FAKE_USERS.length; i++) {
        const fakeUser = FAKE_USERS[i];

        try {
            // 1. Create or get Auth User
            const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
                email: fakeUser.email,
                password: 'password123',
                email_confirm: true,
                user_metadata: {
                    full_name: fakeUser.name,
                    username: fakeUser.username
                }
            });

            const userId = user?.id;

            if (authError) {
                if (authError.message.includes("User already registered") || authError.status === 422) {
                    console.log(`User ${fakeUser.username} already exists. Skipping auth creation.`);
                    // Have to skip if already exists unless we fetch ID. Let's just catch and ignore.
                } else {
                    console.error("Auth Error:", authError);
                }
            }

            if (!userId) {
                // Fetch the existing user ID by email
                const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', fakeUser.username).single();
                if (!existingUser) continue;
                var currentUserId = existingUser.id;
            } else {
                var currentUserId = userId;
            }

            console.log(`Processing user: ${fakeUser.username} (${currentUserId})`);

            // 2. Update their profile (Supabase triggers typically create the row on sign up, so we UPDATE. If not, we upsert).
            const avatarUrl = `https://randomuser.me/api/portraits/${fakeUser.avatar}.jpg`;

            const { error: profileError } = await supabase.from('profiles').upsert({
                id: currentUserId,
                username: fakeUser.username,
                full_name: fakeUser.name,
                avatar_url: avatarUrl,
                level: fakeUser.level,
                xp_points: fakeUser.xp,
                bio: fakeUser.bio,
                is_official: false
            });

            if (profileError) console.error(`Profile Error for ${fakeUser.username}:`, profileError);

            // 3. Create 1-2 posts for this user
            const numPosts = Math.floor(Math.random() * 2) + 1; // 1 or 2 posts

            for (let j = 0; j < numPosts; j++) {
                const isWod = Math.random() > 0.4; // 60% chance to be a WOD post, 40% Image post
                const postText = WORKOUT_COMMENTS[Math.floor(Math.random() * WORKOUT_COMMENTS.length)];
                const likes = Math.floor(Math.random() * 45) + 5;
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 10)); // Post from last 10 days

                if (isWod) {
                    const wod = WOD_EXAMPLES[Math.floor(Math.random() * WOD_EXAMPLES.length)];
                    const { error: error1 } = await supabase.from('posts').insert({
                        user_id: currentUserId,
                        caption: postText,
                        media_type: 'wod',
                        media_url: JSON.stringify(wod), // Emulating the image column stringified format
                        likes_count: likes,
                        created_at: pastDate.toISOString()
                    });
                    if (error1) console.error(error1);
                } else {
                    const img = IMAGES[Math.floor(Math.random() * IMAGES.length)];
                    const { error: error2 } = await supabase.from('posts').insert({
                        user_id: currentUserId,
                        caption: postText,
                        media_type: 'image',
                        media_url: img,
                        likes_count: likes,
                        created_at: pastDate.toISOString()
                    });
                    if (error2) console.error(error2);
                }
            }

            console.log(`✅ Success for ${fakeUser.username}`);
        } catch (e) {
            console.error(`Exception with ${fakeUser.username}:`, e);
        }
    }

    console.log("Seeding complete!");
}

seed();
