"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    Users,
    Shield,
    Dumbbell,
    Zap,
    ShoppingBag,
    Edit,
    CreditCard
} from "lucide-react";
import SupportModal from "../SupportModal";

interface NavItem {
    name: string;
    href: string;
    icon: any;
    adminOnly?: boolean;
}

export default function SidebarNav({ id, isAdmin, centerType }: { id: string, isAdmin: boolean, centerType?: string }) {
    const params = useParams();
    const pathname = usePathname();

    // Detect if we are in a sede context
    const sedeId = params.sedeId as string;
    const query = sedeId ? `?centerId=${sedeId}` : "";

    const isPT = centerType === 'personal_trainer';
    const navigation: NavItem[] = [
        { name: 'Resumen', href: `/dashboard/gyms/${id}${sedeId ? `/sedes/${sedeId}` : ''}`, icon: LayoutDashboard },
        { name: 'Perfil', href: `/center-owner/centers/${id}/edit`, icon: Edit, adminOnly: true },
        { name: isPT ? 'Citas y Horario' : 'Horario', href: `/dashboard/gyms/${id}/schedule${query}`, icon: Calendar },
        { name: isPT ? 'Mis Alumnos' : 'Miembros', href: `/dashboard/gyms/${id}/members${query}`, icon: Users },
        { name: 'Equipo y Roles', href: `/dashboard/gyms/${id}/team${query}`, icon: Shield, adminOnly: true },
        { name: isPT ? 'Programación' : 'Entrenamientos (WODs)', href: `/dashboard/gyms/${id}/${isPT ? 'programming' : 'wods'}${query}`, icon: Dumbbell },
        { name: 'Muro Social', href: `/dashboard/gyms/${id}/feed${query}`, icon: Zap },
        { name: 'Tienda', href: `/dashboard/gyms/${id}/store${query}`, icon: ShoppingBag },
        { name: 'Facturación', href: `/dashboard/gyms/${id}/settings/billing`, icon: CreditCard, adminOnly: true },
    ];

    const navItems = navigation.filter(item => !item.adminOnly || isAdmin);

    return (
        <>
            {/* Desktop Nav */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar hidden lg:block">
                {navItems.map((item) => {
                    const isActive = pathname === item.href.split('?')[0];
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all group ${isActive
                                ? 'text-brand-red bg-brand-red/5'
                                : 'text-gray-500 hover:text-foreground hover:bg-foreground/5'
                                }`}
                        >
                            <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-brand-red' : 'text-gray-400 group-hover:text-brand-red'
                                }`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Support Action (Desktop) */}
            <div className="hidden lg:block px-4 pb-4 mt-auto border-t border-white/5 pt-4">
                <SupportModal />
            </div>

            {/* Mobile Nav */}
            <div className="lg:hidden overflow-x-auto custom-scrollbar">
                <div className="flex px-2 py-2 gap-1 min-w-max">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href.split('?')[0];
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${isActive
                                    ? 'text-white bg-brand-red border-brand-red shadow-glow-sm'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/5'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span className="whitespace-nowrap">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
