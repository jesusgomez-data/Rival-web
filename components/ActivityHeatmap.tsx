"use client";


import { clsx } from "clsx";
import { Activity, Flame } from "lucide-react";
import { useRouter } from "next/navigation";

interface Workout {
    start_time: string;
    // Add other properties if needed, but start_time is crucial here
    [key: string]: unknown;
}

interface ActivityHeatmapProps {
    workouts: Workout[];
}

export default function ActivityHeatmap({ workouts }: ActivityHeatmapProps) {
    const router = useRouter();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get number of days in the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Get starting weekday of the month (0 = Sun, 1 = Mon, etc.)
    // We want Monday start (0 = Mon, ..., 6 = Sun)
    let startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    // Convert Sunday (0) to 7 for easier calculation, so Mon(1) remains 1
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Generate calendar slots
    // "padding" slots for previous month days (empty)
    const paddingSlots = Array(startDayOfWeek).fill(null);

    // actual day slots
    const daySlots = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const date = new Date(currentYear, currentMonth, day);
        date.setHours(0, 0, 0, 0);

        const dayWorkouts = workouts.filter(w => {
            const wDate = new Date(w.start_time);
            wDate.setHours(0, 0, 0, 0);
            return wDate.getTime() === date.getTime();
        });

        const isToday = day === today.getDate();

        return {
            day,
            date,
            count: dayWorkouts.length,
            isToday
        };
    });

    // Combined slots
    const allSlots = [...paddingSlots, ...daySlots];

    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const monthName = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return (
        <div className="bg-brand-gray/30 border border-white/5 p-6 rounded-[32px] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-brand-red" /> Calendario Activo
                    </h3>
                    <p className="text-white font-bold italic text-sm capitalize">{capitalizedMonth}</p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/5">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        {daySlots.filter(d => d.count > 0).length} días activos
                    </span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="w-full">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-[10px] font-black text-gray-600 uppercase py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {allSlots.map((slot, i) => {
                        if (!slot) {
                            return <div key={`empty-${i}`} className="aspect-square" />;
                        }

                        const hasWorkout = slot.count > 0;

                        return (
                            <div
                                key={slot.day}
                                className={clsx(
                                    "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center relative transition-all duration-300 group select-none",
                                    hasWorkout
                                        ? "bg-brand-red shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:scale-110 cursor-pointer z-10"
                                        : "bg-white/5",
                                    slot.isToday && !hasWorkout && "border border-white/20"
                                )}
                                onClick={() => {
                                    if (hasWorkout) {
                                        const year = slot.date.getFullYear();
                                        const month = String(slot.date.getMonth() + 1).padStart(2, '0');
                                        const day = String(slot.date.getDate()).padStart(2, '0');
                                        router.push(`/dashboard/training/logs?date=${year}-${month}-${day}`);
                                    }
                                }}
                            >
                                <span className={clsx(
                                    "text-[10px] md:text-xl font-black italic tracking-tighter z-10 relative",
                                    hasWorkout ? "text-white" : "text-gray-600 group-hover:text-gray-400"
                                )}>
                                    {slot.day}
                                </span>

                                {hasWorkout && (
                                    <Flame className="w-[120%] h-[120%] absolute -bottom-1 -right-1 text-black/10 -rotate-12 pointer-events-none" />
                                )}

                                {slot.isToday && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-red rounded-full animate-pulse shadow-glow" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
