'use server';

import { sendPushNotificationImpl } from '@/utils/web-push-service';

// --- SEND NOTIFICATION ---
// This file only handles sending notifications and uses the server-only service.
// It should NOT be imported by client components directly if possible, although 'use server' makes it safe.
// However, to be extra safe, we moved savePushSubscription to subscription-actions.ts.

export async function sendPushNotification(userId: string, title: string, body: string, url: string = '/', type: string = 'default') {
    return sendPushNotificationImpl(userId, title, body, url, type);
}

// Re-export savePushSubscription just in case existing imports rely on it, BUT marked deprecated
// Ideally, update imports to point to subscription-actions.ts
import { savePushSubscription as savePushSub } from './subscription-actions';
export const savePushSubscription = savePushSub;
