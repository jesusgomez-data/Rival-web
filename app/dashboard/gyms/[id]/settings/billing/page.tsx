"use client";

import { useState, useEffect, Suspense, use } from "react";
import { Check, Shield, CreditCard, Building2, Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createOrganizationCheckoutSession } from "@/app/dashboard/settings/billing/stripe-actions";
import { User } from "lucide-react";

const plans = [
    {
        id: 'free',
        name: 'FREE',
        price: '€0',
        description: 'Ideal para empezar',
        features: [
            'Perfil público',
            'Hasta 10 clases/semana',
            'Check-in manual',
            'Hasta 50 miembros',
            'Chat básico'
        ],
        cta: 'Plan Actual',
        color: 'gray'
    },
    {
        id: 'starter',
        name: 'STARTER',
        price: '€49.99',
        period: '/mes',
        description: 'Oferta Lanzamiento: Primeros 50 centros',
        features: [
            'Todo de Free',
            'Clases ilimitadas',
            'Sistema de pruebas',
            'Tienda básica',
            'Google Calendar sync',
            'Notificaciones push'
        ],
        cta: 'Mejorar a Starter',
        highlight: true,
        color: 'brand-red'
    },
    {
        id: 'pro',
        name: 'PRO',
        price: '€99.99',
        period: '/mes',
        description: 'Oferta Lanzamiento: Primeros 50 centros',
        features: [
            'Todo de Starter',
            'WOD Generator',
            'Churn Prediction',
            'Benchmarking Competitivo',
            'Tienda avanzada',
            'Reportes automáticos'
        ],
        cta: 'Obtener Pro',
        color: 'yellow'
    }
];

const PT_PLANS = [
    {
        id: 'pt_free',
        name: 'TRAINER BASIC',
        price: '€0',
        description: 'Gestiona tus primeros alumnos gratis.',
        features: ['Perfil público', 'Hasta 3 alumnos', 'Programación Manual', 'Agenda Básica', 'Pagos Manuales'],
        cta: 'Plan Actual',
        color: 'gray'
    },
    {
        id: 'pt_pro',
        name: 'TRAINER PRO',
        price: '€29.99',
        period: '/mes',
        description: 'Para entrenadores en crecimiento.',
        features: ['Alumnos ilimitados', 'Programación con IA', 'Pagos integrados (Stripe)', 'Agenda Avanzada', 'Chat directo'],
        cta: 'Mejorar a Pro',
        highlight: true,
        color: 'brand-red'
    },
    {
        id: 'pt_elite',
        name: 'TRAINER ELITE',
        price: '€59.99',
        period: '/mes',
        description: 'Automatiza tu negocio al 100%.',
        features: ['Todo en Pro', 'App personalizada (PWA)', 'Análisis de retención', 'Soporte prioritario 24/7', 'Web Personalizada'],
        cta: 'Obtener Elite',
        color: 'purple'
    }
];

export default function GymBillingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Cargando Protocolos...</div>}>
            <BillingContent organizationId={id} />
        </Suspense>
    );
}

