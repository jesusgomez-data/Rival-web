"use client";

import { useState, useEffect } from "react";
import {
    Users, Calendar, Activity, Plus, Search, User as UserIcon,
    ChevronRight, Sparkles, Clock, Dumbbell, Send, Save, Loader2,
    Trash2, CheckCircle2, X, Edit, ChevronDown, ChevronUp, Check
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { generateCoachResponse } from "../../../coach/ai-actions";
import { assignWorkoutToStudent } from "../../programming-actions";

interface Exercise { name: string; sets: string; reps: string; notes: string }

export default function ProgrammingManager({ centerId, members, orgDetails, initialPosts }: any) {
    const supabase = createClient();

    const [selectedMember,  setSelectedMember]  = useState<any>(null);
    const [searchQuery,     setSearchQuery]      = useState("");
    const [isGenerating,    setIsGenerating]     = useState(false);
    const [generatedPlan,   setGeneratedPlan]    = useState<any>(null);
    const [assignDate,      setAssignDate]       = useState(new Date().toISOString().split('T')[0]);
    const [isAssigning,     setIsAssigning]      = useState(false);
    const [toast,           setToast]            = useState<{ msg: string; ok: boolean } | null>(null);

    // Active programming
    const [workouts,        setWorkouts]         = useState<any[]>([]);
    const [loadingWorkouts, setLoadingWorkouts]  = useState(false);
    const [expandedWod,     setExpandedWod]      = useState<string | null>(null);

    // Manual form
    const [showManual,      setShowManual]       = useState(false);
    const [savingManual,    setSavingManual]      = useState(false);
    const [manualForm,      setManualForm]        = useState({
        title: '', date: new Date().toISOString().split('T')[0],
        description: '', duration: '', sportType: '',
    });
    const [exercises,       setExercises]        = useState<Exercise[]>([
        { name: '', sets: '', reps: '', notes: '' }
    ]);

    function showToast(msg: string, ok = true) {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }

    // Load workouts for selected member
    useEffect(() => {
        if (!selectedMember) { setWorkouts([]); return; }
        const uid = selectedMember.user?.id || selectedMember.user_id;
        if (!uid) { setWorkouts([]); return; }
        loadWorkouts(uid);
    }, [selectedMember]);

    async function loadWorkouts(uid: string) {
        setLoadingWorkouts(true);
        const { data } = await supabase
            .from('scheduled_workouts')
            .select('*')
            .eq('user_id', uid)
            .order('scheduled_date', { ascending: false })
            .limit(20);
        setWorkouts(data || []);
        setLoadingWorkouts(false);
    }

    async function handleDeleteWorkout(id: string) {
        if (!confirm('¿Eliminar este entrenamiento?')) return;
        await supabase.from('scheduled_workouts').delete().eq('id', id);
        const uid = selectedMember.user?.id || selectedMember.user_id;
        if (uid) loadWorkouts(uid);
        showToast('Entrenamiento eliminado');
    }

    // AI Generation
    const handleGenerateAI = async () => {
        if (!selectedMember) return;
        setIsGenerating(true);
        const profile = {
            level: "Intermediate",
            main_sport: "CrossTraining",
            full_name: selectedMember.full_name || selectedMember.user?.full_name || "Alumno",
        };
        const res = await generateCoachResponse(
            `Genera una rutina personalizada de 45 minutos para mi alumno que quiere mejorar su fuerza y resistencia cardiovascular.`,
            profile
        );
        if (res.workout) setGeneratedPlan(res.workout);
        setIsGenerating(false);
    };

    // Assign AI plan
    const handleAssign = async () => {
        if (!selectedMember || !generatedPlan) return;
        setIsAssigning(true);
        const result = await assignWorkoutToStudent(centerId, selectedMember.user?.id || selectedMember.user_id, {
            title: generatedPlan.title, date: assignDate,
            exercises: generatedPlan.exercises, description: generatedPlan.description,
            duration: generatedPlan.duration, sportType: generatedPlan.sportType,
        });
        setIsAssigning(false);
        if (result.error) { showToast(result.error, false); }
        else {
            showToast('¡Entrenamiento asignado!');
            setGeneratedPlan(null);
            const uid = selectedMember.user?.id || selectedMember.user_id;
            if (uid) loadWorkouts(uid);
        }
    };

    // Manual workout save
    async function handleSaveManual() {
        if (!manualForm.title.trim()) { showToast('El título es obligatorio', false); return; }
        if (!selectedMember) return;
        setSavingManual(true);

        const workoutData = {
            title: manualForm.title,
            date: manualForm.date,
            description: manualForm.description || null,
            duration: manualForm.duration || null,
            sportType: manualForm.sportType || null,
            exercises: exercises.filter(e => e.name.trim()),
        };

        const result = await assignWorkoutToStudent(
            centerId,
            selectedMember.user?.id || selectedMember.user_id,
            workoutData
        );

        setSavingManual(false);
        if (result.error) { showToast(result.error, false); }
        else {
            showToast('Entrenamiento guardado y asignado ✓');
            setShowManual(false);
            setManualForm({ title: '', date: new Date().toISOString().split('T')[0], description: '', duration: '', sportType: '' });
            setExercises([{ name: '', sets: '', reps: '', notes: '' }]);
            const uid = selectedMember.user?.id || selectedMember.user_id;
            if (uid) loadWorkouts(uid);
        }
    }

    function addExercise() { setExercises(e => [...e, { name: '', sets: '', reps: '', notes: '' }]); }
    function removeExercise(i: number) { setExercises(e => e.filter((_, idx) => idx !== i)); }
    function updateExercise(i: number, key: keyof Exercise, val: string) {
        setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, [key]: val } : ex));
    }

    const filteredMembers = members.filter((m: any) =>
        (m.full_name || m.user?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-200px)]">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 ${toast.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {toast.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* ── SIDEBAR: Alumnos ─────────────────────────────────────────── */}
            <div className="lg:col-span-4 bg-brand-gray/50 rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            placeholder="Buscar alumno..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-brand-red outline-none transition-all placeholder:text-gray-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredMembers.length === 0 ? (
                        <div className="text-center py-12 text-gray-600 text-xs font-bold uppercase tracking-widest">
                            Sin alumnos
                        </div>
                    ) : filteredMembers.map((member: any) => (
                        <button key={member.id} onClick={() => setSelectedMember(member)}
                            className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group mb-1 ${selectedMember?.id === member.id ? 'bg-brand-red/10 border border-brand-red/20' : 'hover:bg-white/5 border border-transparent'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-800 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    {(member.user?.avatar_url || member.avatar_url)
                                        ? <img src={member.user?.avatar_url || member.avatar_url} className="w-full h-full object-cover" alt="" />
                                        : <UserIcon className="w-4 h-4 text-gray-400" />
                                    }
                                </div>
                                <div className="text-left">
                                    <p className={`text-sm font-bold ${selectedMember?.id === member.id ? 'text-brand-red' : 'text-white'}`}>
                                        {member.full_name || member.user?.full_name || "Alumno"}
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{member.plan || "Sin Plan"}</p>
                                </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform flex-shrink-0 ${selectedMember?.id === member.id ? 'text-brand-red translate-x-1' : 'text-gray-600'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* ── MAIN PANEL ───────────────────────────────────────────────── */}
            <div className="lg:col-span-8 space-y-5 overflow-y-auto custom-scrollbar pr-1">
                {selectedMember ? (
                    <div className="space-y-5">
                        {/* Member header */}
                        <div className="bg-gradient-to-br from-brand-gray to-black border border-white/5 px-6 py-5 rounded-3xl flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-gray-800 border border-brand-red/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {(selectedMember.user?.avatar_url || selectedMember.avatar_url)
                                    ? <img src={selectedMember.user?.avatar_url || selectedMember.avatar_url} className="w-full h-full object-cover" alt="" />
                                    : <UserIcon className="w-7 h-7 text-gray-400" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter truncate">
                                    {selectedMember.full_name || selectedMember.user?.full_name || "Alumno"}
                                </h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-red bg-brand-red/10 px-2.5 py-0.5 rounded-full border border-brand-red/20">
                                        {selectedMember.plan || 'Sin plan'}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        {workouts.length} entrenamiento{workouts.length !== 1 ? 's' : ''} asignado{workouts.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Section */}
                        <div className="bg-purple-500/5 border border-purple-500/20 p-6 rounded-3xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-sm uppercase tracking-tight">AI Programming</h4>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Plan personalizado con IA</p>
                                    </div>
                                </div>
                                <button onClick={handleGenerateAI} disabled={isGenerating}
                                    className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Generar
                                </button>
                            </div>

                            {generatedPlan && (
                                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4 animate-in fade-in">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <h5 className="font-black text-white italic uppercase text-base">{generatedPlan.title}</h5>
                                        <div className="flex gap-3">
                                            {generatedPlan.duration && <span className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold"><Clock className="w-3 h-3 text-purple-400" />{generatedPlan.duration}</span>}
                                            {generatedPlan.sportType && <span className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold"><Dumbbell className="w-3 h-3 text-purple-400" />{generatedPlan.sportType}</span>}
                                        </div>
                                    </div>
                                    <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{generatedPlan.description}</pre>
                                    <div className="flex flex-col sm:flex-row gap-3 items-end pt-2 border-t border-white/5">
                                        <div className="w-full sm:w-auto">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Fecha</label>
                                            <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-red" />
                                        </div>
                                        <div className="flex gap-3 flex-1">
                                            <button onClick={() => setGeneratedPlan(null)}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all">
                                                <X className="w-4 h-4" /> Descartar
                                            </button>
                                            <button onClick={handleAssign} disabled={isAssigning}
                                                className="flex-[2] bg-brand-red hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-glow">
                                                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                Asignar a alumno
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── PROGRAMACIÓN ACTIVA ─────────────────────────── */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Programación Activa</h4>
                                <button onClick={() => setShowManual(v => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${showManual ? 'bg-brand-red text-white' : 'bg-white/5 text-brand-red hover:bg-brand-red/10 border border-brand-red/20'}`}>
                                    {showManual ? <><X className="w-3.5 h-3.5" />Cancelar</> : <><Plus className="w-3.5 h-3.5" />Crear Manual</>}
                                </button>
                            </div>

                            {/* Manual workout form */}
                            {showManual && (
                                <div className="bg-white/3 border border-brand-red/20 rounded-2xl p-5 space-y-4 animate-in fade-in">
                                    <h5 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Edit className="w-4 h-4 text-brand-red" /> Nuevo Entrenamiento Manual
                                    </h5>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <Label>Título del entrenamiento *</Label>
                                            <input value={manualForm.title} onChange={e => setManualForm(f => ({ ...f, title: e.target.value }))}
                                                placeholder="Ej: Fuerza + HIIT · Semana 3"
                                                className={INPUT} />
                                        </div>
                                        <div>
                                            <Label>Fecha programada</Label>
                                            <input type="date" value={manualForm.date} onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))}
                                                className={INPUT} />
                                        </div>
                                        <div>
                                            <Label>Duración</Label>
                                            <input value={manualForm.duration} onChange={e => setManualForm(f => ({ ...f, duration: e.target.value }))}
                                                placeholder="45 min" className={INPUT} />
                                        </div>
                                        <div className="col-span-2">
                                            <Label>Descripción / Notas</Label>
                                            <textarea value={manualForm.description} onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))}
                                                rows={2} placeholder="Indicaciones, intensidad, calentamiento…"
                                                className={`${INPUT} resize-none`} />
                                        </div>
                                    </div>

                                    {/* Exercises */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <Label>Ejercicios</Label>
                                            <button onClick={addExercise}
                                                className="text-[10px] font-black text-brand-red hover:underline flex items-center gap-1 uppercase tracking-wider">
                                                <Plus className="w-3 h-3" /> Añadir
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {exercises.map((ex, i) => (
                                                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                                                    <input value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)}
                                                        placeholder="Ejercicio" className={`${INPUT} col-span-5 text-xs py-2`} />
                                                    <input value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)}
                                                        placeholder="Series" className={`${INPUT} col-span-2 text-xs py-2`} />
                                                    <input value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)}
                                                        placeholder="Reps" className={`${INPUT} col-span-2 text-xs py-2`} />
                                                    <input value={ex.notes} onChange={e => updateExercise(i, 'notes', e.target.value)}
                                                        placeholder="Notas" className={`${INPUT} col-span-2 text-xs py-2`} />
                                                    <button onClick={() => removeExercise(i)} disabled={exercises.length === 1}
                                                        className="col-span-1 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 flex items-center justify-center pt-2">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button onClick={handleSaveManual} disabled={savingManual}
                                        className="w-full bg-brand-red text-white py-3 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                                        {savingManual ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</> : <><Save className="w-4 h-4" />Guardar y Asignar</>}
                                    </button>
                                </div>
                            )}

                            {/* Workouts list */}
                            {loadingWorkouts ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-brand-red animate-spin" />
                                </div>
                            ) : workouts.length === 0 && !showManual ? (
                                <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-600">
                                        <Calendar className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase tracking-widest">Sin entrenamientos activos</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Crea uno manual o genera un plan con IA</p>
                                    </div>
                                    <button onClick={() => setShowManual(true)}
                                        className="text-brand-red text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> Crear Entrenamiento Manual
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {workouts.map(w => {
                                        const isExpanded   = expandedWod === w.id;
                                        const isPast       = new Date(w.scheduled_date) < new Date();
                                        const exs: Exercise[] = Array.isArray(w.exercises) ? w.exercises : [];
                                        return (
                                            <div key={w.id}
                                                className={`bg-brand-gray/50 border rounded-2xl overflow-hidden transition-all ${isPast ? 'border-white/5 opacity-75' : 'border-brand-red/20'}`}>
                                                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedWod(isExpanded ? null : w.id)}>
                                                    <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${isPast ? 'bg-gray-600' : 'bg-brand-red'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-black text-sm truncate">{w.title}</p>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <span className="text-[10px] text-gray-500 font-bold">
                                                                📅 {new Date(w.scheduled_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                            </span>
                                                            {w.duration && <span className="text-[10px] text-gray-500 font-bold">⏱ {w.duration}</span>}
                                                            {exs.length > 0 && <span className="text-[10px] text-gray-500 font-bold">🏋️ {exs.length} ejercicio{exs.length !== 1 ? 's' : ''}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {isPast
                                                            ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-500 font-black uppercase">Pasado</span>
                                                            : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-black uppercase">Activo</span>
                                                        }
                                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-0 border-t border-white/5 space-y-3 animate-in fade-in">
                                                        {w.description && (
                                                            <p className="text-gray-400 text-xs mt-3 whitespace-pre-line">{w.description}</p>
                                                        )}
                                                        {exs.length > 0 && (
                                                            <div className="mt-3">
                                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ejercicios</p>
                                                                <div className="space-y-1.5">
                                                                    {exs.map((ex, i) => (
                                                                        <div key={i} className="flex items-center gap-3 p-2.5 bg-white/3 rounded-xl text-xs">
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                                                                            <span className="text-white font-bold flex-1">{ex.name}</span>
                                                                            {ex.sets && <span className="text-gray-500">{ex.sets} series</span>}
                                                                            {ex.reps && <span className="text-gray-500">× {ex.reps}</span>}
                                                                            {ex.notes && <span className="text-gray-600 italic">{ex.notes}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <button onClick={() => handleDeleteWorkout(w.id)}
                                                            className="flex items-center gap-2 text-red-400 text-xs font-bold hover:text-red-300 transition-colors mt-2">
                                                            <Trash2 className="w-3.5 h-3.5" /> Eliminar entrenamiento
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-brand-gray/20 rounded-[40px] border border-dashed border-white/5 min-h-[400px]">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
                            <Users className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Selecciona un Alumno</h3>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2 max-w-xs">
                            Elige un alumno de la lista para gestionar su programación y generar planes con IA.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

const INPUT = "w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-red/50 transition-all placeholder:text-gray-600";

function Label({ children }: { children: React.ReactNode }) {
    return <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">{children}</p>;
}
