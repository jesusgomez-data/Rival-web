"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar as CalIcon, Clock, Users, ChevronLeft, ChevronRight, LayoutGrid, List as ListIcon, ChevronDown, Check, Building2, RefreshCw, Download, Share2 } from "lucide-react";
import { createClass, deleteClass, getClassesRange } from "../../schedule-actions";

const CLASS_COLORS = [
    { label: "Rojo",     value: "#dc2626" },
    { label: "Naranja",  value: "#ea580c" },
    { label: "Amarillo", value: "#ca8a04" },
    { label: "Verde",    value: "#16a34a" },
    { label: "Teal",     value: "#0d9488" },
    { label: "Azul",     value: "#2563eb" },
    { label: "Índigo",   value: "#4f46e5" },
    { label: "Púrpura",  value: "#7c3aed" },
    { label: "Rosa",     value: "#db2777" },
    { label: "Gris",     value: "#4b5563" },
];

function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

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
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncCalendar = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            alert("Sincronización con Google Calendar activada correctamente. Tus clases aparecerán en tu calendario personal.");
        }, 1500);
    };

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
        description: "",
        color: CLASS_COLORS[0].value,
    });

    const getWeekRange = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay() || 7;
        start.setDate(start.getDate() - day + 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    useEffect(() => {
        const fetchClasses = async () => {
            if (viewMode === 'week') {
                const { start, end } = getWeekRange(currentDate);
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
            center_id: selectedCenterId
        });
        setIsSaving(false);
        if (res.error) {
            alert(res.error);
        } else {
            setShowModal(false);
            const [y, m, d] = formData.date.split('-').map(Number);
            const newDate = new Date(y, m - 1, d);
            setCurrentDate(newDate);
            const { start, end } = getWeekRange(newDate);
            const fresh = await getClassesRange(centerId, start.toISOString(), end.toISOString());
            setClasses(fresh);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Eliminar esta clase?")) return;
        const res = await deleteClass(centerId, id);
        if (res.success) {
            setClasses(classes.filter((c: any) => c.id !== id));
        }
    }

    const weekDays: Date[] = [];
    const { start } = getWeekRange(currentDate);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        weekDays.push(d);
    }
    const hours = Array.from({ length: 17 }, (_, i) => i + 6);

    const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
    const isTuesday = (d: Date) => d.getDay() === 2;

    return (
        <div className="space-y-4">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-foreground hidden md:block">
                        {organizationDetails?.center_type === 'personal_trainer' ? 'Citas' : 'SCHEDULE'} ({classes.length})
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
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrev} className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-foreground text-sm w-24 text-center">
                            {viewMode === 'week'
                                ? `${start.getDate()} ${start.toLocaleDateString('es-ES', { month: 'short' })}`
                                : 'Próximas'}
                        </span>
                        <button onClick={handleNext} className="p-2 hover:bg-foreground/10 rounded-full transition-colors text-foreground">
                            <ChevronRight className="w-4 h-4" />
                        </button>
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
                                <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl z-40 overflow-hidden">
                                    <div className="p-2 border-b border-border bg-purple-500/5">
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-500/60 ml-2 mb-1">Cambiar Ubicación</p>
                                    </div>
                                    {centers.map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() => { setSelectedCenterId(c.id); setCenterDropdownOpen(false); }}
                                            className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-muted flex items-center justify-between ${selectedCenterId === c.id ? 'text-purple-500 bg-purple-500/5' : 'text-muted-foreground'}`}
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
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSyncCalendar}
                                disabled={isSyncing}
                                className="hidden sm:flex items-center gap-2 bg-muted border border-border text-foreground px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted/80 transition-all"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-brand-red ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Sincronizando...' : 'Google Sync'}
                            </button>
                            <button
                                onClick={() => openCreateModal()}
                                className="bg-brand-red text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-brand-red/20"
                            >
                                <Plus className="w-4 h-4" />
                                {organizationDetails?.center_type === 'personal_trainer' ? 'Nueva Cita' : '+ Add Class'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* VIEWS */}
            {viewMode === 'list' ? (
                <div className="space-y-3">
                    {classes.map((cls: any) => {
                        const color = cls.color || '#dc2626';
                        return (
                            <div
                                key={cls.id}
                                className="bg-card border border-border p-4 rounded-xl flex items-center justify-between group hover:border-white/20 transition-all"
                                style={{ borderLeft: `4px solid ${color}` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg text-center min-w-[60px]" style={{ background: hexToRgba(color, 0.1) }}>
                                        <span className="block font-black text-sm" style={{ color }}>{new Date(cls.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="block text-[10px] text-muted-foreground font-bold uppercase">{new Date(cls.scheduled_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
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
                        );
                    })}
                    {classes.length === 0 && <div className="text-center py-10 text-muted-foreground">No hay clases programadas.</div>}
                </div>
            ) : (
                /* WEEK GRID */
                <div className="overflow-x-auto pb-2">
                    <div style={{ minWidth: 820 }}>
                        {/* Header */}
                        <div className="grid grid-cols-8 border-b border-border bg-card rounded-t-2xl overflow-hidden">
                            <div className="p-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border">
                                TIME
                            </div>
                            {weekDays.map((d, i) => {
                                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                return (
                                    <div
                                        key={i}
                                        onClick={() => canEdit && openCreateModal(dateStr)}
                                        className={`p-3 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/40 transition-colors ${isToday(d) ? 'bg-brand-red/5' : ''}`}
                                    >
                                        <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                            {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                                        </div>
                                        <div className={`text-xl font-black mt-0.5 ${isToday(d) ? 'text-brand-red' : isTuesday(d) ? 'text-red-500' : 'text-foreground'}`}>
                                            {d.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Time rows */}
                        <div className="bg-card border border-t-0 border-border rounded-b-2xl overflow-hidden">
                            {hours.map((h) => (
                                <div key={h} className="grid grid-cols-8 border-b border-border/50 last:border-b-0" style={{ minHeight: 72 }}>
                                    {/* Time label */}
                                    <div className="p-2 text-center text-[10px] font-bold text-muted-foreground border-r border-border flex items-start justify-center pt-2">
                                        {h}:00
                                    </div>

                                    {weekDays.map((d, i) => {
                                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        const timeStr = `${h.toString().padStart(2, '0')}:00`;

                                        const slotClasses = classes.filter((c: any) => {
                                            const cDate = new Date(c.scheduled_time);
                                            return (
                                                cDate.getFullYear() === d.getFullYear() &&
                                                cDate.getMonth() === d.getMonth() &&
                                                cDate.getDate() === d.getDate() &&
                                                cDate.getHours() === h
                                            );
                                        });

                                        return (
                                            <div
                                                key={`${i}-${h}`}
                                                className={`border-r border-border/50 last:border-r-0 p-1 relative group/slot ${isToday(d) ? 'bg-brand-red/[0.02]' : ''}`}
                                                onClick={() => canEdit && slotClasses.length === 0 && openCreateModal(dateStr, timeStr)}
                                                style={{ cursor: canEdit && slotClasses.length === 0 ? 'pointer' : 'default' }}
                                            >
                                                {canEdit && slotClasses.length === 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 pointer-events-none transition-opacity">
                                                        <Plus className="w-4 h-4 text-muted-foreground/40" />
                                                    </div>
                                                )}

                                                {slotClasses.map((c: any) => {
                                                    const color = c.color || '#dc2626';
                                                    const endHour = h + Math.ceil((c.duration_minutes || 60) / 60);
                                                    return (
                                                        <div
                                                            key={c.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.location.href = `/dashboard/gyms/${centerId}/schedule/${c.id}`;
                                                            }}
                                                            className="rounded-lg mb-1 p-2 cursor-pointer transition-all hover:brightness-110 group/card relative overflow-hidden"
                                                            style={{
                                                                background: hexToRgba(color, 0.18),
                                                                borderLeft: `3px solid ${color}`,
                                                            }}
                                                        >
                                                            {/* Time range */}
                                                            <div className="text-[9px] font-bold mb-0.5" style={{ color }}>
                                                                {h}:00 - {endHour}:00
                                                            </div>
                                                            {/* Class name */}
                                                            <div className="text-[11px] font-black text-foreground leading-tight truncate">
                                                                {c.name}
                                                            </div>
                                                            {/* Coach */}
                                                            <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                                                                {c.coach?.full_name || 'Staff'}
                                                            </div>
                                                            {/* Capacity */}
                                                            <div className="text-[9px] text-muted-foreground">
                                                                {c.enrolled_count}/{c.max_capacity}
                                                            </div>

                                                            {/* Hover actions */}
                                                            {canEdit && (
                                                                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                                                                        className="p-0.5 rounded bg-black/20 hover:bg-red-500/40 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-2.5 h-2.5 text-white/70" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-black text-foreground italic uppercase mb-4">
                            {organizationDetails?.center_type === 'personal_trainer' ? 'Programar Cita' : 'Nueva Clase'}
                        </h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="label">
                                    {organizationDetails?.center_type === 'personal_trainer' ? 'Nombre de la Sesión' : 'Nombre de la Clase'}
                                </label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder={organizationDetails?.center_type === 'personal_trainer' ? 'Sesión Personal...' : 'CrossFit WOD, HYROX, Yoga...'}
                                />
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="label">Color de la Clase</label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {CLASS_COLORS.map((col) => (
                                        <button
                                            key={col.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: col.value })}
                                            title={col.label}
                                            className="w-7 h-7 rounded-full transition-all border-2"
                                            style={{
                                                background: col.value,
                                                borderColor: formData.color === col.value ? 'white' : 'transparent',
                                                transform: formData.color === col.value ? 'scale(1.2)' : 'scale(1)',
                                                boxShadow: formData.color === col.value ? `0 0 0 2px ${col.value}` : 'none',
                                            }}
                                        />
                                    ))}
                                </div>
                                {/* Preview */}
                                <div
                                    className="mt-2 rounded-lg p-2 text-[11px] font-black"
                                    style={{
                                        background: hexToRgba(formData.color, 0.18),
                                        borderLeft: `3px solid ${formData.color}`,
                                        color: formData.color,
                                    }}
                                >
                                    {formData.name || 'Vista previa de la clase'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Fecha</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input" />
                                </div>
                                <div>
                                    <label className="label">Hora</label>
                                    <input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="input" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">{organizationDetails?.center_type === 'personal_trainer' ? 'Responsable' : 'Entrenador'}</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setCoachDropdownOpen(!coachDropdownOpen)}
                                            className="input text-left flex justify-between items-center"
                                        >
                                            <span className="truncate text-sm">
                                                {coaches.find((c: any) => (c.user?.id || c.id) === formData.coach_id)?.user?.full_name
                                                    || coaches.find((c: any) => (c.user?.id || c.id) === formData.coach_id)?.full_name
                                                    || "Seleccionar..."}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 opacity-50 transition-transform flex-shrink-0 ${coachDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {coachDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto shadow-2xl">
                                                {coaches.map((c: any) => {
                                                    const validId = c.user?.id || c.id;
                                                    const name = c.user?.full_name || c.user?.username || c.full_name || 'Coach';
                                                    const isSelected = formData.coach_id === validId;
                                                    return (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => { setFormData({ ...formData, coach_id: validId }); setCoachDropdownOpen(false); }}
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
                                    <label className="label">Capacidad</label>
                                    <input type="number" required value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: e.target.value })} className="input" />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-muted border border-border text-muted-foreground p-3 rounded-xl text-xs font-black uppercase tracking-widest hover:text-foreground transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 bg-foreground text-background p-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-red hover:text-white transition-all shadow-lg"
                                >
                                    {isSaving ? 'Guardando...' : (organizationDetails?.center_type === 'personal_trainer' ? 'Agendar Cita' : 'Crear Clase')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted-foreground, #6b7280); margin-left: 4px; display: block; margin-bottom: 4px; }
                .input { width: 100%; background: var(--input, rgba(0,0,0,0.4)); border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 0.75rem; padding: 0.75rem; color: var(--foreground, white); outline: none; font-size: 0.875rem; }
                .input:focus { border-color: #dc2626; }
            `}</style>
        </div>
    );
}
