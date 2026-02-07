'use server'

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { isUserAdmin } from "@/utils/admin";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Note: We use supabaseAdmin to bypass RLS for admin actions
// Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local

export async function getAdminStats() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");

    // 1. Total Users
    const { count: userCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // 2. Total Organizations
    const { count: orgCount } = await supabaseAdmin
        .from('organizations')
        .select('*', { count: 'exact', head: true });

    // 3. Total Workouts
    const { count: workoutCount } = await supabaseAdmin
        .from('workouts')
        .select('*', { count: 'exact', head: true });

    // Calculate MRR based on active plans
    const { data: orgs } = await supabaseAdmin
        .from('organizations')
        .select('plan');

    const mrr = orgs?.reduce((acc: number, org: any) => {
        if (org.plan === 'starter') return acc + 49.99;
        if (org.plan === 'pro') return acc + 99.99;
        return acc;
    }, 0) || 0;

    return {
        users: userCount || 0,
        centers: orgCount || 0,
        workouts: workoutCount || 0,
        mrr: mrr
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
    revalidatePath('/dashboard/admin');
}

export async function updateUserPlan(userId: string, tier: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('id', userId);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function deleteOrganization(orgId: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const { error } = await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}
