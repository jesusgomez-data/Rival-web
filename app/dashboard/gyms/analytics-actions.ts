'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// IMPORTANT: In this schema, members.center_id is a FK to organizations.id (not centers.id)
// So when isCenterId=false, we treat the org ID as center_id directly.

export async function getCenterAnalytics(id: string, isCenterId: boolean = false) {
    const supabase = createAdminClient();

    // Both cases query by center_id = id (org ID in practice)
    const [{ data: members }, { data: sales }] = await Promise.all([
        supabase.from('members').select('created_at, status, plan, membership_start_date').eq('center_id', id),
        supabase.from('sales').select('total_amount, created_at').eq('organization_id', id)
    ]);

    const analytics = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('es-ES', { month: 'short' });
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

        const monthlyMembersCount = (members || []).filter((m: any) => {
            const joinedDate = new Date(m.membership_start_date || m.created_at);
            return joinedDate < nextMonth && m.status === 'active';
        }).length;

        const salesRevenue = (sales || []).filter((s: any) => {
            const date = new Date(s.created_at);
            return date >= d && date < nextMonth;
        }).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

        // Estimate MRR from active members in that month
        const membershipRevenue = (members || []).filter((m: any) => {
            const joinedDate = new Date(m.membership_start_date || m.created_at);
            return m.status === 'active' && joinedDate < nextMonth;
        }).reduce((acc: number, m: any) => {
            const plan = (m.plan || '').toLowerCase();
            let price = 0;
            if (plan.includes('trial') || plan.includes('prueba')) price = 0;
            else if (plan.includes('performance') || plan.includes('max')) price = 149;
            else if (plan.includes('elite') || plan.includes('unlimited') || plan.includes('ilimitada') || plan.includes('rival')) price = 89.90;
            else if (plan.includes('basic') || plan.includes('warrior')) price = 49.90;
            else price = 60;
            return acc + price;
        }, 0);

        analytics.push({
            name: monthName,
            members: monthlyMembersCount,
            revenue: Math.round(salesRevenue + membershipRevenue)
        });
    }

    return analytics;
}

export async function getCenterActivity(id: string, isCenterId: boolean = false) {
    const supabase = await createClient();

    const [{ data: members }, { data: trials }, { data: sales }, { data: classes }] = await Promise.all([
        supabase.from('members').select('full_name, created_at, plan').eq('center_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('trial_requests').select('full_name, created_at, status').eq('organization_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('sales').select('total_amount, created_at, product:product_id(name)').eq('organization_id', id).order('created_at', { ascending: false }).limit(5),
        supabase.from('classes').select('name, scheduled_time, created_at').eq('organization_id', id).order('created_at', { ascending: false }).limit(5),
    ]);

    const activity = [
        ...(members || []).map(m => ({ type: 'member', date: m.created_at, data: m })),
        ...(trials || []).map(t => ({ type: 'trial', date: t.created_at, data: t })),
        ...(sales || []).map(s => ({ type: 'sale', date: s.created_at, data: s })),
        ...(classes || []).map(c => ({ type: 'class', date: (c as any).created_at || (c as any).scheduled_time, data: c }))
    ];

    return activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
}

export async function getDashboardMetrics(centerId: string) {
    const admin = createAdminClient();
    const now = new Date();

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekISO = startOfWeek.toISOString();
    const monthISO = startOfMonth.toISOString();

    // members.center_id = orgId in our schema
    const { count: nMW } = await admin.from('members').select('id', { count: 'exact', head: true }).eq('center_id', centerId).gte('created_at', weekISO);
    const { count: nMM } = await admin.from('members').select('id', { count: 'exact', head: true }).eq('center_id', centerId).gte('created_at', monthISO);
    const { count: totalActive } = await admin.from('members').select('id', { count: 'exact', head: true }).eq('center_id', centerId).eq('status', 'active');
    const { count: cW } = await admin.from('members').select('id', { count: 'exact', head: true }).eq('center_id', centerId).in('status', ['inactive', 'cancelled', 'banned']).gte('updated_at', weekISO);
    const { count: cM } = await admin.from('members').select('id', { count: 'exact', head: true }).eq('center_id', centerId).in('status', ['inactive', 'cancelled', 'banned']).gte('updated_at', monthISO);

    // Class attendance this week (via class_enrollments linked to this org's classes)
    const { data: attendanceData } = await admin
        .from('class_enrollments')
        .select('member_id, class:classes!inner(organization_id, scheduled_time)')
        .eq('attended', true)
        .eq('class.organization_id', centerId)
        .gte('class.scheduled_time', weekISO);

    const weeklyAttendance = new Set(attendanceData?.map((a: any) => a.member_id)).size;

    return {
        weeklyAttendance,
        totalActive: totalActive || 0,
        newMembersWeek: nMW || 0,
        newMembersMonth: nMM || 0,
        cancelledWeek: cW || 0,
        cancelledMonth: cM || 0
    };
}
