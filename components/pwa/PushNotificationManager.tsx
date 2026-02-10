"use client";

import { useEffect } from "react";
import { savePushSubscription } from "@/app/dashboard/subscription-actions";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushNotificationManager() {
    useEffect(() => {
        async function registerPush() {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.ready;

                    // Si ya tiene una subscripción, verificarla o renovarla es opcional,
                    // pero aquí intentaremos asegurar que tenemos una válida.
                    let subscription = await registration.pushManager.getSubscription();

                    if (!subscription) {
                        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                        if (!vapidPublicKey || vapidPublicKey.trim() === "") {
                            console.warn("VAPID public key is missing. Push subscription skipped.");
                            return;
                        }

                        try {
                            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

                            subscription = await registration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: convertedVapidKey
                            });
                        } catch (subError) {
                            console.error("Error subscribing to push:", subError);
                            return;
                        }
                    }

                    if (subscription) {
                        // Send to server
                        await savePushSubscription(JSON.parse(JSON.stringify(subscription)));
                    }

                } catch (error) {
                    console.error("Push registration failed:", error);
                }
            }
        }

        if (typeof window !== 'undefined' && 'Notification' in window) {
            try {
                if (Notification.permission === 'granted') {
                    registerPush();
                }
            } catch (e) {
                console.error("Error checking notification permission:", e);
            }
        }

    }, []);

    return null; // Logic component only
}
