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

const FAKE_TRAINERS = [
    {
        name: "Coach Marcos Elite",
        username: "marcos_coach",
        email: "coach.marcos@example.com",
        avatar: "men/80",
        bio: "Especialista en Fuerza y CrossFit. Transformando vidas en Madrid. Preparador de atletas híbridos.",
        city: "Madrid",
        country: "España",
        address: "Calle de Alcalá 12",
        zip: "28014",
        ig: "@coach_marcos_elite",
        lat: 40.4168,
        lng: -3.7038,
        cover: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80"
    },
    {
        name: "Laura FitStudio",
        username: "laura_trainer",
        email: "laura.fit@example.com",
        avatar: "women/45",
        bio: "Entrenadora Personal y Nutricionista. Enfocada en la recomposición corporal y entrenamiento funcional.",
        city: "Barcelona",
        country: "España",
        address: "Carrer de Balmes 50",
        zip: "08007",
        ig: "@laura_fitstudio",
        lat: 41.3879,
        lng: 2.1699,
        cover: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80"
    },
    {
        name: "Hugo Power Training",
        username: "hugo_pt",
        email: "hugo.power@example.com",
        avatar: "men/33",
        bio: "Entrenador de Powerlifting. Si quieres estar fuerte, yo te enseño el camino. Valencia.",
        city: "Valencia",
        country: "España",
        address: "Avinguda del Cid 15",
        zip: "46018",
        ig: "@hugo_powering",
        lat: 39.4699,
        lng: -0.3774,
        cover: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80"
    },
    {
        name: "Sofia Wellness & Shape",
        username: "sofi_wellness",
        email: "sofia.wellness@example.com",
        avatar: "women/61",
        bio: "Entrenamiento personalizado online y presencial. Mejora tu movilidad, fuerza y hábitos diarios.",
        city: "Sevilla",
        country: "España",
        address: "Avenida de la Constitución 10",
        zip: "41004",
        ig: "@sofi_shape",
        lat: 37.3891,
        lng: -5.9845,
        cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80"
    }
];

async function seedTrainers() {
    console.log("Starting Personal Trainers Seeding...");

    for (const trainer of FAKE_TRAINERS) {
        try {
            console.log(`Processing Trainer: ${trainer.name}`);

            let userId = null;

            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: trainer.email,
                password: 'password123',
                email_confirm: true,
                user_metadata: {
                    full_name: trainer.name,
                    username: trainer.username
                }
            });

            if (authError && authError.status !== 422 && !authError.message.includes("already registered")) {
                console.error("Auth Error:", authError);
                continue;
            }

            if (authData?.user?.id) {
                userId = authData.user.id;
            } else {
                // Try fetching existing
                const { data: extUserMap } = await supabase.auth.admin.listUsers();
                const u = extUserMap?.users?.find(u => u.email === trainer.email);
                if (u) userId = u.id;
            }

            if (!userId) {
                console.log(`Could not get absolute user ID for ${trainer.email}`);
                continue;
            }

            // 2. Profile Creation/Update (Trigger might have fired or not, so we upsert)
            const avatarUrl = `https://randomuser.me/api/portraits/${trainer.avatar}.jpg`;
            await supabase.from('profiles').upsert({
                id: userId,
                username: trainer.username,
                full_name: trainer.name,
                avatar_url: avatarUrl,
                bio: trainer.bio,
                level: 15, // Make them look experienced
                xp_points: 15000,
                is_official: false
            });

            // 3. Create the Organization (center_type = 'personal_trainer')
            // Drop any existing just in case or select
            const { data: existingOrg } = await supabase.from('organizations').select('id').eq('owner_id', userId).eq('center_type', 'personal_trainer').single();

            let orgId = existingOrg?.id;

            if (!orgId) {
                const { data: org, error: orgError } = await supabase.from('organizations').insert({
                    name: trainer.name,
                    email: trainer.email,
                    center_type: 'personal_trainer',
                    country: trainer.country,
                    city: trainer.city,
                    address: trainer.address,
                    phone: "+34 600 000 000",
                    website: trainer.ig,
                    plan: 'starter',
                    verified: true,
                    is_public: true,
                    owner_id: userId,
                    logo_url: avatarUrl,
                    cover_photo_url: trainer.cover,
                    bio: trainer.bio,
                    member_count: Math.floor(Math.random() * 20) + 5,
                    latitude: trainer.lat,
                    longitude: trainer.lng
                }).select().single();

                if (orgError) {
                    console.error("Error creating org:", orgError);
                    continue;
                }
                orgId = org.id;

                // 4. Role Assignment
                await supabase.from('center_roles').insert({
                    organization_id: orgId,
                    user_id: userId,
                    role: 'owner',
                    permissions: ['manage_classes', 'see_analytics', 'manage_billing']
                });
            }

            console.log(`✅ Success for Trainer ${trainer.name} (${orgId})`);

        } catch (e) {
            console.error(`Exception with ${trainer.name}:`, e);
        }
    }

    console.log("Personal Trainers seeded successfully!");
}

seedTrainers().catch(console.error);
