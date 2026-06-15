import { createAdminClient } from './utils/supabase/admin';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ORG_ID = 'd1f010aa-628c-4296-bfb1-71c5de4105a1';
const CENTER_ID = 'aebf33d6-e481-4d4d-aa3c-33e63e4edf64';
const OWNER_ID = '0ca3976e-0c51-47ec-9998-004801a2629e';

async function seedAll() {
    const supabase = createAdminClient();
    console.log("🚀 Seeding all data for Rival Madrid...");

    // 1. Rename organization and center
    await supabase.from('organizations').update({
        name: 'Rival Madrid',
        bio: 'El centro de entrenamiento más avanzado de Madrid. En Rival Madrid fusionamos la tecnología con el rendimiento físico de élite. Instalaciones de primer nivel, coaches de primer nivel y una comunidad imparable.',
        cover_photo_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=2000"
    }).eq('id', ORG_ID);

    await supabase.from('centers').update({
        name: 'Rival Madrid - Central',
        address: 'Calle del Trueno, 4, Madrid, España',
        city: 'Madrid',
        country: 'España',
        phone: '+34 910 223 344',
        email: 'madrid@rivalfit.com'
    }).eq('id', CENTER_ID);

    // 2. Clear previous membership plans, products, center posts
    await supabase.from('membership_plans').delete().eq('organization_id', ORG_ID);
    await supabase.from('center_products').delete().eq('organization_id', ORG_ID);
    await supabase.from('center_posts').delete().eq('organization_id', ORG_ID);

    // 3. Create Membership Plans
    const plans = [
        {
            organization_id: ORG_ID,
            name: 'Rival Starter',
            description: 'Acceso de 3 días a la semana a clases dirigidas y open box.',
            price: 55,
            duration_months: 1,
            features: ['3 clases por semana', 'Acceso a Open Box', 'Seguimiento por App', 'Duchas y vestuarios'],
            is_active: true
        },
        {
            organization_id: ORG_ID,
            name: 'Rival Unlimited',
            description: 'Acceso ilimitado a todas nuestras clases, open box y entrenamientos.',
            price: 75,
            duration_months: 1,
            features: ['Clases ilimitadas', 'Acceso ilimitado a Open Box', 'Prioridad de reserva', 'Seguimiento personalizado por App', 'Bebida de cortesía semanal'],
            is_active: true
        },
        {
            organization_id: ORG_ID,
            name: 'Elite Performance',
            description: 'Acceso ilimitado más asesoramiento de nutrición y programación individualizada.',
            price: 120,
            duration_months: 1,
            features: ['Todo lo del plan Unlimited', 'Asesoría nutricional mensual', 'Programación de fuerza individualizada', 'Acceso a zona VIP de recuperación', 'Camiseta oficial Rival Fit de regalo'],
            is_active: true
        }
    ];
    await supabase.from('membership_plans').insert(plans);
    console.log("✅ Membership plans seeded!");

    // 4. Create Products
    const products = [
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            name: 'Camiseta Oficial Rival Fit',
            description: 'Camiseta técnica de alta transpirabilidad y diseño deportivo de élite.',
            price: 25,
            stock_quantity: 50,
            category: 'Clothing',
            image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600'
        },
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            name: 'Shaker Metálico Rival',
            description: 'Mezclador de acero inoxidable con aislamiento térmico de doble capa.',
            price: 18,
            stock_quantity: 30,
            category: 'Accessories',
            image_url: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&q=80&w=600'
        },
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            name: 'Proteína Whey Rival (1kg)',
            description: 'Aislado de proteína de suero de leche de máxima pureza, sabor Chocolate Belga.',
            price: 39,
            stock_quantity: 25,
            category: 'Nutrition',
            image_url: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&q=80&w=600'
        },
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            name: 'Calleras de Cuero Rival',
            description: 'Calleras de fibra de carbono y cuero para máxima protección y agarre en barra.',
            price: 22,
            stock_quantity: 40,
            category: 'Accessories',
            image_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=600'
        },
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            name: 'Bebida Energética NOCCO',
            description: 'Bebida carbonatada con BCAA, cafeína y vitaminas, sin azúcar. Sabor Limón.',
            price: 3,
            stock_quantity: 100,
            category: 'Nutrition',
            image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600'
        }
    ];
    await supabase.from('center_products').insert(products);
    console.log("✅ Products seeded!");

    // 5. Create Center Posts (Feed)
    const posts = [
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            author_id: OWNER_ID,
            post_type: 'post',
            content: '¡Ya están aquí las nuevas zonas de recuperación e hidratación en Rival Madrid! Hemos ampliado nuestras instalaciones para ofreceros lo mejor para vuestro rendimiento y salud. 💧🏋️‍♂️',
            image_urls: ['https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80&w=1000'],
            post_as_center: true,
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            scheduled_for: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            author_id: OWNER_ID,
            post_type: 'post',
            content: 'Consejo de Nutrición de la semana por nuestro Head Coach: Asegúrate de consumir suficiente proteína en las 2 horas posteriores a tus entrenamientos de alta intensidad para maximizar la reconstrucción muscular y acelerar la recuperación. 📈🍳',
            image_urls: ['https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&q=80&w=1000'],
            post_as_center: true,
            created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            scheduled_for: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            organization_id: ORG_ID,
            center_id: CENTER_ID,
            author_id: OWNER_ID,
            post_type: 'post',
            content: 'Este sábado a las 11:30 tendremos nuestro Workshop de Levantamiento Olímpico (Snatch & Clean). Abierto a todos los niveles, plazas limitadas a 15 atletas. ¡Reserva en recepción o mediante la App! 🏋️‍♀️🏆',
            image_urls: ['https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&q=80&w=1000'],
            post_as_center: true,
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            scheduled_for: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    await supabase.from('center_posts').insert(posts);
    console.log("✅ Feed posts seeded!");

    // 6. Create WODs (scheduled in the past so they show on feed)
    const wods = [
        {
            title: "MURPH CHALLENGE",
            warmup: "800m jogging, 2 rounds of: 5 Pull-ups, 10 Push-ups, 15 Air Squats",
            blocks: [
                { id: '1', title: 'RUNNING', content: '1 Mile Run', exercises: [] },
                { id: '2', title: 'BODYWEIGHT', content: '100 Pull-ups\n200 Push-ups\n300 Air Squats (Partitioned as 20 rounds of 5-10-15)', exercises: [] },
                { id: '3', title: 'RUNNING', content: '1 Mile Run', exercises: [] }
            ],
            summary: { scoreType: 'TIME', scoreLabel: 'TOTAL TIME', totalTime: '60:00' }
        },
        {
            title: "OLYMPIC POWER",
            warmup: "3 rounds of: 10 PVC Pass-throughs, 5 Snatch Balance, 5 Snatch Deadlift",
            blocks: [
                { id: '1', title: 'STRENGTH', content: 'Snatch: 3-3-2-2-1-1-1 working up to heavy single', exercises: [] },
                { id: '2', title: 'AMRAP 12 MIN', content: '12 Power Snatch (45/30kg)\n12 Toes-to-Bar\n24 Double Under', exercises: [] }
            ],
            summary: { scoreType: 'REPS', scoreLabel: 'TOTAL REPS', totalTime: '12:00' }
        },
        {
            title: "HEAVY FRIDAY",
            warmup: "Mobility focus + 3 rounds of: 10 Goblet Squats, 10 Ring Rows",
            blocks: [
                { id: '1', title: 'STRENGTH', content: 'Back Squat: 5x5 at 75-80% 1RM', exercises: [] },
                { id: '2', title: 'FOR TIME (15 min Cap)', content: '50 Wall Ball (9/6kg)\n40 Box Jump Overs\n30 Kettlebell Swings (32/24kg)\n20 Handstand Push-ups\n10 Bar Muscle-ups', exercises: [] }
            ],
            summary: { scoreType: 'TIME', scoreLabel: 'COMPLETION TIME', totalTime: '15:00' }
        }
    ];

    const wodPosts = wods.map((wod, idx) => ({
        organization_id: ORG_ID,
        center_id: CENTER_ID,
        author_id: OWNER_ID,
        post_type: 'wod',
        content: JSON.stringify({
            title: wod.title,
            warmup: wod.warmup,
            blocks: wod.blocks,
            summary: wod.summary
        }),
        scheduled_for: new Date(Date.now() - (idx + 1) * 12 * 60 * 60 * 1000).toISOString(),
        post_as_center: true,
        created_at: new Date(Date.now() - (idx + 1) * 12 * 60 * 60 * 1000).toISOString()
    }));

    await supabase.from('center_posts').insert(wodPosts);
    console.log("✅ WODs seeded!");

    console.log("✨ All Rival Madrid data seeded successfully!");
}

seedAll();
