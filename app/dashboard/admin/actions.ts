'use server'

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { isUserAdmin } from "@/utils/admin";

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
    revalidatePath('/dashboard/admin');
}
