"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Calendar, Loader2, X, ChevronRight, AlertCircle, Check } from "lucide-react";
import { getCoachShifts, upsertCoachShift, deleteCoachShift } from "../../team-actions";
import clsx from "clsx";

interface Shift {
    id: string;
    user_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    user: { id: string; full_name: string; avatar_url: string; username: string };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_ES: any = {
    'Monday': 'Lunes', 'Tuesday': 'Martes', 'Wednesday': 'Miércoles',
    'Thursday': 'Jueves', 'Friday': 'Viernes', 'Saturday': 'Sábado', 'Sunday': 'Domingo'
};
const DAYS_SHORT: any = {
    'Monday': 'L', 'Tuesday': 'M', 'Wednesday': 'X',
    'Thursday': 'J', 'Friday': 'V', 'Saturday': 'S', 'Sunday': 'D'
};
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function CoachShifts({ centerId, team }: { centerId: string, team: any[] }) {
    const [shifts, setShifts]           = useState<Shift[]>([]);
    const [loading, setLoading]         = useState(true);
    const [showModal, setShowModal]     = useState(false);
    const [isSaving, setIsSaving]       = useState(false);
    const [selectedDays, setSelectedDays] = useState<string[]>(['Monday']);
    const [formData, setFormData] = useState({ user_id: "", start_time: "08:00", end_time: "14:00" });

    useEffect(() => { loadShifts(); }, [centerId]);

    const loadShifts = async () => {
        setLoading(true);
        const res = await getCoachShifts(centerId);
        if (res.shifts) setShifts(res.shifts);
        setLoading(false);
    };

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const selectWeekdays = () => setSelectedDays([...WEEKDAYS]);
    const selectAll      = () => setSelectedDays([...DAYS]);
    const clearDays      = () => setSelectedDays([]);

    const handleUpsert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.user_id) { alert("Selecciona un coach"); return; }
        if (!selectedDays.length) { alert("Selecciona al menos un día"); return; }

