"use client";

import { useState, useTransition } from "react";
import {
    Megaphone, Users, Send, Check, Clock, Bell, Mail, ChevronDown,
    AlertCircle, Filter, MessageSquare, History
} from "lucide-react";
import { sendCenterAnnouncement } from "../../management-actions";

type FilterType = 'all' | 'active' | 'inactive' | 'trial';

const FILTER_LABELS: Record<FilterType, string> = {
    all: 'Todos los miembros',
    active: 'Solo activos',
    inactive: 'Solo inactivos / cancelados',
    trial: 'Solo en prueba',
};

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
}

const TEMPLATES = [
    { label: '🏋️ Recordatorio de clase', title: 'Recuerda tu clase de hoy', message: 'No olvides que tienes clase hoy. ¡Te esperamos! Recuerda traer tu equipo y llegar 5 minutos antes.' },
    { label: '💳 Aviso de pago', title: 'Renovación de membresía', message: 'Tu membresía está próxima a vencer. Renueva ahora para seguir disfrutando de todos los beneficios sin interrupciones.' },
    { label: '🎉 Anuncio especial', title: '¡Novedad en el centro!', message: 'Tenemos algo nuevo para ti. Pásate por el centro o consulta tu app para descubrir las novedades de esta semana.' },
    { label: '🏆 Motivación', title: '¡Sigue adelante!', message: '¡Estás haciendo un trabajo increíble! Cada entrenamiento te acerca más a tu meta. ¡Vamos con todo esta semana!' },
    { label: '📅 Cambio de horario', title: 'Actualización de horario', message: 'Te informamos de un cambio en nuestro horario de clases. Consulta el calendario actualizado en tu app para ver los nuevos horarios.' },
];

