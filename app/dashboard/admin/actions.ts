'use server'

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { isUserAdmin } from "@/utils/admin";
import { isProfessional } from "@/lib/professional-types";
import { broadcastNotifications } from "@/app/dashboard/notifications-actions";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAdminStats() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    const { count: userCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    const { count: orgCount } = await supabaseAdmin
        .from('organizations')
        .select('*', { count: 'exact', head: true });

    const { count: workoutCount } = await supabaseAdmin
        .from('workouts')
        .select('*', { count: 'exact', head: true });

    const { data: orgs } = await supabaseAdmin
        .from('organizations')
        .select('plan, monthly_revenue');

    const mrr = orgs?.reduce((acc: number, org: any) => {
        if (org.plan === 'starter') return acc + 49.99;
        if (org.plan === 'pro') return acc + 99.99;
        return acc + (Number(org.monthly_revenue) || 0);
    }, 0) || 0;

    // Visitors Stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: totalVisits } = await supabaseAdmin
        .from('site_visits')
        .select('*', { count: 'exact', head: true });

    const { count: recentVisits } = await supabaseAdmin
        .from('site_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

    // Churn Stats (downgrades/cancellations in subscription_logs)
    const { count: churnCount } = await supabaseAdmin
        .from('subscription_logs')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'downgrade');

    return {
        users: userCount || 0,
        centers: orgCount || 0,
        workouts: workoutCount || 0,
        mrr: mrr,
        visits: totalVisits || 0,
        recentVisits: recentVisits || 0,
        churn: churnCount || 0
    };
}

export async function logVisit(path: string, userAgent?: string) {
    // This is a public-ish action, but we check if user is logged in
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser();

    await supabaseAdmin.from('site_visits').insert({
        user_id: user?.id || null,
        page_path: path,
        user_agent: userAgent
    });
}

