"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
    LayoutDashboard, Calendar, Users, Shield, Dumbbell,
    Zap, ShoppingBag, Edit, CreditCard, BarChart2,
    ScanLine, Megaphone, Star, HelpCircle, ChevronRight
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

interface NavSection { label: string; items: NavItem[] }

export default function SidebarNav({
    id, isAdmin, centerType, pendingTrials
}: {
    id: string;
    isAdmin: boolean;
    centerType?: string;
    pendingTrials?: number;
}) {
    const params   = useParams();
    const pathname = usePathname();
    const sedeId   = params.sedeId as string;
    const query    = sedeId ? `?centerId=${sedeId}` : "";
    const isPT     = centerType === 'personal_trainer';

    const sections: NavSection[] = isPT ? [
        {
            label: 'Entrenador',
            items: [
                { name: 'Resumen',       href: `/dashboard/gyms/${id}`,                icon: LayoutDashboard },
                { name: 'Agenda',        href: `/dashboard/gyms/${id}/schedule`,        icon: Calendar },
                { name: 'Alumnos',       href: `/dashboard/gyms/${id}/members`,         icon: Users, badge: pendingTrials || null },
                { name: 'Programación',  href: `/dashboard/gyms/${id}/programming`,     icon: Dumbbell },
            ]
        },
        {
            label: 'Negocio',
            items: [
                { name: 'Tarifas',       href: `/dashboard/gyms/${id}/memberships`,     icon: Star,       adminOnly: true },
                { name: 'Cobros',        href: `/dashboard/gyms/${id}/store`,           icon: ShoppingBag },
            ]
        },
        {
            label: 'Perfil',
            items: [
                { name: 'Analytics',     href: `/dashboard/gyms/${id}/analytics`,       icon: BarChart2,  adminOnly: true },
                { name: 'Facturación',   href: `/dashboard/gyms/${id}/settings/billing`,icon: CreditCard, adminOnly: true },
                { name: 'Editar Perfil', href: `/trainer/${id}/edit`,                   icon: Edit,       adminOnly: true },
            ]
        }
    ] : [
        {
            label: 'Principal',
            items: [
                { name: 'Resumen',       href: `/dashboard/gyms/${id}${sedeId ? `/sedes/${sedeId}` : ''}`, icon: LayoutDashboard },
                { name: 'Horario',       href: `/dashboard/gyms/${id}/schedule${query}`,       icon: Calendar },
                { name: 'Miembros',      href: `/dashboard/gyms/${id}/members${query}`,        icon: Users, badge: pendingTrials || null },
                { name: 'Check-in',      href: `/dashboard/gyms/${id}/checkin${query}`,        icon: ScanLine },
                { name: 'Entrenamientos',href: `/dashboard/gyms/${id}/wods${query}`,           icon: Dumbbell },
            ]
        },
        {
            label: 'Negocio',
            items: [
                { name: 'Membresías',    href: `/dashboard/gyms/${id}/memberships${query}`,    icon: Star,       adminOnly: true },
                { name: 'Tienda',        href: `/dashboard/gyms/${id}/store${query}`,          icon: ShoppingBag },
                { name: 'Muro Social',   href: `/dashboard/gyms/${id}/feed${query}`,           icon: Zap },
                { name: 'Comunicados',   href: `/dashboard/gyms/${id}/communications${query}`, icon: Megaphone,  adminOnly: true },
            ]
        },
        {
            label: 'Admin',
            items: [
                { name: 'Equipo',        href: `/dashboard/gyms/${id}/team${query}`,           icon: Shield,     adminOnly: true },
                { name: 'Analytics',     href: `/dashboard/gyms/${id}/analytics`,              icon: BarChart2,  adminOnly: true },
                { name: 'Facturación',   href: `/dashboard/gyms/${id}/settings/billing`,       icon: CreditCard, adminOnly: true },
                { name: 'Editar',        href: `/center-owner/centers/${id}/edit`,             icon: Edit,       adminOnly: true },
            ]
        }
    ];

    function isActive(href: string) {
        const base = href.split('?')[0];
        if (base === `/dashboard/gyms/${id}`) return pathname === base;
        return !!pathname?.startsWith(base);
    }

    // ── Desktop ──────────────────────────────────────────────────────────────
    return (
        <>
            <nav className="flex-1 px-2.5 py-3 overflow-y-auto custom-scrollbar hidden lg:block space-y-3 min-h-0">
                {sections.map(section => {
                    const visible = section.items.filter(i => !i.adminOnly || isAdmin);
                    if (!visible.length) return null;
                    return (
                        <div key={section.label}>
                            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-white/20 px-2.5 mb-1">
                                {section.label}
                            </p>
                            <div className="space-y-px">
                                {visible.map(item => {
                                    const active = isActive(item.href);
                                    return (
                                        <Link key={item.name} href={item.href}
                                            className={clsx(
                                                "flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-semibold rounded-lg transition-all group relative",
                                                active
                                                    ? "text-gray-900 dark:text-white bg-brand-red/10 border border-brand-red/20"
                                                    : "text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.04] border border-transparent"
                                            )}
                                        >
                                            {active && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-brand-red rounded-full" />}
                                            <item.icon className={clsx(
                                                "w-3.5 h-3.5 shrink-0 transition-colors",
                                                active ? "text-brand-red" : "text-gray-400 dark:text-white/25 group-hover:text-gray-600 dark:group-hover:text-white/60"
                                            )} />
                                            <span className="flex-1 truncate leading-none">{item.name}</span>
                                            {item.badge && item.badge > 0 ? (
                                                <span className="shrink-0 min-w-[16px] h-4 bg-brand-red text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-[0_0_6px_rgba(220,38,38,0.5)]">
                                                    {item.badge > 9 ? '9+' : item.badge}
                                                </span>
                                            ) : active ? (
                                                <ChevronRight className="w-3 h-3 text-brand-red/40 shrink-0" />
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
            <div className="hidden lg:block px-2.5 pb-1 shrink-0">
                <SupportModal />
            </div>

            {/* ── Mobile Nav ───────────────────────────────────────────────── */}
            <div className="lg:hidden overflow-x-auto no-scrollbar">
                <div className="flex px-2 py-1.5 gap-1 min-w-max">
                    {sections.flatMap(s => s.items).filter(i => !i.adminOnly || isAdmin).map(item => {
                        const active = isActive(item.href);
                        return (
                            <Link key={item.name} href={item.href}
                                className={clsx(
                                    "relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                                    active
                                        ? "text-white bg-brand-red border-brand-red"
                                        : "text-gray-500 dark:text-white/35 border-transparent hover:text-gray-900 dark:hover:text-white hover:border-gray-200 dark:hover:border-white/10"
                                )}
                            >
                                <item.icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{item.name}</span>
                                {item.badge && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-brand-red text-[7px] font-black rounded-full flex items-center justify-center">
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
