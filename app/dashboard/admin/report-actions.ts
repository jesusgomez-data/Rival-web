'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { isUserAdmin } from "@/utils/admin";

export async function getModerationReports() {
    if (!(await isUserAdmin())) throw new Error("Unauthorized");
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('moderation_reports')
        .select(`
            *,
            reporter:profiles!reporter_id(username, full_name)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching reports:", error);
        return [];
    }

    return data.map(report => ({
        id: report.id,
        type: report.target_type,
        user: report.reporter?.username || 'Anónimo',
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
