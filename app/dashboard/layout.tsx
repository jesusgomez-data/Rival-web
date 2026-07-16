"use client";

import React, { useEffect, useState, useRef, useMemo, Fragment, Suspense } from "react";
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
    Instagram,
    BookOpen,
    Compass
} from "lucide-react";
import clsx from "clsx";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { getSavedAccounts, saveAccount, switchToAccount, clearActiveSessionLocally, type SavedAccount } from "@/utils/supabase/multi-account";

// ── Non-critical layout components — loaded after paint ──────────────────────
const PendingReviewPrompt = dynamic(() => import("./PendingReviewPrompt"),       { ssr: false, loading: () => null });
const SupportModal        = dynamic(() => import("./gyms/SupportModal"),          { ssr: false, loading: () => null });
const AnalyticsTracker    = dynamic(() => import("./admin/AnalyticsTracker"),     { ssr: false, loading: () => null });
const OnboardingTour      = dynamic(() => import("@/components/OnboardingTour"),  { ssr: false, loading: () => null });
const LiveActivityTicker  = dynamic(() => import("@/components/LiveActivityTicker"), { ssr: false, loading: () => null });

// ── Black Screen Fix for Capacitor/PWA ───────────────────────────────────────
// When the app is minimized on Android/iOS and the WebView is resumed after a 
// long idle period, the WebView can show a blank black screen. We detect when 
// the page becomes visible again after being hidden and force a paint cycle.
function useBlackScreenFix() {
    useEffect(() => {
        let hiddenAt: number | null = null;

        const onVisibilityChange = () => {
            if (document.hidden) {
                hiddenAt = Date.now();
            } else {
                const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
                hiddenAt = null;

                // Force a repaint to clear potential blank WebView state
                if (hiddenMs > 0) {
                    // Trigger a forced reflow/repaint on the body
                    document.body.style.opacity = '0.99';
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            document.body.style.opacity = '';
                        });
                    });
                }

                // Hard reload after very long background (> 10 min) to recover fully
                if (hiddenMs > 10 * 60 * 1000) {
                    window.location.reload();
                }
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);

        // Capacitor/Android also fires 'resume' on the window object
        const onResume = () => {
            document.body.style.opacity = '0.99';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    document.body.style.opacity = '';
                });
            });
        };
        window.addEventListener('resume', onResume);

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('resume', onResume);
        };
    }, []);
}

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
    const searchParams = useSearchParams();
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const { language, setLanguage, t } = useLanguage();

    // ── Apply the black screen fix for Capacitor/PWA ──────────────────────────
    useBlackScreenFix();

    const [profile, setProfile] = useState<any>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isBusinessUser, setIsBusinessUser] = useState(false);
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

    const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [isMobileSwitcherOpen, setIsMobileSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSavedAccounts(getSavedAccounts());
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsSwitcherOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        pathnameRef.current = pathname;
    }, [pathname]);

    // Hide bottom nav on scroll down, show on scroll up
    // Disabled to prevent layout shifts on scroll
    useEffect(() => {
        setShowBottomNav(true);
    }, []);

    useEffect(() => {
        let isMounted = true;
        async function loadProfile() {
            try {
                // Try to get session locally first to avoid network delay
                const { data: sessionData } = await supabase.auth.getSession();
                let user = sessionData?.session?.user || null;
                if (!user) {
                    const authResult = await supabase.auth.getUser();
                    user = authResult.data?.user || null;
                }

                if (user) {
                    cachedUserIdRef.current = user.id;
                    if (isMounted) setUserEmail(user.email?.toLowerCase() || null);
                }

                // Fetch database profile and unread messages in parallel
                const [profileData, unreadCount] = await Promise.all([
                    getUserProfile(),
                    getUnreadMessageCount(),
                ]);
                if (!isMounted) return;

                setProfile(profileData);
                setUnreadMessages(unreadCount);

                if (user) {
                    const [ownedRes, rolesRes] = await Promise.all([
                        supabase
                            .from('organizations')
                            .select('id', { count: 'exact', head: true })
                            .or(`owner_id.eq.${user.id},head_coach_id.eq.${user.id}`),
                        supabase
                            .from('center_roles')
                            .select('id', { count: 'exact', head: true })
                            .eq('user_id', user.id)
                            .in('role', ['owner', 'admin', 'head_coach', 'coach'])
                    ]);
                    const hasOwned = ownedRes.count !== null && ownedRes.count > 0;
                    const hasRoles = rolesRes.count !== null && rolesRes.count > 0;
                    if (isMounted) {
                        setIsBusinessUser(hasOwned || hasRoles);
                    }
                }

                if (profileData && sessionData?.session && user) {
                    saveAccount(
                        profileData.id,
                        user.email || '',
                        profileData.username,
                        profileData.full_name || '',
                        profileData.avatar_url || '',
                        profileData.level || '',
                        sessionData.session
                    );
                    if (isMounted) {
                        setSavedAccounts(getSavedAccounts());
                    }
                }

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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
            if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session) {
                const accounts = getSavedAccounts();
                const existing = accounts.find(a => a.userId === session.user.id);
                if (existing) {
                    saveAccount(
                        existing.userId,
                        existing.email,
                        existing.username,
                        existing.fullName,
                        existing.avatarUrl,
                        existing.level,
                        session
                    );
                    if (isMounted) {
                        setSavedAccounts(getSavedAccounts());
                    }
                } else if (profile && profile.id === session.user.id) {
                    saveAccount(
                        profile.id,
                        session.user.email || '',
                        profile.username,
                        profile.full_name || '',
                        profile.avatar_url || '',
                        profile.level || '',
                        session
                    );
                    if (isMounted) {
                        setSavedAccounts(getSavedAccounts());
                    }
                }
            }
        });

        return () => {
            isMounted = false;
            window.removeEventListener('profile-updated', handleProfileUpdate);
            subscription.unsubscribe();
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
                                }).catch(() => {});

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
                        }).catch(() => {});
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
            import("./notifications-actions").then(m => m.markMessageNotificationsAsRead());
        } else {
            getUnreadMessageCount().then(unread => {
                setUnreadMessages(unread);
            }).catch(() => {});
        }
    }, [pathname]);

    // Polling fallback — runs every 20s when Realtime drops. Skipped while the
    // tab is hidden so it doesn't stack extra session-refresh attempts against
    // the middleware's own refresh while the user is away from the tab.
    useEffect(() => {
        const interval = setInterval(() => {
            if (document.hidden) return;
            if (!pathnameRef.current?.startsWith('/dashboard/messages')) {
                getUnreadMessageCount().then(count => setUnreadMessages(count)).catch(() => {});
            }
        }, 20000);
        return () => clearInterval(interval);
    }, []);

    const handleAccountSwitch = async (userId: string, isActive: boolean) => {
        if (isActive) return;
        setIsSwitcherOpen(false);
        setIsMobileSwitcherOpen(false);
        
        const success = await switchToAccount(userId);
        if (success) {
            window.location.reload();
        } else {
            alert("No se pudo iniciar sesión en esta cuenta. Por favor vuelve a acceder.");
            setSavedAccounts(getSavedAccounts());
        }
    };

    const handleAddAccount = async () => {
        setIsSwitcherOpen(false);
        setIsMobileSwitcherOpen(false);
        
        if (profile) {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
                saveAccount(
                    profile.id,
                    userEmail || '',
                    profile.username,
                    profile.full_name || '',
                    profile.avatar_url || '',
                    profile.level || '',
                    sessionData.session
                );
            }
        }
        
        await clearActiveSessionLocally();
        router.push("/login?add_account=true");
    };

    const handleLogoutAccount = async (userId: string, isCurrent: boolean) => {
        setIsSwitcherOpen(false);
        setIsMobileSwitcherOpen(false);
        
        const { removeAccount } = await import('@/utils/supabase/multi-account');
        if (isCurrent) {
            await supabase.auth.signOut({ scope: 'local' });
            removeAccount(userId);
            window.location.reload();
        } else {
            removeAccount(userId);
            setSavedAccounts(getSavedAccounts());
        }
    };

    const handleLogout = async () => {
        if (profile?.id) {
            const { removeAccount } = await import('@/utils/supabase/multi-account');
            removeAccount(profile.id);
        }
        await supabase.auth.signOut();
        
        const remaining = getSavedAccounts();
        if (remaining.length > 0) {
            const success = await switchToAccount(remaining[0].userId);
            if (success) {
                window.location.reload();
                return;
            }
        }
        
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
        // { name: t.navDashboard.training, href: "/dashboard/training", icon: Dumbbell }, // hidden temporarily
        { name: "Mis Marcas", href: "/dashboard/hyrox", icon: Dumbbell },
        { name: "Nutrición", href: "/dashboard/nutrition", icon: Zap },
        { name: "Body Stats", href: "/dashboard/body-stats", icon: Activity },
        { name: t.navDashboard.affiliateGym, href: "/dashboard/gyms", icon: Building2 },
        { name: "Profesionales", href: "/dashboard/gyms?type=personal_trainer", icon: User },
        { name: "Mis Reservas", href: "/dashboard/my-bookings", icon: BookOpen },
        { name: "Explorar", href: "/dashboard/explore", icon: Compass },
        { name: "Competiciones", href: "/dashboard/competitions", icon: Flag },
        { name: t.navDashboard.leaderboard, href: "/dashboard/leaderboard", icon: Trophy },
        { name: t.navDashboard.analytics, href: "/dashboard/analytics", icon: BarChart2 },
        { name: t.navDashboard.profile, href: "/dashboard/profile", icon: Settings },
        ...(isAdmin === true ? [
            { name: "RIVAL COMMAND", href: "/dashboard/admin", icon: Shield },
        ] : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [isAdmin, t]);

    const isBusinessCenterRoute = pathname?.startsWith('/dashboard/gyms/') && pathname.split('/').length > 3;
    const hideSidebarDefault = pathname === '/dashboard/admin'; // Give admin its toggle, but not business centers
    const showSidebar = !isBusinessCenterRoute && (!hideSidebarDefault || isMenuOpen);
    const showMobileNav = !isBusinessCenterRoute && (!hideSidebarDefault || isMenuOpen);

    return (
        <>
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
                <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/95 backdrop-blur-xl h-screen fixed left-0 top-0 z-50 shadow-[4px_0_30px_rgba(0,0,0,0.15)]">
                    <div className="p-6 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-3">
                            <Image src="/logo.svg" alt="Rival Logo" width={32} height={32} className="w-8 h-8" />
                            <span className="font-heading font-bold text-2xl tracking-tight text-foreground uppercase italic">RIVAL</span>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            let isActive = pathname === item.href;
                            if (item.href.includes('?')) {
                                const [basePath, query] = item.href.split('?');
                                const urlParams = new URLSearchParams(query);
                                isActive = pathname === basePath && searchParams.get('type') === urlParams.get('type');
                            } else if (pathname === '/dashboard/gyms') {
                                isActive = pathname === item.href && !searchParams.get('type');
                            }
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 group relative overflow-hidden",
                                        isActive
                                            ? "bg-gradient-to-r from-brand-red to-red-700 text-white shadow-[0_4px_20px_rgba(220,38,38,0.35)] scale-[1.02]"
                                            : "text-gray-400 hover:bg-foreground/5 hover:text-foreground hover:translate-x-1"
                                    )}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/90 rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                                    )}
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

                    <div className="p-4 border-t border-border space-y-4 bg-card/50 backdrop-blur-sm relative">
                        <div className="px-2">
                            <SupportModal />
                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-full text-gray-500 hover:text-brand-red flex items-center gap-3 px-2 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-colors group/logout"
                        >
                            <LogOut className="w-4 h-4 group-hover/logout:-translate-x-1 transition-transform" /> {t.navDashboard.logout}
                        </button>

                        {/* Training button hidden temporarily */}

                        <div 
                            ref={switcherRef}
                            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                            className="flex items-center gap-3 px-2 py-2 group bg-foreground/5 rounded-2xl border border-transparent hover:border-brand-red/30 transition-all cursor-pointer relative"
                        >
                            {/* Desktop Switcher Popover */}
                            {isSwitcherOpen && (
                                <div 
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute bottom-[90px] left-0 right-0 bg-card border border-border rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-2 z-[200] animate-in slide-in-from-bottom-2 fade-in duration-200"
                                >
                                    <div className="px-3 py-1.5 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-border/50 mb-1">
                                        Cuentas
                                    </div>
                                    
                                    <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                                        {savedAccounts.map((account) => {
                                            const isActive = account.userId === profile?.id;
                                            return (
                                                <div
                                                    key={account.userId}
                                                    onClick={() => handleAccountSwitch(account.userId, isActive)}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all group/acc cursor-pointer",
                                                        isActive 
                                                            ? "bg-brand-red/10 border border-brand-red/20" 
                                                            : "hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className="w-7 h-7 rounded-full overflow-hidden relative shrink-0">
                                                        {account.avatarUrl ? (
                                                            <Image src={account.avatarUrl} alt={account.username} fill className="object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                                <User className="w-3.5 h-3.5 text-gray-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-bold text-foreground truncate leading-none mb-0.5">{account.fullName || 'Atleta'}</p>
                                                        <p className="text-[9px] text-gray-400 truncate leading-none">@{account.username}</p>
                                                    </div>
                                                    <div className="flex items-center shrink-0">
                                                        {isActive ? (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-red shrink-0" />
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleLogoutAccount(account.userId, false);
                                                                }}
                                                                className="text-[8px] font-bold text-gray-500 hover:text-brand-red uppercase tracking-wider px-1.5 py-0.5 hover:bg-brand-red/10 rounded-md transition-all opacity-0 group-hover/acc:opacity-100"
                                                            >
                                                                Quitar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="border-t border-border/50 my-1" />

                                    <button
                                        onClick={handleAddAccount}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-foreground"
                                    >
                                        <PlusCircle className="w-4 h-4 text-gray-400" />
                                        <span>Agregar Cuenta</span>
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-brand-red/10 transition-all text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-brand-red"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Cerrar sesión activa</span>
                                    </button>
                                </div>
                            )}

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
                            <span 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push("/dashboard/profile");
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                            >
                                <Settings className="w-4 h-4 text-gray-500 group-hover:text-foreground transition-colors" />
                            </span>
                        </div>
                    </div>
                </aside>
            )}

            <main className={clsx("flex-1 min-h-screen relative bg-background w-full overflow-x-hidden transition-all duration-300", showSidebar && "lg:ml-64")}>
                {/* Mobile Header Bar */}
                {showMobileNav && (
                    <div className="lg:hidden flex flex-col sticky top-0 bg-background z-[1000]">
                        <div style={{ height: 'max(12px, env(safe-area-inset-top))' }} className="w-full bg-background" />
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

                            <button 
                                onClick={() => setIsMobileSwitcherOpen(true)}
                                className="ml-2 relative shrink-0"
                            >
                                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-border">
                                    {profile?.avatar_url ? (
                                        <Image src={profile.avatar_url} alt="Profile" fill className="object-cover rounded-full" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-full">
                                            <User className="w-4 h-4 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {/* Mobile Search Overlay */}
                {showMobileSearch && showMobileNav && (
                    <div 
                        style={{ top: 'calc(80px + max(12px, env(safe-area-inset-top)))' }}
                        className="lg:hidden px-6 pb-6 pt-2 bg-background/95 backdrop-blur-xl border-b border-border sticky z-[190] animate-in slide-in-from-top-2 fade-in"
                    >
                        <GlobalSearch />
                    </div>
                )}

                {/* Mobile Menu Overlay */}
                {isMenuOpen && showMobileNav && (
                    <div 
                        style={{ top: 'calc(80px + max(12px, env(safe-area-inset-top)))' }}
                        className="fixed inset-x-0 bottom-0 bg-background z-[999] lg:hidden overflow-y-auto pb-32 animate-in fade-in slide-in-from-right-4 duration-300"
                    >
                        <div className="p-6 space-y-8">
                            {/* Profile Summary Removed by User Request */}

                            {/* Menu Items Grid */}
                            <div className="grid grid-cols-1 gap-2.5">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    let isActive = pathname === item.href;
                                    if (item.href.includes('?')) {
                                        const [basePath, query] = item.href.split('?');
                                        const urlParams = new URLSearchParams(query);
                                        isActive = pathname === basePath && searchParams.get('type') === urlParams.get('type');
                                    } else if (pathname === '/dashboard/gyms') {
                                        isActive = pathname === item.href && !searchParams.get('type');
                                    }
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
                                {/* Training button hidden temporarily */}
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
                    {showMobileNav && (
                        <div className="mb-6 px-3 sm:px-0">
                            <LiveActivityTicker />
                        </div>
                    )}
                    {children}
                </div>
            </main>
            </div>

            {/* Mobile Bottom Navigation - Placed outside the flex container to ensure standard viewport fixed layout */}
            {showMobileNav && (
                <nav className={clsx(
                    "lg:hidden fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/90 backdrop-blur-2xl border border-border py-3 px-6 z-[90] rounded-[2rem] shadow-2xl transition-transform duration-300 transform-gpu will-change-transform pb-3",
                    showBottomNav ? "translate-y-0" : "translate-y-32"
                )}>
                    <div className="grid grid-cols-5 items-center justify-items-center h-12 relative">
                        {navItems.filter(i => [t.navDashboard.home, t.navDashboard.messages, "Explorar", t.navDashboard.profile].includes(i.name)).map((item, idx) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Fragment key={item.href}>
                                    {idx === 2 && (
                                        <div className="w-12 h-12" aria-hidden="true" />
                                    )}
                                    <Link
                                        href={item.href}
                                        className={clsx(
                                            "flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all relative group",
                                            isActive ? "text-brand-red" : "text-gray-500 hover:text-white"
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
                                </Fragment>
                            )
                        })}

                        {/* Floating Center Button */}
                        <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center">
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

            {/* Mobile Bottom Sheet Drawer for Account Switcher */}
            {isMobileSwitcherOpen && (
                <div 
                    className="fixed inset-0 bg-black/70 z-[9999] flex items-end justify-center lg:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileSwitcherOpen(false)}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="w-full bg-[#111111] border-t border-border rounded-t-[2.5rem] p-6 pb-10 space-y-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
                    >
                        {/* Drag indicator handle */}
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
                        
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-500">Cambiar de cuenta</h3>
                            <p className="text-xs text-gray-400">Selecciona el perfil para continuar en Rival Fit.</p>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {savedAccounts.map((account) => {
                                const isActive = account.userId === profile?.id;
                                return (
                                    <div
                                        key={account.userId}
                                        onClick={() => handleAccountSwitch(account.userId, isActive)}
                                        className={clsx(
                                            "w-full flex items-center gap-4 p-4 rounded-2xl text-left border transition-all cursor-pointer relative",
                                            isActive 
                                                ? "bg-brand-red/10 border-brand-red/30 text-white" 
                                                : "bg-white/[0.02] border-white/5 text-gray-400 active:bg-white/5"
                                        )}
                                    >
                                        <div className="w-10 h-10 rounded-full overflow-hidden relative shrink-0">
                                            {account.avatarUrl ? (
                                                <Image src={account.avatarUrl} alt={account.username} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-foreground truncate">{account.fullName || 'Atleta'}</p>
                                            <p className="text-xs text-gray-400 truncate">@{account.username}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isActive ? (
                                                <span className="w-2.5 h-2.5 rounded-full bg-brand-red shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
                                            ) : (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleLogoutAccount(account.userId, false);
                                                    }}
                                                    className="text-[9px] font-black text-gray-400 hover:text-brand-red uppercase tracking-widest px-3 py-1.5 bg-white/5 active:bg-white/10 rounded-xl transition-all"
                                                >
                                                    Quitar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={handleAddAccount}
                                className="flex items-center justify-center gap-2 py-4 bg-white/[0.02] active:bg-white/5 border border-white/5 rounded-2xl font-black text-[10px] tracking-wider uppercase text-gray-300"
                            >
                                <PlusCircle className="w-4 h-4 text-gray-400" /> Agregar Cuenta
                            </button>
                            <Link
                                href="/dashboard/profile"
                                onClick={() => setIsMobileSwitcherOpen(false)}
                                className="flex items-center justify-center gap-2 py-4 bg-white/[0.02] active:bg-white/5 border border-white/5 rounded-2xl font-black text-[10px] tracking-wider uppercase text-gray-300"
                            >
                                <Settings className="w-4 h-4 text-gray-400" /> Configuración
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

import { UploadProvider } from "./UploadContext";
import { PresenceProvider } from "./PresenceContext";
import PushNotificationManager from "@/components/pwa/PushNotificationManager";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <UploadProvider>
            <VideoProvider>
                <StoryProvider>
                    <PresenceProvider>
                        <Suspense fallback={null}>
                            <DashboardContent>
                                {children}
                            </DashboardContent>
                        </Suspense>
                    </PresenceProvider>
                </StoryProvider>
            </VideoProvider>
            <PushNotificationManager />
        </UploadProvider>
    );
}

