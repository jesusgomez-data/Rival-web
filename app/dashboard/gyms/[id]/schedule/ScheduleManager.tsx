"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar as CalIcon, Clock, Users, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, ChevronDown, Check, Building2 } from "lucide-react";
import { createClass, deleteClass, getClassesRange } from "../../schedule-actions";

export default function ScheduleManager({ centerId, initialClasses, coaches, userRole, centers = [], organizationDetails }: any) {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const centerIdParam = searchParams?.get('centerId');

    const [viewMode, setViewMode] = useState<'list' | 'week'>('week');
    const [selectedCenterId, setSelectedCenterId] = useState<string | null>(centerIdParam || (centers.length > 0 ? centers[0].id : null));
    const [classes, setClasses] = useState(initialClasses);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [coachDropdownOpen, setCoachDropdownOpen] = useState(false);
    const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);

    const isMultiCenter = organizationDetails?.is_multi_center;
    const canEdit = userRole === 'owner' || userRole === 'head_coach';

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        coach_id: coaches[0]?.user?.id || "",
        date: new Date().toISOString().split('T')[0],
        time: "17:00",
        duration: "60",
        capacity: "20",
        type: "cross_training",
        difficulty: "intermediate",
        description: ""
    });

    // Helper to get start/end of current week view
    const getWeekRange = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay() || 7; // Treat Sunday as 7
        start.setDate(start.getDate() - day + 1); // Monday
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    // Fetch classes when date/mode changes
    useEffect(() => {
        const fetchClasses = async () => {
            if (viewMode === 'week') {
                const { start, end } = getWeekRange(currentDate);
                // If it's multi-center, we filter by selected center.
                // Otherwise we use centerId (which is the org id)
                const idToFetch = selectedCenterId || centerId;
                const isSede = !!selectedCenterId;

                const data = await getClassesRange(idToFetch, start.toISOString(), end.toISOString(), isSede);
                setClasses(data);
            }
        };
        fetchClasses();
    }, [currentDate, viewMode, centerId, selectedCenterId]);

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const openCreateModal = (dateStr?: string, timeStr?: string) => {
        setFormData(prev => ({
            ...prev,
            date: dateStr || prev.date,
            time: timeStr || prev.time
        }));
        setShowModal(true);
    };

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);

        const scheduled_time = new Date(`${formData.date}T${formData.time}:00`).toISOString();
        const res = await createClass(centerId, {
            ...formData,
            scheduled_time,
            center_id: selectedCenterId // Assign to the currently selected center
        });
        console.log("Create class response:", res);

        setIsSaving(false);
        if (res.error) {
            alert(res.error);
        } else {
            setShowModal(false);
            // Refresh and Jump to Date (Robust Local Date Parsing)
            const [y, m, d] = formData.date.split('-').map(Number);
            const newDate = new Date(y, m - 1, d); // Local Midnight

            setCurrentDate(newDate);

            const { start, end } = getWeekRange(newDate);
            const fresh = await getClassesRange(centerId, start.toISOString(), end.toISOString());
            console.log("Refreshed classes:", fresh);
            setClasses(fresh);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this class?")) return;
        const res = await deleteClass(centerId, id);
        if (res.success) {
            setClasses(classes.filter((c: any) => c.id !== id));
        }
    }

    // Weekly Grid Render Helpers
    const weekDays: Date[] = [];
    const { start } = getWeekRange(currentDate);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        weekDays.push(d);
    }
    const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00 start times

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground hidden md:block">
                        {organizationDetails?.center_type === 'personal_trainer' ? 'Citas' : 'Schedule'} ({classes.length})
                    </h2>
                    <div className="flex bg-background rounded-lg p-1 border border-border">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'week' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrev} className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="font-bold text-foreground text-sm w-32 text-center">
                            {viewMode === 'week'
                                ? `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                                : 'Upcoming'
                            }
                        </span>
                        <button onClick={handleNext} className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isMultiCenter && (
                        <div className="relative">
                            <button
                                onClick={() => setCenterDropdownOpen(!centerDropdownOpen)}
                                className="flex items-center gap-2 bg-purple-500/10 text-purple-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                            >
                                <Building2 className="w-4 h-4" />
                                {centers.find((c: any) => c.id === selectedCenterId)?.name || 'Seleccionar Sede'}
                                <ChevronDown className={`w-3 h-3 transition-transform ${centerDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {centerDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    <div className="p-2 border-b border-white/5 bg-purple-500/5">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/60 ml-2 mb-1">Cambiar Ubicación</p>
                                    </div>
                                    {centers.map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setSelectedCenterId(c.id);
                                                setCenterDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5 flex items-center justify-between ${selectedCenterId === c.id ? 'text-purple-500 bg-purple-500/5' : 'text-muted-foreground'}`}
                                        >
                                            <span className="truncate">{c.name}</span>
                                            {selectedCenterId === c.id && <Check className="w-3 h-3" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => openCreateModal()}
                            className="bg-brand-red text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-brand-red/20"
                        >
                            <Plus className="w-4 h-4" /> {organizationDetails?.center_type === 'personal_trainer' ? 'Nueva Cita' : 'Add Class'}
                        </button>
                    )}
                </div>
            </div>

            {/* VIEWS */}
            {viewMode === 'list' ? (
                <div className="space-y-4">
                    {classes.map((cls: any) => (
                        <div key={cls.id} className="bg-card border border-border p-4 rounded-xl flex items-center justify-between group hover:border-brand-red/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="bg-background p-3 rounded-lg text-center min-w-[60px]">
                                    <span className="block text-brand-red font-black text-sm">{new Date(cls.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="block text-[10px] text-muted-foreground font-bold uppercase">{new Date(cls.scheduled_time).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <h3 className="font-heading font-black text-foreground italic text-lg">{cls.name}</h3>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cls.enrolled_count}/{cls.max_capacity}</span>
                                        <span>• {cls.coach?.full_name || 'Staff'}</span>
                                    </div>
                                </div>
                            </div>
                            {canEdit && (
                                <button onClick={() => handleDelete(cls.id)} className="p-2 text-muted-foreground hover:text-red-500 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    {classes.length === 0 && <div className="text-center py-10 text-muted-foreground">No classes found.</div>}
                </div>
            ) : (
                /* WEEK GRID VIEW */
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-[800px] grid grid-cols-8 gap-px bg-border border border-border rounded-2xl overflow-hidden">
                        {/* Header Row */}
                        <div className="bg-card p-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider sticky left-0 z-10">Time</div>
                        {weekDays.map((d, i) => {
                            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            const isSelected = showModal && formData.date === dateStr;

                            return (
                                <div
                                    key={i}
                                    onClick={() => openCreateModal(dateStr)}
                                    className={`bg-card p-3 text-center border-l border-border cursor-pointer hover:bg-muted transition-colors group/day ${d.toDateString() === new Date().toDateString() ? 'bg-brand-red/5' : ''} ${isSelected ? 'bg-brand-red/10 ring-1 ring-inset ring-brand-red/30 relative z-20' : ''}`}
                                >
                                    <div className={`text-[10px] uppercase font-black tracking-widest transition-colors ${isSelected ? 'text-brand-red' : 'text-muted-foreground group-hover/day:text-brand-red'}`}>
                                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                    </div>
                                    <div className={`text-lg font-black transition-all group-hover/day:scale-110 ${isSelected || d.toDateString() === new Date().toDateString() ? 'text-brand-red' : 'text-foreground'}`}>
                                        {d.getDate()}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Time Slots */}
                        {hours.map((h) => (
                            <>
                                {/* Time Label */}
                                <div
                                    key={`label-${h}`}
                                    className={`bg-card p-2 text-center text-[10px] font-bold border-t border-border sticky left-0 flex items-center justify-center transition-colors ${showModal && formData.time.startsWith(h.toString().padStart(2, '0')) ? 'text-brand-red bg-brand-red/5' : 'text-muted-foreground'}`}
                                >
                                    {h}:00
                                </div>
                                {weekDays.map((d, i) => {
                                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                    const timeStr = `${h.toString().padStart(2, '0')}:00`;
                                    const isSelected = showModal && formData.date === dateStr && formData.time === timeStr;

                                    const slotDate = new Date(d);
                                    slotDate.setHours(h, 0, 0, 0);

                                    // Find classes in this slot
                                    const slotClasses = classes.filter((c: any) => {
                                        const cDate = new Date(c.scheduled_time);
                                        // Compare dates in local time
                                        const sameDay = cDate.getFullYear() === d.getFullYear() &&
                                            cDate.getMonth() === d.getMonth() &&
                                            cDate.getDate() === d.getDate();
                                        const sameHour = cDate.getHours() === h;
                                        return sameDay && sameHour;
                                    });

                                    return (
                                        <div
                                            key={`slot-${i}-${h}`}
                                            className={`bg-card border-t border-l border-border min-h-[80px] relative group hover:bg-muted transition-colors cursor-pointer p-1 ${isSelected ? 'bg-brand-red/5 ring-1 ring-inset ring-brand-red/20 z-10' : ''}`}
                                            onClick={() => canEdit && slotClasses.length === 0 && openCreateModal(dateStr, timeStr)}
                                        >
                                            {/* Add Button on Hover if Empty */}
                                            {canEdit && slotClasses.length === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                                    <Plus className="w-5 h-5 text-muted-foreground" />
                                                </div>
                                            )}

                                            {/* Render Classes */}
                                            {slotClasses.map((c: any) => (
                                                <div
                                                    key={c.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.location.href = `/dashboard/gyms/${centerId}/schedule/${c.id}`;
                                                    }}
                                                    className="bg-brand-red text-white p-1.5 rounded-lg text-[10px] shadow-lg mb-1 cursor-pointer hover:bg-red-700 transition-colors border border-white/10"
                                                >
                                                    <div className="font-black truncate">{c.name}</div>
                                                    <div className="flex justify-between opacity-80 mt-1">
                                                        <span>{c.duration_minutes}m</span>
                                                        <span>{c.enrolled_count}/{c.max_capacity}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </>
                        ))}
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-black text-foreground italic uppercase mb-4">{organizationDetails?.center_type === 'personal_trainer' ? 'Programar Cita' : 'Schedule Class'}</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="label">{organizationDetails?.center_type === 'personal_trainer' ? 'Nombre de la Sesión' : 'Class Name'}</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input" placeholder={organizationDetails?.center_type === 'personal_trainer' ? 'Sesión Personal, Evaluación...' : 'WOD, Yoga Flow...'} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Date</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input" />
                                </div>
                                <div>
                                    <label className="label">Time</label>
                                    <input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Coach</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setCoachDropdownOpen(!coachDropdownOpen)}
                                            className="input text-left flex justify-between items-center"
                                        >
                                            <span className="truncate">
                                                {coaches.find((c: any) => (c.user?.id || c.id) === formData.coach_id)?.user?.full_name
                                                    || coaches.find((c: any) => (c.user?.id || c.id) === formData.coach_id)?.full_name
                                                    || "Select Coach..."}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${coachDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {coachDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                                                {coaches.map((c: any) => {
                                                    const validId = c.user?.id || c.id;
                                                    const name = c.user?.full_name || c.user?.username || c.full_name || 'Coach';
                                                    const isSelected = formData.coach_id === validId;

                                                    return (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({ ...formData, coach_id: validId });
                                                                setCoachDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-border last:border-0 flex items-center justify-between ${isSelected ? 'bg-brand-red/10 text-brand-red font-bold' : 'text-foreground hover:bg-foreground/5'}`}
                                                        >
                                                            <span>{name}</span>
                                                            {isSelected && <Check className="w-4 h-4" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Capacity</label>
                                    <input type="number" required value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} className="input" />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" disabled={isSaving} className="btn-primary flex-1">{isSaving ? 'Scheduling...' : 'Create Class'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style jsx>{`
                .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted-foreground, #6b7280); margin-left: 4px; display: block; margin-bottom: 4px; }
                .input { width: 100%; background: var(--input, rgba(0,0,0,0.4)); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 0.75rem; padding: 0.75rem; color: var(--foreground, white); outline: none; font-size: 0.875rem; }
                .input:focus { border-color: #dc2626; }
                .btn-primary { background: var(--foreground, white); color: var(--background, black); padding: 0.75rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; transition: all; }
                .btn-primary:hover { background: #dc2626; color: white; }
                .btn-secondary { background: transparent; border: 1px solid var(--border, rgba(255,255,255,0.1)); color: var(--foreground, white); padding: 0.75rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
                .btn-secondary:hover { background: var(--muted, rgba(255,255,255,0.05)); }
            `}</style>
        </div>
    );
}
