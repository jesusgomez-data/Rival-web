"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getUserProfile } from "./training/actions";
import GlobalSearch from "./GlobalSearch";
import {
    Home,
    Dumbbell,
    Users,
    User,
    Trophy,
    Settings,
    LogOut,
    MessageCircle,
    MessageSquarePlus,
    PlusCircle,
    BarChart2,
    Building2,
    Search as SearchIcon,
    X,
    Sun,
    Moon,
    Shield
} from "lucide-react";
import clsx from "clsx";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import { StoryProvider, useStories } from "./stories/StoryContext";
import { useTheme } from "../ThemeContext";
import { useLanguage } from "@/app/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import PendingReviewPrompt from "./PendingReviewPrompt";

function DashboardContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    const [profile, setProfile] = useState<any>(null);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const { userStories, openStory } = useStories();
    const supabase = createClient();

    useEffect(() => {
        async function loadProfile() {
            const data = await getUserProfile();
            setProfile(data);
        }
        loadProfile();

        // Pedir permiso de notificaciones al entrar al dashboard
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const setupRealtime = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Simple listener for new messages
            // In a real app, we might want to check if the message is for a conversation the user is in
            // But RLS should restrict this anyway if configured correctly.
            const channel = supabase
                .channel('global-chat-notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages'
                    },
                    (payload) => {
                        // Solo notificar si el mensaje NO es mío
                        if (payload.new.sender_id !== user.id) {
                            // Si NO estoy en la página de mensajes, aumentar contador y lanzar push
                            if (!pathname?.startsWith('/dashboard/messages')) {
                                setUnreadMessages(prev => prev + 1);

                                if ("Notification" in window && Notification.permission === "granted") {
                                    new Notification("Rival: Nuevo Mensaje", {
                                        body: payload.new.text,
                                        icon: "/logo.svg",
                                        tag: payload.new.conversation_id // Agrupar por chat
                                    });
                                }
                            }
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupRealtime();
    }, [pathname, supabase]);

    useEffect(() => {
        if (pathname?.startsWith('/dashboard/messages')) {
            setUnreadMessages(0);
        }
    }, [pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    const navItems = [
        { name: t.navDashboard.home, href: "/dashboard", icon: Home },
        { name: t.navDashboard.messages, href: "/dashboard/messages", icon: MessageSquarePlus },
        { name: t.navDashboard.onlineCoach, href: "/dashboard/coach", icon: MessageCircle },
        { name: t.navDashboard.training, href: "/dashboard/training", icon: Dumbbell },
        { name: t.navDashboard.affiliateGym, href: "/dashboard/gyms", icon: Building2 },
        { name: t.navDashboard.community, href: "/dashboard/community", icon: Users },
        { name: t.navDashboard.leaderboard, href: "/dashboard/leaderboard", icon: Trophy },
        { name: t.navDashboard.analytics, href: "/dashboard/analytics", icon: BarChart2 },
        { name: t.navDashboard.profile, href: "/dashboard/profile", icon: Settings },
        { name: "Rival Command", href: "/dashboard/admin", icon: Shield },
    ];

    const isGymView = pathname?.startsWith('/dashboard/gyms/') && pathname.split('/').length > 3;

    return (
        <div className="min-h-screen bg-background flex font-sans text-foreground selection:bg-brand-red selection:text-white transition-colors duration-300">
            {/* Sidebar Navigation (Desktop) */}
            {!isGymView && (
                <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card h-screen fixed left-0 top-0 z-50">
                    <div className="p-6 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-3">
                            <Image src="/logo.svg" alt="Rival Logo" width={32} height={32} className="w-8 h-8" />
                            <span className="font-heading font-bold text-2xl tracking-tighter text-foreground uppercase italic">RIVAL</span>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all group relative",
                                        isActive
                                            ? "bg-brand-red text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                                            : "text-gray-400 hover:bg-foreground/5 hover:text-foreground"
                                    )}
                                >
                                    <div className="relative">
                                        <Icon className={clsx("w-5 h-5", isActive ? "text-white" : "group-hover:text-foreground")} />
                                        {(item.name === t.navDashboard.messages) && unreadMessages > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-brand-red text-[8px] font-black rounded-full flex items-center justify-center border border-brand-red animate-bounce">
                                                {unreadMessages}
                                            </span>
                                        )}
                                    </div>
                                    {item.name}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="p-4 border-t border-border space-y-3 bg-card/50 backdrop-blur-sm">
                        <button
                            onClick={handleLogout}
                            className="w-full text-gray-500 hover:text-brand-red flex items-center gap-3 px-2 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-colors group/logout"
                        >
                            <LogOut className="w-4 h-4 group-hover/logout:-translate-x-1 transition-transform" /> {t.navDashboard.logout}
                        </button>

                        <Link href="/dashboard/training/session" className="w-full bg-background border border-border text-foreground py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-red hover:text-white hover:border-brand-red transition-all shadow-xl uppercase text-[10px] tracking-wider">
                            <PlusCircle className="w-4 h-4" /> {t.navDashboard.startTraining}
                        </Link>

                        <Link href="/dashboard/profile" className="flex items-center gap-3 px-2 py-2 group bg-foreground/5 rounded-2xl border border-transparent hover:border-brand-red/30 transition-all">
                            <div
                                onClick={(e) => {
                                    const hasStory = userStories.some((us: any) => us.user.id === profile?.id);
                                    if (hasStory) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openStory(profile?.id);
                                    }
                                }}
                                className={clsx(
                                    "w-9 h-9 rounded-full overflow-hidden relative border transition-all shrink-0",
                                    userStories.some((us: any) => us.user.id === profile?.id)
                                        ? "ring-2 ring-brand-red shadow-glow"
                                        : "bg-gray-700 border-border group-hover:border-brand-red"
                                )}
                            >
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="User" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                        <User className="w-4 h-4 text-gray-500" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 leading-none mb-1">
                                    <p className="text-xs font-bold text-foreground truncate">{profile?.full_name || 'Atleta'}</p>
                                    {profile?.subscription_tier && profile?.subscription_tier !== 'free' && (
                                        <span className={clsx(
                                            "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter shrink-0",
                                            profile.subscription_tier === 'premium' ? "bg-brand-red text-white" : "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                                        )}>
                                            {profile.subscription_tier}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[9px] text-gray-400 truncate font-black uppercase tracking-widest leading-none">{profile?.level ? `Soldado Lvl ${profile.level}` : 'Recluta'}</p>
                            </div>
                            <Settings className="w-4 h-4 text-gray-500 group-hover:text-foreground transition-colors shrink-0" />
                        </Link>
                    </div>
                </aside>
            )}

            <main className={clsx("flex-1 min-h-screen relative bg-background w-full overflow-x-hidden", !isGymView && "lg:ml-64")}>
                {/* Mobile Header */}
                <div className="lg:hidden h-16 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-background/95 backdrop-blur-md z-[70]">
                    <div className="flex items-center gap-2">
                        {!showMobileSearch ? (
                            <>
                                <Image src="/logo.svg" alt="Rival Logo" width={24} height={24} className="w-6 h-6" />
                                <span className="font-heading font-bold text-xl text-foreground uppercase italic">RIVAL</span>
                            </>
                        ) : (
                            <div className="flex-1 mr-2">
                                <GlobalSearch />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="p-2 text-gray-400 hover:text-foreground">
                            {showMobileSearch ? <X className="w-5 h-5" /> : <SearchIcon className="w-5 h-5" />}
                        </button>
                        {!showMobileSearch && (
                            <>
                                <ThemeToggle className="bg-transparent border-none p-2 shadow-none" />
                                <NotificationBell />
                                <Link href="/dashboard/profile" className="relative group shrink-0">
                                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/10 group-hover:border-brand-red transition-all">
                                        {profile?.avatar_url ? (
                                            <Image src={profile.avatar_url} alt="Profile" fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                <User className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                <div className={clsx("mx-auto", isGymView ? "h-full p-0 max-w-none" : "p-4 pb-24 lg:p-8 max-w-7xl")}>
                    {!isGymView && (
                        <header className="hidden lg:flex items-center justify-between mb-8">
                            <div className="flex-1 max-w-xl">
                                <GlobalSearch />
                            </div>
                            <div className="flex items-center gap-4">
                                <ThemeToggle />
                                <NotificationBell />
                                <Link href="/dashboard/profile" className="w-9 h-9 rounded-full bg-brand-gray border border-white/10 hover:border-brand-red transition-all shrink-0 overflow-hidden flex items-center justify-center group/profile">
                                    {profile?.avatar_url ? (
                                        <Image src={profile.avatar_url} alt="Profile" width={36} height={36} className="w-full h-full object-cover group-hover/profile:scale-110 transition-transform" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-brand-red/20 to-brand-red/5 flex items-center justify-center text-brand-red font-black text-xs italic">
                                            {(profile?.full_name || 'A')[0].toUpperCase()}
                                        </div>
                                    )}
                                </Link>
                            </div>
                        </header>
                    )}
                    {children}
                </div>
            </main>

            {!isGymView && (
                <nav className="lg:hidden fixed bottom-0 w-full bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 py-2 px-4 z-[100] safe-area-inset-bottom">
                    <div className="flex justify-between items-center h-16 relative">
                        {navItems.filter(i => [t.navDashboard.home, t.navDashboard.messages, t.navDashboard.onlineCoach, t.navDashboard.community].includes(i.name)).map((item, idx) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            // Add a spacer for the central FAB if needed, or just let them group
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(
                                        "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all relative group",
                                        isActive ? "text-brand-red" : "text-gray-500 hover:text-foreground",
                                        idx === 1 && "mr-12", // Leave space for FAB
                                        idx === 2 && "ml-12"  // Leave space for FAB
                                    )}
                                >
                                    <div className="relative">
                                        <Icon className={clsx("w-6 h-6 transition-transform group-active:scale-90", isActive && "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
                                        {item.name === t.navDashboard.messages && unreadMessages > 0 && !isActive && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-[8px] font-black rounded-full flex items-center justify-center border border-[#0a0a0a] animate-pulse">
                                                {unreadMessages}
                                            </span>
                                        )}
                                    </div>
                                    {isActive && (
                                        <span className="absolute -bottom-1 w-1 h-1 bg-brand-red rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    )}
                                </Link>
                            )
                        })}

                        {/* Improved Floating Action Button */}
                        <div className="absolute left-1/2 -translate-x-1/2 -top-8">
                            <Link
                                href="/dashboard/training/session"
                                className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-red to-[#991b1b] text-white shadow-[0_8px_20px_rgba(220,38,38,0.5)] border-4 border-[#0a0a0a] hover:scale-110 active:scale-95 transition-all duration-300 group"
                            >
                                <PlusCircle className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
                                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                        </div>
                    </div>
                </nav>
            )}
            <PendingReviewPrompt />
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <StoryProvider>
            <DashboardContent>
                {children}
            </DashboardContent>
        </StoryProvider>
    );
}
