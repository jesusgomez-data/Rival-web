"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, X, CreditCard, ChevronDown, Check, Loader2, DollarSign, Clock, ListChecks } from "lucide-react";
import { createMembershipPlan, updateMembershipPlan, deleteMembershipPlan } from "../../membership-plan-actions";

export default function MembershipManager({ centerId, initialPlans }: any) {
    const [plans, setPlans] = useState(initialPlans);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [duration, setDuration] = useState("1");
    const [features, setFeatures] = useState<string[]>([]);
    const [newFeature, setNewFeature] = useState("");

    const resetForm = () => {
        setName("");
        setDescription("");
        setPrice("");
        setDuration("1");
        setFeatures([]);
        setNewFeature("");
        setEditingPlan(null);
    };

    const handleEdit = (plan: any) => {
        setEditingPlan(plan);
        setName(plan.name);
        setDescription(plan.description || "");
        setPrice(plan.price.toString());
        setDuration(plan.duration_months.toString());
        setFeatures(plan.features || []);
        setShowModal(true);
    };

    const handleAddFeature = () => {
        if (!newFeature.trim()) return;
        setFeatures([...features, newFeature.trim()]);
        setNewFeature("");
    };

    const removeFeature = (idx: number) => {
        setFeatures(features.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const data = {
            name,
            description,
            price: parseFloat(price),
            duration: parseInt(duration),
            features
        };

        try {
            let res;
            if (editingPlan) {
                res = await updateMembershipPlan(centerId, editingPlan.id, data);
            } else {
                res = await createMembershipPlan(centerId, data);
            }

            console.log("Response from server:", res);

            if (res && res.error) {
                alert("Error del servidor: " + res.error);
            } else if (res && res.success) {
                setShowModal(false);
                window.location.reload();
            } else {
                alert("La operación terminó sin respuesta clara. Revisa la consola.");
            }
        } catch (err: any) {
            console.error("Error en handleSubmit:", err);
            alert("Error crítico: " + (err.message || "Desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("¿Seguro que quieres eliminar esta tarifa? Los miembros actuales que la tengan asignada no se verán afectados, pero no podrá seleccionarse para nuevos registros.")) return;

        setIsSaving(true);
        try {
            const res = await deleteMembershipPlan(centerId, planId);
            console.log("Delete response:", res);

            if (res && res.success) {
                window.location.reload();
            } else if (res && res.error) {
                alert("No se pudo eliminar: " + res.error);
            } else {
                alert("Respuesta inesperada al eliminar.");
            }
        } catch (err: any) {
            console.error("Error en handleDelete:", err);
            alert("Error al intentar eliminar: " + (err.message || "Desconocido"));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    Planes activos: {plans.length}
                </p>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="bg-brand-red text-white py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg"
                >
                    <Plus className="w-4 h-4" /> Crear Tarifa
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.length > 0 ? (
                    plans.map((plan: any) => (
                        <div key={plan.id} className="bg-brand-gray/50 border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-brand-red/30 transition-all group overflow-hidden relative">
                            {/* Glow Effect */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-brand-red/10 rounded-2xl text-brand-red">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(plan)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(plan.id)} className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">{plan.name}</h3>
                                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{plan.description || "Sin descripción proporcionada."}</p>

                                <div className="flex items-baseline gap-1 mb-6">
                                    <span className="text-3xl font-black text-white italic">{plan.price}€</span>
                                    <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">/ {plan.duration_months === 1 ? "mes" : `${plan.duration_months} meses`}</span>
                                </div>

                                <div className="space-y-2 mb-6 border-t border-white/5 pt-4">
                                    {plan.features?.length > 0 ? (
                                        plan.features.map((feature: string, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 text-[11px] text-gray-300">
                                                <Check className="w-3 h-3 text-green-500 shrink-0" />
                                                <span>{feature}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-gray-600 italic">Acceso estándar al centro.</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${plan.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {plan.is_active ? 'Activa' : 'Inactiva'}
                                </span>
                                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">
                                    ID: {plan.id.substring(0, 8)}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-brand-gray/20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center px-10">
                        <div className="p-4 bg-white/5 rounded-full mb-4">
                            <CreditCard className="w-8 h-8 text-gray-600" />
                        </div>
                        <h4 className="text-lg font-bold text-white uppercase italic mb-2">No has configurado tarifas</h4>
                        <p className="text-xs text-gray-500 max-w-sm mb-6 uppercase tracking-widest font-medium">Define tus planes de precios para que puedas asignarlos a tus miembros y habilitar el cobro automático desde la App.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-brand-red text-white py-3 px-8 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg"
                        >
                            Configurar mi primera Tarifa
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Crear / Editar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-brand-gray border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-2xl animate-in fade-in zoom-in duration-300 my-8">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-red/10 rounded-xl text-brand-red">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                        {editingPlan ? "Editar Tarifa" : "Nueva Tarifa"}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Define los detalles del plan de pagos</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="bg-white/5 p-2 rounded-full text-gray-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Nombre del Plan</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Ej: Acceso Ilimitado GOLD"
                                                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 pl-12 text-white outline-none focus:border-brand-red text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Descripción (Opcional)</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Detalla qué incluye este plan..."
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-brand-red text-sm h-32 resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Precio (€)</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-4 pl-12 text-white outline-none focus:border-brand-red text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Duración (Meses)</label>
                                            <div className="relative">
                                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <select
                                                    value={duration}
                                                    onChange={(e) => setDuration(e.target.value)}
                                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-4 pl-12 text-white outline-none focus:border-brand-red text-sm appearance-none"
                                                >
                                                    <option value="1">1 Mes</option>
                                                    <option value="3">3 Meses</option>
                                                    <option value="6">6 Meses</option>
                                                    <option value="12">Anual</option>
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Características y Beneficios</label>
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    value={newFeature}
                                                    onChange={(e) => setNewFeature(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                                                    placeholder="Agregar característica..."
                                                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 pl-10 text-white outline-none focus:border-brand-red text-xs"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddFeature}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-red text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 custom-scrollbar">
                                                {features.map((feat, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 bg-brand-red/10 border border-brand-red/20 px-2 py-1 rounded-lg text-[10px] text-white group">
                                                        <span>{feat}</span>
                                                        <button type="button" onClick={() => removeFeature(idx)} className="text-brand-red hover:text-red-400">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {features.length === 0 && (
                                                    <p className="text-[10px] text-gray-600 italic">No hay características añadidas.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 bg-white/5 text-gray-400 py-4 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] bg-brand-red text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        editingPlan ? "Actualizar Tarifa" : "Crear Tarifa"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