export async function getBusinessStats() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    // 1. Visitor Breakdown (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: visits } = await supabaseAdmin
        .from('site_visits')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

    // 2. Churn Breakdown (Recent unsubscribes)
    const { data: churnData } = await supabaseAdmin
        .from('subscription_logs')
        .select(`
            *,
            profiles(username, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

    // 3. Inactive Users (No workouts in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeWorkouts } = await supabaseAdmin
        .from('workouts')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

    const uniqueActiveIds = Array.from(new Set(activeWorkouts?.map(w => w.user_id) || []));

    let inactiveQuery = supabaseAdmin.from('profiles').select('*').limit(20);
    if (uniqueActiveIds.length > 0) {
        inactiveQuery = inactiveQuery.not('id', 'in', `(${uniqueActiveIds.join(',')})`);
    }

    const { data: inactiveUsers } = await inactiveQuery;

    // 4. Popular Pages
    const { data: popularPages } = await supabaseAdmin
        .from('site_visits')
        .select('page_path');

    const pageCounts = (popularPages || []).reduce((acc: any, curr: any) => {
        acc[curr.page_path] = (acc[curr.page_path] || 0) + 1;
        return acc;
    }, {});

    const topPages = Object.entries(pageCounts)
        .map(([path, count]) => ({ path, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        visits,
        churn: churnData || [],
        inactiveUsers: inactiveUsers || [],
        topPages
    };
}

export async function getRecentOrganizations() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching organizations:", error);
        return [];
    }

    return data.map((org: any) => ({
        ...org,
        status: org.plan === 'free' || !org.plan ? 'Trial' : 'Active',
    }));
}

export async function getAllUsers() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data;
}

export async function updateOrganizationPlan(orgId: string, plan: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { error } = await supabaseAdmin
        .from('organizations')
        .update({ plan })
        .eq('id', orgId);

    if (error) throw new Error(error.message);
    await logAdminAction('update_org_plan', 'organization', orgId, { new_plan: plan });
    revalidatePath('/dashboard/admin');
}

export async function updateUserPlan(userId: string, tier: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    // Get old tier for logging
    const { data: profile } = await supabaseAdmin.from('profiles').select('subscription_tier').eq('id', userId).single();
    const oldTier = profile?.subscription_tier;

    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('id', userId);

    if (error) throw new Error(error.message);

    // Log the change
    if (oldTier !== tier) {
        let eventType = 'upgrade';
        const tiers = ['free', 'premium', 'elite'];
        if (tiers.indexOf(oldTier) > tiers.indexOf(tier)) eventType = 'downgrade';
        if (tier === 'free') eventType = 'cancel';

        await supabaseAdmin.from('subscription_logs').insert({
            user_id: userId,
            old_tier: oldTier,
            new_tier: tier,
            event_type: eventType
        });

        await logAdminAction('update_user_plan', 'user', userId, { old_tier: oldTier, new_tier: tier, event: eventType });
    }

    revalidatePath('/dashboard/admin');
}

export async function deleteOrganization(orgId: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    console.log(`[NUCLEAR ORG DELETE] Initiated for orgId: ${orgId}`);

    const safeDelete = async (table: string, column: string, value: any) => {
        try {
            const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
            if (error) console.warn(`[NUCLEAR ORG DELETE] Warning for ${table}: ${error.message}`);
        } catch (e) {
            // Table might not exist
        }
    };

    // 1. Cleanup all related tables (Top-down order)
    const tablesToClean = [
        ['center_roles', 'organization_id'],
        ['members', 'center_id'],
        ['classes', 'organization_id'],
        ['membership_plans', 'organization_id'],
        ['wods', 'organization_id'],
        ['trial_requests', 'organization_id'],
        ['support_tickets', 'organization_id'],
        ['centers', 'organization_id'], // Sede table if exists
    ];

    for (const [table, col] of tablesToClean) {
        await safeDelete(table, col, orgId);
    }

    // 2. The final delete of the organization itself
    const { error } = await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', orgId);

    if (error) {
        console.error(`[NUCLEAR ORG DELETE] Failed for ${orgId}:`, error.message);
        throw new Error(`No se pudo borrar el centro por dependencias en la base de datos. Por favor, ejecuta 'fix_org_deletion.sql' en el dashboard de Supabase.`);
    }

    console.log(`[NUCLEAR ORG DELETE] Success for orgId: ${orgId}`);
    await logAdminAction('delete_organization', 'organization', orgId);
    revalidatePath('/dashboard/admin');
}

export async function deleteUser(userId: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    console.log(`[NUCLEAR DELETE] Initiated for userId: ${userId}`);

    const safeDelete = async (table: string, column: string, value: any) => {
        try {
            const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
            if (error) console.warn(`[NUCLEAR DELETE] Warning for ${table}: ${error.message}`);
        } catch (e) {
            // Table might not exist
        }
    };

    // 1. Recursive cleanup for grandchild tables
    // 1.1 Memberships & Enrollments
    const { data: members } = await supabaseAdmin.from('members').select('id').eq('user_id', userId);
    if (members && members.length > 0) {
        const mIds = members.map(m => m.id);
        await supabaseAdmin.from('class_enrollments').delete().in('member_id', mIds);
    }

    // 1.2 Workouts -> Sets
    const { data: workouts } = await supabaseAdmin.from('workouts').select('id').eq('user_id', userId);
    if (workouts && workouts.length > 0) {
        const wIds = workouts.map(w => w.id);
        await safeDelete('workout_sets', 'workout_id', wIds);
        await safeDelete('workout_exercises', 'workout_id', wIds);
    }

    // 1.3 Posts -> Likes/Comments
    const { data: posts } = await supabaseAdmin.from('posts').select('id').eq('user_id', userId);
    if (posts && posts.length > 0) {
        const pIds = posts.map(p => p.id);
        await safeDelete('post_likes', 'post_id', pIds);
        await safeDelete('post_comments', 'post_id', pIds);
    }

    // 2. Direct cleanups (alphabetical order approx)
    const tablesToClean = [
        ['center_followers', 'user_id'],
        ['center_post_comments', 'user_id'],
        ['center_post_likes', 'user_id'],
        ['center_reviews', 'user_id'],
        ['center_roles', 'user_id'],
        ['class_enrollments', 'user_id'], // fallback
        ['class_results', 'user_id'],
        ['comment_likes', 'user_id'],
        ['comments', 'user_id'],
        ['conversation_participants', 'user_id'],
        ['follows', 'follower_id'],
        ['follows', 'following_id'],
        ['likes', 'user_id'],
        ['members', 'user_id'],
        ['memberships', 'user_id'],
        ['messages', 'sender_id'],
        ['mission_progress', 'user_id'],
        ['moderation_reports', 'reporter_id'],
        ['notifications', 'recipient_id'],
        ['notifications', 'user_id'],
        ['orders', 'user_id'],
        ['post_comments', 'user_id'],
        ['post_likes', 'user_id'],
        ['posts', 'user_id'],
        ['stories', 'user_id'],
        ['story_likes', 'user_id'],
        ['story_views', 'user_id'],
        ['support_messages', 'sender_id'],
        ['support_tickets', 'user_id'],
        ['trial_requests', 'user_id'],
        ['user_achievements', 'user_id'],
        ['user_missions', 'user_id'],
        ['workouts', 'user_id']
    ];

    for (const [table, col] of tablesToClean) {
        await safeDelete(table, col, userId);
    }

    // 3. Ownership & Foreign Key Nullification
    try {
        await supabaseAdmin.from('organizations').update({ owner_id: null }).eq('owner_id', userId);
        await supabaseAdmin.from('organizations').update({ head_coach_id: null }).eq('head_coach_id', userId);
        await supabaseAdmin.from('classes').update({ coach_id: null }).eq('coach_id', userId);
    } catch (e) { }

    // 4. Profiles Delete (The final gatekeeper before auth)
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profileError) {
        console.error(`[NUCLEAR DELETE] Profile deletion failed for ${userId}:`, profileError.message);
        throw new Error(`Critical database dependency found. Please run 'fix_full_cascade.sql' in the Supabase Dashboard to automatically handle this user's data.`);
    }

    // 5. Auth User Delete
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
        console.error(`[NUCLEAR DELETE] Auth deletion failed for ${userId}:`, authError.message);
        throw new Error(`Database error deleting user: ${authError.message}`);
    }

    console.log(`[NUCLEAR DELETE] Success for userId: ${userId}`);
    await logAdminAction('delete_user', 'user', userId);
    revalidatePath('/dashboard/admin');
}

