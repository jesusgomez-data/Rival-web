"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { Activity, Flame, Trophy } from "lucide-react";

interface ActivityHeatmapProps {
    workouts: any[];
}

export default function ActivityHeatmap({ workouts }: ActivityHeatmapProps) {
    const [stats, setStats] = useState({
        streak: 0,
        totalWorkouts: 0,
        thisMonth: 0
    });

    useEffect(() => {
        // Calculate Streak and stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const workoutDates = workouts.map(w => {
            const d = new Date(w.start_time);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }).sort((a, b) => b - a);

        const uniqueDates = Array.from(new Set(workoutDates));

        let streak = 0;
        let current = new Date(today);

        // Loop backwards to find current streak
        for (let i = 0; i < uniqueDates.length; i++) {
            const date = new Date(uniqueDates[i]);
            const diff = (current.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

            if (diff === 0) {
                streak++;
                current.setDate(current.getDate() - 1);
            } else if (diff === 1) {
                streak++;
                current.setDate(current.getDate() - 1);
            } else if (diff > 1 && i === 0) {
                // If the most recent workout was not today or yesterday, streak is 0
                break;
            } else {
                break;
            }
        }

        const thisMonth = workouts.filter(w => {
            const d = new Date(w.start_time);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        }).length;

        setStats({
            streak,
            totalWorkouts: workouts.length,
            thisMonth
        });
    }, [workouts]);

    // Generate last 12 weeks of days
    const DAYS_TO_SHOW = 12 * 7;
    const days = Array.from({ length: DAYS_TO_SHOW }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (DAYS_TO_SHOW - 1 - i));
        d.setHours(0, 0, 0, 0);

        const count = workouts.filter(w => {
            const wd = new Date(w.start_time);
            wd.setHours(0, 0, 0, 0);
            return wd.getTime() === d.getTime();
        }).length;

        return {
            date: d,
            count
        };
    });

    const getIntensityClass = (count: number) => {
        if (count === 0) return "bg-white/5";
        if (count === 1) return "bg-brand-red/30";
        if (count === 2) return "bg-brand-red/60 shadow-[0_0_8px_rgba(220,38,38,0.3)]";
        return "bg-brand-red shadow-glow";
    };

    return (
        <div className="bg-brand-gray/30 border border-white/5 p-6 rounded-[32px] backdrop-blur-xl group">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-red" /> Constancia de Combate
                </h3>
                <div className="flex items-center gap-2 bg-brand-red/10 px-3 py-1 rounded-full border border-brand-red/20 shadow-glow">
                    <Flame className="w-3 h-3 text-brand-red animate-pulse" />
                    <span className="text-[10px] font-black text-white italic">{stats.streak} DÍAS</span>
                </div>
            </div>

            <div className="flex gap-2 mb-6">
                <div className="grid grid-cols-12 gap-1.5 flex-1">
                    {days.map((day, i) => (
                        <div
                            key={i}
                            className={clsx(
                                "aspect-square rounded-[4px] md:rounded-sm transition-all duration-500 hover:scale-125 hover:z-10",
                                getIntensityClass(day.count)
                            )}
                            title={`${day.date.toDateString()}: ${day.count} entrenos`}
                        />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <p className="text-2xl font-black text-white italic leading-none">{stats.totalWorkouts}</p>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Total Misiones</p>
                </div>
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <p className="text-2xl font-black text-brand-red italic leading-none">{stats.thisMonth}</p>
                    <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Este Mes</p>
                </div>
            </div>
        </div>
    );
}
