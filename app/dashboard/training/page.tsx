"use client";

import { getMissions, getRecentPRs, getUserProfile, getScheduledWorkouts, getWorkoutHistory, getPublishedResults, deleteScheduledWorkout } from "./actions";
import { type TrainingPlan } from "./types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Play, Clock, Dumbbell, Zap, Target, Award, List, ChevronDown, ChevronUp, Trophy, X, Sparkles } from "lucide-react";
import Image from "next/image";

export default function TrainingPage() {
    const [missions, setMissions] = useState<any[]>([]);
    const [prs, setPrs] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [scheduled, setScheduled] = useState<any[]>([]);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [publishedResults, setPublishedResults] = useState<any[]>([]);
    const [isWodExpanded, setIsWodExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            const [missionsData, prsData, profileData, scheduledData, workoutsData, publishedData] = await Promise.all([
                getMissions(),
                getRecentPRs(),
                getUserProfile(),
                getScheduledWorkouts(),
                getWorkoutHistory(30),
                getPublishedResults(1)
            ]);
            setMissions(missionsData);
            setPrs(prsData);
            setProfile(profileData);
            setScheduled(scheduledData);
            setWorkouts(workoutsData);
            setPublishedResults(publishedData);
            setIsLoading(false);
        }
        fetchData();
    }, []);

    // Unified Level to Difficulty Mapping
    const getLevelCategory = (level: number): 'beginner' | 'intermediate' | 'elite' => {
        if (level >= 15) return 'elite';
        if (level >= 7) return 'intermediate';
        return 'beginner';
    };

    const currentDayOfWeek = new Date().getDay(); // 0 is Sunday, 1 is Monday...

    const routinePool: Record<string, TrainingPlan[]> = {
        'beginner': [
            {
                id: 'beg-1',
                title: "Constructor de Base (A)",
                description: "Enfoque en fuerza básica y técnica de ejecución.",
                sport: 'gym', difficulty: 'beginner', duration_min: 45, is_premium: false,
                exercises: [
                    { id: 'b1', name: "Sentadillas Goblet", target: "3 series x 12 reps", sets: [] },
                    { id: 'b2', name: "Flexiones (Push-ups)", target: "3 series x Max reps", sets: [] },
                    { id: 'b3', name: "Remo con Mancuerna", target: "3 series x 12 reps", sets: [] },
                    { id: 'b4', name: "Plancha", target: "3 series x 45 seg", sets: [] }
                ]
            },
            {
                id: 'beg-h',
                title: "Hybrid Starter",
                description: "Iniciación al entrenamiento híbrido: Carrera suave y calistenia.",
                sport: 'hybrid', difficulty: 'beginner', duration_min: 40, is_premium: false,
                exercises: [
                    { id: 'bh1', name: "Run 2km", target: "Z2 Pace", sets: [] },
                    { id: 'bh2', name: "Air Squats", target: "3 series x 20 reps", sets: [] },
                    { id: 'bh3', name: "Push Ups", target: "3 series x 10 reps", sets: [] }
                ]
            }
        ],
        'intermediate': [
            {
                id: 'int-1',
                title: "Empuje de Hipertrofia (Push)",
                description: "Día de empuje enfocado en pecho, hombros y tríceps.",
                sport: 'gym', difficulty: 'intermediate', duration_min: 75, is_premium: false,
                exercises: [
                    { id: 'i1', name: "Press de Banca", target: "4 series x 8 reps", sets: [] },
                    { id: 'i2', name: "Press Militar Barra", target: "3 series x 10 reps", sets: [] },
                    { id: 'i3', name: "Aperturas Inclinadas", target: "3 series x 12 reps", sets: [] },
                    { id: 'i4', name: "Elevaciones Laterales", target: "4 series x 15 reps", sets: [] }
                ]
            },
            {
                id: 'int-h',
                title: "WOD Híbrido: RIVAL 500",
                description: "Reto metabólico combinando remo y ejercicios de peso corporal.",
                sport: 'hybrid', difficulty: 'intermediate', duration_min: 35, is_premium: false,
                exercises: [
                    { id: 'ih1', name: "Row 500m", target: "Max Effort", sets: [] },
                    { id: 'ih2', name: "Burpees", target: "50 reps", sets: [] },
                    { id: 'ih3', name: "Kettlebell Swings", target: "50 reps", sets: [] },
                    { id: 'ih4', name: "Row 500m", target: "Finish strong", sets: [] }
                ]
            }
        ],
        'elite': [
            {
                id: 'eli-1',
                title: "Bloque de Poder Élite (Squat)",
                description: "Alta intensidad para picos de fuerza máxima.",
                sport: 'gym', difficulty: 'elite', duration_min: 90, is_premium: true,
                exercises: [
                    { id: 'e1', name: "Sentadilla Trasera", target: "5 series x 3 reps", note: "Singles Pesados", sets: [] },
                    { id: 'e2', name: "Peso Muerto con Pausa", target: "3 series x 5 reps", sets: [] },
                    { id: 'e3', name: "Dominadas Lastradas", target: "4 series x 6 reps", sets: [] },
                    { id: 'e4', name: "Paseo del Granjero", target: "3 series x 40m", sets: [] }
                ]
            },
            {
                id: 'eli-h',
                title: "Hyrox Simulation: Elite",
                description: "Entrenamiento de volumen Hyrox para atletas avanzados.",
                sport: 'hybrid', difficulty: 'elite', duration_min: 80, is_premium: true,
                exercises: [
                    { id: 'eh1', name: "Run 1km", target: "4:00 pace", sets: [] },
                    { id: 'eh2', name: "Sled Push 50m", target: "Heavy", sets: [] },
                    { id: 'eh3', name: "Run 1km", target: "4:15 pace", sets: [] },
                    { id: 'eh4', name: "Burpee Broad Jumps", target: "80 meters", sets: [] }
                ]
            }
        ]
    };

    const userDifficulty = getLevelCategory(profile?.level || 1);
    const pool = routinePool[userDifficulty];
    // Simple rotation logic: Day 1,3,5 -> Routine A, Day 2,4,6 -> Routine B
    const routineIndex = currentDayOfWeek % pool.length;
    const activeRoutine = pool[routineIndex];

    // Generate current week days
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDiff);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.getDate().toString();
        const fullDateISO = d.toISOString().split('T')[0];
        const isToday = d.toDateString() === today.toDateString();

        // Check if a workout was completed on this day (using unified display_date)
        const wasDone = workouts.some(w => new Date(w.display_date).toDateString() === d.toDateString());

        let status = 'future';
        if (isToday) status = 'active';
        else if (wasDone) status = 'done';
        else if (d < today) status = 'rest';

        return {
            day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
            date: dateStr,
            fullDate: fullDateISO,
            status: status
        };
    });

    return (
        <div className="space-y-12 pb-20">
            {/* Hero Header */}
            <div className="relative h-[300px] rounded-3xl overflow-hidden group">
                <Image
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop"
                    alt="Training Hero"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full flex flex-col md:flex-row justify-between items-end gap-6">
                    <div className="max-w-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-brand-red text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">Programa Actual</span>
                            <span className="text-gray-300 text-xs font-bold uppercase tracking-widest !text-gray-300">Semana 4 • Bloque de Hipertrofia</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-heading font-black !text-white glow-text">CENTRO DE ENTRENAMIENTO</h1>
                    </div>
                    <Link href="/dashboard/training/session" className="bg-white text-black px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-red hover:text-white transition-all transform hover:-translate-y-1 shadow-2xl">
                        <Play className="w-5 h-5 fill-current" /> INICIAR SESIÓN
                    </Link>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-8">
                {/* Left Column (Main Focus) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Week Calendar */}
                    <div className="bg-brand-gray/50 border border-border/10 rounded-3xl p-6 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-brand-red" /> Semana Actual
                            </h3>
                            <Link href="/dashboard/training/logs" className="text-xs font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1">
                                VER REGISTROS <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-7 gap-3">
                            {weekDays.map((d, i) => (
                                <div
                                    key={i}
                                    className={`
                                            flex flex-col items-center p-4 rounded-2xl border transition-all cursor-pointer relative group
                                            ${d.status === 'active' ? 'bg-brand-red border-brand-red text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] scale-105' :
                                            d.status === 'done' ? 'bg-white/5 border-green-500/20 text-gray-400 opacity-60' :
                                                'bg-white/5 border-white/5 text-gray-600 hover:border-white/20'}
                                        `}
                                >
                                    <span className="text-[10px] font-bold uppercase mb-1 tracking-tighter">{d.day}</span>
                                    <span className={`text-xl font-heading font-black ${d.status === 'done' ? 'text-green-500' : ''}`}>{d.date}</span>
                                    {d.status === 'done' && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-green-500" />}
                                    {d.status === 'active' && <div className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span></div>}

                                    {scheduled.some(s => {
                                        const sDate = new Date(s.scheduled_date);
                                        return sDate.toISOString().split('T')[0] === d.fullDate;
                                    }) && (
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_5px_rgba(220,38,38,0.5)]" />
                                                {d.status === 'active' && <span className="text-[6px] font-black uppercase text-white/80">Goal</span>}
                                            </div>
                                        )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scheduled Workouts Section */}
                    {scheduled.length > 0 && (
                        <div className="bg-gradient-to-br from-blue-900/20 to-brand-gray border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden">
                            <div className="absolute -right-20 -top-20 w-60 h-60 bg-blue-500/5 rounded-full blur-[80px]"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-400" /> Entrenamientos Programados
                                    </h3>
                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-bold uppercase tracking-widest">
                                        {scheduled.length} Pendiente{scheduled.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {scheduled.map((workout: any, idx: number) => {
                                        const workoutDate = new Date(workout.scheduled_date);
                                        const isToday = workoutDate.toDateString() === new Date().toDateString();
                                        const isPast = workoutDate < new Date() && !isToday;

                                        return (
                                            <div
                                                key={idx}
                                                className={`bg-black/40 border rounded-2xl p-5 transition-all hover:border-blue-500/30 ${isToday ? 'border-brand-red/30 shadow-[0_0_15px_rgba(220,38,38,0.1)]' :
                                                    isPast ? 'border-yellow-500/20' :
                                                        'border-white/5'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-white text-base">{workout.title}</h4>
                                                            {isToday && (
                                                                <span className="text-[8px] bg-brand-red text-white px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                                                    HOY
                                                                </span>
                                                            )}
                                                            {isPast && (
                                                                <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                                                    PENDIENTE
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                                            📅 {workoutDate.toLocaleDateString('es-ES', {
                                                                weekday: 'long',
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Exercise Preview */}
                                                <div className="space-y-2 mb-4 bg-white/5 rounded-xl p-4 border border-white/5">
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">
                                                        Vista Previa del WOD:
                                                    </p>
                                                    {workout.exercises && workout.exercises.slice(0, 4).map((ex: any, exIdx: number) => (
                                                        <div key={exIdx} className="flex items-center gap-2 text-xs text-gray-400">
                                                            <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                                                            <span className="font-bold text-gray-300">{ex.name}</span>
                                                            {ex.sets && ex.reps && (
                                                                <span className="text-gray-500">• {ex.sets} x {ex.reps}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {workout.exercises && workout.exercises.length > 4 && (
                                                        <p className="text-[10px] text-gray-600 italic">
                                                            +{workout.exercises.length - 4} ejercicios más...
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Link
                                                        href={`/dashboard/training/session?mode=scheduled&workout=${encodeURIComponent(JSON.stringify({
                                                            title: workout.title,
                                                            exercises: workout.exercises
                                                        }))}`}
                                                        className="flex items-center justify-center gap-2 bg-brand-red text-white py-2.5 rounded-lg text-xs font-black uppercase transition-all hover:bg-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                                                    >
                                                        <Play className="w-3 h-3 fill-current" /> Iniciar Ahora
                                                    </Link>
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('¿Eliminar este entrenamiento programado?')) {
                                                                const result = await deleteScheduledWorkout(workout.id);
                                                                if (result.success) {
                                                                    // Refresh the scheduled workouts list
                                                                    const updatedScheduled = await getScheduledWorkouts();
                                                                    setScheduled(updatedScheduled);
                                                                } else {
                                                                    alert('Error al eliminar el entrenamiento. Inténtalo de nuevo.');
                                                                }
                                                            }
                                                        }}
                                                        className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-400 py-2.5 rounded-lg text-xs font-black uppercase transition-all hover:bg-white/10 hover:text-white"
                                                    >
                                                        <X className="w-3 h-3" /> Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Today's Recommended Routine */}
                    <Link
                        href={`/dashboard/training/session?mode=recommendation&plan=${encodeURIComponent(JSON.stringify(activeRoutine))}`}
                        className="block bg-gradient-to-br from-brand-gray to-black border border-white/10 rounded-3xl p-8 relative overflow-hidden group shadow-2xl hover:border-brand-red/50 transition-all duration-300"
                    >
                        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-brand-red/10 rounded-full blur-[100px] group-hover:bg-brand-red/20 transition-all duration-700"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-brand-red/20 text-brand-red px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-brand-red/20">
                                    <Zap className="w-3 h-3 fill-current" /> RECOMENDADO POR EL COACH
                                </span>
                                <h2 className="text-xl font-heading font-bold !text-white uppercase tracking-wider">{activeRoutine.title}</h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 bg-black/40 p-6 rounded-2xl border border-white/5">
                                <StatItem icon={<Clock className="w-4 h-4" />} label="Duración" value={`${activeRoutine.duration_min} min`} />
                                <StatItem icon={<Dumbbell className="w-4 h-4" />} label="Volumen" value={activeRoutine.difficulty === 'beginner' ? 'Moderado' : 'Alto'} />
                                <StatItem icon={<Zap className="w-4 h-4 text-brand-red" />} label="Intensidad" value={activeRoutine.difficulty === 'elite' ? 'RPE 9-10' : 'RPE 6-8'} />
                                <StatItem icon={<Target className="w-4 h-4 text-yellow-500" />} label="Enfoque" value={activeRoutine.sport === 'gym' ? 'Musculación' : 'Resistencia'} />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-heading font-bold text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <Target className="w-3 h-3" /> Vista Previa
                                    </h3>
                                    <span className="text-[10px] font-black text-brand-red uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Pulsa para empezar →</span>
                                </div>
                                <div className="grid gap-3">
                                    {activeRoutine.exercises.map((ex: any, idx: number) => (
                                        <WorkoutItem key={idx} name={ex.name} sets={ex.target} note={ex.note} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Link>


                    {/* Latest Published Class Result (WOD) */}
                    {publishedResults && publishedResults.length > 0 && (
                        <div className="bg-gradient-to-br from-brand-gray/80 to-black border border-white/10 rounded-3xl p-8 relative overflow-hidden group shadow-2xl transition-all duration-500">
                            <div className="absolute -left-20 -top-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] transition-all duration-700"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-blue-500/20">
                                            <Trophy className="w-3 h-3" /> RESULTADO PUBLICADO
                                        </span>
                                        <h2 className="text-xl font-heading font-bold !text-white uppercase tracking-wider">
                                            WOD {(publishedResults[0].class?.organization?.name || 'CENTRO')}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden md:block">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                {new Date(publishedResults[0].date_performed).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsWodExpanded(!isWodExpanded)}
                                            className={`p-2 rounded-full border border-white/10 transition-all ${isWodExpanded ? 'bg-brand-red text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                        >
                                            {isWodExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Content - Accordion Effect */}
                                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isWodExpanded ? 'max-h-[2000px] mt-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="space-y-4">
                                        <h3 className="font-heading font-bold text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <List className="w-3 h-3" /> Detalle del Entrenamiento
                                        </h3>
                                        <div className="grid gap-3">
                                            {publishedResults[0].data?.map((section: any, sIdx: number) => (
                                                section.exercises?.map((ex: any, eIdx: number) => (
                                                    <WorkoutItem
                                                        key={`${sIdx}-${eIdx}`}
                                                        name={ex.name || 'Ejercicio'}
                                                        sets={section.type === 'weight' ? `${ex.sets || '?'}x${ex.reps || '?'} • ${ex.value || '0'}kg` : section.value || 'Completado'}
                                                        note={section.title || section.type}
                                                    />
                                                ))
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {!isWodExpanded && (
                                    <button
                                        onClick={() => setIsWodExpanded(true)}
                                        className="mt-4 w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-blue-400 transition-colors py-2 border-t border-dashed border-white/5"
                                    >
                                        Hacer clic para expandir detalles
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recent Sessions (History) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-heading font-bold text-foreground uppercase tracking-widest text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-red" /> Actividad Reciente
                            </h3>
                            <Link href="/dashboard/training/logs" className="text-[10px] font-black text-brand-red hover:underline uppercase tracking-widest">
                                Historial Completo
                            </Link>
                        </div>

                        <div className="grid gap-4">
                            {workouts.slice(0, 3).map((w, idx) => {
                                // Unified Max Weight
                                const maxWeight = w.max_weight_kg || 0;

                                return (
                                    <div key={idx} className="bg-brand-gray/30 border border-border/10 p-5 rounded-2xl flex items-center justify-between group hover:border-border/30 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-brand-red border border-white/5">
                                                {w.type === 'class_result' ? <Trophy className="w-6 h-6" /> : <Dumbbell className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">{w.title}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                                    {new Date(w.display_date).toLocaleDateString()} • {w.type === 'class_result' ? 'Resultado en Centro' : `${Math.floor(w.duration_seconds / 60)} min`} • RPE {w.effort_rpe}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-1 justify-end">
                                                <Trophy className="w-3 h-3 text-yellow-500" />
                                                <p className="text-white font-heading font-black italic">{maxWeight} <span className="text-[10px] text-gray-500 uppercase">kg máx</span></p>
                                            </div>
                                            {w.is_pr && <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded font-black uppercase">Nuevo Récord</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            {workouts.length === 0 && !isLoading && (
                                <div className="text-center py-10 border border-dashed border-white/5 rounded-2xl">
                                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest italic">No hay datos de combate registrados este mes.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column (Progression & Missions) */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Mission Control */}
                    <div className="bg-brand-gray/40 border border-border/10 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
                        <Image
                            src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop"
                            alt="Missions"
                            fill
                            className="object-cover opacity-10 absolute inset-0 pointer-events-none"
                        />
                        <h3 className="font-heading font-bold text-foreground mb-6 flex items-center gap-2">
                            <Target className="w-5 h-5 text-brand-red" /> Control de Misiones
                        </h3>
                        <div className="space-y-6">
                            {isLoading ? (
                                <div className="text-gray-500 text-xs animate-pulse">Cargando protocolos de misión...</div>
                            ) : missions.length > 0 ? (
                                missions.map(m => (
                                    <MissionCard
                                        key={m.id}
                                        title={m.title}
                                        progress={(m.current_value / m.goal_value) * 100}
                                        desc={m.description}
                                        reward={`+${m.xp_reward} XP`}
                                        completed={m.is_completed}
                                    />
                                ))
                            ) : (
                                <div className="text-gray-500 text-xs">No se encontraron misiones activas.</div>
                            )}
                        </div>
                    </div>

                    {/* Personal Best Widget */}
                    <div className="bg-gradient-to-br from-yellow-600/20 to-brand-gray border border-white/10 rounded-3xl p-6">
                        <h3 className="font-heading font-bold !text-white mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-500" /> Trofeos Recientes
                        </h3>
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-gray-500 text-xs animate-pulse">Escaneando historial de logros...</div>
                            ) : prs.length > 0 ? (
                                prs.map((pr, idx) => (
                                    <div key={idx} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-yellow-500/10">
                                        <div className="w-10 h-10 bg-yellow-400/10 rounded-full flex items-center justify-center text-yellow-500">
                                            <Trophy className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Récord en {pr.exercise_name}</p>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Alcanzó {pr.weight_kg}KG el {new Date(pr.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-[10px] italic">Aún no hay trofeos. Las series pesadas aparecerán aquí.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}


function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {icon} {label}
            </div>
            <p className="!text-white font-black text-lg font-heading">{value}</p>
        </div>
    )
}

function WorkoutItem({ name, sets, note }: { name: string, sets: string, note?: string }) {
    return (
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all hover:translate-x-1">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center text-brand-red border border-white/5">
                    <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-white text-sm">{name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{sets}</p>
                </div>
            </div>
            {note && (
                <span className="text-[8px] font-black uppercase text-brand-red bg-brand-red/10 border border-brand-red/20 px-2 py-1 rounded">
                    {note}
                </span>
            )}
        </div>
    )
}

function MissionCard({ title, progress, desc, reward, completed }: any) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <div>
                    <p className={`text-sm font-bold ${completed ? 'text-green-500' : 'text-foreground'}`}>{title}</p>
                    <p className="text-[10px] text-gray-500">{desc}</p>
                </div>
                <span className="text-[10px] font-bold text-brand-red bg-brand-red/10 px-2 py-0.5 rounded">{reward}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ${completed ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.3)]'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

