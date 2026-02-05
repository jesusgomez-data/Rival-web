'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAdminStats() {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autorizado" };

    // 1. Total Users
    const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // 2. Total Organizations
    const { count: orgCount } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

    // 3. Total Workouts
    const { count: workoutCount } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true });

    // Calculate MRR based on active plans
    const { data: orgs } = await supabase
        .from('organizations')
        .select('plan');

    const mrr = orgs?.reduce((acc, org) => {
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
    const supabase = await createClient();

    const { data, error } = await supabase
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
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Limit for now

    if (error) {
        console.error("Error fetching users:", error);
        return [];
    }

    return data;
}

export async function updateOrganizationPlan(orgId: string, plan: string) {
    const supabase = await createClient();

    // In real app, check admin role
    const { error } = await supabase
        .from('organizations')
        .update({ plan })
        .eq('id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function updateUserPlan(userId: string, tier: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: tier })
        .eq('id', userId);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}

export async function deleteOrganization(orgId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/admin');
}
