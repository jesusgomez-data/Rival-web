"use client";

import { useState, useEffect, Suspense, use } from "react";
import {
    Check, Shield, Building2, User,
    BanknoteIcon, CheckCircle2, AlertCircle, ExternalLink,
    Loader2, RefreshCw, Euro
} from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createOrganizationCheckoutSession } from "@/app/dashboard/settings/billing/stripe-actions";
import {
    initiateStripeConnect,
    getConnectStatus,
    getConnectDashboardLink,
} from "@/app/dashboard/gyms/connect-actions";
import { PLATFORM_FEE_PERCENT } from "@/lib/stripe-config";

// ─── Platform Plans ────────────────────────────────────────────────────────────

const plans = [
    {
        id: 'free',
        name: 'FREE',
        price: '€0',
        description: 'Ideal para empezar',
        features: ['Perfil público', 'Hasta 10 clases/semana', 'Check-in manual', 'Hasta 50 miembros', 'Chat básico'],
        cta: 'Plan Actual',
        color: 'gray'
    },
    {
        id: 'starter',
        name: 'STARTER',
        price: '€49.99',
        period: '/mes',
        description: 'Oferta Lanzamiento: Primeros 50 centros',
        features: ['Todo de Free', 'Clases ilimitadas', 'Sistema de pruebas', 'Tienda básica', 'Google Calendar sync', 'Notificaciones push'],
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
        features: ['Todo de Starter', 'WOD Generator', 'Churn Prediction', 'Benchmarking Competitivo', 'Tienda avanzada', 'Reportes automáticos'],
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

// ─── Connect Section ───────────────────────────────────────────────────────────

function ConnectSection({ organizationId }: { organizationId: string }) {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const searchParams = useSearchParams();
    const stripeParam = searchParams.get('stripe');

    useEffect(() => {
        getConnectStatus(organizationId).then((s) => {
            setStatus(s);
            setLoading(false);
        });
    }, [organizationId, stripeParam]);

    const handleConnect = async () => {
        setActionLoading(true);
        try {
            const result = await initiateStripeConnect(organizationId);
            if (result?.error) {
                alert('Error: ' + result.error);
            } else if (result?.url) {
                window.location.href = result.url;
                return; // keep spinner while redirect happens
            }
        } catch (err: any) {
            alert('Error inesperado: ' + (err?.message || err));
        } finally {
            setActionLoading(false);
        }
    };

    const handleDashboard = async () => {
        setActionLoading(true);
        try {
            const result = await getConnectDashboardLink(organizationId);
            if (result?.error) {
                alert('Error: ' + result.error);
            } else if (result?.url) {
                window.open(result.url, '_blank');
            }
        } catch (err: any) {
            alert('Error inesperado: ' + (err?.message || err));
        } finally {
            setActionLoading(false);
        }
    };

    const isConnected = status?.connected && status?.onboarding_complete;
    const isPending = status?.connected && !status?.onboarding_complete;

    return (
        <div className={clsx(
            "rounded-[2rem] border p-8 space-y-6",
            isConnected
                ? "bg-green-500/5 border-green-500/20"
                : isPending
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : "bg-brand-red/5 border-brand-red/20"
        )}>
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className={clsx(
                    "p-3 rounded-2xl shrink-0",
                    isConnected ? "bg-green-500/10" : "bg-brand-red/10"
                )}>
                    <BanknoteIcon className={clsx("w-7 h-7", isConnected ? "text-green-400" : "text-brand-red")} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg italic uppercase tracking-tight">
                        Cobros a Alumnos
                    </h3>
                    <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                        Cobra membresías directamente desde la app. El dinero va a tu cuenta bancaria automáticamente.
                        Rival retiene un <span className="text-white font-bold">{PLATFORM_FEE_PERCENT}%</span> de cada cobro.
                    </p>
                </div>
                {/* Status badge */}
                {!loading && (
                    <div className={clsx(
                        "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        isConnected ? "bg-green-500/15 text-green-400" :
                            isPending ? "bg-yellow-500/15 text-yellow-400" :
                                "bg-white/5 text-gray-500"
                    )}>
                        {isConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                            isPending ? <AlertCircle className="w-3.5 h-3.5" /> :
                                <AlertCircle className="w-3.5 h-3.5" />}
                        {isConnected ? 'Activo' : isPending ? 'Pendiente' : 'No activado'}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando estado...
                </div>
            ) : (
                <>
                    {/* State: Not connected */}
                    {!status?.connected && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { icon: Euro, label: 'Sin comisiones fijas', desc: 'Solo el 5% por cobro procesado' },
                                    { icon: BanknoteIcon, label: 'Pago automático', desc: 'Stripe transfiere a tu banco semanalmente' },
                                    { icon: Shield, label: 'Verificación Stripe', desc: 'KYC seguro gestionado por Stripe' },
                                ].map(({ icon: Icon, label, desc }) => (
                                    <div key={label} className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-1">
                                        <Icon className="w-5 h-5 text-brand-red mb-2" />
                                        <p className="text-white text-xs font-bold">{label}</p>
                                        <p className="text-gray-500 text-[10px]">{desc}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-brand-red text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_4px_15px_rgba(220,38,38,0.3)] disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BanknoteIcon className="w-4 h-4" />}
                                Activar cobros — Conectar Stripe
                            </button>
                            <p className="text-[10px] text-gray-600">
                                Serás redirigido a Stripe para introducir los datos de tu empresa y cuenta bancaria. Proceso guiado, ~5 minutos.
                            </p>
                        </div>
                    )}

                    {/* State: Onboarding started but not complete */}
                    {isPending && (
                        <div className="space-y-4">
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-yellow-400 text-xs font-bold">Registro incompleto</p>
                                    <p className="text-gray-400 text-[10px] mt-0.5">
                                        Debes completar el registro en Stripe para empezar a recibir pagos. Puede que falten datos de empresa o bancarios.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleConnect}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-yellow-500 text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Continuar registro en Stripe
                            </button>
                        </div>
                    )}

                    {/* State: Fully connected */}
                    {isConnected && (
                        <div className="space-y-4">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-green-400 text-xs font-bold">Cobros activos</p>
                                    <p className="text-gray-400 text-[10px]">
                                        Cuando envíes una solicitud de pago a un alumno, el dinero irá directamente a tu cuenta bancaria tras deducir el {PLATFORM_FEE_PERCENT}% de comisión.
                                    </p>
                                </div>
                            </div>

                            {/* Fee breakdown example */}
                            <div className="bg-black/20 border border-white/5 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ejemplo — Membresía de 50€</p>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-gray-300"><span>Alumno paga</span><span className="font-bold text-white">50,00 €</span></div>
                                    <div className="flex justify-between text-gray-500"><span>Comisión Rival ({PLATFORM_FEE_PERCENT}%)</span><span>- 2,50 €</span></div>
                                    <div className="flex justify-between text-gray-500"><span>Comisión Stripe (~2,9% + 0,30€)</span><span>- 1,75 €</span></div>
                                    <div className="border-t border-white/5 pt-1 flex justify-between text-green-400 font-bold"><span>Recibes tú</span><span>45,75 €</span></div>
                                </div>
                            </div>

                            <button
                                onClick={handleDashboard}
                                disabled={actionLoading}
                                className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                                Ver Dashboard Stripe Express
                            </button>
                        </div>
                    )}

                    {/* stripe=connected param feedback */}
                    {stripeParam === 'connected' && !loading && (
                        <p className="text-green-400 text-xs font-bold animate-in fade-in">
                            ✅ Registro completado. Si los cobros no están activos aún, Stripe puede tardar unos minutos en verificar los datos.
                        </p>
                    )}
                    {stripeParam === 'error' && (
                        <p className="text-brand-red text-xs font-bold animate-in fade-in">
                            ⚠️ Error al generar el enlace de registro. Inténtalo de nuevo.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

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
                alert("Para cancelar tu suscripción, contacta con soporte o usa el Portal de Facturación.");
            } else {
                const priceId = plan.id === 'starter'
                    ? process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_1SxdaPCpwHwK9MuevBVancPf'
                    : process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_1SxdavCpwHwK9Mueeesvlq6T';
                await createOrganizationCheckoutSession(priceId, organizationId);
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
                    {org?.center_type === 'personal_trainer'
                        ? <User className="w-4 h-4 text-brand-red" />
                        : <Building2 className="w-4 h-4 text-brand-red" />}
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                        {org?.center_type === 'personal_trainer' ? 'Planes para Entrenadores' : 'Planes para Centros'}
                    </span>
                </div>
                <h1 className="text-4xl lg:text-5xl font-heading font-extrabold italic uppercase tracking-tighter text-white">
                    {org?.center_type === 'personal_trainer'
                        ? <>Eleva tu <span className="text-brand-red">Carrera</span></>
                        : <>Potencia tu <span className="text-brand-red">Centro</span></>}
                </h1>
                <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
                    Herramientas profesionales para gestionar, medir y escalar tu{' '}
                    {org?.center_type === 'personal_trainer' ? 'negocio de coaching' : 'comunidad fitness'}.
                </p>
            </header>

            {/* ── Cobros a Alumnos (Stripe Connect) ── */}
            <section>
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand-red rounded-full" />
                    Cobros a Alumnos
                </h2>
                <ConnectSection organizationId={organizationId} />
            </section>

            {/* ── Plan de Plataforma ── */}
            <section>
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
                    <span className="w-1 h-3 bg-brand-red rounded-full" />
                    Plan de Plataforma
                </h2>
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
                                    {'period' in plan && <span className="text-gray-500 font-bold text-xs uppercase">{(plan as any).period}</span>}
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
            </section>

            <section className="bg-brand-gray/30 border border-white/5 p-10 rounded-[3rem]">
                <div className="flex flex-col md:flex-row gap-10 items-center">
                    <div className="h-20 w-20 rounded-3xl bg-brand-red/10 flex items-center justify-center shrink-0">
                        <Shield className="w-10 h-10 text-brand-red" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <h4 className="text-xl font-bold text-white italic uppercase">Facturación Segura</h4>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                            Tus pagos están protegidos por Stripe. Los cobros a alumnos van directamente a tu cuenta bancaria.
                            Puedes solicitar facturas detalladas para deducir impuestos de tu empresa.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
