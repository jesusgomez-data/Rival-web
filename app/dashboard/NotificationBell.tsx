"use client";

import { useState, useEffect } from "react";
import { Bell, X, CheckCircle2, Swords, UserPlus, Zap, MessageSquare, Heart, BookmarkCheck } from "lucide-react";
import { getNotifications, markAsRead, markAllAsRead } from "./notifications-actions";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { playNotificationSound } from "@/app/utils/audio";

interface Notification {
    id: string;
    is_read: boolean;
    type: string;
    title: string;
    content: string;
    created_at: string;
    link?: string;
}

export default function NotificationBell() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const supabase = createClient();
        let channel: any = null;

        async function loadNotifications() {
            const data = await getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.is_read).length);
        }

        async function setupRealtime() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            console.log(`[NotificationBell] Activando radar para el usuario: ${user.id}`);

            // Unlocking AudioContext on first interaction
            const unlockAudio = () => {
                playNotificationSound().then(() => {
                    console.log("[NotificationBell] Sistema de audio desbloqueado.");
                    window.removeEventListener('click', unlockAudio);
                });
            };
            window.addEventListener('click', unlockAudio);

            channel = supabase
                .channel(`notifications-realtime-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                    },
                    (payload) => {
                        console.log(`[NotificationBell] ¡Nueva señal detectada en el radar!`, payload);
                        if (payload.new.user_id === user.id) {
                            loadNotifications();
                            playNotificationSound();
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`[NotificationBell] Estado de la conexión (${user.id}):`, status);
                    if (status === 'CHANNEL_ERROR') {
                        console.error("[NotificationBell] Error crítico en el canal de señales. Intentando reconectar...");
                    }
                });
        }

        loadNotifications();
        setupRealtime();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'duel_challenge': return <Swords className="w-4 h-4 text-brand-red" />;
            case 'follow': return <UserPlus className="w-4 h-4 text-blue-500" />;
            case 'mission_complete': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'class_reservation': return <BookmarkCheck className="w-4 h-4 text-purple-500" />;
            case 'like':
            case 'post_like':
            case 'comment_like': return <Heart className="w-4 h-4 text-rose-500" />;
            case 'comment':
            case 'post_comment': return <MessageSquare className="w-4 h-4 text-sky-500" />;
            default: return <Zap className="w-4 h-4 text-yellow-500" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-black">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[200]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute -left-16 md:left-auto md:right-0 top-full mt-2 w-[280px] sm:w-[320px] bg-card border border-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[210] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left md:origin-top-right">
                        <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-brand-red animate-pulse" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Centro de Señales</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-[8px] font-black text-muted-foreground hover:text-brand-red uppercase tracking-widest transition-colors"
                                    >
                                        Limpiar Todo
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={clsx(
                                            "p-4 border-b border-border hover:bg-muted transition-all cursor-pointer relative group",
                                            !n.is_read ? "bg-brand-red/[0.05]" : ""
                                        )}
                                        onClick={() => {
                                            if (!n.is_read) handleMarkAsRead(n.id);
                                            setIsOpen(false);
                                            if (n.link) router.push(n.link);
                                        }}
                                    >
                                        <div className="flex gap-4">
                                            <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border group-hover:scale-110 transition-transform">
                                                {getTypeIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={clsx("text-xs text-foreground leading-tight", !n.is_read ? "font-black" : "font-medium")}>
                                                    {n.title}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed font-medium">{n.content}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <p className="text-[8px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {!n.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-brand-red mt-1 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <Bell className="w-6 h-6 text-gray-700" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 italic">Sin señales en el radar</p>
                                </div>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <Link
                                href="/dashboard/notifications"
                                onClick={() => setIsOpen(false)}
                                className="block p-4 text-center bg-muted text-[10px] font-black text-brand-red uppercase tracking-[0.3em] hover:bg-brand-red hover:text-white transition-all border-t border-border"
                            >
                                VER TODAS LAS SEÑALES
                            </Link>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
