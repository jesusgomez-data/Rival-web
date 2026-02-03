"use client";
import { useState } from "react";
import { Edit, X, Trash2, ChevronDown, Check } from "lucide-react";
import { updateClass, deleteClass } from "../../../management-actions";
import { useRouter } from "next/navigation";

export default function EditClassButton({ centerId, classData, coaches, userRole }: any) {
    const canEdit = userRole === 'owner' || userRole === 'head_coach';

    if (!canEdit) return null;

    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [coachDropdownOpen, setCoachDropdownOpen] = useState(false);
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: classData.name,
        coach_id: classData.coach_id || "",
        date: new Date(classData.scheduled_time).toISOString().split('T')[0],
        time: new Date(classData.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        duration: classData.duration_minutes?.toString(),
        capacity: classData.max_capacity?.toString(),
        type: classData.class_type,
        difficulty: classData.difficulty,
        description: classData.description || ""
    });

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault();
        setIsSaving(true);
        const scheduled_time = new Date(`${formData.date}T${formData.time}:00`).toISOString();
        const res = await updateClass(centerId, classData.id, { ...formData, scheduled_time });
        setIsSaving(false);
        if (res.error) {
            alert(res.error);
        } else {
            setShowModal(false);
            window.location.reload();
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this class? This cannot be undone.")) return;
        setIsDeleting(true);
        const res = await deleteClass(centerId, classData.id);
        if (res.error) {
            alert(res.error);
            setIsDeleting(false);
        } else {
            router.push(`/dashboard/gyms/${centerId}/schedule`);
            router.refresh();
        }
    }

    return (
        <div className="flex gap-2">
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all border border-brand-red/20"
            >
                <Trash2 className="w-4 h-4" /> {isDeleting ? '...' : 'Delete'}
            </button>
            <button
                onClick={() => setShowModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
            >
                <Edit className="w-4 h-4" /> Edit Class
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-brand-gray border border-white/10 rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-white italic uppercase">Edit Class</h3>
                            <button onClick={() => setShowModal(false)}><X className="text-gray-500 hover:text-white" /></button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="label">Class Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input" />
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
                                            className="input flex justify-between items-center text-left"
                                        >
                                            <span className="truncate">
                                                {formData.coach_id
                                                    ? (coaches.find((c: any) => (c.user_id || c.id) === formData.coach_id)?.user?.full_name ||
                                                        coaches.find((c: any) => (c.user_id || c.id) === formData.coach_id)?.full_name ||
                                                        "Coach Selected")
                                                    : "Select Coach"}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${coachDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {coachDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-brand-gray border border-white/10 rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, coach_id: "" });
                                                        setCoachDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b border-white/5 ${!formData.coach_id ? 'bg-brand-red/10 text-brand-red' : 'text-gray-500 hover:bg-white/5'}`}
                                                >
                                                    Select Coach
                                                </button>
                                                {coaches.map((c: any) => {
                                                    const validId = c.user_id || c.id;
                                                    const isSelected = formData.coach_id === validId;
                                                    const name = c.user?.full_name || c.user?.username || c.full_name;

                                                    return (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({ ...formData, coach_id: validId });
                                                                setCoachDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-white/5 last:border-0 flex items-center justify-between ${isSelected ? 'bg-brand-red/10 text-brand-red font-bold' : 'text-gray-300 hover:bg-white/5'}`}
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

                            <button type="submit" disabled={isSaving} className="btn-primary w-full mt-4">
                                {isSaving ? 'Updating...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <style jsx>{`
                .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-left: 4px; display: block; margin-bottom: 4px; }
                .input { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.75rem; padding: 0.75rem; color: white; outline: none; font-size: 0.875rem; }
                .input:focus { border-color: #dc2626; }
                .btn-primary { background: white; color: black; padding: 0.75rem; border-radius: 0.75rem; font-size: 0.75rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; transition: all; }
                .btn-primary:hover { background: #dc2626; color: white; }
            `}</style>
        </div>
    );
}
