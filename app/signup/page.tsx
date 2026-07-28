"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User, Mail, Lock, ArrowRight } from "lucide-react";
import { signup } from "@/app/login/actions";
import { useActionState, useState } from "react";
import { useLanguage } from "@/app/LanguageContext";
import { createClient } from "@/utils/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import TurnstileWidget from "@/components/TurnstileWidget";


export default function SignupPage() {
    const { t } = useLanguage();
    const [state, formAction, isPending] = useActionState(signup, null);
    const [turnstileStatus, setTurnstileStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const supabase = createClient();

    const handleOAuthLogin = async (provider: 'google' | 'apple') => {
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
    };

    return (
        <div className="min-h-screen flex font-sans selection:bg-brand-red selection:text-white transition-colors duration-300 bg-background text-foreground">



            {/* Visual Side */}
            <div className="hidden lg:block w-1/2 relative overflow-hidden order-2">
                <Image
                    src="/assets/hero-cinematic.png"
                    alt="Intense workout"
                    fill
                    className="object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-background/50 to-background pointer-events-none" />
                <div className="absolute bottom-12 right-12 z-10 text-right">
                    <h2 className="text-5xl font-heading font-bold mb-4 text-foreground leading-[1.1]">
                        {t.signup.sidebarTitle.split('.').filter((p: string) => p.trim() !== '').map((part: string, i: number) => (
                            <span key={i} className="block">
                                {i < 2 ? (
                                    <>{part.trim()}.</>
                                ) : (
                                    <span className="text-brand-red">{part.trim()}..</span>
                                )}
                            </span>
                        ))}
                    </h2>
                    <p className="text-muted-foreground max-w-md ml-auto text-lg">{t.signup.sidebarDesc}</p>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 pt-24 lg:pt-8 relative order-1 min-h-screen lg:min-h-0">
                <div className="absolute right-8 flex items-center gap-4" style={{ top: 'max(2rem, env(safe-area-inset-top))' }}>
                    <ThemeToggle />
                </div>

                <Link href="/" className="text-muted-foreground hover:text-foreground absolute left-8 flex items-center gap-2 transition-colors" style={{ top: 'max(2rem, env(safe-area-inset-top))' }}>
                    <ArrowLeft className="w-4 h-4" /> {t.signup.backHome}
                </Link>

                <div className="max-w-md w-full">
                    <div className="mb-10">
                        <Image src="/logo.svg" alt="Rival Logo" width={40} height={40} className="mb-6 w-10 h-10" />
                        <h1 className="text-4xl font-heading font-bold mb-2 text-foreground">{t.signup.title}</h1>
                        <p className="text-muted-foreground">{t.signup.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleOAuthLogin('google')}
                        className="w-full flex items-center justify-center gap-3 py-4 border-2 border-border rounded-xl hover:border-brand-red/40 hover:bg-foreground/5 transition-all font-semibold text-base"
                    >
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar con Google
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-3 text-muted-foreground font-bold tracking-widest">O regístrate con email</span>
                        </div>
                    </div>

                    {state?.success ? (
                        <div className="bg-green-500/10 border border-green-500/50 p-6 rounded-2xl text-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-green-500">{t.signup.successTitle}</h3>
                            <p className="text-muted-foreground text-lg">
                                {t.signup.successMessage}
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/login"
                                    className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group bg-foreground text-background hover:opacity-80"
                                >
                                    {t.signup.goToLogin} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-5" action={formAction}>
                            {state?.error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center font-bold">
                                    {state.error}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.signup.firstName}</label>
                                    <input
                                        name="firstName"
                                        type="text"
                                        required
                                        className="w-full border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground"
                                        placeholder="Juan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.signup.lastName}</label>
                                    <input
                                        name="lastName"
                                        type="text"
                                        required
                                        className="w-full border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground"
                                        placeholder="Pérez"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.signup.username}</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-red transition-colors" />
                                    <input
                                        name="username"
                                        type="text"
                                        required
                                        className="w-full border border-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground"
                                        placeholder="rival_legend"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.signup.email}</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-red transition-colors" />
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        className="w-full border border-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground"
                                        placeholder="tu@ejemplo.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.signup.birthDate}</label>
                                <div className="relative group">
                                    <input
                                        name="birthDate"
                                        type="date"
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                        className="w-full border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.signup.password}</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-red transition-colors" />
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        minLength={8}
                                        pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                                        title="Mínimo 8 caracteres, con mayúsculas, minúsculas y al menos un número."
                                        className="w-full border border-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground"
                                        placeholder={t.signup.passwordHint}
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5">Mínimo 8 caracteres, con mayúsculas, minúsculas y un número.</p>
                            </div>

                            <TurnstileWidget onStatusChange={setTurnstileStatus} />

                            <div className="pt-2">
                                <button
                                    disabled={isPending || turnstileStatus === 'loading'}
                                    className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed bg-foreground text-background hover:opacity-80"
                                >
                                    {isPending ? t.signup.submitting : (turnstileStatus === 'loading' ? 'Verificando seguridad...' : t.signup.submit)} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                                <p className="text-xs text-muted-foreground mt-4 text-center">{t.signup.terms}</p>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center border-t border-border pt-6">
                        <p className="text-muted-foreground text-sm">{t.signup.alreadyHaveAccount} <Link href="/login" className="text-brand-red font-bold hover:underline">{t.signup.login}</Link></p>
                    </div>

                </div>
            </div>
        </div>
    );
}
