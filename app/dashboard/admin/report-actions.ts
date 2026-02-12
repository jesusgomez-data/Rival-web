'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { isUserAdmin } from "@/utils/admin";

export async function getModerationReports() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const adminSupabase = createAdminClient();

    // Fetch reports
    const { data: reports, error: reportsError } = await adminSupabase
        .from('moderation_reports')
        .select('*')
        .order('created_at', { ascending: false });

    if (reportsError) {
        console.error("Error fetching moderation reports:", reportsError);
        return [];
    }

    if (!reports || reports.length === 0) return [];

    // Fetch reporter profiles
    const reporterIds = Array.from(new Set(reports.map(r => r.reporter_id).filter(Boolean)));
    const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', reporterIds);

    const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
    }, {});

    return reports.map(report => ({
        id: report.id,
        type: report.target_type,
        user: profilesMap[report.reporter_id]?.username || 'Anónimo',
        target: report.target_id,
        status: report.status === 'pending' ? 'Pending' : 'Resolved',
        date: new Date(report.created_at).toLocaleDateString(),
        severity: report.severity,
        reason: report.reason
    }));
}

export async function takeModerationAction(reportId: string, action: 'ignore' | 'delete' | 'ban', targetType: string, targetId: string, reporterId?: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) throw new Error("No autorizado");

    try {
        if (action === 'delete') {
            // Delete the content (Post or Comment)
            const table = targetType === 'post' ? 'posts' : 'comments';
            const { error: deleteError } = await supabase
                .from(table)
                .delete()
                .eq('id', targetId);

            if (deleteError) throw new Error(`Error eliminando contenido: ${deleteError.message}`);
        }

        if (action === 'ban') {
            // We need the user_id of the person who created the content
            // For now, if the target is 'user', targetId IS the userId
            // If it's a post, we'd need to fetch the author_id first.

            let userIdToBan = targetId;
            if (targetType === 'post') {
                const { data: post } = await supabase.from('posts').select('user_id').eq('id', targetId).single();
                if (post) userIdToBan = post.user_id;
            }

            const { error: banError } = await supabase
                .from('profiles')
                .update({ status: 'banned' })
                .eq('id', userIdToBan);

            if (banError) throw new Error(`Error baneando usuario: ${banError.message}`);
        }

        // Always mark the report as resolved
        const { error: reportError } = await supabase
            .from('moderation_reports')
            .update({
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: adminUser.id
            })
            .eq('id', reportId);

        if (reportError) throw new Error(reportError.message);

        revalidatePath('/dashboard/admin');
        return { success: true };

    } catch (e: any) {
        console.error("Moderation Action Error:", e);
        throw e;
    }
}

export async function resolveReport(reportId: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    return takeModerationAction(reportId, 'ignore', '', '');
}

export async function deleteModerationReport(reportId: string) {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();

    const { error } = await supabase
        .from('moderation_reports')
        .delete()
        .eq('id', reportId);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
}
