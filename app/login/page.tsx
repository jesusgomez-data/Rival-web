"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, Lock, ArrowRight } from "lucide-react";
import { login } from "./actions";
import { useActionState } from "react";
import { useLanguage } from "@/app/LanguageContext";
import { createClient } from "@/utils/supabase/client";
import { clearActiveSessionLocally } from "@/utils/supabase/multi-account";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect } from "react";
import { useRouter } from "next/navigation";


export default function LoginPage() {
    const { t } = useLanguage();
    const [state, formAction, isPending] = useActionState(login, null);
    const supabase = createClient();
    const router = useRouter();

    // If user already has an active session, redirect to dashboard immediately (unless adding an account)
    useEffect(() => {
        async function checkSession() {
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get('add_account') === 'true') {
                clearActiveSessionLocally();
            } else {
                const { data } = await supabase.auth.getSession();
                if (data.session) router.replace('/dashboard');
            }
        }
        checkSession();
    }, []);

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



            {/* Visual Side (Hidden on Mobile) */}
            <div className="hidden lg:block w-1/2 relative overflow-hidden">
                <Image
                    src="/assets/hero-cinematic.png"
                    alt="Athlete focused"
                    fill
                    className="object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/50 to-background pointer-events-none" />
                <div className="absolute bottom-12 left-12 z-10">
                    <h2 className="text-5xl font-heading font-bold mb-4 text-foreground leading-[1.1]">
                        {t.login.sidebarTitle.split('.').filter((p: string) => p.trim() !== '').map((part: string, i: number) => (
                            <span key={i} className="block">
                                {i < 2 ? (
                                    <>{part.trim()}.</>
                                ) : (
                                    <span className="text-brand-red">{part.trim()}..</span>
                                )}
                            </span>
                        ))}
                    </h2>
                    <p className="text-muted-foreground max-w-md text-lg">{t.login.sidebarDesc}</p>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 pt-24 lg:pt-8 relative min-h-screen lg:min-h-0">
                <div className="absolute right-8 flex items-center gap-4" style={{ top: 'max(2rem, env(safe-area-inset-top))' }}>
                    <ThemeToggle />
                </div>

                <Link href="/" className="text-muted-foreground hover:text-foreground absolute left-8 flex items-center gap-2 transition-colors" style={{ top: 'max(2rem, env(safe-area-inset-top))' }}>
                    <ArrowLeft className="w-4 h-4" /> {t.login.backHome}
                </Link>

                <div className="max-w-md w-full">
                    <div className="text-center mb-10">
                        <Image src="/logo.svg" alt="Rival Logo" width={48} height={48} className="mx-auto mb-4 w-12 h-12" />
                        <h1 className="text-3xl font-heading font-bold mb-2 text-foreground">{t.login.welcome}</h1>
                        <p className="text-muted-foreground">{t.login.subtitle}</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => handleOAuthLogin('google')}
                        className="w-full flex items-center justify-center gap-3 py-4 border-2 border-border rounded-xl hover:border-brand-red/40 hover:bg-foreground/5 transition-all font-semibold text-base mb-6"
                    >
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar con Google
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-3 text-muted-foreground font-bold tracking-widest">O inicia con email</span>
                        </div>
                    </div>

                    <form className="space-y-6" action={formAction}>
                        {state?.error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center font-bold">
                                {state.error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.login.emailLabel}</label>
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
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t.login.passwordLabel}</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-red transition-colors" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full border border-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="flex justify-end mt-2">
                                <Link href="/forgot-password" className="text-xs text-brand-red hover:underline transition-colors">{t.login.forgotPassword}</Link>
                            </div>
                        </div>

                        <button
                            disabled={isPending}
                            className="w-full bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-red/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? t.login.authenticating : t.login.submit} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>



                    <div className="mt-8 text-center">
                        <p className="text-muted-foreground">{t.login.noAccount} <Link href="/signup" className="font-bold hover:underline text-foreground">{t.login.joinUs}</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
