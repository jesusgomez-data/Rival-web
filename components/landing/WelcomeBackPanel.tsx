"use client";

import Link from "next/link";
import { ArrowRight, Building2, User, Loader2, Sparkles } from "lucide-react";
import type { SavedAccount } from "@/utils/supabase/multi-account";

interface WelcomeBackPanelProps {
    savedAccounts: SavedAccount[];
    accountCenters: Record<string, { id: string; name: string }>;
    switchingAccountId: string | null;
    onContinueAs: (userId: string, destination: 'dashboard' | string) => void;
}

// Reemplaza TODO el contenido de marketing de la tarjeta (ticker, "Domina
// tu terreno", los 3 chips de propuesta de valor, "Cuéntame más") cuando ya
// hay una cuenta guardada en este navegador — no tiene sentido venderle la
// app a alguien que ya la usa. Es el único contenido de la tarjeta en ese
// caso, así que puede permitirse más aire y presencia que el bloque de
// botones que sustituyó.
export default function WelcomeBackPanel({ savedAccounts, accountCenters, switchingAccountId, onContinueAs }: WelcomeBackPanelProps) {
    const firstName = (savedAccounts[0]?.fullName || savedAccounts[0]?.username || '').split(' ')[0];

    return (
        <div className="space-y-8 py-2">
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 px-4 py-1.5 rounded-full">
                    <Sparkles className="w-4 h-4 text-brand-red" />
                    <span className="text-[10px] xs:text-[11px] font-black tracking-[0.25em] uppercase text-slate-600 dark:text-white/80">Bienvenido de nuevo</span>
                </div>
                <h1 className="text-3xl xs:text-4xl sm:text-4xl font-heading font-black italic uppercase tracking-tighter leading-none text-gradient-red">
                    {firstName ? `¿Listo, ${firstName}?` : '¿Listo para entrar?'}
                </h1>
                <p className="text-xs xs:text-sm text-slate-500 dark:text-white/45 font-medium leading-normal max-w-xs mx-auto">
                    Tu sesión sigue activa en este dispositivo — entra directo, sin volver a escribir nada.
                </p>
            </div>

            <div className="space-y-4">
                {savedAccounts.map((account) => {
                    const center = accountCenters[account.userId];
                    const isSwitching = switchingAccountId === account.userId;
                    return (
                        <div
                            key={account.userId}
                            className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10 border-2 border-brand-red/30 shrink-0 relative flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                                    {account.avatarUrl ? (
                                        <img src={account.avatarUrl} alt={account.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-7 h-7 text-slate-500 dark:text-white/40" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-base font-black text-slate-900 dark:text-white truncate">{account.fullName || account.username}</p>
                                    <p className="text-xs text-slate-500 dark:text-white/40 truncate">@{account.username}</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <button
                                    onClick={() => onContinueAs(account.userId, 'dashboard')}
                                    disabled={isSwitching}
                                    className="w-full bg-gradient-to-r from-brand-red to-red-600 hover:from-brand-accent hover:to-red-500 text-white py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs xs:text-sm transition-all shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 duration-300 disabled:opacity-60"
                                >
                                    {isSwitching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                    Entrar a tu cuenta ({account.username})
                                </button>
                                {center && (
                                    <button
                                        onClick={() => onContinueAs(account.userId, center.id)}
                                        disabled={isSwitching}
                                        className="w-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-brand-orange/40 hover:bg-brand-orange/5 text-slate-800 dark:text-white py-4 rounded-xl font-black uppercase tracking-[0.15em] text-xs xs:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 duration-300 disabled:opacity-60"
                                    >
                                        <Building2 className="w-4 h-4 text-brand-orange" />
                                        Entrar a tu cuenta ({center.name})
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center">
                <span className="text-[11px] xs:text-xs font-bold text-slate-500 dark:text-white/40">
                    ¿No eres tú? <Link href="/login?add_account=true" className="text-slate-900 dark:text-white hover:text-brand-red font-black uppercase tracking-widest ml-1 transition-colors">Usar otra cuenta</Link>
                </span>
            </div>
        </div>
    );
}
