'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react';
import NotificationBell from '../../NotificationBell';
import GlobalSearch from '../../GlobalSearch';
import ThemeToggle from '@/components/ThemeToggle';
import SidebarNav from './SidebarNav';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// ── Global toast for all center management pages ───────────────────────────────
function CenterToast() {
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
    useEffect(() => {
        const handler = (e: Event) => {
            const { message, type } = (e as CustomEvent).detail;
            setToast({ message, type });
            const t = setTimeout(() => setToast(null), 4500);
            return () => clearTimeout(t);
        };
        window.addEventListener('center-toast', handler);
        return () => window.removeEventListener('center-toast', handler);
    }, []);
    return (
        <AnimatePresence>
            {toast && (
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm max-w-xs text-center ${
                        toast.type === 'error'   ? 'bg-red-500 text-white'
                        : toast.type === 'success' ? 'bg-green-600 text-white'
                        : 'bg-zinc-800 text-white border border-white/10'
                    }`}
                >
                    {toast.type === 'error'   ? <AlertCircle  className="w-4 h-4 shrink-0" />
                    : toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                    :                            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />}
                    {toast.message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

interface GymLayoutClientProps {
    org: any;
    isAdmin: boolean;
    roleLabel: string;
    userRole: string;
    profile: any;
    children: React.ReactNode;
}

export default function GymLayoutClient({
    org, isAdmin, roleLabel, userRole, profile, children
}: GymLayoutClientProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="flex h-[100dvh] bg-background overflow-hidden font-sans">
            <CenterToast />

            {/* ── Mobile backdrop ───────────────────────────────────────────── */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
            <aside className={`
                hidden lg:flex w-56 xl:w-60 flex-col h-full
                fixed inset-y-0 left-0 z-50
                bg-[#0A0A0A] border-r border-white/[0.06]
                transform transition-transform duration-300 ease-in-out
                keep-all dark-section
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Sidebar header */}
                <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        <Link href={`/dashboard/gyms/${org.id}`} className="flex items-center gap-2.5 min-w-0 hover:opacity-80 transition-opacity">
                            {org.logo_url ? (
                                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/10">
                                    <Image src={org.logo_url} alt="" width={28} height={28} className="object-cover w-full h-full" />
                                </div>
                            ) : (
                                <div className="w-7 h-7 rounded-lg bg-brand-red/20 border border-brand-red/30 flex items-center justify-center shrink-0">
                                    <span className="text-brand-red font-black text-xs">{org.name?.[0]?.toUpperCase()}</span>
                                </div>
                            )}
                            <div className="min-w-0">
                                <h2 className="font-black text-sm text-white leading-tight truncate">{org.name}</h2>
                                <p className="text-[9px] text-brand-red font-bold uppercase tracking-wider leading-none mt-0.5">{roleLabel}</p>
                            </div>
                        </Link>
                        <button onClick={() => setSidebarOpen(false)} className="p-1.5 text-white/25 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Nav */}
                <SidebarNav id={org.id} isAdmin={isAdmin} centerType={org.center_type} />

                {/* Sidebar footer */}
                <div className="px-3 py-2.5 border-t border-white/[0.06] shrink-0">
                    <Link href="/dashboard/gyms"
                        className="flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white/25 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-all">
                        <LogOut className="w-3.5 h-3.5" /> Cambiar Centro
                    </Link>
                </div>
            </aside>

            {/* ── Main Content ──────────────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col h-full min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-56 xl:ml-60' : 'ml-0'}`}>

                {/* Desktop header */}
                <header className="hidden lg:flex h-14 border-b border-white/[0.06] bg-background/90 backdrop-blur px-4 xl:px-6 items-center justify-between shrink-0 z-20">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {!sidebarOpen && (
                            <button onClick={() => setSidebarOpen(true)}
                                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0">
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex-1 min-w-0 max-w-md">
                            <GlobalSearch />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pl-4 shrink-0">
                        <ThemeToggle />
                        <NotificationBell />
                        <Link href="/dashboard/profile"
                            className="w-8 h-8 rounded-full border border-white/10 hover:border-brand-red/50 transition-all shrink-0 overflow-hidden flex items-center justify-center">
                            {profile?.avatar_url
                                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-brand-red/10 flex items-center justify-center text-brand-red font-black text-xs">{(profile?.full_name || 'A')[0].toUpperCase()}</div>
                            }
                        </Link>
                    </div>
                </header>

                {/* Mobile header */}
                <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-white/[0.06]">
                    <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {org.logo_url
                                ? <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 border border-white/10"><Image src={org.logo_url} alt="" width={24} height={24} className="object-cover" /></div>
                                : <div className="w-6 h-6 rounded-lg bg-brand-red/20 border border-brand-red/30 flex items-center justify-center shrink-0"><span className="text-brand-red font-black text-[10px]">{org.name?.[0]?.toUpperCase()}</span></div>
                            }
                            <div className="min-w-0">
                                <h1 className="font-black text-sm italic text-white truncate leading-tight">{org.name}</h1>
                                <p className="text-[9px] font-bold text-brand-red uppercase tracking-widest leading-none">{userRole === 'owner' ? 'Propietario' : 'Coach'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <NotificationBell />
                            <ThemeToggle className="bg-transparent border-none p-1.5 shadow-none" />
                            <Link href="/dashboard/profile" className="w-7 h-7 rounded-full border border-white/10 overflow-hidden">
                                {profile?.avatar_url
                                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full bg-gray-800 flex items-center justify-center text-[10px] text-gray-400">{(profile?.full_name || 'A')[0].toUpperCase()}</div>
                                }
                            </Link>
                        </div>
                    </div>
                    <SidebarNav id={org.id} isAdmin={isAdmin} centerType={org.center_type} />
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
