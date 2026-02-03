import { Suspense } from "react";
import { getCenterMembers, getMembershipPlans } from "../../management-actions";
import MembersManager from "./MembersManager";
import { Users, Loader2 } from "lucide-react";

export default async function MembersPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const members = await getCenterMembers(id);
    const plans = await getMembershipPlans(id);

    return (
        <div className="px-2 py-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                    <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Gestión de Atletas</h2>
            </div>

            <Suspense fallback={
                <div className="flex flex-col items-center justify-center p-20 bg-brand-gray/50 rounded-3xl border border-white/5 animate-pulse">
                    <Loader2 className="w-10 h-10 text-brand-red animate-spin mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando base de datos...</p>
                </div>
            }>
                <MembersManager centerId={id} initialMembers={members} plans={plans} />
            </Suspense>
        </div>
    );
}
