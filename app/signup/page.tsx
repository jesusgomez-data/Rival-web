"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User, Mail, Lock, ArrowRight } from "lucide-react";
import { signup } from "@/app/login/actions";
import { useActionState } from "react";


export default function SignupPage() {
    const [state, formAction, isPending] = useActionState(signup, null);

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
                    <h2 className="text-5xl font-heading font-bold mb-4 text-foreground">Gánate tu <br /><span className="text-brand-red">Lugar.</span></h2>
                    <p className="text-muted-foreground max-w-md ml-auto text-lg">Únete a la única comunidad donde el respeto se mide en sudor, no en seguidores.</p>
                </div>
            </div>

            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 pt-24 lg:pt-8 relative order-1 min-h-screen lg:min-h-0">
                <Link href="/" className="text-muted-foreground hover:text-foreground absolute top-8 left-8 flex items-center gap-2 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                </Link>

                <div className="max-w-md w-full">
                    <div className="mb-10">
                        <Image src="/logo.svg" alt="Rival Logo" width={40} height={40} className="mb-6 w-10 h-10" />
                        <h1 className="text-4xl font-heading font-bold mb-2 text-foreground">Crear Cuenta</h1>
                        <p className="text-muted-foreground">Comienza tu viaje hacia el 1%.</p>
                    </div>

                    <form className="space-y-5" action={formAction}>
                        {state?.error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center font-bold">
                                {state.error}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Nombre</label>
                                <input
                                    name="firstName"
                                    type="text"
                                    required
                                    className="w-full border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/50 transition-all bg-card text-foreground placeholder:text-muted-foreground"
                                    placeholder="Juan"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Apellido</label>
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
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Usuario</label>
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
                                    placeholder="Mín 8 caracteres"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                disabled={isPending}
                                className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed bg-foreground text-background hover:opacity-80"
                            >
                                {isPending ? 'Creando Cuenta...' : 'Crear Cuenta'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-xs text-muted-foreground mt-4 text-center">Al unirte, aceptas nuestros Términos de Servicio. Sé respetuoso, entrena duro.</p>
                        </div>
                    </form>

                    <div className="mt-8 text-center border-t border-border pt-6">
                        <p className="text-muted-foreground">¿Ya tienes cuenta? <Link href="/login" className="text-brand-red font-bold hover:underline">Inicia Sesión</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
