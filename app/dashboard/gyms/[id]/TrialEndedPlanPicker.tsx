"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { createOrganizationCheckoutSession } from "@/app/dashboard/settings/billing/stripe-actions";
import { isProfessional } from "@/lib/professional-types";

// Mismos planes/precios que la página de facturación del centro
// (app/dashboard/gyms/[id]/settings/billing/page.tsx) — se excluye el tier
// gratuito aquí: si ya se venció la prueba, quedarse en Free no es una
// opción real, el usuario tiene que elegir un plan de pago para seguir.
const plans = [
    {
        id: 'starter',
        name: 'STARTER',
        price: '€49.99',
        period: '/mes',
        features: ['Clases ilimitadas', 'Sistema de pruebas', 'Tienda básica', 'Google Calendar sync', 'Notificaciones push'],
        cta: 'Mejorar a Starter',
        highlight: true,
    },
    {
        id: 'pro',
        name: 'PRO',
        price: '€99.99',
        period: '/mes',
        features: ['Todo de Starter', 'WOD Generator', 'Churn Prediction', 'Benchmarking Competitivo', 'Reportes automáticos'],
        cta: 'Obtener Pro',
    }
];

const PT_PLANS = [
    {
        id: 'pt_pro',
        name: 'PROFESIONAL PRO',
        price: '€29.99',
        period: '/mes',
        features: ['Alumnos ilimitados', 'Programación con IA', 'Pagos integrados (Stripe)', 'Agenda Avanzada', 'Chat directo'],
        cta: 'Mejorar a Pro',
        highlight: true,
    },
    {
        id: 'pt_elite',
        name: 'PROFESIONAL ELITE',
        price: '€59.99',
        period: '/mes',
        features: ['Todo en Pro', 'App personalizada (PWA)', 'Análisis de retención', 'Soporte prioritario 24/7'],
        cta: 'Obtener Elite',
    }
];

export default function TrialEndedPlanPicker({ organizationId, centerType }: { organizationId: string; centerType: string }) {
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const handleUpgrade = async (planId: string) => {
        setLoadingPlan(planId);
        try {
            const priceId = planId === 'starter'
                ? (process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_1SxdaPCpwHwK9MuevBVancPf')
                : (process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_1SxdavCpwHwK9Mueeesvlq6T');
            await createOrganizationCheckoutSession(priceId, organizationId);
        } catch (error: any) {
            // createOrganizationCheckoutSession usa redirect() de Next, que
            // internamente lanza un error especial para navegar — no es un
            // fallo real, así que no lo mostramos como error al usuario.
            if (error?.digest?.startsWith('NEXT_REDIRECT')) throw error;
            alert('Error: ' + (error?.message || 'No se pudo iniciar el pago.'));
            setLoadingPlan(null);
        }
    };

    const activePlans = isProfessional(centerType) ? PT_PLANS : plans;

    return (
        <div className="grid sm:grid-cols-2 gap-4 w-full">
            {activePlans.map((plan) => (
                <div
                    key={plan.id}
                    className={clsx(
                        "flex flex-col p-6 rounded-3xl border bg-black/40 text-left",
                        plan.highlight ? "border-brand-red/50 ring-1 ring-brand-red/20" : "border-white/10"
                    )}
                >
                    <h3 className="text-lg font-bold text-white italic uppercase tracking-tight">{plan.name}</h3>
                    <div className="mt-1 mb-4 flex items-baseline gap-1">
                        <span className="text-3xl font-heading font-black text-white">{plan.price}</span>
                        <span className="text-gray-500 font-bold text-xs uppercase">{plan.period}</span>
                    </div>
                    <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-brand-red mt-0.5 shrink-0" />
                                <span className="text-xs text-gray-300">{f}</span>
                            </li>
                        ))}
                    </ul>
                    <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={loadingPlan !== null}
                        className={clsx(
                            "w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                            plan.highlight ? "bg-brand-red text-white hover:bg-red-600" : "bg-white text-black hover:bg-gray-200"
                        )}
                    >
                        {loadingPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {loadingPlan === plan.id ? 'Redirigiendo...' : plan.cta}
                    </button>
                </div>
            ))}
        </div>
    );
}
