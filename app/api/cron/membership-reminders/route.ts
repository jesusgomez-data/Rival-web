import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createNotification } from '@/app/dashboard/notifications-actions';

// Avisos de vencimiento de membresía (se ejecuta a diario):
// - 3 días antes y el día del vencimiento → aviso al alumno
// - El día después de vencer → aviso al dueño del centro
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toDateStr(d: Date) {
    return d.toISOString().split('T')[0];
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const admin = createAdminClient();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);

        let remindersSent = 0;
        let ownerAlertsSent = 0;

        // ── 1. Alumnos cuya membresía vence HOY o en 3 días ──────────────
        const { data: expiring, error: expError } = await admin
            .from('members')
            .select('id, user_id, full_name, membership_end_date, center_id, organization:center_id (name)')
            .eq('status', 'active')
            .in('membership_end_date', [toDateStr(today), toDateStr(in3Days)]);

        if (expError) {
            console.error('[membership-reminders] Error fetching expiring members:', expError);
        }

        for (const m of expiring || []) {
            if (!m.user_id) continue; // Sin cuenta vinculada no hay a quién notificar
            const orgName = Array.isArray(m.organization)
                ? (m.organization[0] as any)?.name
                : (m.organization as any)?.name;
            const isToday = m.membership_end_date === toDateStr(today);

            await createNotification({
                userId: m.user_id,
                type: 'membership_expiring',
                title: isToday ? 'Tu membresía vence hoy' : 'Tu membresía vence en 3 días',
                content: isToday
                    ? `Tu membresía en ${orgName || 'tu centro'} vence hoy. Renuévala para seguir reservando clases.`
                    : `Tu membresía en ${orgName || 'tu centro'} vence el ${new Date(m.membership_end_date).toLocaleDateString('es-ES')}. Habla con tu centro para renovarla.`,
                link: `/gym/${m.center_id}`
            });
            remindersSent++;
        }

        // ── 2. Membresías vencidas AYER → aviso al dueño del centro ──────
        const { data: expired, error: expiredError } = await admin
            .from('members')
            .select('id, full_name, center_id')
            .eq('status', 'active')
            .eq('membership_end_date', toDateStr(yesterday));

        if (expiredError) {
            console.error('[membership-reminders] Error fetching expired members:', expiredError);
        }

        if (expired && expired.length > 0) {
            // Agrupar por centro
            const byCenter: Record<string, string[]> = {};
            expired.forEach(m => {
                byCenter[m.center_id] = byCenter[m.center_id] || [];
                byCenter[m.center_id].push(m.full_name || 'Alumno');
            });

            for (const [centerId, names] of Object.entries(byCenter)) {
                const { data: org } = await admin
                    .from('organizations')
                    .select('owner_id, head_coach_id, name')
                    .eq('id', centerId)
                    .single();

                const recipients = [...new Set([org?.owner_id, org?.head_coach_id].filter(Boolean))] as string[];
                const namesList = names.slice(0, 5).join(', ') + (names.length > 5 ? ` y ${names.length - 5} más` : '');

                for (const userId of recipients) {
                    await createNotification({
                        userId,
                        type: 'membership_expired',
                        title: `${names.length} ${names.length === 1 ? 'membresía vencida' : 'membresías vencidas'}`,
                        content: `Vencieron ayer en ${org?.name || 'tu centro'}: ${namesList}. Revisa el estado de pago en Miembros.`,
                        link: `/dashboard/gyms/${centerId}/members`
                    });
                    ownerAlertsSent++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            remindersSent,
            ownerAlertsSent
        });
    } catch (err: any) {
        console.error('[membership-reminders] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
    }
}
