import { getClassDetails, markAttendance } from "../../../management-actions";
import { getCenterTeam } from "../../../actions"; // Import getCenterTeam
import { checkStaffRole } from "../../../team-actions";
import { Loader2, Check, X, User, Calendar, Clock, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AttendanceToggle from "./AttendanceToggle";
import EditClassButton from "./EditClassButton";

export default async function ClassDetailPage({ params }: { params: { id: string, classId: string } }) {
    const { id, classId } = await params;

    // Fetch Data
    const [classData, coaches, { role }] = await Promise.all([
        getClassDetails(classId),
        getCenterTeam(id),
        checkStaffRole(id)
    ]);

    if (!classData) return (
        <div className="p-8 text-center">
            <h1 className="text-xl font-bold mb-4">Class not found</h1>
            <p className="text-gray-500 text-sm">Class ID: {classId}</p>
            <p className="text-gray-500 text-sm">Center ID: {id}</p>
            <Link href={`/dashboard/gyms/${id}/schedule`} className="text-brand-red hover:underline mt-4 inline-block">
                Back to Schedule
            </Link>
        </div>
    );

    const enrolledCount = classData.enrollments.length;

    return (
        <div className="px-1 py-4 sm:p-8 space-y-4 sm:space-y-8 animate-fade-in max-w-5xl mx-auto">
            <Link href={`/dashboard/gyms/${id}/schedule`} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-2 sm:mb-4 ml-2 sm:ml-0">
                <ArrowLeft className="w-4 h-4" /> Back to Schedule
            </Link>

            <div className="bg-brand-gray border border-white/5 rounded-2xl sm:rounded-3xl p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Calendar className="w-32 h-32 text-brand-red" />
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div className="flex-1 min-w-0">
                            <span className="bg-brand-red/10 text-brand-red border border-brand-red/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                                {classData.class_type}
                            </span>
                            <h1 className="text-3xl sm:text-4xl font-heading font-black text-white italic uppercase mb-2 break-words leading-tight">{classData.name}</h1>
                            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-400 mt-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-brand-red shrink-0" />
                                    <span>{new Date(classData.scheduled_time).toLocaleTimeString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-brand-red shrink-0" />
                                    <span>{classData.duration_minutes} min</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-brand-red shrink-0" />
                                    <span className="truncate">Coach {classData.coach?.full_name || classData.coach_name || 'Jesus Gomez'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            <div className="text-left sm:text-right order-2 sm:order-1">
                                <div className="text-4xl sm:text-5xl font-heading font-black text-white italic leading-none">{enrolledCount}</div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alumnos / {classData.max_capacity}</div>
                            </div>
                            <div className="order-1 sm:order-2">
                                <EditClassButton centerId={id} classData={classData} coaches={coaches} userRole={role} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-brand-gray/50 border border-white/5 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    Attendance Sheet
                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400 font-normal">{enrolledCount} Students</span>
                </h3>

                {classData.enrollments.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 italic">
                        No students enrolled yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {classData.enrollments.map((enrollment: any) => (
                            <div key={enrollment.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-3 sm:p-4 rounded-xl group hover:border-white/10 transition-colors gap-3 overflow-hidden">
                                <Link
                                    href={`/dashboard/gyms/${id}/members?memberId=${enrollment.member?.id}`}
                                    className="flex items-center gap-3 sm:gap-4 hover:opacity-80 transition-opacity cursor-pointer flex-1 min-w-0"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden relative border border-white/10 shrink-0">
                                        {enrollment.member?.avatar_url ? (
                                            <img src={enrollment.member.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-bold text-white group-hover:text-brand-red transition-colors text-sm sm:text-base">
                                                {enrollment.member?.full_name || 'Unknown'}
                                                {enrollment.member?.user?.username && (
                                                    <span className="ml-2 text-[10px] text-gray-500 font-normal lowercase tracking-tighter">
                                                        @{enrollment.member.user.username}
                                                    </span>
                                                )}
                                            </p>
                                            {enrollment.member?.status === 'trial' && (
                                                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[7px] font-black uppercase px-1.5 py-0.5 rounded shrink-0">Trial</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-gray-500 truncate font-mono">
                                            {enrollment.member?.email || 'No email'}
                                        </p>
                                    </div>
                                </Link>

                                <div className="shrink-0">
                                    <AttendanceToggle
                                        enrollmentId={enrollment.id}
                                        initialAttended={enrollment.attended}
                                        path={`/dashboard/gyms/${id}/schedule/${classId}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lista de Espera */}
            {classData.waitlist && classData.waitlist.length > 0 && (
                <div className="bg-brand-gray/50 border border-amber-500/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        Lista de Espera
                        <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-normal">{classData.waitlist.length} en espera</span>
                    </h3>
                    <div className="space-y-3">
                        {classData.waitlist.map((entry: any, index: number) => (
                            <div key={entry.id} className="flex items-center gap-3 sm:gap-4 bg-black/40 border border-white/5 p-3 sm:p-4 rounded-xl">
                                <span className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-500 text-xs font-black flex items-center justify-center shrink-0">
                                    {index + 1}
                                </span>
                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden relative border border-white/10 shrink-0">
                                    {entry.member?.avatar_url ? (
                                        <img src={entry.member.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-gray-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-white text-sm sm:text-base truncate">{entry.member?.full_name || 'Desconocido'}</p>
                                    <p className="text-[10px] sm:text-xs text-gray-500 truncate font-mono">
                                        En espera desde {new Date(entry.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-4 italic">Si se libera una plaza, el primero de la lista entra automáticamente y recibe una notificación.</p>
                </div>
            )}
        </div>
    );
}
