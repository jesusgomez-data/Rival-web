"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Loader2, X, Hourglass, Dumbbell, ChevronRight } from "lucide-react";
import { unenrollFromClass, leaveWaitlist } from "@/app/dashboard/gyms/schedule-actions";

interface UpcomingClass {
    id: string;
    class_id: string;
    name: string;
    scheduled_time: string;
    duration_minutes: number;
    center_id: string;
    center_name: string;
    center_logo: string | null;
    coach_name: string | null;
}

export default function MyClassesSection({ initialEnrollments, initialWaitlist }: {
    initialEnrollments: UpcomingClass[];
    initialWaitlist: UpcomingClass[];
}) {
    const [enrollments, setEnrollments] = useState<UpcomingClass[]>(initialEnrollments);
    const [waitlist, setWaitlist] = useState<UpcomingClass[]>(initialWaitlist);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

    function flash(text: string, isError = false) {
        setMessage({ text, isError });
        setTimeout(() => setMessage(null), 5000);
    }

    async function handleCancel(cls: UpcomingClass) {
        if (!confirm(`¿Cancelar tu reserva en ${cls.name}?`)) return;
        setBusyId(cls.id);
        const res = await unenrollFromClass(cls.center_id, cls.class_id);
        setBusyId(null);
        if (res.error) {
            flash(res.error, true);
        } else {
            setEnrollments(prev => prev.filter(e => e.id !== cls.id));
            flash("Reserva cancelada.");
        }
    }

    async function handleLeaveWaitlist(cls: UpcomingClass) {
        if (!confirm(`¿Salir de la lista de espera de ${cls.name}?`)) return;
        setBusyId(cls.id);
        const res = await leaveWaitlist(cls.center_id, cls.class_id);
        setBusyId(null);
        if (res.error) {
            flash(res.error, true);
        } else {
            setWaitlist(prev => prev.filter(e => e.id !== cls.id));
            flash("Has salido de la lista de espera.");
        }
    }

    function formatWhen(iso: string) {
        const d = new Date(iso);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const isToday = d.toDateString() === today.toDateString();
        const isTomorrow = d.toDateString() === tomorrow.toDateString();
        const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (isToday) return `Hoy · ${time}`;
        if (isTomorrow) return `Mañana · ${time}`;
        return `${d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })} · ${time}`;
    }

    const ClassCard = ({ cls, isWaitlist }: { cls: UpcomingClass; isWaitlist: boolean }) => (
        <div className={`bg-muted/50 border rounded-2xl p-4 flex items-center gap-3 sm:gap-4 ${isWaitlist ? 'border-amber-500/20' : 'border-border'}`}>
            <Link href={`/gym/${cls.center_id}`} className="w-11 h-11 rounded-xl overflow-hidden bg-background border border-border shrink-0 flex items-center justify-center">
                {cls.center_logo ? (
                    <img src={cls.center_logo} alt={cls.center_name} className="w-full h-full object-cover" />
                ) : (
                    <Dumbbell className="w-5 h-5 text-brand-red" />
                )}
            </Link>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black italic uppercase text-sm text-foreground truncate">{cls.name}</p>
                    {isWaitlist && (
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Hourglass className="w-2.5 h-2.5" /> En Espera
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-brand-red uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> {formatWhen(cls.scheduled_time)}
                    </span>
                    <Link href={`/gym/${cls.center_id}`} className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors truncate">
                        <MapPin className="w-3 h-3" /> {cls.center_name}
                    </Link>
                    {cls.coach_name && (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:inline">Coach {cls.coach_name}</span>
                    )}
                </div>
            </div>
            <button
                onClick={() => isWaitlist ? handleLeaveWaitlist(cls) : handleCancel(cls)}
                disabled={busyId === cls.id}
                title={isWaitlist ? 'Salir de la lista de espera' : 'Cancelar reserva'}
                className="shrink-0 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 border border-border hover:border-red-500/30 rounded-xl px-3 py-2 transition-all disabled:opacity-50"
            >
                {busyId === cls.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isWaitlist ? 'Salir' : 'Cancelar'}</span>
            </button>
        </div>
    );

    return (
        <div className="space-y-4 mb-10">
            <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-foreground flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-red" /> Mis Clases
                </h2>
                {enrollments.length > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{enrollments.length} próxima{enrollments.length !== 1 ? 's' : ''}</span>
                )}
            </div>

            {message && (
                <div className={`text-xs font-bold rounded-xl p-3 border animate-in fade-in ${message.isError ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                    {message.text}
                </div>
            )}

            {enrollments.length === 0 && waitlist.length === 0 ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-border">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold text-muted-foreground">No tienes clases reservadas.</p>
                    <Link href="/dashboard/gyms" className="inline-flex items-center gap-1 text-brand-red text-xs font-black uppercase tracking-widest mt-2 hover:underline">
                        Ir a mi box <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {enrollments.map(cls => <ClassCard key={cls.id} cls={cls} isWaitlist={false} />)}
                    {waitlist.map(cls => <ClassCard key={cls.id} cls={cls} isWaitlist={true} />)}
                </div>
            )}
        </div>
    );
}
