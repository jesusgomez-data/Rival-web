import { Suspense } from "react";
import { getTodayClasses, getCheckinStats, getOrgMembersForCheckin } from "../../management-actions";
import { getCenterDetails } from "../../actions";
import CheckinManager from "./CheckinManager";
import { ScanLine, Loader2 } from "lucide-react";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [todayClasses, stats, members, details] = await Promise.all([
        getTodayClasses(id),
        getCheckinStats(id),
        getOrgMembersForCheckin(id),
        getCenterDetails(id),
    ]);

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div className="flex items-start gap-4 mb-6 md:mb-8 border-b border-white/5 pb-6 md:pb-8">
                <div className="p-3 bg-brand-red/10 rounded-2xl border border-brand-red/20 text-brand-red shrink-0">
                    <ScanLine className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-black text-white italic uppercase">Check-in</h1>
                    <p className="text-sm md:text-base text-gray-400">Registro de asistencia por clase o acceso libre al centro.</p>
                </div>
            </div>

            <Suspense fallback={
                <div className="flex flex-col items-center justify-center p-20 bg-brand-gray/50 rounded-3xl border border-white/5 animate-pulse">
                    <Loader2 className="w-10 h-10 text-brand-red animate-spin mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando asistencia...</p>
                </div>
            }>
                <CheckinManager
                    centerId={id}
                    initialClasses={todayClasses}
                    stats={stats}
                    members={members}
                />
            </Suspense>
        </div>
    );
}
