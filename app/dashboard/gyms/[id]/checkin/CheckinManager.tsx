"use client";

import { useState, useTransition, useEffect } from "react";
import { ScanLine, Users, CheckCircle2, Clock, Search, Check, X, ChevronRight, QrCode, UserCheck, RefreshCcw } from "lucide-react";
import { getClassWithEnrollments, markMemberAttended, quickEnrollAndCheckin } from "../../management-actions";

interface ClassItem { id: string; name: string; scheduled_time: string; capacity: number | null; }
interface MemberItem { id: string; full_name: string; plan: string; status: string; }

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function StatBadge({ icon: Icon, label, value, color }: any) {
    const colors: Record<string, string> = {
        red: 'bg-brand-red/10 border-brand-red/20 text-brand-red',
        green: 'bg-green-500/10 border-green-500/20 text-green-400',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    };
    return (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${colors[color] || colors.red}`}>
            <Icon className="w-5 h-5 shrink-0" />
            <div>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">{label}</p>
            </div>
        </div>
    );
}

export default function CheckinManager({ centerId, initialClasses, stats, members }: {
    centerId: string;
    initialClasses: ClassItem[];
    stats: { todayAttended: number; weekUniqueAttendees: number; todayClassCount: number };
    members: MemberItem[];
}) {
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
    const [classData, setClassData] = useState<any>(null);
    const [loadingClass, setLoadingClass] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [quickSearchQuery, setQuickSearchQuery] = useState('');
    const [mode, setMode] = useState<'classes' | 'quick'>('classes');
    const [isPending, startTransition] = useTransition();
    const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
    const [localStats, setLocalStats] = useState(stats);

    async function loadClassData(cls: ClassItem) {
        setLoadingClass(true);
        setSelectedClass(cls);
        const data = await getClassWithEnrollments(cls.id, centerId);
        setClassData(data);
        setLoadingClass(false);
    }

    async function handleToggleAttendance(enrollmentId: string, currentAttended: boolean) {
        startTransition(async () => {
            const newVal = !currentAttended;
            await markMemberAttended(enrollmentId, newVal, centerId);
            setClassData((prev: any) => ({
                ...prev,
                enrollments: prev.enrollments.map((e: any) =>
                    e.id === enrollmentId ? { ...e, attended: newVal } : e
                )
            }));
            if (newVal) {
                setSuccessIds(prev => new Set([...prev, enrollmentId]));
                setLocalStats(s => ({ ...s, todayAttended: s.todayAttended + 1 }));
                setTimeout(() => setSuccessIds(prev => { const n = new Set(prev); n.delete(enrollmentId); return n; }), 2000);
            } else {
                setLocalStats(s => ({ ...s, todayAttended: Math.max(0, s.todayAttended - 1) }));
            }
        });
    }

    async function handleQuickCheckin(member: MemberItem) {
        if (!selectedClass) return;
        startTransition(async () => {
            const res = await quickEnrollAndCheckin(centerId, member.id, selectedClass.id);
            if (!res.error) {
                await loadClassData(selectedClass);
                setSuccessIds(prev => new Set([...prev, member.id]));
                setLocalStats(s => ({ ...s, todayAttended: s.todayAttended + 1 }));
                setTimeout(() => setSuccessIds(prev => { const n = new Set(prev); n.delete(member.id); return n; }), 2000);
            }
        });
    }

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(quickSearchQuery.toLowerCase())
    );

    const enrolledIds = new Set((classData?.enrollments || []).map((e: any) => e.member_id));
    const notEnrolled = filteredMembers.filter(m => !enrolledIds.has(m.id));
    const filteredEnrollments = (classData?.enrollments || []).filter((e: any) =>
        !searchQuery || e.member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <StatBadge icon={UserCheck} label="Hoy" value={localStats.todayAttended} color="red" />
                <StatBadge icon={Users} label="Esta semana" value={localStats.weekUniqueAttendees} color="green" />
                <StatBadge icon={Clock} label="Clases hoy" value={localStats.todayClassCount} color="blue" />
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 p-1 bg-black/30 rounded-xl border border-white/5">
                <button
                    onClick={() => setMode('classes')}
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'classes' ? 'bg-brand-red text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <ScanLine className="w-3.5 h-3.5" /> Por Clase
                </button>
                <button
                    onClick={() => setMode('quick')}
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'quick' ? 'bg-brand-red text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <UserCheck className="w-3.5 h-3.5" /> Check-in Rápido
                </button>
            </div>

            {/* ── BY CLASS MODE ──────────────────────────────────────────── */}
            {mode === 'classes' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Classes list */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                            <p className="text-xs font-black text-white uppercase tracking-widest">Clases de Hoy</p>
                        </div>
                        <div className="divide-y divide-white/5">
                            {initialClasses.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8 px-4">No hay clases programadas para hoy.</p>
                            ) : (
                                initialClasses.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => loadClassData(cls)}
                                        className={`w-full text-left p-4 hover:bg-white/5 transition-all flex items-center justify-between gap-2 ${selectedClass?.id === cls.id ? 'bg-brand-red/10 border-l-2 border-brand-red' : ''}`}
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-white">{cls.name}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" /> {formatTime(cls.scheduled_time)}
                                                {cls.capacity && <span className="ml-2">· Cap. {cls.capacity}</span>}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Enrollment + attendance */}
                    <div className="lg:col-span-2 bg-brand-gray border border-white/5 rounded-2xl overflow-hidden">
                        {!selectedClass ? (
                            <div className="flex flex-col items-center justify-center p-16 text-center">
                                <ScanLine className="w-12 h-12 text-gray-700 mb-4" />
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Selecciona una clase para ver asistencia</p>
                            </div>
                        ) : loadingClass ? (
                            <div className="flex items-center justify-center p-16">
                                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-white/5 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-black text-white">{selectedClass.name}</p>
                                        <p className="text-xs text-gray-500">{formatTime(selectedClass.scheduled_time)} · {classData?.enrollments?.length || 0} inscritos</p>
                                    </div>
                                    <span className="text-xs font-black text-brand-red bg-brand-red/10 px-3 py-1 rounded-full">
                                        {classData?.enrollments?.filter((e: any) => e.attended).length || 0} presentes
                                    </span>
                                </div>

                                {/* Search */}
                                <div className="p-3 border-b border-white/5">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Buscar miembro inscrito..."
                                            className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-red/50"
                                        />
                                    </div>
                                </div>

                                {/* Enrolled members */}
                                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto custom-scrollbar">
                                    {filteredEnrollments.length === 0 ? (
                                        <p className="text-gray-500 text-sm text-center py-8">Sin inscritos en esta clase.</p>
                                    ) : filteredEnrollments.map((enrollment: any) => (
                                        <div key={enrollment.id} className={`flex items-center justify-between p-4 transition-all ${enrollment.attended ? 'bg-green-500/5' : ''}`}>
                                            <div>
                                                <p className="text-sm font-bold text-white">{enrollment.member?.full_name || 'Miembro'}</p>
                                                <p className="text-xs text-gray-500">{enrollment.member?.plan || '—'}</p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleAttendance(enrollment.id, enrollment.attended)}
                                                disabled={isPending}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${enrollment.attended
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-red-500/20 hover:text-red-400'
                                                    : 'bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                                                    }`}
                                            >
                                                {successIds.has(enrollment.id) ? <CheckCircle2 className="w-4 h-4" /> : enrollment.attended ? <Check className="w-4 h-4" /> : null}
                                                {enrollment.attended ? 'Presente' : 'Registrar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add member not enrolled */}
                                {notEnrolled.length > 0 && (
                                    <div className="border-t border-white/5 p-4">
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Añadir al vuelo</p>
                                        <div className="relative mb-3">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                value={quickSearchQuery}
                                                onChange={e => setQuickSearchQuery(e.target.value)}
                                                placeholder="Buscar miembro..."
                                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-red/50"
                                            />
                                        </div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                            {notEnrolled.slice(0, 8).map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => handleQuickCheckin(m)}
                                                    disabled={isPending}
                                                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-brand-red/10 transition-all group"
                                                >
                                                    <span className="text-sm text-gray-400 group-hover:text-white font-semibold">{m.full_name}</span>
                                                    <span className="text-xs text-brand-red font-bold opacity-0 group-hover:opacity-100 transition-opacity">+ Check-in</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── QUICK CHECK-IN MODE ────────────────────────────────────── */}
            {mode === 'quick' && (
                <div className="space-y-4">
                    {initialClasses.length > 0 && (
                        <div>
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Clase activa</p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {initialClasses.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => setSelectedClass(cls)}
                                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedClass?.id === cls.id
                                            ? 'bg-brand-red border-brand-red text-white'
                                            : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                            }`}
                                    >
                                        {cls.name} · {formatTime(cls.scheduled_time)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!selectedClass && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                            <p className="text-amber-400 text-sm font-bold">Selecciona una clase arriba para activar el check-in</p>
                        </div>
                    )}

                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            value={quickSearchQuery}
                            onChange={e => setQuickSearchQuery(e.target.value)}
                            placeholder="Buscar miembro por nombre..."
                            className="w-full bg-brand-gray border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-red/50 text-base"
                        />
                    </div>

                    {/* Member list */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
                        {filteredMembers.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-10">No se encontraron miembros.</p>
                        ) : filteredMembers.slice(0, 20).map(member => {
                            const isSuccess = successIds.has(member.id);
                            return (
                                <div key={member.id} className={`flex items-center justify-between p-4 transition-all ${isSuccess ? 'bg-green-500/10' : ''}`}>
                                    <div>
                                        <p className="font-bold text-white text-sm">{member.full_name}</p>
                                        <p className="text-xs text-gray-500">{member.plan || '—'}</p>
                                    </div>
                                    <button
                                        onClick={() => selectedClass && handleQuickCheckin(member)}
                                        disabled={!selectedClass || isPending || isSuccess}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${isSuccess
                                            ? 'bg-green-500/20 text-green-400'
                                            : selectedClass
                                                ? 'bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white'
                                                : 'bg-white/5 text-gray-600 cursor-not-allowed'
                                            }`}
                                    >
                                        {isSuccess ? <><CheckCircle2 className="w-4 h-4" /> Registrado</> : <><UserCheck className="w-4 h-4" /> Check-in</>}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {filteredMembers.length > 20 && (
                        <p className="text-xs text-gray-600 text-center">Mostrando 20 de {filteredMembers.length}. Busca por nombre para filtrar.</p>
                    )}
                </div>
            )}
        </div>
    );
}
