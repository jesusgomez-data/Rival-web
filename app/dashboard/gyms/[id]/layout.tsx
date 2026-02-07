import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    Users,
    Settings,
    Dumbbell,
    Shield,
    LogOut,
    ShoppingBag,
    Zap,
    Eye,
    Edit
} from "lucide-react";
import NotificationBell from "../../NotificationBell";
import GlobalSearch from "../../GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";
import SidebarNav from "./SidebarNav";


export default async function CenterLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch Organization
    const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !org) {
        notFound();
    }

    // Verify Access (Role check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/');

    const isOwner = org.owner_id === user.id;
    let userRole = isOwner ? 'owner' : null;

    if (!isOwner) {
        const { data: roleData } = await supabase
            .from('center_roles')
            .select('role')
            .eq('organization_id', id)
            .eq('user_id', user.id)
            .single();

        if (!roleData) {
            redirect('/dashboard/gyms'); // No access
        }
        userRole = roleData.role;
    }

    // Fetch User Profile for Header
    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();

    const isAdmin = userRole === 'owner' || userRole === 'head_coach';
    const roleLabel = userRole === 'owner' ? 'VISTA DE PROPIETARIO' : userRole === 'head_coach' ? 'VISTA DE HEAD COACH' : 'VISTA DE COACH';

    return (
        <div className="flex h-[100dvh] bg-background overflow-hidden font-sans">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-card hidden lg:flex flex-col h-full">
                <div className="p-6 border-b border-border flex justify-between items-start shrink-0">
                    <div className="flex-1 min-w-0 pr-2">
                        <Link href={`/gym/${org.id}`} className="hover:opacity-80 transition-opacity block">
                            <h2 className="font-heading font-black text-foreground italic truncate" title={org.name}>{org.name}</h2>
                        </Link>
                        <p className="text-xs text-brand-red font-bold uppercase tracking-widest mt-1">{roleLabel}</p>
                    </div>

                </div>
                <SidebarNav id={id} isAdmin={isAdmin} />
                <div className="p-4 border-t border-border shrink-0">
                    <Link href="/dashboard/gyms" className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-foreground transition-all">
                        <LogOut className="w-4 h-4" /> Cambiar Centro
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-background/50">
                {/* Center Dashboard Header - Hidden on mobile to avoid duplication */}
                <header className="hidden lg:flex h-16 border-b border-border bg-background/80 backdrop-blur px-4 lg:px-6 items-center justify-between shrink-0 z-20">
                    <div className="w-full max-w-xl">
                        <GlobalSearch />
                    </div>
                    <div className="flex items-center gap-4 pl-4">
                        <ThemeToggle />
                        <NotificationBell />
                        <Link href="/dashboard/profile" className="w-9 h-9 rounded-full bg-brand-gray border border-white/10 hover:border-brand-red transition-all shrink-0 overflow-hidden flex items-center justify-center group/profile">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover group-hover/profile:scale-110 transition-transform"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-brand-red/20 to-brand-red/5 flex items-center justify-center text-brand-red font-black text-xs italic">
                                    {(profile?.full_name || 'A')[0].toUpperCase()}
                                </div>
                            )}
                        </Link>
                    </div>
                </header>

                {/* Mobile Navigation */}
                <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                        <h1 className="font-heading font-black text-lg italic text-foreground truncate">{org.name}</h1>
                        <div className="flex items-center gap-2 shrink-0">
                            <ThemeToggle className="bg-transparent border-none p-1.5 shadow-none" />
                            <div className="text-[9px] font-bold text-brand-red uppercase tracking-widest bg-brand-red/10 px-2 py-1 rounded border border-brand-red/20">{userRole === 'owner' ? 'Propietario' : 'Coach'}</div>
                        </div>
                    </div>
                    <SidebarNav id={id} isAdmin={isAdmin} />
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
