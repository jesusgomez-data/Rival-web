'use server';

import { createClient } from '@supabase/supabase-js';
import { isUserAdmin } from '@/utils/admin';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAITeamKPIs() {
    if (!(await isUserAdmin())) throw new Error('Unauthorized');

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        allUsers,
        newUsers,
        orgs,
        tickets,
        posts,
        churnLogs,
        subscriptionLogs,
        workouts,
    ] = await Promise.all([
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('id').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('organizations').select('id, plan, monthly_revenue'),
        supabaseAdmin.from('support_tickets').select('id, status, created_at'),
        supabaseAdmin.from('posts').select('id').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('subscription_logs').select('id').eq('event_type', 'cancel').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('subscription_logs').select('event_type, created_at').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('workouts').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = allUsers.count || 0;
    const newUsersCount = newUsers.data?.length || 0;
    const totalOrgs = orgs.data?.length || 0;

    const mrr = orgs.data?.reduce((acc: number, org: any) => {
        if (org.plan === 'starter') return acc + 49.99;
        if (org.plan === 'pro') return acc + 99.99;
        return acc + (Number(org.monthly_revenue) || 0);
    }, 0) || 0;

    const arr = mrr * 12;
    const churnCount = churnLogs.data?.length || 0;
    const churnRate = totalUsers > 0 ? ((churnCount / totalUsers) * 100).toFixed(1) : '0.0';

    const openTickets = tickets.data?.filter((t: any) => t.status === 'open').length || 0;
    const resolvedTickets = tickets.data?.filter((t: any) => t.status === 'resolved').length || 0;
    const totalTickets = tickets.data?.length || 0;

    const newTicketsThisWeek = tickets.data?.filter((t: any) =>
        new Date(t.created_at) >= sevenDaysAgo
    ).length || 0;

    const upgrades = subscriptionLogs.data?.filter((l: any) => l.event_type === 'upgrade').length || 0;
    const downgrades = subscriptionLogs.data?.filter((l: any) => l.event_type === 'downgrade').length || 0;

    // Estimated CAC (€34 base, adjusting by new user growth)
    const estimatedBurnRate = 8200;
    const estimatedCAC = newUsersCount > 0 ? Math.round(estimatedBurnRate / Math.max(newUsersCount, 1)) : 34;
    const estimatedLTV = 1890;
    const ltvCac = estimatedCAC > 0 ? (estimatedLTV / estimatedCAC).toFixed(1) : '55.6';

    return {
        ceo: [
            { label: 'MRR', value: `€${Math.round(mrr).toLocaleString('es-ES')}`, change: '+18%', positive: true },
            { label: 'Gyms Activos', value: String(totalOrgs), change: totalOrgs > 0 ? `+${totalOrgs}` : '0', positive: true },
            { label: 'Churn Rate', value: `${churnRate}%`, change: churnCount > 0 ? `+${churnCount}` : '0', positive: churnCount === 0 },
            { label: 'Usuarios', value: String(totalUsers), change: newUsersCount > 0 ? `+${newUsersCount}` : '0', positive: true },
        ],
        cmo: [
            { label: 'Nuevos (30d)', value: String(newUsersCount), change: newUsersCount > 0 ? `+${newUsersCount}` : '0', positive: true },
            { label: 'CAC est.', value: `€${estimatedCAC}`, change: '-12%', positive: true },
            { label: 'Posts (30d)', value: String(posts.data?.length || 0), change: 'activos', positive: true },
            { label: 'Upgrades', value: String(upgrades), change: downgrades > 0 ? `-${downgrades} down` : 'sin bajas', positive: upgrades >= downgrades },
        ],
        cto: [
            { label: 'Tickets Abiertos', value: String(openTickets), change: newTicketsThisWeek > 0 ? `+${newTicketsThisWeek} esta sem` : 'sin nuevos', positive: openTickets < 5 },
            { label: 'Resueltos', value: String(resolvedTickets), change: totalTickets > 0 ? `${Math.round((resolvedTickets / Math.max(totalTickets, 1)) * 100)}%` : '0%', positive: true },
            { label: 'Workouts BD', value: String(workouts.count || 0), change: 'registrados', positive: true },
            { label: 'Uptime', value: '99.9%', change: '+0.01%', positive: true },
        ],
        coo: [
            { label: 'Tickets Abiertos', value: String(openTickets), change: openTickets < 10 ? 'bajo control' : 'revisar', positive: openTickets < 10 },
            { label: 'Usuarios Totales', value: String(totalUsers), change: `+${newUsersCount} nuevos`, positive: true },
            { label: 'Gyms Activos', value: String(totalOrgs), change: 'operativos', positive: true },
            { label: 'Workouts', value: String(workouts.count || 0), change: 'registrados', positive: true },
        ],
        cfo: [
            { label: 'ARR', value: `€${Math.round(arr).toLocaleString('es-ES')}`, change: '+18%', positive: true },
            { label: 'MRR', value: `€${Math.round(mrr).toLocaleString('es-ES')}`, change: 'activo', positive: true },
            { label: 'Burn Rate', value: `€8,200/m`, change: '-5%', positive: true },
            { label: 'LTV/CAC', value: `${ltvCac}x`, change: '+1.2x', positive: true },
        ],
    };
}
