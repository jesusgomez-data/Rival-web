"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { savePushSubscription } from "@/app/dashboard/subscription-actions";

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

async function registerPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey?.trim()) return;
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
        }
        if (subscription) {
            const data = typeof subscription.toJSON === 'function'
                ? subscription.toJSON()
                : JSON.parse(JSON.stringify(subscription));
            await savePushSubscription(data);
        }
    } catch (err) {
        console.error("Push registration failed:", err);
    }
}

export default function PushNotificationManager() {
    // 'default' = never asked | 'granted' = enabled | 'denied' = blocked
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        // Check if user already dismissed the banner
        if (sessionStorage.getItem('push_banner_dismissed')) { setDismissed(true); }
        setPermission(Notification.permission);

        // If already granted, ensure subscription exists (re-registers if missing)
        if (Notification.permission === 'granted') registerPushSubscription();
    }, []);

    async function handleEnable() {
        if (!('Notification' in window)) return;
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
            await registerPushSubscription();
        } else {
            // Denied or dismissed — don't show again this session
            sessionStorage.setItem('push_banner_dismissed', '1');
            setDismissed(true);
        }
    }

    function handleDismiss() {
        sessionStorage.setItem('push_banner_dismissed', '1');
        setDismissed(true);
    }

    // Only show banner when permission is 'default' (never asked) and not dismissed
    if (permission !== 'default' || dismissed) return null;

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] w-[calc(100vw-2rem)] max-w-sm">
            <div className="bg-[#111] border border-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-4 flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-red/15 border border-brand-red/25 flex items-center justify-center mt-0.5">
                    <Bell className="w-4 h-4 text-brand-red" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-black leading-tight">Activa las notificaciones</p>
                    <p className="text-gray-500 text-[11px] mt-0.5 leading-snug">
                        Recibe avisos de mensajes, retos y actividad como en WhatsApp o Instagram.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleEnable}
                            className="flex-1 h-8 bg-brand-red text-white text-[11px] font-black rounded-lg hover:bg-red-600 transition-colors uppercase tracking-wide"
                        >
                            Habilitar
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="h-8 px-3 text-gray-500 text-[11px] font-semibold rounded-lg hover:bg-white/5 transition-colors"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
                <button onClick={handleDismiss} className="shrink-0 text-gray-600 hover:text-white transition-colors -mt-0.5">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
