import { Suspense } from "react";
import { getCenterClasses } from "../../management-actions";
import { getCenterTeam, getCenterDetails, getOrganizationCenters } from "../../actions";
import { checkStaffRole } from "../../team-actions";
import ScheduleManager from "./ScheduleManager";
import ProfessionalAgenda from "./ProfessionalAgenda";
import { isProfessional } from "@/lib/professional-types";
import { Calendar, Loader2 } from "lucide-react";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [{ role }, details] = await Promise.all([
        checkStaffRole(id),
        getCenterDetails(id),
    ]);

    // Professionals get a booking-based agenda, not the gym class scheduler
    if (isProfessional(details?.center_type)) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in">
                <div className="shrink-0 flex items-start gap-4 px-4 pt-4 pb-3 border-b border-border">
                    <div className="p-2.5 bg-brand-red/10 rounded-2xl border border-brand-red/20 text-brand-red shrink-0">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-heading font-black text-white italic uppercase">Agenda de Citas</h1>
                        <p className="text-xs text-gray-500">Citas confirmadas de clientes. Los pendientes aparecen en Reservas.</p>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <ProfessionalAgenda professionalId={id} />
                </div>
            </div>
        );
    }

    // Gym/center: load full data for class scheduler
    const [classes, coaches, centers] = await Promise.all([
        getCenterClasses(id),
        getCenterTeam(id),
        getOrganizationCenters(id)
    ]);

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div className="flex items-start gap-4 mb-6 md:mb-8 border-b border-white/5 pb-6 md:pb-8">
                <div className="p-3 bg-brand-red/10 rounded-2xl border border-brand-red/20 text-brand-red shrink-0">
                    <Calendar className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-heading font-black text-white italic uppercase">Schedule</h1>
                    <p className="text-sm md:text-base text-gray-400">Manage class times, coaches, and capacity.</p>
                </div>
            </div>

            <Suspense fallback={
                <div className="flex flex-col items-center justify-center p-20 bg-brand-gray/50 rounded-3xl border border-white/5 animate-pulse">
                    <Loader2 className="w-10 h-10 text-brand-red animate-spin mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando horario...</p>
                </div>
            }>
                <ScheduleManager
                    centerId={id}
                    initialClasses={classes}
                    coaches={coaches}
                    userRole={role}
                    centers={centers}
                    organizationDetails={details}
                />
            </Suspense>
        </div>
    );
}
