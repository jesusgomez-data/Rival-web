"use client";

import { useState, useEffect, Suspense } from "react";
import { Check, Star, Zap, Trophy, CreditCard, Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { getUserProfile } from "../../training/actions";
import { createClient } from "@/utils/supabase/client";
import { createCheckoutSession, createPortalSession, verifyStripeSubscription } from "./stripe-actions";

const plans = [
    {
        id: 'free',
        name: 'Atleta',
        price: 'Gratis',
        description: 'Perfecto para comenzar tu viaje',
        features: [
            'Registro ilimitado de entrenamientos',
            'Acceso a la comunidad Rival',
            'Analíticas básicas de rendimiento',
            'Rankings globales (Top 100)',
            'Perfil público'
        ],
        cta: 'Plan Actual',
        color: 'gray'
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '$4.99',
        period: '/mes',
        description: 'Oferta de Lanzamiento: Potencia tu entrenamiento con IA',
        features: [
            'Todo lo de Atleta',
            'Coach IA: Programación adaptativa',
            'Analíticas avanzadas y fatiga',
            'Duelos ilimitados con rivales',
            'Sin anuncios y modo pro',
            'Soporte prioritario'
        ],
        cta: 'Mejorar a Premium',
        highlight: true,
        color: 'brand-red'
    },
    {
        id: 'elite',
        name: 'Élite',
        price: '$9.99',
        period: '/mes',
        description: 'Oferta de Lanzamiento: Para los que no aceptan límites',
        features: [
            'Todo lo de Premium',
            'Sesiones 1-a-1 con Head Coaches',
            'Acceso Global a Centros Partner',
            'Programas personalizados exclusivos',
            'Badge de Verificado de Élite',
            'Acceso a eventos VIP'
        ],
        cta: 'Obtener Élite',
        color: 'yellow'
    }
];

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Cargando Protocolos...</div>}>
            <BillingContent />
        </Suspense>
    );
}

function BillingContent() {
    const searchParams = useSearchParams();
    const status = searchParams.get('status');
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (status === 'success') {
                // Manually sync subscription status on success return (for localhost mainly)
                await verifyStripeSubscription();
            }

            const data = await getUserProfile();
            setProfile(data);
            setLoading(false);
        }
        load();
    }, [status]);

    const handleUpgrade = async (plan: any) => {
        if (plan.id === profile?.subscription_tier) return;

        setUpdating(plan.id);

        try {
            if (plan.id === 'free') {
                // Downgrade to free logic
                // Downgrade request -> Redirect to Portal
                // Users must cancel via Stripe Portal to stop billing
                const result = await createPortalSession();
                if (result.error) alert(result.error);
                else if (result.url) window.location.href = result.url;
                return;
            } else {
                // PAID PLANS -> Stripe
                // We'll use the price IDs from environment variables
                let priceId = plan.id === 'premium'
                    ? (process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || 'price_1SzepeCuIXDNtJ7AFKkDXv4H').trim()
                    : (process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || 'price_1SzeqjCuIXDNtJ7ApOSdRJre').trim();

                console.log("Using Price ID:", priceId);

                const result = await createCheckoutSession(priceId);
                if (result.error) {
                    alert(result.error);
                } else if (result.url) {
                    window.location.href = result.url;
                }
            }
        } catch (error: any) {
            alert("Error de conexión: " + error.message);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Cargando Protocolos...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {status === 'success' && (
                <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-2xl text-green-500 text-center font-bold animate-in fade-in zoom-in">
                    ✅ ¡Suscripción activada con éxito! Bienvenido al siguiente nivel.
                </div>
            )}
            {status === 'canceled' && (
                <div className="bg-brand-red/10 border border-brand-red/50 p-4 rounded-2xl text-brand-red text-center font-bold">
                    ⚠️ El proceso de pago fue cancelado. No se ha realizado ningún cargo.
                </div>
            )}
            <header className="text-center space-y-4">
                <h1 className="text-4xl lg:text-5xl font-heading font-extrabold italic uppercase tracking-tighter text-white">
                    Suscripción <span className="text-brand-red">Rival</span>
                </h1>
                <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
                    Selecciona el nivel de acceso que se adapte a tu ambición. Actualiza o cancela en cualquier momento.
                </p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const isCurrent = profile?.subscription_tier === plan.id;
                    return (
                        <motion.div
                            key={plan.id}
                            whileHover={{ y: -5 }}
                            className={clsx(
                                "relative flex flex-col p-8 rounded-[2.5rem] border bg-black/40 backdrop-blur-xl transition-all",
                                plan.highlight
                                    ? "border-brand-red/50 shadow-[0_0_40px_rgba(220,38,38,0.1)] ring-1 ring-brand-red/20"
                                    : "border-white/5 hover:border-white/10"
                            )}
                        >
                            {plan.highlight && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-red text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                    Recomendado
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-white italic uppercase tracking-tight mb-2">{plan.name}</h3>
                                <p className="text-xs text-gray-400">{plan.description}</p>
                            </div>

                            <div className="mb-8 flex items-baseline gap-1">
                                <span className="text-5xl font-heading font-black text-white">{plan.price}</span>
                                {plan.period && <span className="text-gray-500 font-bold text-xs uppercase">{plan.period}</span>}
                            </div>

                            <ul className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feature: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className={clsx(
                                            "mt-1 shrink-0 p-0.5 rounded-full",
                                            plan.id === 'elite' ? "bg-yellow-500/20 text-yellow-500" : "bg-brand-red/20 text-brand-red"
                                        )}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span className="text-xs text-gray-300 font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={async () => {
                                    if (isCurrent) {
                                        setUpdating('portal');
                                        try {
                                            const result = await createPortalSession();
                                            if (result.error) alert(result.error);
                                            else if (result.url) window.location.href = result.url;
                                        } catch (e: any) { alert("Error al conectar con Stripe."); }
                                        setUpdating(null);
                                    } else {
                                        handleUpgrade(plan);
                                    }
                                }}
                                disabled={updating !== null}
                                className={clsx(
                                    "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all transform active:scale-95",
                                    isCurrent
                                        ? "bg-white/5 border border-white/10 text-gray-500 cursor-default"
                                        : plan.highlight
                                            ? "bg-brand-red text-white shadow-[0_10px_20px_rgba(220,38,38,0.3)] hover:bg-red-600"
                                            : "bg-white text-black hover:bg-gray-200"
                                )}
                            >
                                {updating === plan.id ? "Procesando..." : isCurrent ? "Gestionar" : plan.cta}
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            <section className="bg-brand-gray/30 border border-white/5 p-10 rounded-[3rem] mt-16">
                <div className="flex flex-col md:flex-row gap-10 items-center">
                    <div className="h-20 w-20 rounded-3xl bg-brand-red/10 flex items-center justify-center shrink-0">
                        <Shield className="w-10 h-10 text-brand-red" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <h4 className="text-xl font-bold text-white italic uppercase">Seguridad Rival</h4>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                            Utilizamos encriptación de grado militar para procesar tus pagos. No almacenamos datos de tu tarjeta directamente. Al suscribirte, aceptas nuestros términos de servicio y política de privacidad.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center opacity-50 grayscale hover:grayscale-0 transition-all cursor-crosshair">
                            <CreditCard className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
