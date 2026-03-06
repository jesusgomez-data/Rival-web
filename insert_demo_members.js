const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// members.center_id is a FK to ORGANIZATIONS (not centers table!)
const ORG_ID = '36117009-b263-4cb2-bdd5-dfc8344d549f';

async function insertMembers() {
    console.log('Inserting members using ORG_ID as center_id...');

    // Delete old test member
    await s.from('members').delete().eq('full_name', 'FK Test');

    const now = new Date();
    const mo = (months) => new Date(now.getFullYear(), now.getMonth() - months, 15).toISOString().split('T')[0];

    const { data, error } = await s.from('members').insert([
        { center_id: ORG_ID, full_name: 'Carlos Rodríguez', email: 'carlos@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(5), phone: '+34 600 111 222' },
        { center_id: ORG_ID, full_name: 'Elena García', email: 'elena@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(4), phone: '+34 600 333 444' },
        { center_id: ORG_ID, full_name: 'Marco Fernández', email: 'marco@demobox.com', plan: 'Basic Warrior', status: 'active', membership_start_date: mo(3), phone: '+34 600 555 666' },
        { center_id: ORG_ID, full_name: 'Lucía Serrat', email: 'lucia@demobox.com', plan: 'Performance MAX', status: 'active', membership_start_date: mo(3), phone: '+34 600 777 888' },
        { center_id: ORG_ID, full_name: 'Santi Gómez', email: 'santi@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(2), phone: '+34 600 999 000' },
        { center_id: ORG_ID, full_name: 'Ana Martínez', email: 'ana@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(2), phone: '+34 611 222 333' },
        { center_id: ORG_ID, full_name: 'David Pérez', email: 'david@demobox.com', plan: 'Basic Warrior', status: 'active', membership_start_date: mo(1), phone: '+34 622 333 444' },
        { center_id: ORG_ID, full_name: 'Sofía Torres', email: 'sofia@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(1), phone: '+34 633 444 555' },
        { center_id: ORG_ID, full_name: 'Rubén Castro', email: 'ruben@demobox.com', plan: 'Performance MAX', status: 'active', membership_start_date: mo(1), phone: '+34 644 555 666' },
        { center_id: ORG_ID, full_name: 'Marta López', email: 'marta@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(0), phone: '+34 655 666 777' },
        { center_id: ORG_ID, full_name: 'Jorge Navarro', email: 'jorge@demobox.com', plan: 'Basic Warrior', status: 'active', membership_start_date: mo(0), phone: '+34 666 777 888' },
        { center_id: ORG_ID, full_name: 'Patricia Villa', email: 'patricia@demobox.com', plan: 'Elite Rival', status: 'active', membership_start_date: mo(0), phone: '+34 677 888 999' },
        { center_id: ORG_ID, full_name: 'Tomás Hierro', email: 'tomas@demobox.com', plan: 'Basic Warrior', status: 'inactive', membership_start_date: mo(4), phone: '+34 688 999 000' }
    ]).select();

    if (error) {
        console.error('INSERT ERROR:', error.message, error.details);
    } else {
        console.log('✅ Inserted', data?.length, 'members!');
    }

    // Also insert sales using ORG_ID
    const salesData = [];
    for (let i = 1; i <= 5; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 10);
        const amounts = [29.90, 49.00, 39.00, 89.90, 29.90];
        for (let j = 0; j < 5 + i; j++) {
            salesData.push({
                organization_id: ORG_ID,
                center_id: ORG_ID, // FK might be to organizations
                total_amount: amounts[j % 5],
                payment_status: 'completed',
                created_at: new Date(d.getTime() + j * 86400000 * 2).toISOString()
            });
        }
    }
    const { error: sErr } = await s.from('sales').insert(salesData);
    if (sErr) {
        console.error('Sales error:', sErr.message);
        // Try without center_id
        const salesNoCenter = salesData.map(s => { const { center_id, ...rest } = s; return rest; });
        const { error: s2Err } = await s.from('sales').insert(salesNoCenter);
        if (s2Err) console.error('Sales (no center_id) error:', s2Err.message);
        else console.log('✅ Sales inserted (no center_id)');
    } else {
        console.log('✅ Sales inserted:', salesData.length);
    }

    // trial_requests
    const { error: tErr } = await s.from('trial_requests').insert([
        { organization_id: ORG_ID, center_id: ORG_ID, full_name: 'Roberto Blanco', email: 'roberto@prospect.com', status: 'pending', created_at: new Date().toISOString() },
        { organization_id: ORG_ID, center_id: ORG_ID, full_name: 'Sara Mínguez', email: 'sara@prospect.com', status: 'pending', created_at: new Date(Date.now() - 86400000).toISOString() }
    ]);
    if (tErr) {
        // try without center_id
        const { error: t2Err } = await s.from('trial_requests').insert([
            { organization_id: ORG_ID, full_name: 'Roberto Blanco', email: 'roberto@prospect.com', status: 'pending' },
            { organization_id: ORG_ID, full_name: 'Sara Mínguez', email: 'sara@prospect.com', status: 'pending' }
        ]);
        if (t2Err) console.error('Trial error:', t2Err.message);
        else console.log('✅ Trial requests created');
    } else {
        console.log('✅ Trial requests created');
    }

    // Verify final counts
    const [{ count: mc }, { count: cls }] = await Promise.all([
        s.from('members').select('id', { count: 'exact', head: true }).eq('center_id', ORG_ID),
        s.from('classes').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID)
    ]);
    console.log('\n📊 Final counts: Members=', mc, 'Classes=', cls);
}

insertMembers().catch(console.error);
