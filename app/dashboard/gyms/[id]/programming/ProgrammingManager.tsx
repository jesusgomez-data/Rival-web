"use client";

import { useState } from "react";
import {
    Users,
    Calendar,
    Activity,
    Plus,
    Search,
    User as UserIcon,
    ChevronRight,
    Sparkles,
    Clock,
    Dumbbell,
    Send,
    MessageSquare,
    Save,
    Loader2
} from "lucide-react";
import { generateCoachResponse } from "../../../coach/ai-actions";
import { createWod } from "../../wod-actions";
import { assignWorkoutToStudent } from "../../programming-actions";

export default function ProgrammingManager({ centerId, members, orgDetails, initialPosts }: any) {
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<any>(null);
    const [showWodCreator, setShowWodCreator] = useState(false);

    // Assignment State
    const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAssigning, setIsAssigning] = useState(false);

    const filteredMembers = members.filter((m: any) =>
        (m.full_name || m.user?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleGenerateAI = async () => {
        if (!selectedMember) return;
        setIsGenerating(true);

        const userProfile = {
            level: "Intermediate",
            main_sport: "CrossTraining",
            full_name: selectedMember.full_name || selectedMember.user?.full_name || "Alumno",
        };

        const res = await generateCoachResponse(
            `Genera una rutina personalizada de 45 minutos para mi alumno que quiere mejorar su fuerza y resistencia cardiovascular.`,
            userProfile
        );

        if (res.workout) {
            setGeneratedPlan(res.workout);
        }
        setIsGenerating(false);
    };

    const handleAssign = async () => {
        if (!selectedMember || !generatedPlan) return;
        setIsAssigning(true);

        const workoutData = {
            title: generatedPlan.title,
            date: assignDate,
            exercises: generatedPlan.exercises,
            description: generatedPlan.description,
            duration: generatedPlan.duration,
            sportType: generatedPlan.sportType
        };

        const result = await assignWorkoutToStudent(centerId, selectedMember.user?.id || selectedMember.id, workoutData);

        setIsAssigning(false);
        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            alert("¡Entrenamiento asignado con éxito!");
            setGeneratedPlan(null); // Clear after assignment
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
            {/* Sidebar: Alumnos */}
            <div className="lg:col-span-4 bg-brand-gray/50 rounded-3xl border border-white/5 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            placeholder="Buscar alumno..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-brand-red outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {filteredMembers.map((member: any) => (
                        <button
                            key={member.id}
                            onClick={() => setSelectedMember(member)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${selectedMember?.id === member.id ? 'bg-brand-red/10 border border-brand-red/20' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 overflow-hidden flex items-center justify-center">
                                    {member.user?.avatar_url || member.avatar_url ? (
                                        <img src={member.user?.avatar_url || member.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className={`text-sm font-bold ${selectedMember?.id === member.id ? 'text-brand-red' : 'text-white'}`}>
                                        {member.full_name || member.user?.full_name || "Alumno"}
                                    </p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{member.plan || "Sin Plan"}</p>
                                </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedMember?.id === member.id ? 'text-brand-red translate-x-1' : 'text-gray-600'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Main View: Programming Details */}
            <div className="lg:col-span-8 space-y-6 overflow-y-auto custom-scrollbar pr-2">
                {selectedMember ? (
                    <div className="space-y-6">
                        {/* Member Card */}
                        <div className="bg-gradient-to-br from-brand-gray to-black border border-white/5 p-8 rounded-[40px] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8">
                                <Activity className="w-32 h-32 text-brand-red/5 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="w-24 h-24 rounded-3xl bg-gray-800 border-2 border-brand-red/30 overflow-hidden shadow-2xl">
                                    {selectedMember.user?.avatar_url || selectedMember.avatar_url ? (
                                        <img src={selectedMember.user?.avatar_url || selectedMember.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon className="w-10 h-10 mx-auto mt-6 text-gray-400" />
                                    )}
                                </div>
                                <div className="text-center md:text-left">
                                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                        {selectedMember.full_name || selectedMember.user?.full_name || "Alumno"}
                                    </h3>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-red bg-brand-red/10 px-3 py-1 rounded-full border border-brand-red/20">
                                            <Activity className="w-3 h-3" /> Nivel Intermedio
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <Calendar className="w-3 h-3" /> Inscrito Feb 2024
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Suggestion Section */}
                        <div className="bg-purple-500/5 border border-purple-500/20 p-8 rounded-[40px] relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tight">AI Programming Assistant</h4>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Sugerencias inteligentes basadas en el atleta.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating}
                                    className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-glow-purple flex items-center gap-2"
                                >
                                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Generar Sugerencia
                                </button>
                            </div>

                            {generatedPlan && (
                                <div className="bg-black/40 border border-white/5 rounded-3xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <h5 className="text-lg font-black text-white italic uppercase">{generatedPlan.title}</h5>
                                        <div className="flex gap-4">
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                                                <Clock className="w-3 h-3 text-purple-400" /> {generatedPlan.duration}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                                                <Dumbbell className="w-3 h-3 text-purple-400" /> {generatedPlan.sportType}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="prose prose-invert max-w-none">
                                        <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap bg-transparent p-0 leading-relaxed">
                                            {generatedPlan.description}
                                        </pre>
                                    </div>
                                    <div className="pt-4 flex flex-col sm:flex-row gap-4 items-end">
                                        <div className="w-full sm:w-auto">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Fecha Programada</label>
                                            <input
                                                type="date"
                                                value={assignDate}
                                                onChange={(e) => setAssignDate(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-red w-full"
                                            />
                                        </div>
                                        <div className="flex gap-4 w-full sm:w-auto flex-1">
                                            <button className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2">
                                                <Save className="w-4 h-4" /> Guardar
                                            </button>
                                            <button
                                                onClick={handleAssign}
                                                disabled={isAssigning}
                                                className="flex-1 bg-brand-red hover:bg-red-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                Asignar a Alumno
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Active Programming / History */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Programación Activa</h4>
                            <div className="bg-brand-gray/50 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 group hover:border-brand-red/30 transition-all">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-600 group-hover:scale-110 transition-transform">
                                    <Calendar className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white uppercase tracking-widest">Sin entrenamientos activos</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Empieza asignando una rutina o un WOD del centro.</p>
                                </div>
                                <button className="mt-2 text-brand-red text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Crear Entrenamiento Manual
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-brand-gray/20 rounded-[40px] border border-dashed border-white/5">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600 mb-6">
                            <Users className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Selecciona un Alumno</h3>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2 max-w-xs">
                            Elige a uno de tus alumnos de la lista de la izquierda para gestionar su programación, ver su progreso y generar planes con IA.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function LoaderSpinner({ className }: any) {
    return <Loader2 className={`${className} animate-spin`} />;
}
