'use server';

import { createClient } from '@/utils/supabase/server';
import webpush from 'web-push';

// La inicialización se hace dentro de las funciones para evitar que se ejecute en el top-level si se importa en el cliente
function setupWebPush() {
    try {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
        const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();

        if (publicKey && privateKey) {
            webpush.setVapidDetails(
                'mailto:support@rivalfit.app',
                publicKey,
                privateKey
            );
            return true;
        }
    } catch (error) {
        console.error("Error setting VAPID details:", error);
    }
    return false;
}


export async function savePushSubscription(subscription: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: 'Unauthorized' };

    const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, endpoint' });

    if (error) {
        console.error('Error saving subscription:', error);
        return { error: error.message };
    }

    return { success: true };
}

export async function sendPushNotification(userId: string, title: string, body: string, url: string = '/') {
    setupWebPush();
    const supabase = await createClient();

    // Fetch valid subscriptions for the user
    const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, url });

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
