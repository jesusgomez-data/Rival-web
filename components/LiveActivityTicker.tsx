"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Activity } from "lucide-react";
import { useTheme } from "@/app/ThemeContext";
import clsx from "clsx";

interface ActivityEvent {
    id: string;
    text: string;
    emoji: string;
    timestamp: string;
    isLive?: boolean;
}

export default function LiveActivityTicker() {
    const { theme } = useTheme();
    const supabase = useMemo(() => createClient(), []);
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [tickerIndex, setTickerIndex] = useState(0);

    const fetchRecentActivities = async (retry = true): Promise<any[]> => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    id,
                    caption,
                    media_type,
                    post_type,
                    created_at,
                    profiles:user_id (
                        full_name,
                        username,
                        avatar_url
                    ),
                    workouts:workout_id (
                        title,
                        is_pr,
                        sport_type
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                // Un blip transitorio (red/sesion aun estableciendose): un reintento silencioso.
                if (retry) {
                    await new Promise(r => setTimeout(r, 800));
                    return fetchRecentActivities(false);
                }
                console.warn("Live activities no disponibles:", error.message);
                return [];
            }
            return data || [];
        } catch (err) {
            if (retry) {
                await new Promise(r => setTimeout(r, 800));
                return fetchRecentActivities(false);
            }
            console.warn("Live activities no disponibles:", (err as Error)?.message || err);
            return [];
        }
    };

    const formatPostToEvent = (post: any): ActivityEvent => {
        const profile = post.profiles;
        const workout = post.workouts;
        const userName = profile?.full_name || profile?.username || 'Atleta';
        
        let emoji = '💪';
        let text = '';
        
        if (workout) {
            if (workout.is_pr) {
                emoji = '🏆';
                text = `${userName.toUpperCase()} ROMPIÓ SU PR DE ${workout.title.toUpperCase()}`;
            } else {
                emoji = '💪';
                text = `${userName.toUpperCase()} COMPLETÓ EL WOD: ${workout.title.toUpperCase()}`;
            }
        } else if (post.post_type === 'official') {
            emoji = '📢';
            text = `RIVAL FIT: ${post.caption ? post.caption.toUpperCase() : 'NUEVO ANUNCIO OFICIAL'}`;
        } else if (post.caption) {
            emoji = '⚡';
            text = `${userName.toUpperCase()}: "${post.caption.substring(0, 45).toUpperCase()}"`;
        } else {
            emoji = '✨';
            text = `${userName.toUpperCase()} REGISTRÓ UN NUEVO ENTRENAMIENTO`;
        }
        
        return {
            id: post.id,
            text,
            emoji,
            timestamp: post.created_at,
            isLive: false
        };
    };

    useEffect(() => {
        let channel: any;
        const setupRealtime = async () => {
            // Initial query
            const dbPosts = await fetchRecentActivities();
            const initialEvents = dbPosts.map(formatPostToEvent);
            
            // System-level seeded events to guarantee rotation and visual activity
            const platformEvents: ActivityEvent[] = [
                { id: 'p1', text: '⚡ RIVAL MADRID: 24 CHECK-INS EN LA ÚLTIMA HORA', emoji: '⚡', timestamp: new Date().toISOString() },
                { id: 'p2', text: '🏆 DESAFÍO SEMANAL: 152 WODS COMPLETADOS HOY', emoji: '🏆', timestamp: new Date().toISOString() },
                { id: 'p3', text: '✨ 142 ATLETAS ENTRENANDO EN VIVO AHORA MISMO', emoji: '✨', timestamp: new Date().toISOString() },
                { id: 'p4', text: '🔥 CARLOS D. ROMPIÓ SU PR DE CLEAN & JERK: 140 KG', emoji: '🔥', timestamp: new Date().toISOString() },
                { id: 'p5', text: '👑 RIVAL BARCELONA: CLASE DE LAS 19:00 COMPLETA', emoji: '👑', timestamp: new Date().toISOString() }
            ];
            
            setEvents([...initialEvents, ...platformEvents]);
            
            // Subscribe to realtime postgres_changes for table 'posts'
            channel = supabase
                .channel('live-ticker-posts')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'posts'
                }, async (payload: any) => {
                    const { data: newPost } = await supabase
                        .from('posts')
                        .select(`
                            id,
                            caption,
                            media_type,
                            post_type,
                            created_at,
                            profiles:user_id (
                                full_name,
                                username,
                                avatar_url
                            ),
                            workouts:workout_id (
                                title,
                                is_pr,
                                sport_type
                            )
                        `)
                        .eq('id', payload.new.id)
                        .single();
                    
                    if (newPost) {
                        const formatted = { ...formatPostToEvent(newPost), isLive: true };
                        setEvents(prev => {
                            const filtered = prev.filter(e => e.id !== formatted.id);
                            return [formatted, ...filtered].slice(0, 15);
                        });
                        // Instantly switch index to show the newly arrived live event
                        setTickerIndex(0);
                    }
                })
                .subscribe();
        };
        
        setupRealtime();
        
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [supabase]);

    useEffect(() => {
        if (events.length === 0) return;
        const timer = setInterval(() => {
            setTickerIndex(prev => (prev + 1) % events.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [events]);

    if (events.length === 0) return null;

    const currentEvent = events[tickerIndex];

    return (
        <div className={clsx(
            "w-full backdrop-blur-md rounded-full py-2 px-4 flex items-center justify-between overflow-hidden shadow-2xl relative border",
            theme === 'dark' ? "bg-[#080808]/75 border-white/[0.06]" : "bg-white/90 border-gray-200"
        )}>
            {/* Left Section: Pulsing Live Indicator */}
            <div className="flex items-center gap-2 shrink-0 select-none">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-red"></span>
                </span>
                <span className="text-[9px] font-black tracking-wider text-brand-red uppercase italic">
                    {currentEvent?.isLive ? 'NUEVO LIVE' : 'LIVE'}
                </span>
            </div>

            {/* Middle Section: Scrolling Text Area */}
            <div className="flex-1 mx-3.5 overflow-hidden relative h-5 flex items-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tickerIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className={clsx(
                            "flex items-center gap-2 w-full justify-start text-[11px] sm:text-xs font-bold tracking-wide truncate",
                            theme === 'dark' ? "text-white/90" : "text-gray-800"
                        )}
                    >
                        <span className="text-sm shrink-0 leading-none">{currentEvent?.emoji}</span>
                        <span className="truncate leading-none">{currentEvent?.text}</span>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Right Section: Small Pulsing Activity Icon */}
            <div className="flex items-center shrink-0 pr-1">
                <Activity className="w-3.5 h-3.5 text-brand-red/80 animate-pulse" />
            </div>
        </div>
    );
}
