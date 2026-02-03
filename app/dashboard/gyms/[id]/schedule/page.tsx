import { getCenterClasses } from "../../management-actions";
import { getCenterTeam } from "../../actions";
import { checkStaffRole } from "../../team-actions";
import ScheduleManager from "./ScheduleManager";
import { Calendar } from "lucide-react";

export default async function SchedulePage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Fetch data parallelly
    const [classes, coaches, { role }] = await Promise.all([
        getCenterClasses(id),
        getCenterTeam(id),
        checkStaffRole(id)
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

            <ScheduleManager centerId={id} initialClasses={classes} coaches={coaches} userRole={role} />
        </div>
    );
}