export async function createAnnouncement(title: string, content: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabaseAdmin.from('announcements').insert({
        title,
        content,
        created_by: user?.id
    });

    if (error) throw new Error(error.message);

    // Also send a notification to everyone (simplified for now)
    const { data: users } = await supabaseAdmin.from('profiles').select('id');
    if (users) {
        const notifications = users.map(u => ({
            user_id: u.id,
            type: 'announcement',
            title: title,
            content: content.substring(0, 100),
            is_read: false
        }));

        for (let i = 0; i < notifications.length; i += 100) {
            const batch = notifications.slice(i, i + 100);
            await supabaseAdmin.from('notifications').insert(batch);
            broadcastNotifications(batch).catch(() => {});
        }
    }

    await logAdminAction('create_announcement', 'announcement', 'global', { title });
    revalidatePath('/dashboard/admin');
    return { success: true };
}

export async function getExportData(type: 'users' | 'centers' | 'workouts') {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    const { data, error } = await supabaseAdmin.from(type).select('*');
    if (error) throw new Error(error.message);

    if (!data || data.length === 0) return "";

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row: any) =>
        Object.values(row).map(val => String(val).replace(/,/g, " ")).join(",")
    ).join("\n");

    return `${headers}\n${rows}`;
}
// --- PROFESSIONAL ADMIN TOOLS ---

export async function logAdminAction(action: string, type: string, targetId: string, details: any = {}) {
    const supabase = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabase.auth.getUser();

    await supabaseAdmin.from('admin_audit_logs').insert({
        admin_id: user?.id,
        action_type: action,
        target_type: type,
        target_id: targetId,
        details
    });
}

