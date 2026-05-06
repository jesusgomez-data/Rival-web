
import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ORG_ID = 'd1f010aa-628c-4296-bfb1-71c5de4105a1';
const CENTER_ID = 'aebf33d6-e481-4d4d-aa3c-33e63e4edf64';
const OWNER_ID = '0ca3976e-0c51-47ec-9998-004801a2629e';

const NAMES = [
    'Alejandro García', 'Lucía Martínez', 'Javier López', 'Marta Sánchez', 
    'Pablo Rodríguez', 'Sara Fernández', 'Diego Pérez', 'Elena Gómez',
    'Marcos Ruiz', 'Alba Torres', 'Adrián Navarro', 'Sofía Ramos',
    'Hugo Gil', 'Claudia Serrat', 'Daniel Expósito', 'Noa Blanch'
];

const PLANS = ['Rival Starter', 'Rival Pro', 'Elite Performance', 'Unlimited Warrior'];
const SPORTS = ['Cross Training', 'Weightlifting', 'Open Box', 'HIIT', 'Yoga'];

async function seed() {
    const supabase = createAdminClient();
    console.log("🚀 Starting seed for Rival Madrid...");

    // 0. Rename Center to match Branding
    await supabase.from('centers').update({ name: 'Rival Madrid - Central' }).eq('id', CENTER_ID);

    // 1. Members
    console.log("👥 Creating members...");
    const membersData = NAMES.map((name, i) => {
        const joinedDate = new Date(Date.now() - (60 + i) * 24 * 60 * 60 * 1000);
        return {
            center_id: ORG_ID,
            full_name: name,
            email: `user${i}@example.com`,
            phone: `+34 600 000 ${100 + i}`,
            status: 'active',
            plan: PLANS[i % PLANS.length],
            membership_start_date: joinedDate.toISOString(),
            created_at: joinedDate.toISOString(),
            updated_at: joinedDate.toISOString(),
            payment_method: i % 2 === 0 ? 'card' : 'cash'
        };
    });

    const { data: members, error: mError } = await supabase
        .from('members')
        .insert(membersData)
        .select();

    if (mError) {
        console.error("Error creating members:", mError);
        return;
    }
    console.log(`✅ Created ${members.length} members`);

    // 2. Classes (Schedule)
    console.log("📅 Creating schedule...");
    const hourOffsets = [8, 10, 12, 17, 19, 20];
    const classesToInsert: any[] = [];

    const now = new Date();
    const currentDay = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    monday.setHours(0,0,0,0);

    for (let d = -7; d < 7; d++) { // Last week and this week
        const date = new Date(monday);
        date.setDate(monday.getDate() + d);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
        
        for (let i = 0; i < 3; i++) {
            const scheduledTime = new Date(date);
            scheduledTime.setHours(hourOffsets[i], 0, 0, 0);
            
            const hours = String(scheduledTime.getUTCHours()).padStart(2, '0');
            const minutes = String(scheduledTime.getUTCMinutes()).padStart(2, '0');
            const timeString = `${hours}:${minutes}:00`;

            classesToInsert.push({
                organization_id: ORG_ID,
                center_id: CENTER_ID,
                name: SPORTS[Math.floor(Math.random() * SPORTS.length)],
                description: 'Sesión de entrenamiento intensa para mejorar tu rendimiento.',
                day_of_week: dayName,
                time: timeString,
                scheduled_time: scheduledTime.toISOString(),
                capacity: 20,
                max_capacity: 20,
                duration_minutes: 60,
                coach_id: OWNER_ID,
                class_type: 'general',
                difficulty: 'intermediate'
            });
        }
    }

    const { data: classes, error: cError } = await supabase
        .from('classes')
        .insert(classesToInsert)
        .select();

    if (cError) {
        console.error("Error creating classes:", cError);
    } else {
        console.log(`✅ Created ${classes.length} classes`);
    }

    // 3. Enrollments (Bookings)
    if (members && members.length > 0 && classes && classes.length > 0) {
        console.log("🎟️ Creating bookings...");
        const enrollments: any[] = [];
        classes.forEach(cls => {
            const numParticipants = 5 + Math.floor(Math.random() * 8);
            const shuffledMembers = [...members].sort(() => 0.5 - Math.random());
            for (let i = 0; i < Math.min(numParticipants, members.length); i++) {
                enrollments.push({
                    class_id: cls.id,
                    member_id: shuffledMembers[i].id,
                    attended: new Date(cls.scheduled_time) < new Date(),
                    enrollment_date: new Date(cls.scheduled_time).toISOString()
                });
            }
        });

        const { error: eError } = await supabase.from('class_enrollments').insert(enrollments);
        if (eError) console.error("Error creating enrollments:", eError);
        else console.log(`✅ Created ${enrollments.length} bookings`);
    }

    // 4. Team Messages
    console.log("💬 Creating team messages...");
    const messagesData = [
        { content: "¡Bienvenidos al dashboard de Rival Madrid! 🚀", as_org: true },
        { content: "Recordatorio: El fin de semana tenemos el evento de comunidad.", as_org: true },
        { content: "¿Alguien puede cubrir la clase de las 10:00 el jueves?", as_org: false },
        { content: "Yo puedo @Jesus.", as_org: false },
        { content: "Perfecto, ya te lo he asignado en el calendario.", as_org: true },
    ].map(m => ({
        organization_id: ORG_ID,
        user_id: OWNER_ID,
        content: m.content,
        as_org: m.as_org,
        created_at: new Date().toISOString()
    }));

    await supabase.from('team_messages').insert(messagesData);

    // 5. Sales (Simplified for Analytics compatibility)
    // Analytics actions seems to expect organization_id in 'sales', but error said it was missing.
    // Let's re-verify analytics search. If it fails, I'll use center_id.
    console.log("💰 Creating sales history...");
    const salesData: any[] = [];
    for (let m = 0; m < 6; m++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
        for (let s = 0; s < 8; s++) {
            const saleDate = new Date(monthStart);
            saleDate.setDate(1 + Math.floor(Math.random() * 25));
            salesData.push({
                center_id: CENTER_ID, // Use center_id since organization_id failed
                member_id: members[s % members.length].id,
                total_amount: 30 + Math.floor(Math.random() * 70),
                created_at: saleDate.toISOString(),
                payment_status: 'completed'
            });
        }
    }

    const { error: sError } = await supabase.from('sales').insert(salesData);
    if (sError) console.error("Error creating sales:", sError);
    else console.log(`✅ Created ${salesData.length} sales records`);

    // 6. WODs
    console.log("🏋️ Creating WODs...");
    const wods = [
        { title: "RIVAL MADRID OPEN", warmup: "500m Row, 2 Rounds of Cindy", summary: { scoreType: 'REPS', scoreLabel: 'TOTAL REPS', totalTime: '20:00' } },
        { title: "POWER WEDNESDAY", warmup: "Mobility + Snatch Technique", summary: { scoreType: 'WEIGHT', scoreLabel: 'MAX KG', totalTime: '30:00' } }
    ];

    const wodPosts = wods.map(wod => ({
        organization_id: ORG_ID,
        author_id: OWNER_ID,
        post_type: 'wod',
        content: JSON.stringify({
            title: wod.title,
            warmup: wod.warmup,
            blocks: [
                { id: '1', title: 'STRENGTH', content: 'Snatch 1-1-1-1-1', exercises: [] },
                { id: '2', title: 'METCON', content: '21-15-9\nSnatch (40/30kg)\nBurpees over bar', exercises: [] }
            ],
            summary: wod.summary
        }),
        scheduled_for: new Date().toISOString(),
        post_as_center: true,
        created_at: new Date().toISOString()
    }));

    await supabase.from('center_posts').insert(wodPosts);

    console.log("✨ Seed completed successfully for Rival Madrid!");
}

seed();
