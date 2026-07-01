import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createNotification } from '@/app/dashboard/notifications-actions';

// Ensure the route is never cached and runs dynamically
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        // Simple security check (Vercel Cron sends a CRON_SECRET if configured)
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const admin = createAdminClient();

        // Call the RPC to get finished unnotified bookings
        const { data: bookings, error } = await admin.rpc('get_finished_unnotified_bookings');

        if (error) {
            console.error('Error fetching bookings for cron:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!bookings || bookings.length === 0) {
            return NextResponse.json({ message: 'No pending notifications to send.' });
        }

        let sentCount = 0;

        for (const booking of bookings) {
            // 1. Notify Client
            await createNotification({
                userId: booking.client_id,
                type: 'session_completed',
                title: 'Sesión terminada',
                content: `¿Qué tal fue tu sesión de ${booking.service_name}? ¡Califica al profesional!`,
                link: `/dashboard/my-bookings`,
            });

            // 2. Notify Professional
            await createNotification({
                userId: booking.professional_user_id,
                type: 'session_completed',
                title: 'Sesión terminada',
                content: `La sesión de ${booking.service_name} ha culminado. Confirma que se realizó y califica a tu alumno.`,
                link: `/dashboard/gyms/${booking.org_id}/bookings`,
            });

            // 3. Mark as notified
            const { error: updateError } = await admin
                .from('service_bookings')
                .update({ post_session_notified: true })
                .eq('id', booking.booking_id);

            if (updateError) {
                console.error(`Error updating booking ${booking.booking_id}:`, updateError);
            } else {
                sentCount += 2;
            }
        }

        return NextResponse.json({ message: `Successfully sent ${sentCount} notifications.` });
    } catch (e: any) {
        console.error('Cron job error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
