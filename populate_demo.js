const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ORG_ID = '36117009-b263-4cb2-bdd5-dfc8344d549f';
const CENTER_ID = '993edb6b-a081-49c9-bca8-57955498e55e'; // Chosen as primary

async function populateDemo() {
    console.log("🚀 Starting Demo Population...");

    // 1. Update Organization
    console.log("Updating organization info...");
    await supabase.from('organizations').update({
        name: 'Rival Fit Performance Lab',
        bio: 'El centro de alto rendimiento líder en Madrid. Entrenamiento funcional, CrossFit y programación personalizada impulsada por IA. Únete a la élite.',
        address: 'Calle del Entrenamiento 42',
        city: 'Madrid',
        website: 'https://rival.fit',
        instagram: '@rival.fit_demo',
        is_public: true,
        logo_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&h=200&auto=format&fit=crop',
        cover_photo_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1600&h=600&auto=format&fit=crop'
    }).eq('id', ORG_ID);

    // 2. Add Memberships
    console.log("Adding memberships...");
    const membershipData = [
        { organization_id: ORG_ID, name: 'Basic Warrior', price: 49.90, description: '3 sesiones por semana, acceso a app básica.', duration_months: 1, stays_count: 12, features: ['3 clases/semana', 'App móvil', 'Seguimiento WOD'] },
        { organization_id: ORG_ID, name: 'Elite Rival', price: 89.90, description: 'Sesiones ilimitadas, acceso 24/7 y coach personal.', duration_months: 1, stays_count: 999, features: ['Ilimitado', 'Acceso 24/7', 'Nutrición básica', 'Prioridad reservas'] },
        { organization_id: ORG_ID, name: 'Performance Max', price: 149.00, description: 'Entrenamiento personal 1-on-1 y nutrición avanzada.', duration_months: 1, stays_count: 8, features: ['2 PT sesiones/mes', 'Ilimitado', 'Plan nutrición PRO', 'Test lactato'] }
    ];
    await supabase.from('memberships').insert(membershipData);

    // 3. Add Members (Fake athletes)
    console.log("Adding fake members...");
    const memberData = [
        { center_id: CENTER_ID, full_name: 'Carlos Rodríguez', email: 'carlos@demo.com', plan: 'Elite Rival', status: 'active', membership_start_date: '2024-01-01', phone: '+34 600 111 222', city: 'Madrid' },
        { center_id: CENTER_ID, full_name: 'Elena García', email: 'elena@demo.com', plan: 'Elite Rival', status: 'active', membership_start_date: '2024-02-15', phone: '+34 600 333 444', city: 'Madrid' },
        { center_id: CENTER_ID, full_name: 'Marco Polo', email: 'marco@demo.com', plan: 'Basic Warrior', status: 'active', membership_start_date: '2024-03-01', phone: '+34 600 555 666', city: 'Madrid' },
        { center_id: CENTER_ID, full_name: 'Lucía Serrat', email: 'lucia@demo.com', plan: 'Performance Max', status: 'active', membership_start_date: '2024-01-20', phone: '+34 600 777 888', city: 'Madrid' },
        { center_id: CENTER_ID, full_name: 'Santi Giménez', email: 'santi@demo.com', plan: 'Elite Rival', status: 'active', membership_start_date: '2024-02-01', phone: '+34 600 999 000', city: 'Madrid' }
    ];
    await supabase.from('members').insert(memberData);

    // 4. Add Classes (Weekly schedule)
    console.log("Adding weekly schedule...");
    const classData = [
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'WOD CrossFit', coach_name: 'Coach Alex', day_of_week: 'Monday', time: '08:00:00', duration_minutes: 60, capacity: 15, emoji: '🏋️‍♂️', class_type: 'crossfit' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'WOD CrossFit', coach_name: 'Coach Alex', day_of_week: 'Monday', time: '18:00:00', duration_minutes: 60, capacity: 15, emoji: '🏋️‍♂️', class_type: 'crossfit' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Mobilidad Pro', coach_name: 'Sara Flow', day_of_week: 'Tuesday', time: '10:00:00', duration_minutes: 45, capacity: 20, emoji: '🧘‍♀️', class_type: 'yoga' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Halterofilia', coach_name: 'Marc Power', day_of_week: 'Wednesday', time: '19:00:00', duration_minutes: 75, capacity: 10, emoji: '⚡', class_type: 'weightlifting' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Team Workout', coach_name: 'Coach Alex', day_of_week: 'Saturday', time: '11:00:00', duration_minutes: 90, capacity: 30, emoji: '🤜', class_type: 'team' }
    ];
    await supabase.from('classes').insert(classData);

    // 5. Add Products to Store
    console.log("Adding store products...");
    const productData = [
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Camiseta Rival Fit - Carbon Edition', price: 25.00, stock_quantity: 50, category: 'merch', image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400&h=400&auto=format&fit=crop' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Proteína Whey - Vainilla Bourbon', price: 45.00, stock_quantity: 20, category: 'supplements', image_url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=400&h=400&auto=format&fit=crop' }
    ];
    await supabase.from('center_products').insert(productData);

    console.log("✅ Demo Population Complete!");
}

populateDemo().catch(console.error);
