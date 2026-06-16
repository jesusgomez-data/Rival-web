import 'server-only';
// No static import for web-push to ensure it's not bundled on client accidentally
// import webpush from 'web-push';
import { createAdminClient } from '@/utils/supabase/admin';

async function getWebPush() {
    // Dynamic import to be 100% sure this doesn't run on client or break build
    const webpush = (await import('web-push')).default;
    return webpush;
}

async function setupWebPush() {
    try {
        const webpush = await getWebPush();
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
        const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

        if (publicKey && privateKey) {
            webpush.setVapidDetails(
                'mailto:support@rivalfit.app',
                publicKey,
                privateKey
            );
            return { success: true, webpush };
        }
    } catch (error) {
        console.error("Error setting VAPID details:", error);
    }
    return { success: false, webpush: null };
}

export async function sendPushNotificationImpl(userId: string, title: string, body: string, url: string = '/', type: string = 'default') {
    const { success, webpush } = await setupWebPush();
    if (!success || !webpush) return;

    // Use admin client to bypass RLS — subscriptions must always be readable server-side
    const supabase = createAdminClient();

    // Fetch valid subscriptions
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, url, type });

    const promises = subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }, payload);
        } catch (error: any) {
            console.error('Error sending push:', error);
            if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription is gone, remove it
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
        }
    });

    await Promise.all(promises);
}
