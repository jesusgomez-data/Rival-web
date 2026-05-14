"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, CheckCircle2, Swords, UserPlus, Zap, MessageSquare, Heart, BookmarkCheck } from "lucide-react";
import { getNotifications, markAsRead, markAllAsRead } from "./notifications-actions";
import { playReceiveSound, playContactOnlineSound, playEmojiSound } from "./messages/emojiSounds";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

    const loadNotifications = useCallback(async () => {
        const data = await getNotifications();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }, []);

    useEffect(() => {
        const supabase = createClient();
        let channel: any = null;

        async function setupRealtime() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // ── 1. postgres_changes for reliable delivery ──────────────────
            channel = supabase
                .channel(`notifications-live-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload: any) => {
                        const n = payload.new as Notification;
                        setNotifications(prev => {
                            if (prev.find(x => x.id === n.id)) return prev;
                            return [n, ...prev];
                        });
                        setUnreadCount(prev => prev + 1);
                        // ── MSN Messenger sounds per notification type ──
                        try {
                            if (n.type === 'message') playReceiveSound();
                            else if (n.type === 'follow') playContactOnlineSound();
                            else if (n.type === 'pr_achievement') playEmojiSound('🏆');
                            else if (n.type === 'like') playEmojiSound('❤️');
                            else if (n.type === 'duel') playEmojiSound('⚔️');
                            else playReceiveSound();
                        } catch {}
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    (payload: any) => {
                        setNotifications(prev =>
                            prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n)
                        );
                        setUnreadCount(prev => {
                            // payload.new.is_read became true → one less unread
                            if (payload.new.is_read && !payload.old?.is_read) return Math.max(0, prev - 1);
                            return prev;
                        });
                    }
                )
                // ── 2. Broadcast channel — instant server-push (no RLS delay) ──
                .on('broadcast', { event: 'new_notification' }, ({ payload }: any) => {
                    if (!payload?.id) return;
                    setNotifications(prev => {
                        if (prev.find(x => x.id === payload.id)) return prev;
                        return [payload, ...prev];
                    });
                    setUnreadCount(prev => prev + 1);
                    // MSN sound for broadcast notifications too
                    try {
                        if (payload.type === 'message') playReceiveSound();
                        else playContactOnlineSound();
                    } catch {}
                })
                .subscribe();
        }

        loadNotifications();
        setupRealtime();

        // ── 3. Fallback: refresh on tab focus ──────────────────────────────
        const onVisible = () => {
            if (document.visibilityState === 'visible') loadNotifications();
        };
        document.addEventListener('visibilitychange', onVisible);

        // ── 4. Fallback: poll every 30s while tab is active ───────────────
        const poll = setInterval(() => {
            if (document.visibilityState === 'visible') loadNotifications();
        }, 30_000);

        return () => {
            if (channel) supabase.removeChannel(channel);
            document.removeEventListener('visibilitychange', onVisible);
            clearInterval(poll);
        };
    }, [loadNotifications]);

    const handleMarkAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        await markAllAsRead();
    };

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'duel_challenge': return <Swords className="w-4 h-4 text-brand-red" />;
            case 'follow': return <UserPlus className="w-4 h-4 text-blue-400" />;
            case 'mission_complete': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
            case 'class_reservation': return <BookmarkCheck className="w-4 h-4 text-purple-400" />;
            case 'like':
            case 'post_like':
            case 'comment_like': return <Heart className="w-4 h-4 text-rose-400 fill-current" />;
            case 'comment':
            case 'message':
            case 'post_comment': return <MessageSquare className="w-4 h-4 text-sky-400" />;
            default: return <Zap className="w-4 h-4 text-yellow-400" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => {
                    if (!isOpen && unreadCount > 0) handleMarkAllAsRead();
                    setIsOpen(prev => !prev);
                }}
                className="relative p-2 text-gray-400 hover:text-white transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-brand-red text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black px-0.5 shadow-[0_0_8px_rgba(220,38,38,0.6)] animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[200]" onClick={() => setIsOpen(false)} />
                    <div className="absolute -left-16 md:left-auto md:right-0 top-full mt-2 w-[300px] sm:w-[340px] bg-[#0E0E0E] border border-white/[0.07] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-[210] overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-brand-red" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Notificaciones</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-[8px] font-black text-white/25 hover:text-brand-red uppercase tracking-widest transition-colors"
                                    >
                                        Limpiar Todo
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="text-white/20 hover:text-white transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={clsx(
                                            "px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer relative group",
                                            !n.is_read && "bg-brand-red/[0.04]"
                                        )}
                                        onClick={async () => {
                                            if (!n.is_read) await handleMarkAsRead(n.id);
                                            setIsOpen(false);
                                            if (n.link) router.push(n.link);
                                        }}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:scale-110 transition-transform">
                                                {getTypeIcon(n.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={clsx("text-xs text-white leading-tight", !n.is_read ? "font-black" : "font-medium text-white/70")}>
                                                    {n.title}
                                                </p>
                                                {n.content && (
                                                    <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2 leading-relaxed">{n.content}</p>
                                                )}
                                                <p className="text-[8px] text-white/15 font-bold uppercase tracking-widest mt-1.5">
                                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            {!n.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-brand-red mt-1 shadow-[0_0_6px_rgba(220,38,38,0.6)] shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <div className="w-12 h-12 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/[0.05]">
                                        <Bell className="w-6 h-6 text-white/10" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/15">Sin notificaciones</p>
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <Link
                                href="/dashboard/notifications"
                                onClick={() => setIsOpen(false)}
                                className="block py-3 text-center bg-white/[0.02] text-[10px] font-black text-brand-red uppercase tracking-[0.3em] hover:bg-brand-red hover:text-white transition-all border-t border-white/[0.05]"
                            >
                                Ver todas
                            </Link>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
