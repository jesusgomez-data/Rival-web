import { Suspense } from "react";
import { getMembershipPlans } from "../../management-actions";
import MembershipManager from "./MembershipManager";
import { CreditCard, Loader2 } from "lucide-react";

export default async function MembershipsPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const plans = await getMembershipPlans(id);

    return (
        <div className="px-2 py-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                    <CreditCard className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Membresías y Tarifas</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Configura los planes de suscripción de tu centro</p>
                </div>
            </div>

            <Suspense fallback={
                <div className="flex flex-col items-center justify-center p-20 bg-brand-gray/50 rounded-3xl border border-white/5 animate-pulse">
                    <Loader2 className="w-10 h-10 text-brand-red animate-spin mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando tarifas...</p>
                </div>
            }>
                <MembershipManager centerId={id} initialPlans={plans} />
            </Suspense>
        </div>
    );
}
