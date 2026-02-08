'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';
import NotificationBell from '../../NotificationBell';
import GlobalSearch from '../../GlobalSearch';
import ThemeToggle from '@/components/ThemeToggle';
import SidebarNav from './SidebarNav';

interface GymLayoutClientProps {
    org: any;
    isAdmin: boolean;
    roleLabel: string;
    userRole: string;
    profile: any;
    children: React.ReactNode;
}

export default function GymLayoutClient({
    org,
    isAdmin,
    roleLabel,
    userRole,
    profile,
    children
}: GymLayoutClientProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true); // Abierto por defecto

    return (
        <div className="flex h-[100dvh] bg-background overflow-hidden font-sans">
            {/* Backdrop para móvil */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                w-64 border-r border-border bg-card flex flex-col h-full
                fixed lg:relative inset-y-0 left-0 z-50
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-border flex justify-between items-start shrink-0">
                    <div className="flex-1 min-w-0 pr-2">
                        <Link href={`/gym/${org.id}`} className="hover:opacity-80 transition-opacity block">
                            <h2 className="font-heading font-black text-foreground italic truncate" title={org.name}>{org.name}</h2>
                        </Link>
                        <p className="text-xs text-brand-red font-bold uppercase tracking-widest mt-1">{roleLabel}</p>
                    </div>
                    {/* Botón cerrar */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        title="Cerrar menú"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <SidebarNav id={org.id} isAdmin={isAdmin} />
                <div className="p-4 border-t border-border shrink-0">
                    <Link href="/dashboard/gyms" className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-foreground transition-all">
                        <LogOut className="w-4 h-4" /> Cambiar Centro
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-background/50">
                {/* Center Dashboard Header - Desktop con botón hamburguesa */}
                <header className="hidden lg:flex h-16 border-b border-border bg-background/80 backdrop-blur px-4 lg:px-6 items-center justify-between shrink-0 z-20">
                    <div className="flex items-center gap-4 w-full max-w-xl">
                        {/* Botón hamburguesa para desktop */}
                        {!sidebarOpen && (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                                aria-label="Abrir menú"
                                title="Abrir menú"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex-1">
                            <GlobalSearch />
                        </div>
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

                {/* Mobile Header con botón hamburguesa */}
                <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                        {/* Botón hamburguesa */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                            aria-label="Abrir menú"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <h1 className="font-heading font-black text-lg italic text-foreground truncate">{org.name}</h1>

                        <div className="flex items-center gap-2 shrink-0">
                            <ThemeToggle className="bg-transparent border-none p-1.5 shadow-none" />
                            <div className="text-[9px] font-bold text-brand-red uppercase tracking-widest bg-brand-red/10 px-2 py-1 rounded border border-brand-red/20">
                                {userRole === 'owner' ? 'Propietario' : 'Coach'}
                            </div>
                        </div>
                    </div>
                    <SidebarNav id={org.id} isAdmin={isAdmin} />
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
