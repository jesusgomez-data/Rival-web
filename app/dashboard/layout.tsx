"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { getUserProfile } from "./training/actions";
import { getUnreadMessageCount } from "./messages/actions";
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
    Menu,
    Sun,
    Moon,
    Shield,
    ChevronRight,
    ChevronLeft,
    Flag,
    Zap,
    Activity,
    Instagram
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
import { playNotificationSound } from "@/app/utils/audio";
import { VideoProvider } from "./VideoContext";
import dynamic from "next/dynamic";

// ── Non-critical layout components — loaded after paint ──────────────────────
const PendingReviewPrompt = dynamic(() => import("./PendingReviewPrompt"),       { ssr: false, loading: () => null });
const SupportModal        = dynamic(() => import("./gyms/SupportModal"),          { ssr: false, loading: () => null });
const AnalyticsTracker    = dynamic(() => import("./admin/AnalyticsTracker"),     { ssr: false, loading: () => null });
const OnboardingTour      = dynamic(() => import("@/components/OnboardingTour"),  { ssr: false, loading: () => null });

// ── New-user hint above the "+" button ────────────────────────────────────────
function NewUserHint() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        const seen = localStorage.getItem('rival_plus_hint_seen');
        if (!seen) {
            // Small delay so it doesn't flash on first render
            const t = setTimeout(() => setShow(true), 1200);
            return () => clearTimeout(t);
        }
    }, []);
    const dismiss = () => {
        setShow(false);
        localStorage.setItem('rival_plus_hint_seen', 'true');
    };
    if (!show) return null;
    return (
        <div
            onClick={dismiss}
            className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
            style={{ animation: 'hint-bounce 1.5s ease-in-out infinite' }}
        >
            <div className="flex flex-col items-center gap-0.5">
                <div className="bg-[#111] border border-brand-red/40 text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-2xl shadow-2xl whitespace-nowrap shadow-[0_0_20px_rgba(220,38,38,0.25)]">
                    <span className="text-brand-red">+</span> Post · WOD · PR · Historia
                </div>
                <div className="w-2 h-2 bg-[#111] border-r border-b border-brand-red/40 rotate-45 -mt-1" />
            </div>
            <style jsx>{`
                @keyframes hint-bounce {
                    0%, 100% { transform: translateX(-50%) translateY(0); }
                    50% { transform: translateX(-50%) translateY(-4px); }
                }
            `}</style>
        </div>
    );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    const [profile, setProfile] = useState<any>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showBottomNav, setShowBottomNav] = useState(true);
    const lastScrollY = useRef(0);
    const pathnameRef = useRef(pathname);
    const cachedUserIdRef = useRef<string | null>(null);
    const { userStories, openStory } = useStories();
    // useMemo ensures we reuse the singleton client, not create a new one on re-render
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    // Hide bottom nav on scroll down, show on scroll up
    // FIX: use useRef for lastScrollY so the effect is stable (no re-registration on each scroll)
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Only hide/show if scrolled more than 50px
            if (currentScrollY > 50) {
                if (currentScrollY > lastScrollY.current) {
                    setShowBottomNav(false);
                } else {
                    setShowBottomNav(true);
                }
            } else {
                setShowBottomNav(true);
            }

            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // empty deps: register once, never re-register

    useEffect(() => {
        let isMounted = true;
        async function loadProfile() {
            try {
                // Fire all 3 requests in parallel — saves ~400ms vs sequential
                const [authResult, profileData, unreadCount] = await Promise.all([
                    supabase.auth.getUser(),
                    getUserProfile(),
                    getUnreadMessageCount(),
                ]);
                if (!isMounted) return;

                const user = authResult.data?.user;
                if (user) {
                    cachedUserIdRef.current = user.id;
                    setUserEmail(user.email?.toLowerCase() || null);
                }
                setProfile(profileData);
                setUnreadMessages(unreadCount);

                if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            } catch (err) {
                console.error('loadProfile error:', err);
            }
        }
        loadProfile();

        const handleProfileUpdate = () => {
            loadProfile();
        };

        window.addEventListener('profile-updated', handleProfileUpdate);

        if (typeof Notification !== 'undefined' && Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => {
            isMounted = false;
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, [supabase]);

    useEffect(() => {
        let channel: any;
        const setupRealtime = async () => {
            // Reuse cached user ID when available — avoids extra auth.getUser() roundtrip
            let userId = cachedUserIdRef.current;
            if (!userId) {
                const { data: authData } = await supabase.auth.getUser();
                userId = authData?.user?.id || null;
                if (userId) cachedUserIdRef.current = userId;
            }
            const user = userId ? { id: userId } : null;
            if (!user || !isMounted) return;

            channel = supabase
                .channel(`notifs:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications'
                    },
                    (payload: any) => {
                        const newNotif = payload.new;
                        // Manual filtering for reliability
                        if (newNotif.user_id === user.id && newNotif.type === 'message') {
                            playNotificationSound();
                            
                            // Only refresh count and show browser notif if NOT in messages tab
                            if (!pathnameRef.current?.startsWith('/dashboard/messages')) {
                                getUnreadMessageCount().then(count => {
                                    if (isMounted) setUnreadMessages(count);
                                });

                                if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
                                    new Notification("Rival Fit", {
                                        body: newNotif.content || "Nuevo mensaje recibido",
                                        icon: "/logo.svg",
                                        tag: newNotif.link || 'messages'
                                    });
                                }
                            }
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'conversation_participants',
                        filter: `user_id=eq.${user.id}`
                    },
                    () => {
                        // Refresh count on any change (read messages, new message, etc)
                        getUnreadMessageCount().then(count => {
                            if (!isMounted) return;
                            // Use Ref for current pathname to avoid stale closures
                            if (pathnameRef.current?.startsWith('/dashboard/messages')) {
                                setUnreadMessages(0);
                            } else {
                                setUnreadMessages(count);
                            }
                        });
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    },
                    (payload: { new: Record<string, unknown> }) => {
                        if (isMounted) setProfile(payload.new);
                    }
                )
                .subscribe((status: string) => {
                    if (status !== 'SUBSCRIBED') {
                        console.warn(`[Realtime] Subscription status for notifications (${user.id}): ${status}`);
                    }
                });

        };

        let isMounted = true;
        setupRealtime();
        return () => {
            isMounted = false;
            if (channel) supabase.removeChannel(channel);
        };
    }, [supabase]);

    useEffect(() => {
        if (pathname?.startsWith('/dashboard/messages')) {
            setUnreadMessages(0);
            // Clear message notifications when entering the messages page
            import("./notifications-actions").then(m => m.markMessageNotificationsAsRead());
        } else {
            getUnreadMessageCount().then(unread => {
                setUnreadMessages(unread);
            });
        }
    }, [pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // Strict admin whitelist - ONLY these specific emails can access admin panel
    const ADMIN_EMAILS = useMemo(() => ['rival.app.official@gmail.com', 'jesusgomez.s@hotmail.com'], []);
    const isAdmin = userEmail && typeof userEmail === 'string' && ADMIN_EMAILS.includes(userEmail.toLowerCase().trim());

    const navItems = useMemo(() => [
        { name: t.navDashboard.home, href: "/dashboard", icon: Home },
        { name: t.navDashboard.messages, href: "/dashboard/messages", icon: MessageSquarePlus },
        { name: t.navDashboard.onlineCoach, href: "/dashboard/coach", icon: MessageCircle },
        { name: t.navDashboard.training, href: "/dashboard/training", icon: Dumbbell },
        { name: "Nutrición", href: "/dashboard/nutrition", icon: Zap },
        { name: "Body Stats", href: "/dashboard/body-stats", icon: Activity },
        { name: t.navDashboard.affiliateGym, href: "/dashboard/gyms", icon: Building2 },
        { name: "Profesionales", href: "/dashboard/gyms?type=personal_trainer", icon: User },
        { name: t.navDashboard.community, href: "/dashboard/community", icon: Users },
        { name: "Competiciones", href: "/dashboard/competitions", icon: Flag },
        { name: t.navDashboard.leaderboard, href: "/dashboard/leaderboard", icon: Trophy },
        { name: t.navDashboard.analytics, href: "/dashboard/analytics", icon: BarChart2 },
        { name: t.navDashboard.profile, href: "/dashboard/profile", icon: Settings },
        ...(isAdmin === true ? [
            { name: "RIVAL COMMAND", href: "/dashboard/admin", icon: Shield },
            { name: "Canal Oficial", href: "/dashboard/admin/official-posts", icon: Trophy },
            { name: "Social Media", href: "/dashboard/admin/social-media", icon: Instagram },
        ] : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [isAdmin, t]);

    const isBusinessCenterRoute = pathname?.startsWith('/dashboard/gyms/') && pathname.split('/').length > 3;
    const hideSidebarDefault = pathname === '/dashboard/admin'; // Give admin its toggle, but not business centers
    const showSidebar = !isBusinessCenterRoute && (!hideSidebarDefault || isMenuOpen);
    const showMobileNav = !isBusinessCenterRoute && (!hideSidebarDefault || isMenuOpen);

    return (
        <div className="min-h-screen bg-background flex font-sans text-foreground selection:bg-brand-red selection:text-white transition-colors duration-300 overflow-x-hidden">
            <AnalyticsTracker />
            {/* Sidebar Toggle Button (Floating) - Only for Admin, not for business centers */}
            {hideSidebarDefault && !isBusinessCenterRoute && (
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={clsx(
                        "fixed top-1/2 -translate-y-1/2 z-[101] bg-brand-red text-white p-2 rounded-r-2xl shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all duration-300",
                        isMenuOpen ? "left-64" : "left-0"
                    )}
                >
                    {isMenuOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
            )}

            {/* Sidebar Navigation (Desktop) */}
            {showSidebar && (
                <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card h-screen fixed left-0 top-0 z-50">
                    <div className="p-6 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-3">
                            <Image src="/logo.svg" alt="Rival Logo" width={32} height={32} className="w-8 h-8" />
                            <span className="font-heading font-bold text-2xl tracking-tight text-foreground uppercase italic">RIVAL</span>
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
                                        {item.href === "/dashboard/messages" && unreadMessages > 0 && (
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

                    <div className="p-4 border-t border-border space-y-4 bg-card/50 backdrop-blur-sm">
                        <div className="px-2">
                            <SupportModal />
                        </div>

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
                                </div>
                                <p className="text-[9px] text-gray-400 truncate font-black uppercase tracking-widest leading-none">{profile?.level ? `Soldado Lvl ${profile.level}` : 'Recluta'}</p>
                            </div>
                            <Settings className="w-4 h-4 text-gray-500 group-hover:text-foreground transition-colors shrink-0" />
                        </Link>
                    </div>
                </aside>
            )}

            <main className={clsx("flex-1 min-h-screen relative bg-background w-full overflow-x-hidden transition-all duration-300", showSidebar && "lg:ml-64")}>
                {/* Mobile Header Bar */}
                {showMobileNav && (
                    <div className="lg:hidden flex flex-col sticky top-0 bg-background z-[200]">
                        <div className="h-[env(safe-area-inset-top)] w-full bg-background" />
                        <div className="h-20 flex items-center justify-between px-6">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Image src="/logo.svg" alt="Rival Logo" width={28} height={28} className="w-7 h-7" />
                                <span className="font-heading font-bold text-xl text-foreground uppercase italic tracking-tight">RIVAL</span>
                            </div>

                            {/* Icons moved next to logo */}
                            <div className="flex items-center gap-1 ml-2 pl-3">
                                <ThemeToggle className="bg-transparent border-none p-1.5" />
                                <NotificationBell />
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button onClick={() => setShowMobileSearch(!showMobileSearch)} className="p-2.5 text-gray-400 hover:text-white transition-colors">
                                {showMobileSearch ? <X className="w-6 h-6" /> : <SearchIcon className="w-6 h-6" />}
                            </button>

                            <button
                                onClick={() => {
                                    setIsMenuOpen(!isMenuOpen);
                                    setShowMobileSearch(false);
                                }}
                                className="p-2.5 text-gray-400 hover:text-white transition-colors"
                            >
                                {isMenuOpen ? <X className="w-6 h-6 text-brand-red" /> : <Menu className="w-6 h-6" />}
                            </button>

                            <Link href="/dashboard/profile" className="ml-2 relative shrink-0">
                                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-border">
                                    {profile?.avatar_url ? (
                                        <Image src={profile.avatar_url} alt="Profile" fill className="object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-full">
                                            <User className="w-4 h-4 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
                )}

                {/* Mobile Search Overlay */}
                {showMobileSearch && showMobileNav && (
                    <div className="lg:hidden px-6 pb-6 pt-2 bg-background/95 backdrop-blur-xl border-b border-border sticky top-20 z-[190] animate-in slide-in-from-top-2 fade-in">
                        <GlobalSearch />
                    </div>
                )}

                {/* Mobile Menu Overlay */}
                {isMenuOpen && showMobileNav && (
                    <div className="fixed inset-0 top-20 bg-background z-[999] lg:hidden overflow-y-auto pb-32 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-6 space-y-8">
                            {/* Profile Summary Removed by User Request */}

                            {/* Menu Items Grid */}
                            <div className="grid grid-cols-1 gap-2.5">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMenuOpen(false)}
                                            className={clsx(
                                                "flex items-center gap-4 px-6 py-4.5 rounded-2xl font-black transition-all group border",
                                                isActive ? "bg-brand-red border-brand-red text-white shadow-glow-sm" : "bg-white/[0.02] border-white/5 text-gray-400 active:bg-white/5"
                                            )}
                                        >
                                            <Icon className={clsx("w-6 h-6", isActive ? "text-white" : "group-active:text-white")} />
                                            <div className="flex-1 flex items-center justify-between">
                                                <span className="uppercase text-[11px] tracking-widest">{item.name}</span>
                                            </div>
                                            <ChevronRight className={clsx("w-4 h-4 opacity-20", isActive && "opacity-100")} />
                                        </Link>
                                    )
                                })}
                                <div className="px-2 pt-2">
                                    <SupportModal />
                                </div>
                            </div>

                            {/* Menu Actions */}
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <Link
                                    href="/dashboard/training/session"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="w-full bg-brand-red text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-glow-sm uppercase text-[11px] tracking-widest active:scale-[0.98] transition-all"
                                >
                                    <PlusCircle className="w-5 h-5" /> Iniciar Entrenamiento
                                </Link>
                                <button
                                    onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                                    className="w-full bg-white/[0.02] text-gray-500 py-4.5 rounded-2xl font-black flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest border border-white/5"
                                >
                                    <LogOut className="w-4 h-4" /> Cerrar Sesión
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className={clsx("mx-auto w-full transition-all duration-300",
                    (hideSidebarDefault || isBusinessCenterRoute) && !isMenuOpen ? "h-full p-0 max-w-none" : "px-0 pt-6 pb-32 lg:p-8 max-w-7xl"
                )}>
                    {showMobileNav && (
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

            {/* Mobile Bottom Navigation */}
            {showMobileNav && (
                <nav className={clsx(
                    "lg:hidden fixed bottom-4 left-4 right-4 bg-background/90 backdrop-blur-2xl border border-border py-3 px-6 z-[100] rounded-[2rem] shadow-2xl safe-area-inset-bottom transition-transform duration-300",
                    showBottomNav ? "translate-y-0" : "translate-y-32"
                )}>
                    <div className="flex justify-between items-center h-12 relative">
                        {navItems.filter(i => [t.navDashboard.home, t.navDashboard.messages, t.navDashboard.onlineCoach, t.navDashboard.community].includes(i.name)).map((item, idx) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(
                                        "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all relative group",
                                        isActive ? "text-brand-red" : "text-gray-500 hover:text-white",
                                        idx === 1 && "mr-10",
                                        idx === 2 && "ml-10"
                                    )}
                                >
                                    <div className="relative">
                                        <Icon className={clsx("w-6 h-6 transition-transform group-active:scale-90", isActive && "drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
                                        {item.href === "/dashboard/messages" && unreadMessages > 0 && !isActive && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-[8px] font-black rounded-full flex items-center justify-center border border-background animate-pulse">
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

                        {/* Floating Center Button */}
                        <div className="absolute left-1/2 -translate-x-1/2 -top-10 flex flex-col items-center">
                            {/* Tooltip hint for new users */}
                            <NewUserHint />
                            <Link
                                href="/dashboard?create=true"
                                className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-brand-red to-[#991b1b] text-white shadow-[0_8px_25px_rgba(220,38,38,0.6)] border-4 border-background hover:scale-110 active:scale-95 transition-all duration-300 group relative"
                            >
                                <PlusCircle className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
                            </Link>
                        </div>
                    </div>
                </nav>
            )}


            <PendingReviewPrompt />
            <OnboardingTour />
        </div>
    );
}

import { UploadProvider } from "./UploadContext";

import { PresenceProvider } from "./PresenceContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <UploadProvider>
            <VideoProvider>
                <StoryProvider>
                    <PresenceProvider>
                        <DashboardContent>
                            {children}
                        </DashboardContent>
                    </PresenceProvider>
                </StoryProvider>
            </VideoProvider>
        </UploadProvider>
    );
}
