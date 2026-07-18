'use client';

import { useState, useEffect, useTransition } from 'react';
import { Bell, CheckCheck, Swords, UserPlus, Zap, MessageSquare, Trophy, Star, BookmarkCheck, ExternalLink, Loader2 } from 'lucide-react';
import LikeFist from '@/components/LikeFist';
import { getNotifications, markAsRead, markAllAsRead } from '../notifications-actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Notification {
    id: string;
    is_read: boolean;
    type: string;
    title: string;
    content: string;
    created_at: string;
    link?: string;
}

function getNotifIcon(type: string) {
    switch (type) {
        case 'duel':         return <Swords className="w-5 h-5 text-brand-red" />;
        case 'follow':       return <UserPlus className="w-5 h-5 text-blue-400" />;
        case 'like':         return <LikeFist active size={20} />;
        case 'comment':      return <MessageSquare className="w-5 h-5 text-green-400" />;
        case 'achievement':  return <Star className="w-5 h-5 text-yellow-400" />;
        case 'competition':  return <Trophy className="w-5 h-5 text-yellow-400" />;
        case 'mission':      return <Zap className="w-5 h-5 text-purple-400" />;
        case 'badge':        return <BookmarkCheck className="w-5 h-5 text-orange-400" />;
        default:             return <Bell className="w-5 h-5 text-gray-400" />;
    }
}

function getNotifBg(type: string) {
    switch (type) {
        case 'duel':         return 'bg-brand-red/10 border-brand-red/20';
        case 'follow':       return 'bg-blue-500/10 border-blue-500/20';
        case 'like':         return 'bg-pink-500/10 border-pink-500/20';
        case 'comment':      return 'bg-green-500/10 border-green-500/20';
        case 'achievement':
        case 'competition':  return 'bg-yellow-500/10 border-yellow-500/20';
        case 'mission':      return 'bg-purple-500/10 border-purple-500/20';
        case 'badge':        return 'bg-orange-500/10 border-orange-500/20';
        default:             return 'bg-white/5 border-white/10';
    }
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        getNotifications().then(data => {
            setNotifications(data);
            setIsLoading(false);
        });
    }, []);

    const handleMarkRead = (id: string) => {
        startTransition(async () => {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        });
    };

    const handleMarkAllRead = () => {
        startTransition(async () => {
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        });
    };

    const handleClick = (notif: Notification) => {
        if (!notif.is_read) handleMarkRead(notif.id);
        if (notif.link) router.push(notif.link);
    };

    const unread = notifications.filter(n => !n.is_read).length;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-heading font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                        <Bell className="w-7 h-7 text-brand-red" />
                        Señales
                    </h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">
                        {unread > 0 ? `${unread} notificación${unread !== 1 ? 'es' : ''} sin leer` : 'Todo al día'}
                    </p>
                </div>
                {unread > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-red hover:text-white transition-colors disabled:opacity-50"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                        Marcar todo leído
                    </button>
                )}
            </div>

            {/* List */}
            <div className="space-y-2">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                    ))
                ) : notifications.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-4 opacity-50">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <Bell className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-600 font-black uppercase tracking-[0.2em] text-sm">Sin señales en el radar</p>
                    </div>
                ) : (
                    notifications.map(notif => {
                        const timeAgo = formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es });
                        return (
                            <div
                                key={notif.id}
                                onClick={() => handleClick(notif)}
                                className={clsx(
                                    'relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 group',
                                    notif.is_read
                                        ? 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                                        : 'bg-white/[0.05] border-white/10 hover:bg-white/8 hover:border-white/20'
                                )}
                            >
                                {/* Unread dot */}
                                {!notif.is_read && (
                                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-brand-red shadow-[0_0_6px_rgba(220,38,38,0.8)]" />
                                )}

                                {/* Icon */}
                                <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0', getNotifBg(notif.type))}>
                                    {getNotifIcon(notif.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className={clsx('text-sm font-bold leading-snug', notif.is_read ? 'text-gray-400' : 'text-white')}>
                                        {notif.title}
                                    </p>
                                    {notif.content && (
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.content}</p>
                                    )}
                                    <p className="text-[10px] text-gray-600 font-medium mt-1.5 uppercase tracking-wider">{timeAgo}</p>
                                </div>

                                {/* Arrow if has link */}
                                {notif.link && (
                                    <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-brand-red transition-colors shrink-0 self-center" />
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