function BillingContent({ organizationId }: { organizationId: string }) {
    const searchParams = useSearchParams();
    const status = searchParams.get('status');
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const supabase = createClient();
            const { data } = await supabase.from('organizations').select('plan, center_type').eq('id', organizationId).single();
            setOrg(data);
            setLoading(false);
        }
        load();
    }, [organizationId, status]);

    const handleUpgrade = async (plan: any) => {
        if (plan.id === org?.plan) return;

        setUpdating(plan.id);

        try {
            if (plan.id === 'free') {
                // Para cancelar suscripciones de centros, redirigimos al portal o mostramos mensaje de contacto
                // Por ahora, asumimos que deben contactar soporte o usar el portal si implementamos portal para orgs
                alert("Para cancelar tu suscripción de Centro, por favor contacta a soporte o usa el Portal de Facturación.");
            } else {
                // PAID PLANS -> Stripe
                // We'll use the price IDs from environment variables or HARDCODED FALLBACKS
                let priceId = plan.id === 'starter'
                    ? process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_1SxdaPCpwHwK9MuevBVancPf' // Reemplazar con ID real Starter
                    : process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_1SxdavCpwHwK9Mueeesvlq6T'; // Reemplazar con ID real Pro

                // NOTA: Usando IDs de ejemplo. Asegúrate de configurar IDs reales para Starter/Pro
                // Si no tienes IDs distintos para PRO/STARTER creados aun, usa el Premium/Elite de atletas como placeholder temporal
                if (!process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER) {
                    // Fallback IDs based on Plan Type
                    if (plan.id.startsWith('pt_')) {
                        // PT Plans
                        priceId = plan.id === 'pt_pro' ? 'price_1SxdaPCpwHwK9MuevBVancPf_PT' : 'price_1SxdavCpwHwK9Mueeesvlq6T_PT';
                    } else {
                        // Gym Plans
                        priceId = plan.id === 'starter' ? 'price_1SxdaPCpwHwK9MuevBVancPf' : 'price_1SxdavCpwHwK9Mueeesvlq6T';
                    }
                    console.warn("Using Fallback Price ID:", priceId);
                }

                await createOrganizationCheckoutSession(priceId, organizationId);
                // Redirect happens in server action
            }
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest animate-pulse">Cargando Datos del Centro...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {status === 'success' && (
                <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-2xl text-green-500 text-center font-bold animate-in fade-in zoom-in">
                    ✅ ¡Plan del centro actualizado con éxito!
                </div>
            )}
            {status === 'canceled' && (
                <div className="bg-brand-red/10 border border-brand-red/50 p-4 rounded-2xl text-brand-red text-center font-bold">
                    ⚠️ Operación cancelada.
                </div>
            )}

            <header className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-4">
                    {org?.center_type === 'personal_trainer' ? <User className="w-4 h-4 text-brand-red" /> : <Building2 className="w-4 h-4 text-brand-red" />}
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">{org?.center_type === 'personal_trainer' ? 'Planes para Entrenadores' : 'Planes para Centros'}</span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-heading font-extrabold italic uppercase tracking-tighter text-white">
                    {org?.center_type === 'personal_trainer' ? (
                        <>Eleva tu <span className="text-brand-red">Carrera</span></>
                    ) : (
                        <>Potencia tu <span className="text-brand-red">Centro</span></>
                    )}
                </h1>
                <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
                    Herramientas profesionales para gestionar, medir y escalar tu {org?.center_type === 'personal_trainer' ? 'negocio de coaching' : 'comunidad fitness'}.
                </p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
                {(org?.center_type === 'personal_trainer' ? PT_PLANS : plans).map((plan) => {
                    const isCurrent = (org?.plan || 'free') === plan.id;
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
                                    Más Popular
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
                                            plan.id === 'pro' ? "bg-yellow-500/20 text-yellow-500" : "bg-brand-red/20 text-brand-red"
                                        )}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span className="text-xs text-gray-300 font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan)}
                                disabled={updating !== null || isCurrent}
                                className={clsx(
                                    "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all transform active:scale-95",
                                    isCurrent
                                        ? "bg-white/5 border border-white/10 text-gray-500 cursor-default"
                                        : plan.highlight
                                            ? "bg-brand-red text-white shadow-[0_10px_20px_rgba(220,38,38,0.3)] hover:bg-red-600"
                                            : "bg-white text-black hover:bg-gray-200"
                                )}
                            >
                                {updating === plan.id ? "Procesando..." : isCurrent ? "Plan Actual" : plan.cta}
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
                        <h4 className="text-xl font-bold text-white italic uppercase">Facturación Segura</h4>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                            Tus pagos están protegidos por Stripe. Puedes solicitar facturas detalladas para deducir impuestos de tu empresa.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
