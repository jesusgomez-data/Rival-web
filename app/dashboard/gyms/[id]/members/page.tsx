import { Suspense } from "react";
import { getCenterMembers, getMembershipPlans } from "../../management-actions";
import { getCenterDetails, getOrganizationCenters } from "../../actions";
import MembersManager from "./MembersManager";
import PTMembersManager from "./PTMembersManager";
import { Users, Loader2 } from "lucide-react";

export default async function MembersPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ centerId?: string }>
}) {
    const { id }       = await params;
    const { centerId } = await searchParams;

    const idToFetch = centerId || id;
    const isSede    = !!centerId;

    const [members, plans, details, centers] = await Promise.all([
        getCenterMembers(idToFetch, isSede),
        getMembershipPlans(id),
        getCenterDetails(id),
        getOrganizationCenters(id)
    ]);

    const isPT = details?.center_type === 'personal_trainer';

    return (
        <div className="px-2 py-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="p-2 bg-brand-red/10 rounded-lg text-brand-red">
                    <Users className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                        {isPT ? 'Mis Alumnos' : 'Gestión de Atletas'}
                    </h2>
                    {isPT && <p className="text-gray-500 text-xs">Gestiona tus clientes y su progreso</p>}
                </div>
            </div>

            <Suspense fallback={
                <div className="flex flex-col items-center justify-center p-20 bg-brand-gray/50 rounded-3xl border border-white/5 animate-pulse">
                    <Loader2 className="w-10 h-10 text-brand-red animate-spin mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando alumnos...</p>
                </div>
            }>
                {isPT
                    ? <PTMembersManager
                        centerId={id}
                        initialMembers={members}
                        plans={plans}
                        orgDetails={details}
                    />
                    : <MembersManager
                        centerId={id}
                        initialMembers={members}
                        plans={plans}
                        centers={centers}
                        orgDetails={details}
                    />
                }
            </Suspense>
        </div>
    );
}
