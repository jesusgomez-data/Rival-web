const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const ORG_ID = '36117009-b263-4cb2-bdd5-dfc8344d549f';
const CENTER_ID = '993edb6b-a081-49c9-bca8-57955498e55e'; // Primary center

async function cleanAndRepopulate() {
    console.log('🧹 Cleaning old demo data...');

    // Delete old mismatched members (those created by old script)
    await s.from('classes').delete().eq('organization_id', ORG_ID);
    await s.from('memberships').delete().eq('organization_id', ORG_ID);
    await s.from('sales').delete().eq('organization_id', ORG_ID);
    await s.from('trial_requests').delete().eq('organization_id', ORG_ID);
    await s.from('center_products').delete().eq('organization_id', ORG_ID);
    await s.from('members').delete().in('center_id', [CENTER_ID, 'f9384db0-7aa0-4202-9c36-056d5459aed7']);

    console.log('✅ Cleaned. Now inserting fresh demo data...');

    // 1. Update Org profile
    await s.from('organizations').update({
        name: 'Rival Fit Performance Lab',
        bio: 'Centro de alto rendimiento líder en Madrid. Entrenamiento funcional, CrossFit y programación personalizada. Únete a la élite.',
        address: 'Calle del Entrenamiento 42',
        city: 'Madrid',
        country: 'Spain',
        phone: '+34 910 123 456',
        website: 'https://rival.fit',
        instagram: '@rivalfit',
        is_public: true,
        verified: true,
        plan: 'pro',
        logo_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=200&h=200&auto=format&fit=crop',
        cover_photo_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1400&auto=format&fit=crop'
    }).eq('id', ORG_ID);
    console.log('✅ Org profile updated');

    // 2. Update Primary Center profile  
    await s.from('centers').update({
        name: 'Rival Fit Box Madrid - Principal',
        city: 'Madrid',
        country: 'Spain',
        address: 'Calle del Entrenamiento 42',
        center_type: 'crossfit',
        status: 'active',
        plan: 'pro',
        logo_url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=200&h=200&auto=format&fit=crop'
    }).eq('id', CENTER_ID);
    console.log('✅ Center profile updated');

    // 3. Memberships
    const { error: memErr } = await s.from('memberships').insert([
        { organization_id: ORG_ID, name: 'Basic Warrior', price: 49.90, description: '3 sesiones por semana. Acceso a la app y seguimiento de WODs.', duration_months: 1 },
        { organization_id: ORG_ID, name: 'Elite Rival', price: 89.90, description: 'Sesiones ilimitadas, acceso 24/7 y análisis de rendimiento avanzado.', duration_months: 1 },
        { organization_id: ORG_ID, name: 'Performance MAX', price: 149.00, description: '2 sesiones de PT/mes + ilimitado + plan de nutrición personalizado.', duration_months: 1 }
    ]);
    if (memErr) console.error('Membership error:', memErr.message); else console.log('✅ Memberships created');

    // 4. Members (joined across different months)
    const now = new Date();
    const mo = (months) => new Date(now.getFullYear(), now.getMonth() - months, 15).toISOString();

    const { error: mErr } = await s.from('members').insert([
        { center_id: CENTER_ID, full_name: 'Carlos Rodríguez', email: 'carlos@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(5), phone: '+34 600 111 222' },
        { center_id: CENTER_ID, full_name: 'Elena García', email: 'elena@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(4), phone: '+34 600 333 444' },
        { center_id: CENTER_ID, full_name: 'Marco Fernández', email: 'marco@demobox.com', plan: 'Basic Warrior', status: 'active', membership_start_date: mo(3), phone: '+34 600 555 666' },
        { center_id: CENTER_ID, full_name: 'Lucía Serrat', email: 'lucia@demobox.com', plan: 'Performance MAX', status: 'active', membership_start_date: mo(3), phone: '+34 600 777 888' },
        { center_id: CENTER_ID, full_name: 'Santi Gómez', email: 'santi@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(2), phone: '+34 600 999 000' },
        { center_id: CENTER_ID, full_name: 'Ana Martínez', email: 'ana@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(2), phone: '+34 611 222 333' },
        { center_id: CENTER_ID, full_name: 'David Pérez', email: 'david@demobox.com', plan: 'Basic Warrior', status: 'active', membership_start_date: mo(1), phone: '+34 622 333 444' },
        { center_id: CENTER_ID, full_name: 'Sofía Torres', email: 'sofia@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(1), phone: '+34 633 444 555' },
        { center_id: CENTER_ID, full_name: 'Rubén Castro', email: 'ruben@demobox.com', plan: 'Performance MAX', status: 'active', membership_start_date: mo(1), phone: '+34 644 555 666' },
        { center_id: CENTER_ID, full_name: 'Marta López', email: 'marta@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(0), phone: '+34 655 666 777' },
        { center_id: CENTER_ID, full_name: 'Jorge Navarro', email: 'jorge@demobox.com', plan: 'Basic Warrior', status: 'active', membership_start_date: mo(0), phone: '+34 666 777 888' },
        { center_id: CENTER_ID, full_name: 'Patricia Villa', email: 'patricia@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(0), phone: '+34 677 888 999' },
        { center_id: CENTER_ID, full_name: 'Tomás Hierro', email: 'tomas@demobox.com', plan: 'Basic Warrior', status: 'inactive', membership_start_date: mo(4), phone: '+34 688 999 000' }
    ]);
    if (mErr) console.error('Members error:', mErr.message); else console.log('✅ 13 Demo members created');

    // 5. Classes (weekly schedule)
    const { error: cErr } = await s.from('classes').insert([
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'WOD CrossFit AM', coach_name: 'Alex Ruiz', day_of_week: 'Monday', time: '07:00:00', duration_minutes: 60, capacity: 16, max_capacity: 16, emoji: '🏋️', class_type: 'crossfit', status: 'active' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'WOD CrossFit PM', coach_name: 'Alex Ruiz', day_of_week: 'Monday', time: '18:30:00', duration_minutes: 60, capacity: 18, max_capacity: 18, emoji: '🏋️', class_type: 'crossfit', status: 'active' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Open Box', coach_name: 'Self-guided', day_of_week: 'Tuesday', time: '09:00:00', duration_minutes: 90, capacity: 20, max_capacity: 20, emoji: '🔓', class_type: 'open', status: 'active' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Halterofilia', coach_name: 'Marc Bosch', day_of_week: 'Wednesday', time: '19:00:00', duration_minutes: 75, capacity: 10, max_capacity: 10, emoji: '⚡', class_type: 'weightlifting', status: 'active' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Mobilidad & Recovery', coach_name: 'Sara Flow', day_of_week: 'Thursday', time: '10:00:00', duration_minutes: 45, capacity: 20, max_capacity: 20, emoji: '🧘', class_type: 'mobility', status: 'active' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'WOD CrossFit PM', coach_name: 'Alex Ruiz', day_of_week: 'Thursday', time: '18:30:00', duration_minutes: 60, capacity: 18, max_capacity: 18, emoji: '🏋️', class_type: 'crossfit', status: 'active' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Benchmark Friday', coach_name: 'Alex Ruiz', day_of_week: 'Friday', time: '18:00:00', duration_minutes: 75, capacity: 20, max_capacity: 20, emoji: '📊', class_type: 'benchmark', status: 'active' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Team WOD Sábado', coach_name: 'Alex Ruiz', day_of_week: 'Saturday', time: '10:00:00', duration_minutes: 90, capacity: 30, max_capacity: 30, emoji: '🤜', class_type: 'team', status: 'active' }
    ]);
    if (cErr) console.error('Classes error:', cErr.message); else console.log('✅ 8 Classes created');

    // 6. Products
    const { error: pErr } = await s.from('center_products').insert([
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Camiseta Rival — Carbon Edition', price: 29.90, stock_quantity: 35, category: 'merch', is_active: true, image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400&auto=format&fit=crop' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Proteína Whey Premium — Vainilla', price: 49.00, stock_quantity: 18, category: 'supplements', is_active: true, image_url: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=400&auto=format&fit=crop' },
        { organization_id: ORG_ID, center_id: CENTER_ID, name: 'Jump Rope Speed RX', price: 39.00, stock_quantity: 10, category: 'equipment', is_active: true, image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=400&auto=format&fit=crop' }
    ]);
    if (pErr) console.error('Products error:', pErr.message); else console.log('✅ 3 Products created');

    // 7. Sales history (last 5 months)
    const salesData = [];
    for (let i = 1; i <= 5; i++) {
        const monthd = new Date(now.getFullYear(), now.getMonth() - i, 10 + i);
        const count = 4 + i;
        for (let j = 0; j < count; j++) {
            const amounts = [29.90, 49.00, 39.00];
            const amt = amounts[j % 3];
            salesData.push({
                organization_id: ORG_ID,
                center_id: CENTER_ID,
                total_amount: amt,
                payment_status: 'completed',
                created_at: new Date(monthd.getTime() + j * 86400000 * 2).toISOString()
            });
        }
    }
    const { error: sErr } = await s.from('sales').insert(salesData);
    if (sErr) console.error('Sales error:', sErr.message); else console.log(`✅ ${salesData.length} historical sales created`);

    // 8. Trial requests
    const { error: tErr } = await s.from('trial_requests').insert([
        { organization_id: ORG_ID, center_id: CENTER_ID, full_name: 'Roberto Blanco', email: 'roberto@prospect.com', status: 'pending', created_at: new Date().toISOString() },
        { organization_id: ORG_ID, center_id: CENTER_ID, full_name: 'Sara Mínguez', email: 'sara@prospect.com', status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString() },
        { organization_id: ORG_ID, center_id: CENTER_ID, full_name: 'Iván Suárez', email: 'ivan@prospect.com', status: 'contacted', created_at: new Date(Date.now() - 172800000).toISOString() }
    ]);
    if (tErr) console.error('Trials error:', tErr.message); else console.log('✅ 3 Trial requests created');

    console.log('\n🎯 DONE! Demo center fully populated.');
    console.log('ORG ID:', ORG_ID);
    console.log('Dashboard: http://localhost:3000/dashboard/gyms/' + ORG_ID);
}

cleanAndRepopulate().catch(console.error);