export async function getAdminAuditLogs() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { data } = await supabaseAdmin
        .from('admin_audit_logs')
        .select(`
            *,
            admin:admin_id(email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
    return data || [];
}

export async function getSystemActivity() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    // Most recent activities across the system
    const [visits, signups, subscriptions, workouts] = await Promise.all([
        supabaseAdmin.from('site_visits').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(10),
        supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(10),
        supabaseAdmin.from('subscription_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(10),
        supabaseAdmin.from('workouts').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(10)
    ]);

    const allEvents = [
        ...(visits.data || []).map(v => ({ ...v, type: 'visit', label: 'Visita', icon: 'Eye', color: 'text-blue-500' })),
        ...(signups.data || []).map(s => ({ ...s, type: 'signup', label: 'Nuevo Registro', icon: 'UserPlus', color: 'text-green-500' })),
        ...(subscriptions.data || []).map(s => ({ ...s, type: 'subscription', label: 'Suscripción', icon: 'CreditCard', color: 'text-purple-500' })),
        ...(workouts.data || []).map(w => ({ ...w, type: 'workout', label: 'Entrenamiento', icon: 'Zap', color: 'text-yellow-500' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 30);

    return allEvents as any[];
}

export async function getFinanceStats() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(20);

    const { data: sales } = await supabaseAdmin
        .from('sales')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(20);

    return { orders: orders || [], sales: sales || [] };
}

export async function getViewAnalyticsData() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    const [orgsRes, visitsRes, postsRes, storiesRes] = await Promise.all([
        supabaseAdmin.from('organizations').select('id, name, center_type, owner_id'),
        supabaseAdmin.from('profile_visits').select('organization_id'),
        supabaseAdmin
            .from('posts')
            .select('id, caption, media_type, view_count, user_id, profiles:user_id(username, full_name)')
            .order('view_count', { ascending: false, nullsFirst: false })
            .limit(10),
        supabaseAdmin
            .from('stories')
            .select('id, user_id, created_at, profiles:user_id(username, full_name), story_views(count)')
            .order('created_at', { ascending: false })
            .limit(200),
    ]);

    const orgs = orgsRes.data || [];
    const visits = visitsRes.data || [];

    const visitCountByOrg = visits.reduce((acc: Record<string, number>, v: any) => {
        acc[v.organization_id] = (acc[v.organization_id] || 0) + 1;
        return acc;
    }, {});

    const orgVisitStats = orgs
        .map((org: any) => ({
            id: org.id,
            name: org.name,
            type: isProfessional(org.center_type) ? 'profesional' : 'centro',
            visits: visitCountByOrg[org.id] || 0,
        }))
        .sort((a: any, b: any) => b.visits - a.visits)
        .slice(0, 20);

    const totalProfileVisits = visits.length;

    const topPosts = (postsRes.data || []).map((p: any) => ({
        id: p.id,
        caption: p.caption,
        mediaType: p.media_type,
        viewCount: p.view_count || 0,
        author: p.profiles?.full_name || p.profiles?.username || 'Atleta',
    }));

    const totalPostViews = topPosts.reduce((acc: number, p: any) => acc + p.viewCount, 0);

    const storiesWithViews = (storiesRes.data || []).map((s: any) => ({
        id: s.id,
        author: s.profiles?.full_name || s.profiles?.username || 'Atleta',
        createdAt: s.created_at,
        viewCount: s.story_views?.[0]?.count || 0,
    }));

    const totalStoryViews = storiesWithViews.reduce((acc: number, s: any) => acc + s.viewCount, 0);
    const topStories = storiesWithViews.sort((a: any, b: any) => b.viewCount - a.viewCount).slice(0, 10);

    return {
        orgVisitStats,
        totalProfileVisits,
        topPosts,
        totalPostViews,
        topStories,
        totalStoryViews,
    };
}

export async function getManagementIntelligenceData() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [orgs, newUsers, allUsers, churnData, inactiveProfiles, workouts] = await Promise.all([
        supabaseAdmin.from('organizations').select('plan, monthly_revenue'),
        supabaseAdmin.from('profiles').select('id').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('subscription_logs').select('event_type, created_at').eq('event_type', 'cancel').gte('created_at', thirtyDaysAgo.toISOString()),
        supabaseAdmin.from('profiles').select('id, full_name, last_seen_at, subscription_tier').not('subscription_tier', 'eq', 'free').order('last_seen_at', { ascending: true, nullsFirst: false }).limit(10),
        supabaseAdmin.from('workouts').select('created_at').gte('created_at', thirtyDaysAgo.toISOString()),
    ]);

    // KPI: MRR
    const mrr = orgs.data?.reduce((acc: number, org: any) => {
        if (org.plan === 'starter') return acc + 49.99;
        if (org.plan === 'pro') return acc + 99.99;
        return acc + (Number(org.monthly_revenue) || 0);
    }, 0) || 0;

    const totalUsers = allUsers.count || 0;
    const newMembersCount = newUsers.data?.length || 0;
    const prevMonthUsers = totalUsers - newMembersCount;
    const memberGrowthPct = prevMonthUsers > 0
        ? `+${Math.round((newMembersCount / prevMonthUsers) * 100)}%`
        : `+${newMembersCount}`;

    const churnCount = churnData.data?.length || 0;
    const churnRate = totalUsers > 0 ? ((churnCount / totalUsers) * 100).toFixed(1) : '0.0';

    // Heatmap: group workouts by hour bucket and day of week
    const hourBuckets = [8, 10, 14, 18, 20];
    const heatmap: number[][] = hourBuckets.map(() => Array(7).fill(0));

    (workouts.data || []).forEach((w: any) => {
        const d = new Date(w.created_at);
        const hour = d.getHours();
        const dayOfWeek = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
        let bucketIdx = 0;
        let minDiff = Math.abs(hour - hourBuckets[0]);
        hourBuckets.forEach((h, i) => {
            const diff = Math.abs(hour - h);
            if (diff < minDiff) { minDiff = diff; bucketIdx = i; }
        });
        heatmap[bucketIdx][dayOfWeek]++;
    });

    const maxVal = Math.max(...heatmap.flat(), 1);
    const heatmapPct = heatmap.map(row => row.map(v => Math.round((v / maxVal) * 100)));

    // Find day with lowest average attendance for AI insight
    const dayTotals = Array(7).fill(0);
    heatmap.forEach(row => row.forEach((v, d) => { dayTotals[d] += v; }));
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const lowestDayIdx = dayTotals.indexOf(Math.min(...dayTotals));
    const lowestDay = days[lowestDayIdx];

    // Churn risk: profiles with last_seen_at older than 14 days with paid tier
    const churnRiskUsers = (inactiveProfiles.data || [])
        .filter((p: any) => {
            if (!p.last_seen_at) return true;
            return new Date(p.last_seen_at) < fourteenDaysAgo;
        })
        .slice(0, 3)
        .map((p: any) => {
            const daysSince = p.last_seen_at
                ? Math.floor((now.getTime() - new Date(p.last_seen_at).getTime()) / (24 * 60 * 60 * 1000))
                : 30;
            return {
                id: p.id,
                name: p.full_name || 'Usuario',
                risk: daysSince > 21 ? 'Alto' : 'Medio',
                daysInactive: daysSince,
                tier: p.subscription_tier || 'premium',
            };
        });

    return {
        kpis: {
            projectedRevenue: `€${Math.round(mrr * 1.12).toLocaleString('es-ES')}`,
            revenueChange: '+12%',
            newMembers: newMembersCount,
            memberChange: memberGrowthPct,
            churnRate: `${churnRate}%`,
            churnChange: churnCount > 0 ? `+${churnCount}` : '0',
        },
        heatmap: heatmapPct,
        churnRisk: churnRiskUsers,
        aiInsight: workouts.data && workouts.data.length > 0
            ? `Detectamos menor actividad los ${lowestDay}s. Recomendamos programar un evento especial o clase de prueba gratuita para ese día.`
            : 'Aún no hay suficientes datos de entrenamiento para generar recomendaciones automáticas. Anima a tus usuarios a registrar sus workouts.',
    };
}

export async function getApplicationPlans() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { data, error } = await supabaseAdmin
        .from('application_plans')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching application plans:", error);
        return [];
    }
    return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        features: p.features.join(', '),
        type: p.type,
        planKey: p.plan_key
    }));
}

export async function upsertApplicationPlan(plan: any) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { id, name, price, features, type, planKey } = plan;

    let featuresArray = features;
    if (typeof features === 'string') {
        featuresArray = features.split(',').map((f: string) => f.trim()).filter(Boolean);
    }

    const payload = {
        name,
        price,
        features: featuresArray,
        type,
        plan_key: planKey
    };

    let error;
    if (id) {
        const { error: err } = await supabaseAdmin
            .from('application_plans')
            .update(payload)
            .eq('id', id);
        error = err;
    } else {
        const { error: err } = await supabaseAdmin
            .from('application_plans')
            .insert(payload);
        error = err;
    }

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function deleteApplicationPlan(id: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { error } = await supabaseAdmin
        .from('application_plans')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