export default function CommunicationsManager({ centerId, centerName, membersData, initialHistory }: {
    centerId: string;
    centerName: string;
    membersData: { members: any[]; stats: any };
    initialHistory: any[];
}) {
    const [tab, setTab] = useState<'compose' | 'history'>('compose');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<any>(null);
    const [history, setHistory] = useState(initialHistory);
    const [showTemplates, setShowTemplates] = useState(false);

    const { stats } = membersData;
    const targetCount = filter === 'all' ? stats.total : filter === 'active' ? stats.active : filter === 'inactive' ? stats.inactive : stats.trial;

    function applyTemplate(t: typeof TEMPLATES[0]) {
        setTitle(t.title);
        setMessage(t.message);
        setShowTemplates(false);
    }

    function handleSend() {
        if (!title.trim() || !message.trim()) return;
        startTransition(async () => {
            setResult(null);
            const res = await sendCenterAnnouncement(centerId, title, message, filter, centerName);
            setResult(res);
            if (res.success) {
                // Add to local history
                setHistory(prev => [{ id: Date.now(), title, message, created_at: new Date().toISOString() }, ...prev]);
                setTitle('');
                setMessage('');
            }
        });
    }

    return (
        <div className="space-y-6">
            {/* Audience stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'border-white/10 text-white' },
                    { label: 'Activos', value: stats.active, color: 'border-green-500/30 text-green-400' },
                    { label: 'Inactivos', value: stats.inactive, color: 'border-amber-500/30 text-amber-400' },
                    { label: 'En prueba', value: stats.trial, color: 'border-blue-500/30 text-blue-400' },
                ].map(s => (
                    <div key={s.label} className={`bg-brand-gray border rounded-2xl p-4 text-center ${s.color}`}>
                        <p className={`text-2xl font-black italic ${s.color.split(' ')[1]}`}>{s.value}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 bg-black/30 rounded-xl border border-white/5">
                <button
                    onClick={() => setTab('compose')}
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tab === 'compose' ? 'bg-brand-red text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <MessageSquare className="w-3.5 h-3.5" /> Redactar
                </button>
                <button
                    onClick={() => setTab('history')}
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tab === 'history' ? 'bg-brand-red text-white' : 'text-gray-500 hover:text-white'}`}
                >
                    <History className="w-3.5 h-3.5" /> Historial
                </button>
            </div>

            {/* ── COMPOSE TAB ───────────────────────────────────────────── */}
            {tab === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Compose form */}
                    <div className="lg:col-span-2 bg-brand-gray border border-white/5 rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Nuevo Anuncio</h3>
                            <button
                                onClick={() => setShowTemplates(v => !v)}
                                className="text-xs font-bold text-brand-red hover:text-white transition-colors flex items-center gap-1"
                            >
                                Plantillas <ChevronDown className={`w-3 h-3 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {showTemplates && (
                            <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                                {TEMPLATES.map(t => (
                                    <button
                                        key={t.label}
                                        onClick={() => applyTemplate(t)}
                                        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-all flex items-center gap-3 border-b border-white/5 last:border-0"
                                    >
                                        <span className="text-sm">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Filter */}
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block flex items-center gap-1">
                                <Filter className="w-3 h-3" /> Destinatarios
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-left ${filter === f ? 'bg-brand-red/10 border-brand-red/40 text-brand-red' : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
                                    >
                                        {FILTER_LABELS[f]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Asunto</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Ej: Cambio de horario esta semana"
                                maxLength={100}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-red/50 text-sm"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Mensaje</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Escribe aquí tu mensaje para los miembros..."
                                rows={5}
                                maxLength={1000}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-red/50 text-sm resize-none"
                            />
                            <p className="text-xs text-gray-600 text-right mt-1">{message.length}/1000</p>
                        </div>

                        {/* Result feedback */}
                        {result && (
                            <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${result.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {result.success ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                                <div>
                                    {result.success
                                        ? <p>Mensaje enviado a <strong>{result.total}</strong> miembros · <strong>{result.notificationsSent}</strong> notificaciones · <strong>{result.emailsSent}</strong> emails.</p>
                                        : <p>{result.error}</p>
                                    }
                                </div>
                            </div>
                        )}

                        {/* Send button */}
                        <button
                            onClick={handleSend}
                            disabled={isPending || !title.trim() || !message.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red/80 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all text-sm"
                        >
                            {isPending ? (
                                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                            ) : (
                                <><Send className="w-4 h-4" /> Enviar a {targetCount} {targetCount === 1 ? 'miembro' : 'miembros'}</>
                            )}
                        </button>
                    </div>

                    {/* Preview panel */}
                    <div className="bg-brand-gray border border-white/5 rounded-2xl p-5">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Vista Previa Notificación</h3>
                        <div className="bg-black rounded-2xl p-4 border border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white">{centerName}</p>
                                    <p className="text-xs text-gray-500">Ahora</p>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-white">{title || 'Asunto del mensaje...'}</p>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-3">{message || 'El mensaje aparecerá aquí...'}</p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Bell className="w-3.5 h-3.5 text-blue-400" />
                                <span>Notificación in-app a todos con cuenta</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Mail className="w-3.5 h-3.5 text-green-400" />
                                <span>Email si Resend está configurado</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5">
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Audiencia estimada</p>
                            <p className="text-3xl font-black text-white italic">{targetCount}</p>
                            <p className="text-xs text-gray-600">{FILTER_LABELS[filter]}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HISTORY TAB ───────────────────────────────────────────── */}
            {tab === 'history' && (
                <div className="bg-brand-gray border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <p className="text-xs font-black text-white uppercase tracking-widest">Anuncios enviados</p>
                        <span className="text-xs text-gray-500">{history.length} registros</span>
                    </div>
                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Megaphone className="w-12 h-12 text-gray-700 mb-4" />
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sin anuncios enviados aún</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {history.map((item: any) => (
                                <div key={item.id} className="p-5 hover:bg-white/3 transition-all">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-white truncate">{item.title}</p>
                                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{item.message}</p>
                                        </div>
                                        <span className="text-xs text-gray-600 whitespace-nowrap shrink-0 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {timeAgo(item.created_at)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
