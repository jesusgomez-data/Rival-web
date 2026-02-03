"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail, Lock, ArrowRight } from "lucide-react";
import { login } from "./actions";
import { useActionState } from "react";


export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, null);

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
                    <h2 className="text-5xl font-heading font-bold mb-4 text-foreground">Enfócate. <br />Ejecuta. <br /><span className="text-brand-red">Gana Joder.</span></h2>
                    <p className="text-muted-foreground max-w-md text-lg">Tu única competencia te mira desde el espejo. Inicia sesión y supera a tu yo de ayer.</p>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 pt-24 lg:pt-8 relative min-h-screen lg:min-h-0">
                <Link href="/" className="text-muted-foreground hover:text-foreground absolute top-8 left-8 flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                </Link>

                <div className="max-w-md w-full">
                    <div className="text-center mb-10">
                        <Image src="/logo.svg" alt="Rival Logo" width={48} height={48} className="mx-auto mb-4 w-12 h-12" />
                        <h1 className="text-3xl font-heading font-bold mb-2 text-foreground">Bienvenido de nuevo, Rival</h1>
                        <p className="text-muted-foreground">Ingresa tus credenciales para acceder a la arena.</p>
                    </div>

                    <form className="space-y-6" action={formAction}>
                        {state?.error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center font-bold">
                                {state.error}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Correo Electrónico</label>
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
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Contraseña</label>
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
                                <Link href="/forgot-password" className="text-xs text-brand-red hover:underline transition-colors">¿Olvidaste tu contraseña?</Link>
                            </div>
                        </div>

                        <button
                            disabled={isPending}
                            className="w-full bg-brand-red hover:bg-brand-accent text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-brand-red/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? 'Autenticando...' : 'Iniciar Sesión'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-muted-foreground">¿No tienes cuenta? <Link href="/signup" className="font-bold hover:underline text-foreground">Únete a las filas</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
