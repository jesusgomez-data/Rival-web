import { getCenterTeam } from "../../actions";
import TeamManagement from "./TeamManagement";
import { Users } from "lucide-react";

export default async function TeamPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Fetch initial team data on the server
    const rawTeam = await getCenterTeam(id);

    // Normalize data (Supabase sometimes returns relations as arrays)
    const team = (rawTeam || []).map((member: any) => ({
        ...member,
        user: Array.isArray(member.user) ? member.user[0] : member.user
    }));

    return (
        <div className="px-2 py-4 sm:p-8 space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-8 border-b border-white/5 pb-4 sm:pb-8">
                <div className="p-2 sm:p-3 bg-brand-red/10 rounded-xl sm:rounded-2xl border border-brand-red/20 text-brand-red shrink-0">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-black text-white italic uppercase leading-tight">Access Control</h1>
                    <p className="text-sm sm:text-base text-gray-400">Manage coaches, staff, and permissions.</p>
                </div>
            </div>

            <TeamManagement centerId={id} initialTeam={team} />
        </div>
    );
}