        setIsSaving(true);
        // Create a shift for each selected day
        for (const day of selectedDays) {
            await upsertCoachShift(centerId, { ...formData, day_of_week: day });
        }
        setIsSaving(false);
        setShowModal(false);
        setSelectedDays(['Monday']);
        setFormData({ user_id: "", start_time: "08:00", end_time: "14:00" });
        loadShifts();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este turno?")) return;
        const res = await deleteCoachShift(centerId, id);
        if (res.success) setShifts(prev => prev.filter(s => s.id !== id));
    };

    const groupedShifts = DAYS.reduce((acc: any, day) => {
        acc[day] = shifts.filter(s => s.day_of_week === day);
        return acc;
    }, {});

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-xl font-bold text-white italic uppercase tracking-tight flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brand-red" /> Horario de Coaches
                    </h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black opacity-60">Turnos semanales automáticos. Reciben notificaciones cuando están de guardia.</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="w-full sm:w-auto bg-brand-red text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-brand-red/20">
                    <Plus className="w-4 h-4" /> Añadir Turno
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-brand-red animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cargando cuadrante...</p>
                </div>
            ) : shifts.length === 0 ? (
                <div className="bg-brand-gray/50 border border-white/5 rounded-[2rem] p-12 text-center flex flex-col items-center gap-4">
                    <Calendar className="w-12 h-12 text-gray-700 opacity-20" />
                    <div className="max-w-xs">
                        <p className="text-lg font-black text-white italic uppercase tracking-tighter">Horario Vacío</p>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">Configura los turnos de tus coaches. Pueden ser de lunes a viernes, o incluir fines de semana.</p>
                    </div>
                    <button onClick={() => setShowModal(true)} className="mt-4 text-brand-red text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-80 transition-opacity flex items-center gap-2">
                        Configurar primer turno <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DAYS.map(day => (
                        groupedShifts[day].length > 0 && (
                            <div key={day} className="bg-brand-gray border border-white/5 rounded-3xl overflow-hidden hover:border-brand-red/30 transition-all">
                                <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white italic">{DAYS_ES[day]}</h3>
                                    <span className="text-[10px] bg-brand-red/10 text-brand-red px-2 py-0.5 rounded-full font-black uppercase">{groupedShifts[day].length} Turnos</span>
                                </div>
                                <div className="p-2 space-y-2">
                                    {groupedShifts[day].map((shift: Shift) => (
                                        <div key={shift.id} className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between group/item">
                                            <div className="flex items-center gap-3">
                                                <img src={shift.user.avatar_url || `https://ui-avatars.com/api/?name=${shift.user.full_name}`} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt="" />
                                                <div>
                                                    <p className="text-xs font-bold text-white truncate">{shift.user.full_name}</p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-brand-red font-black">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(shift.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
                    <div className="bg-brand-gray border border-white/10 rounded-[2.5rem] p-6 w-full max-w-md animate-in fade-in zoom-in duration-300 relative shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-red/10 rounded-full blur-[60px] pointer-events-none" />

                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Añadir Turno</h3>
                                <p className="text-[10px] text-brand-red font-bold uppercase tracking-widest mt-0.5">Configuración horaria</p>
                            </div>
                            <button onClick={() => { setShowModal(false); setSelectedDays(['Monday']); }} className="p-2 bg-white/5 rounded-full text-gray-500 hover:text-white transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpsert} className="space-y-5 relative">
                            {/* Coach selector */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Seleccionar Coach</label>
                                <div className="grid grid-cols-1 gap-2 mt-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                                    {team.map((member) => (
                                        <button key={member.user.id} type="button"
                                            onClick={() => setFormData({ ...formData, user_id: member.user.id })}
                                            className={clsx("flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                                formData.user_id === member.user.id ? "bg-brand-red/10 border-brand-red text-white" : "bg-black/40 border-white/5 text-gray-400 hover:border-white/20"
                                            )}>
                                            <img src={member.user.avatar_url || `https://ui-avatars.com/api/?name=${member.user.full_name}`} className="w-8 h-8 rounded-full border border-white/10 object-cover" alt="" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{member.user.full_name}</p>
                                                <p className="text-[9px] uppercase tracking-wider opacity-50">{member.role}</p>
                                            </div>
                                            {formData.user_id === member.user.id && <Check className="w-4 h-4 text-brand-red shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Day multi-select */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Días de la Semana</label>
                                    <div className="flex gap-1.5">
                                        <button type="button" onClick={selectWeekdays} className="text-[9px] font-black uppercase tracking-widest text-brand-red hover:opacity-80 transition-opacity px-2 py-0.5 rounded-full border border-brand-red/30 bg-brand-red/10">
                                            L-V
                                        </button>
                                        <button type="button" onClick={selectAll} className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors px-2 py-0.5 rounded-full border border-white/10">
                                            Todo
                                        </button>
                                        <button type="button" onClick={clearDays} className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors px-2 py-0.5">
                                            Limpiar
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap mt-1">
                                    {DAYS.map(day => {
                                        const active = selectedDays.includes(day);
                                        const isWeekend = day === 'Saturday' || day === 'Sunday';
                                        return (
                                            <button key={day} type="button" onClick={() => toggleDay(day)}
                                                className={clsx(
                                                    "flex-1 min-w-[calc(14%-6px)] py-2.5 rounded-xl border text-[10px] font-black transition-all",
                                                    active ? "bg-brand-red border-brand-red text-white shadow-[0_0_8px_rgba(220,38,38,0.3)]"
                                                           : isWeekend ? "bg-black/40 border-white/10 text-yellow-400/60 hover:border-yellow-400/30"
                                                                       : "bg-black/40 border-white/10 text-white/40 hover:border-white/30"
                                                )}
                                            >
                                                {DAYS_SHORT[day]}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedDays.length > 0 && (
                                    <p className="text-[9px] text-brand-red font-bold mt-2 uppercase tracking-widest">
                                        {selectedDays.length === 1 ? DAYS_ES[selectedDays[0]] : `${selectedDays.length} días seleccionados: ${selectedDays.map(d => DAYS_SHORT[d]).join(', ')}`}
                                    </p>
                                )}
                            </div>

                            {/* Time range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hora Inicio</label>
                                    <input type="time" value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-brand-red outline-none mt-2" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Hora Fin</label>
                                    <input type="time" value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-brand-red outline-none mt-2" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button type="submit" disabled={isSaving || !formData.user_id || !selectedDays.length}
                                    className="w-full bg-white text-black py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-brand-red hover:text-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : `Confirmar ${selectedDays.length > 1 ? `${selectedDays.length} Turnos` : 'Turno'}`}
                                </button>
                                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                    <AlertCircle className="w-3 h-3" /> Turno automático semanal recurrente
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
