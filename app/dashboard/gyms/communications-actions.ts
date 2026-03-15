'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Resend } from 'resend';

let resend: any = null;
try {
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
} catch (err) {
    console.error("Error initializing Resend:", err);
}

export async function getCenterMembersForComms(orgId: string) {
    const admin = createAdminClient();
    const { data: members } = await admin
        .from('members')
        .select('id, full_name, plan, status, user_id')
        .eq('center_id', orgId)
        .order('full_name', { ascending: true });

    const all = members || [];

    // Collect user_ids to get emails from profiles
    const userIds = all.filter((m: any) => m.user_id).map((m: any) => m.user_id);
    let emailMap: Record<string, string> = {};
    if (userIds.length > 0) {
        const { data: profiles } = await admin
            .from('profiles')
            .select('id, email')
            .in('id', userIds);
        (profiles || []).forEach((p: any) => { if (p.email) emailMap[p.id] = p.email; });
    }

    const enriched = all.map((m: any) => ({
        ...m,
        email: m.user_id ? emailMap[m.user_id] || null : null,
    }));

    const stats = {
        total: all.length,
        active: all.filter((m: any) => m.status === 'active').length,
        inactive: all.filter((m: any) => m.status === 'inactive').length,
        trial: all.filter((m: any) => (m.plan || '').toLowerCase().includes('trial') || (m.plan || '').toLowerCase().includes('prueba')).length,
    };

    return { members: enriched, stats };
}

export async function sendCenterAnnouncement(
    orgId: string,
    title: string,
    message: string,
    filter: 'all' | 'active' | 'inactive' | 'trial',
    centerName: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    const admin = createAdminClient();

    // Get target members
    let query = admin.from('members').select('id, full_name, user_id, plan, status').eq('center_id', orgId);
    if (filter === 'active') query = query.eq('status', 'active');
    else if (filter === 'inactive') query = query.in('status', ['inactive', 'cancelled']);
    else if (filter === 'trial') query = query.ilike('plan', '%trial%');

    const { data: members } = await query;
    if (!members || members.length === 0) return { error: 'No hay miembros que coincidan con el filtro' };

    // Create in-app notifications for all targeted members with user_id
    const notifications = members
        .filter((m: any) => m.user_id)
        .map((m: any) => ({
            user_id: m.user_id,
            type: 'announcement',
            title,
            content: message,
            is_read: false,
        }));

    if (notifications.length > 0) {
        await admin.from('notifications').insert(notifications);
    }

    // Get emails for members with user_id
    const userIds = members.filter((m: any) => m.user_id).map((m: any) => m.user_id);
    let emailList: { email: string; name: string }[] = [];

    if (userIds.length > 0 && resend) {
        const { data: profiles } = await admin
            .from('profiles')
            .select('id, email, full_name')
            .in('id', userIds);

        const profileMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

        emailList = members
            .filter((m: any) => m.user_id && profileMap[m.user_id]?.email)
            .map((m: any) => ({
                email: profileMap[m.user_id].email,
                name: m.full_name || profileMap[m.user_id].full_name || 'Atleta',
            }));
    }

    // Send emails in batches if resend is configured
    let emailsSent = 0;
    if (resend && emailList.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < emailList.length; i += batchSize) {
            const batch = emailList.slice(i, i + batchSize);
            try {
                await Promise.all(batch.map(({ email, name }) =>
                    resend.emails.send({
                        from: `${centerName} <notifications@rivalfit.app>`,
                        to: [email],
                        subject: `${title} — ${centerName}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111;">
                                <div style="background: #000; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                                    <div style="color: #E11D48; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">${centerName}</div>
                                </div>
                                <div style="background: #fff; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
                                    <h1 style="font-size: 22px; font-weight: 900; font-style: italic; color: #E11D48; text-transform: uppercase; margin-bottom: 16px;">${title}</h1>
                                    <p style="font-size: 16px; line-height: 1.7; color: #333; white-space: pre-wrap;">${message}</p>
                                    <div style="margin-top: 32px; text-align: center;">
                                        <a href="https://rivalfit.app/dashboard" style="background: #E11D48; color: #fff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; text-transform: uppercase;">Abrir Rival Fit</a>
                                    </div>
                                </div>
                                <p style="font-size: 11px; color: #999; text-align: center; margin-top: 16px;">© 2026 Rival Fit · ${centerName}</p>
                            </div>
                        `
                    })
                ));
                emailsSent += batch.length;
            } catch (err) {
                console.error('Batch email error:', err);
            }
        }
    }

    return {
        success: true,
        notificationsSent: notifications.length,
        emailsSent,
        total: members.length,
    };
}

export async function getAnnouncementHistory(orgId: string) {
    const admin = createAdminClient();

    // Get announcements sent to members of this org (type = 'announcement', related_id = orgId)
    const { data } = await admin
        .from('notifications')
        .select('id, title, content, created_at')
        .eq('type', 'announcement')
        .order('created_at', { ascending: false })
        .limit(200);

    if (!data || data.length === 0) return [];

    // De-duplicate by title + content + created_at (same second = same broadcast)
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const n of data) {
        const key = `${n.title}__${n.content}__${n.created_at?.slice(0, 16)}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(n);
        }
    }
    return unique;
}
