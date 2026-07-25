import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import GymLayoutClient from "./GymLayoutClient";
import TrialEndedPlanPicker from "./TrialEndedPlanPicker";


export default async function CenterLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch Organization
    const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !org) {
        notFound();
    }

    // Prueba gratuita de 2 meses vencida: bloquear el panel hasta que
    // actualicen de plan. No se borra ni se oculta el centro, solo se
    // impide seguir gestionandolo desde aqui. Se aplica a cualquier centro
    // con trial_ends_at vencido, no solo a los que eligieron plan "free" —
    // hoy no hay cobro real de Stripe en el alta (center-signup), así que
    // Básico/Pro elegidos ahí tampoco han pagado nada todavía.
    if (org.subscription_status !== 'active' && org.trial_ends_at && new Date(org.trial_ends_at) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-6 relative">
                <Link
                    href="/dashboard"
                    className="absolute top-6 left-6 w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-foreground hover:bg-white/10 transition-all"
                    style={{ top: 'max(24px, env(safe-area-inset-top))' }}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="max-w-2xl w-full text-center space-y-8 bg-brand-gray border border-white/5 rounded-[32px] p-10 shadow-2xl">
                    <div className="space-y-6">
                        <div className="w-16 h-16 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mx-auto">
                            <span className="text-3xl">⏰</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-heading font-black italic uppercase text-foreground mb-2">Tu prueba gratuita terminó</h1>
                            <p className="text-sm text-muted-foreground">
                                Los 2 meses gratis de <strong>{org.name}</strong> han finalizado. Elige un plan para seguir gestionando clases, miembros y pagos.
                            </p>
                        </div>
                    </div>
                    <TrialEndedPlanPicker organizationId={id} centerType={org.center_type} />
                </div>
            </div>
        );
    }

    // Verify Access (Role check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/');

    const isOwner = org.owner_id === user.id;
    let userRole: string = isOwner ? 'owner' : 'coach';

    if (!isOwner) {
        const { data: roleData } = await supabase
            .from('center_roles')
            .select('role')
            .eq('organization_id', id)
            .eq('user_id', user.id)
            .single();

        if (!roleData) {
            redirect('/dashboard/gyms'); // No access
        }
        userRole = roleData.role;
    }

    // Fetch User Profile for Header
    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();

    const isAdmin = userRole === 'owner' || userRole === 'head_coach';
    const roleLabel = userRole === 'owner' ? 'VISTA DE PROPIETARIO' : userRole === 'head_coach' ? 'VISTA DE HEAD COACH' : 'VISTA DE COACH';

    return (
        <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div></div>}>
            <GymLayoutClient
                org={org}
                isAdmin={isAdmin}
                roleLabel={roleLabel}
                userRole={userRole}
                profile={profile}
            >
                {children}
            </GymLayoutClient>
        </Suspense>
    );
}
