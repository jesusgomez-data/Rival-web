"use client";

import { useEffect, useState } from "react";
import { getWorkoutHistory, deleteWorkout } from "../actions";
import { ChevronLeft, Dumbbell, Calendar, Clock, Trash2, Edit2, Loader2, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function WorkoutLogsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando registros...</p>
            </div>
        }>
            <WorkoutLogsContent />
        </Suspense>
    );
}

function WorkoutLogsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dateFilter = searchParams.get('date');
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchLogs = async () => {
        setIsLoading(true);
        const data = await getWorkoutHistory(50);
        setWorkouts(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres borrar este registro de combate? Esta acción no se puede deshacer.")) return;

        setDeletingId(id);
        const result = await deleteWorkout(id);
        if (result.success) {
            setWorkouts(prev => prev.filter(w => w.id !== id));
        } else {
            alert("Error al borrar el entrenamiento");
        }
        setDeletingId(null);
    };

    const filteredWorkouts = dateFilter
        ? workouts.filter(w => new Date(w.display_date).toISOString().split('T')[0] === dateFilter)
        : workouts;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/training" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-heading font-black text-white italic uppercase tracking-tighter">
                            {dateFilter ? `Sesiones: ${dateFilter}` : 'Registros de Combate'}
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            {dateFilter ? 'Filtrado por fecha seleccionada' : 'Tu historial completo de entrenamiento'}
                        </p>
                    </div>
                </div>

                {dateFilter && (
                    <button
                        onClick={() => router.push('/dashboard/training/logs')}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-xl border border-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <X className="w-4 h-4" /> Limpiar Filtro
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 text-brand-red animate-spin" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Recuperando datos de sesión...</p>
                </div>
            ) : filteredWorkouts.length === 0 ? (
                <div className="text-center py-20 bg-brand-gray/30 border border-dashed border-white/5 rounded-3xl">
                    <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg">No hay registros de combate</h3>
                    <p className="text-gray-500 text-sm mb-6">
                        {dateFilter ? `No se encontraron entrenamientos para el día ${dateFilter}.` : 'Todavía no has registrado ninguna sesión, soldado.'}
                    </p>
                    <Link href="/dashboard/training/session" className="bg-white text-black px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all">
                        Iniciar Primera Sesión
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredWorkouts.map((workout) => {
                        const isRunning = workout.sport_type === 'Running' || workout.metrics?.type === 'running';

                        // Calculate Stats based on type
                        let mainStatLabel = 'Peso Máx';
                        let mainStatValue = '0';
                        let mainStatUnit = 'KG';
                        let subStatLabel = 'Intensidad';
                        let subStatValue = `RPE ${workout.effort_rpe}`;
                        let thirdStatLabel = 'Ejercicios';
                        let thirdStatValue = '0';

                        if (isRunning) {
                            mainStatLabel = 'Distancia';
                            // Try to get distance from metrics or calculate from somewhere if needed (usually in metrics)
                            const distMeters = workout.metrics?.distance || 0;
                            mainStatValue = (distMeters / 1000).toFixed(2);
                            mainStatUnit = 'KM';

                            subStatLabel = 'Ritmo';
                            subStatValue = workout.metrics?.pace ? `${workout.metrics.pace}/km` : 'N/A';

                            thirdStatLabel = 'Tiempo';
                            // Format duration if not in metrics
                            const s = workout.duration_seconds;
                            const m = Math.floor(s / 60);
                            const sec = s % 60;
                            thirdStatValue = workout.metrics?.time || `${m}:${sec < 10 ? '0' + sec : sec}`;
                        } else {
                            // Strength Logic
                            const maxWeight = workout.workout_sets?.reduce((max: number, set: any) =>
                                Math.max(max, set.weight_kg || 0), 0) || 0;
                            mainStatValue = maxWeight.toString();

                            thirdStatValue = new Set(workout.workout_sets?.map((s: any) => s.exercise_name)).size.toString();
                        }

                        // Determine pills
                        let pills: string[] = [];
                        if (workout.workout_sets && workout.workout_sets.length > 0) {
                            pills = Array.from(new Set(workout.workout_sets.map((s: any) => s.exercise_name)));
                        } else if (isRunning) {
                            pills = ['Carrera Libre', 'Running'];
                        }

                        return (
                            <div key={workout.id} className="bg-[#0A0A0A] dark-section border border-white/5 rounded-[32px] p-8 hover:border-brand-red/30 transition-all group relative overflow-hidden shadow-2xl">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-brand-red/10 rounded-2xl flex items-center justify-center text-brand-red border border-brand-red/20 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                                                {isRunning ? <Clock className="w-6 h-6 transition-transform group-hover:rotate-12" /> : <Dumbbell className="w-6 h-6 transition-transform group-hover:rotate-12" />}
                                            </div>
                                            <div>
                                                <h3 className="text-white font-heading font-black text-xl uppercase italic tracking-tight group-hover:text-brand-red transition-colors">{workout.title}</h3>
                                                <div className="flex items-center gap-4 text-[11px] text-gray-500 font-black uppercase tracking-widest mt-1">
                                                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(workout.created_at).toLocaleDateString()}</span>
                                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {Math.floor(workout.duration_seconds / 60)}m</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-8 md:gap-12 border-t border-white/5 md:border-none pt-6 md:pt-0">
                                        <div className="text-center">
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
                                                <Trophy className="w-3 h-3 text-yellow-500/50" /> {mainStatLabel}
                                            </p>
                                            <p className="text-white font-heading font-black text-2xl italic">{mainStatValue} <span className="text-xs">{mainStatUnit}</span></p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">{subStatLabel}</p>
                                            <p className="text-brand-red font-heading font-black text-2xl italic">{subStatValue}</p>
                                        </div>
                                        <div className="text-center hidden sm:block">
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1.5">{thirdStatLabel}</p>
                                            <p className="text-white font-heading font-black text-2xl italic">{thirdStatValue}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pl-4 border-l border-white/5">
                                            <Link
                                                href={`/dashboard/training/session?editId=${workout.id}`}
                                                className="p-3 text-gray-600 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                                                title="Editar entreno"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(workout.id)}
                                                disabled={deletingId === workout.id}
                                                className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                                title="Borrar entreno"
                                            >
                                                {deletingId === workout.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Exercises Preview Pills */}
                                <div className="mt-8 pt-8 border-t border-white/5 flex flex-wrap gap-3">
                                    {pills.map((exName: any, idx) => (
                                        <div key={idx} className="bg-white/5 hover:bg-white/10 rounded-2xl px-5 py-2.5 text-[10px] font-black text-gray-400 border border-white/5 transition-colors uppercase tracking-widest italic flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_5px_rgba(220,38,38,0.5)]"></div>
                                            {exName}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
