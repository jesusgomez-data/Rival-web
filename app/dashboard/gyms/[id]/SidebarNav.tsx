"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
    LayoutDashboard, Calendar, Users, Shield, Dumbbell,
    Zap, ShoppingBag, Edit, CreditCard, BarChart2,
    ScanLine, Megaphone, UserCheck, ChevronRight,
    Star, MessageSquare
} from "lucide-react";
import SupportModal from "../SupportModal";
import clsx from "clsx";

interface NavItem {
    name: string;
    href: string;
    icon: any;
    adminOnly?: boolean;
    badge?: number | null;
}

interface NavSection {
    label: string;
    items: NavItem[];
}

export default function SidebarNav({
    id, isAdmin, centerType, pendingTrials
}: {
    id: string;
    isAdmin: boolean;
    centerType?: string;
    pendingTrials?: number;
}) {
    const params = useParams();
    const pathname = usePathname();
    const sedeId = params.sedeId as string;
    const query = sedeId ? `?centerId=${sedeId}` : "";
    const isPT = centerType === 'personal_trainer';

    const sections: NavSection[] = [
        {
            label: 'Principal',
            items: [
                { name: 'Resumen', href: `/dashboard/gyms/${id}${sedeId ? `/sedes/${sedeId}` : ''}`, icon: LayoutDashboard },
                { name: isPT ? 'Citas y Horario' : 'Horario', href: `/dashboard/gyms/${id}/schedule${query}`, icon: Calendar },
                { name: isPT ? 'Mis Alumnos' : 'Miembros', href: `/dashboard/gyms/${id}/members${query}`, icon: Users, badge: pendingTrials || null },
                { name: 'Check-in', href: `/dashboard/gyms/${id}/checkin${query}`, icon: ScanLine },
                { name: isPT ? 'Programación' : 'Entrenamientos', href: `/dashboard/gyms/${id}/${isPT ? 'programming' : 'wods'}${query}`, icon: Dumbbell },
            ]
        },
        {
            label: 'Gestión',
            items: [
                { name: 'Membresías', href: `/dashboard/gyms/${id}/memberships${query}`, icon: Star, adminOnly: true },
                { name: 'Tienda', href: `/dashboard/gyms/${id}/store${query}`, icon: ShoppingBag },
                { name: 'Muro Social', href: `/dashboard/gyms/${id}/feed${query}`, icon: Zap },
                { name: 'Comunicaciones', href: `/dashboard/gyms/${id}/communications${query}`, icon: Megaphone, adminOnly: true },
            ]
        },
        {
            label: 'Administración',
            items: [
                { name: 'Equipo', href: `/dashboard/gyms/${id}/team${query}`, icon: Shield, adminOnly: true },
                { name: 'Analytics', href: `/dashboard/gyms/${id}/analytics`, icon: BarChart2, adminOnly: true },
                { name: 'Facturación', href: `/dashboard/gyms/${id}/settings/billing`, icon: CreditCard, adminOnly: true },
                { name: 'Editar Perfil', href: `/center-owner/centers/${id}/edit`, icon: Edit, adminOnly: true },
            ]
        }
    ];

    function isActive(href: string) {
        const base = href.split('?')[0];
        if (base === `/dashboard/gyms/${id}`) return pathname === base;
        return pathname?.startsWith(base);
    }

    return (
        <>
            {/* Desktop Nav */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar hidden lg:block space-y-6">
                {sections.map((section) => {
                    const visible = section.items.filter(i => !i.adminOnly || isAdmin);
                    if (visible.length === 0) return null;
                    return (
                        <div key={section.label}>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 px-3 mb-2">
                                {section.label}
                            </p>
                            <div className="space-y-0.5">
                                {visible.map((item) => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={clsx(
                                                "flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all group relative",
                                                active
                                                    ? "text-white bg-brand-red/10 border border-brand-red/20"
                                                    : "text-white/40 hover:text-white hover:bg-white/[0.04] border border-transparent"
                                            )}
                                        >
                                            {active && (
                                                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-brand-red rounded-full" />
                                            )}
                                            <item.icon className={clsx(
                                                "w-4 h-4 shrink-0 transition-colors",
                                                active ? "text-brand-red" : "text-white/30 group-hover:text-white/70"
                                            )} />
                                            <span className="flex-1 truncate">{item.name}</span>
                                            {item.badge && item.badge > 0 ? (
                                                <span className="shrink-0 min-w-[18px] h-[18px] bg-brand-red text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-[0_0_8px_rgba(220,38,38,0.5)]">
                                                    {item.badge > 9 ? '9+' : item.badge}
                                                </span>
                                            ) : active ? (
                                                <ChevronRight className="w-3 h-3 text-brand-red/50 shrink-0" />
                                            ) : null}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Support (Desktop) */}
            <div className="hidden lg:block px-3 pb-4 mt-auto border-t border-white/[0.05] pt-4">
                <SupportModal />
            </div>

            {/* Mobile Nav */}
            <div className="lg:hidden overflow-x-auto no-scrollbar border-b border-white/[0.05]">
                <div className="flex px-2 py-2 gap-1 min-w-max">
                    {sections.flatMap(s => s.items).filter(i => !i.adminOnly || isAdmin).map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    "relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                                    active
                                        ? "text-white bg-brand-red/90 border-brand-red"
                                        : "text-white/35 hover:text-white bg-transparent border-transparent hover:border-white/10"
                                )}
                            >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{item.name}</span>
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-brand-red text-[8px] font-black rounded-full flex items-center justify-center">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
