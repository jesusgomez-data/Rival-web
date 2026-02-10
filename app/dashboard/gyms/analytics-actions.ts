'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getCenterAnalytics(id: string, isCenterId: boolean = false) {
    const supabase = createAdminClient();

    let membersQuery = supabase.from('members').select('created_at, status, plan, membership_start_date');
    let salesQuery = supabase.from('sales').select('total_amount, created_at');

    if (isCenterId) {
        membersQuery = membersQuery.eq('center_id', id);
        salesQuery = salesQuery.eq('center_id', id);
    } else {
        // Simplified query
        membersQuery = membersQuery.eq('center_id', id);
        salesQuery = salesQuery.eq('organization_id', id);
    }

    const [{ data: members }, { data: sales }] = await Promise.all([
        membersQuery,
        salesQuery
    ]);

    const analytics = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

        // Members joined before the end of this month
        const monthlyMembersCount = (members || []).filter((m: any) => {
            const joinedDate = new Date(m.membership_start_date || m.created_at);
            // Count if they joined before nextMonth and are currently active (Simplification for history)
            return joinedDate < nextMonth && m.status === 'active';
        }).length;

        // 1. Revenue from Sales
        const salesRevenue = (sales || []).filter((s: any) => {
            const date = new Date(s.created_at);
            return date >= d && date < nextMonth;
        }).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);

        // 2. Revenue from Active Memberships (MRR Estimation)
        const membershipRevenue = (members || []).filter((m: any) => {
            const joinedDate = new Date(m.membership_start_date || m.created_at);
            return m.status === 'active' && joinedDate < nextMonth;
        }).reduce((acc: number, m: any) => {
            const plan = (m.plan || '').toLowerCase();
            let price = 0;
            if (plan.includes('trial') || plan.includes('prueba')) price = 0;
            else if (plan.includes('unlimited') || plan.includes('ilimitada')) price = 75; // Estimated Price
            else price = 60; // Default Standard Price
            return acc + price;
        }, 0);

        const totalRevenue = salesRevenue + membershipRevenue;

        analytics.push({
            name: monthName,
            members: monthlyMembersCount,
            revenue: totalRevenue
        });
    }

    return analytics;
}

export async function getCenterActivity(id: string, isCenterId: boolean = false) {
    const supabase = await createClient();

    // Fetch members, trial requests, sales, and classes
    let membersQuery = supabase.from('members').select('full_name, created_at, plan').order('created_at', { ascending: false }).limit(5);
    let trialsQuery = supabase.from('trial_requests').select('full_name, created_at, status').order('created_at', { ascending: false }).limit(5);
    let salesQuery = supabase.from('sales').select('total_amount, created_at, member:member_id(full_name), product:product_id(name)').order('created_at', { ascending: false }).limit(5);
    let classesQuery = supabase.from('classes').select('name, scheduled_time, created_at').order('created_at', { ascending: false }).limit(5);

    if (isCenterId) {
        membersQuery = membersQuery.eq('center_id', id);
        trialsQuery = trialsQuery.eq('center_id', id);
        salesQuery = salesQuery.eq('center_id', id);
        classesQuery = classesQuery.eq('center_id', id);
    } else {
        membersQuery = membersQuery.eq('center_id', id);
        trialsQuery = trialsQuery.eq('organization_id', id);
        salesQuery = salesQuery.eq('organization_id', id);
        classesQuery = classesQuery.eq('organization_id', id);
    }

    const [{ data: members }, { data: trials }, { data: sales }, { data: classes }] = await Promise.all([
        membersQuery,
        trialsQuery,
        salesQuery,
        classesQuery
    ]);

    const activity = [
        ...(members || []).map(m => ({ type: 'member', date: m.created_at, data: m })),
        ...(trials || []).map(t => ({ type: 'trial', date: t.created_at, data: t })),
        ...(sales || []).map(s => ({ type: 'sale', date: s.created_at, data: s })),
        ...(classes || []).map(c => ({ type: 'class', date: c.created_at || c.scheduled_time, data: c }))
    ];

    return activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
}

export async function getDashboardMetrics(centerId: string) {
    const admin = createAdminClient();
    const now = new Date();

    // Week calc: Monday as start of week
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const weekISO = startOfWeek.toISOString();
    const monthISO = startOfMonth.toISOString();

    // 1. Attendance this week (unique members who attended at least one class)
    const { data: attendanceData, error: attError } = await admin
        .from('class_enrollments')
        .select(`
            member_id,
            class:classes!inner(
                organization_id,
                scheduled_time
            )
        `)
        .eq('attended', true)
        .eq('class.organization_id', centerId)
        .gte('class.scheduled_time', weekISO);

    const weeklyAttendance = new Set(attendanceData?.map((a: any) => a.member_id)).size;

    // 2. New Enrollments (Week & Month)
    const { count: newMembersWeek } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .gte('created_at', weekISO);

    const { count: newMembersMonth } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .gte('created_at', monthISO);

    // 3. Cancellations (Week & Month)
    const { count: cancelledWeek } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .in('status', ['inactive', 'cancelled', 'banned'])
        .gte('updated_at', weekISO);

    const { count: cancelledMonth } = await admin
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
        .in('status', ['inactive', 'cancelled', 'banned'])
        .gte('updated_at', monthISO);

    return {
        weeklyAttendance,
        newMembersWeek: newMembersWeek || 0,
        newMembersMonth: newMembersMonth || 0,
        cancelledWeek: cancelledWeek || 0,
        cancelledMonth: cancelledMonth || 0
    };
}
