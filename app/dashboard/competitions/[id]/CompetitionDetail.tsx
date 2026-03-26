'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    MapPin, Calendar, Users, Trophy, ArrowLeft, CheckCircle,
    XCircle, Crown, ShieldAlert, Loader2, Upload, ChevronDown, ChevronUp
} from 'lucide-react';
import {
    registerForCompetition,
    unregisterFromCompetition,
    uploadResults,
    updateCompetitionStatus,
} from '../actions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Competition {
    id: string;
    title: string;
    description?: string;
    type: string;
    date: string;
    location?: string;
    image_url?: string;
    status: string;
    max_participants?: number;
    registration_deadline?: string;
    organizer?: { full_name: string; username: string; avatar_url?: string };
}

interface Registration {
    id: string;
    user_id: string;
    registered_at: string;
    user: { id: string; full_name: string; username: string; avatar_url?: string; level: number };
}

interface Result {
    id: string;
    user_id: string;
    position: number;
    score?: string;
    notes?: string;
    medal_type?: string;
    user: { id: string; full_name: string; username: string; avatar_url?: string; level: number };
}

interface CurrentUser {
    id: string;
    full_name: string;
    username: string;
    avatar_url?: string;
    level: number;
    is_official: boolean;
}

interface Props {
    competition: Competition;
    registrations: Registration[];
    results: Result[];
    currentUser: CurrentUser | null;
    isRegistered: boolean;
}

// ─── Medal config ─────────────────────────────────────────────────────────────

const MEDAL: Record<string, { emoji: string; label: string; rowBg: string; border: string; text: string }> = {
    gold:   { emoji: '🥇', label: '1er Puesto', rowBg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
    silver: { emoji: '🥈', label: '2do Puesto', rowBg: 'bg-gray-400/10',   border: 'border-gray-400/30',   text: 'text-gray-300' },
    bronze: { emoji: '🥉', label: '3er Puesto', rowBg: 'bg-orange-600/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    fourth: { emoji: '🏅', label: '4to Puesto', rowBg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400' },
};

function getMedalByPosition(pos: number) {
    if (pos === 1) return MEDAL.gold;
    if (pos === 2) return MEDAL.silver;
    if (pos === 3) return MEDAL.bronze;
    if (pos === 4) return MEDAL.fourth;
    return null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    if (status === 'open')
        return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-green-500/15 text-green-400 border border-green-500/30 px-3 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />INSCRIPCIONES ABIERTAS</span>;
    if (status === 'closed')
        return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />INSCRIPCIONES CERRADAS</span>;
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] bg-brand-red/15 text-brand-red border border-brand-red/30 px-3 py-1 rounded-full"><Trophy className="w-3 h-3" />FINALIZADO</span>;
}

// ─── Upload results form ──────────────────────────────────────────────────────

function UploadResultsForm({
    competitionId,
    registrations,
    onDone,
}: {
    competitionId: string;
    registrations: Registration[];
    onDone: () => void;
}) {
    const [rows, setRows] = useState<Record<string, { position: string; score: string }>>(
        Object.fromEntries(registrations.map(r => [r.user_id, { position: '', score: '' }]))
    );
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSubmit = () => {
        const filled = registrations
            .filter(r => rows[r.user_id]?.position)
            .map(r => ({
                user_id: r.user_id,
                position: parseInt(rows[r.user_id].position),
                score: rows[r.user_id].score || undefined,
            }));
        if (filled.length === 0) { setError('Introduce al menos un resultado.'); return; }

        startTransition(async () => {
            try {
                await uploadResults(competitionId, filled);
                onDone();
            } catch (e: any) {
                setError(e.message || 'Error al subir resultados.');
            }
        });
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-gray-400 font-medium">Introduce la posición y el tiempo/puntuación para cada participante. Deja vacío para omitir.</p>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {registrations.map(reg => (
                    <div key={reg.user_id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-brand-gray overflow-hidden relative shrink-0">
                            {reg.user?.avatar_url ? (
                                <Image src={reg.user.avatar_url} alt={reg.user.full_name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-brand-red/30 text-white text-xs font-black">
                                    {reg.user?.full_name?.[0] || '?'}
                                </div>
                            )}
                        </div>
                        <span className="text-sm text-white font-bold flex-1 truncate">{reg.user?.full_name || reg.user?.username}</span>
                        <input
                            type="number"
                            min="1"
                            placeholder="Pos."
                            value={rows[reg.user_id]?.position || ''}
                            onChange={e => setRows(prev => ({ ...prev, [reg.user_id]: { ...prev[reg.user_id], position: e.target.value } }))}
                            className="w-14 bg-black/40 border border-white/10 rounded-lg py-1.5 px-2 text-white text-xs text-center focus:outline-none focus:border-brand-red/50"
                        />
                        <input
                            type="text"
                            placeholder="Tiempo/pts"
                            value={rows[reg.user_id]?.score || ''}
                            onChange={e => setRows(prev => ({ ...prev, [reg.user_id]: { ...prev[reg.user_id], score: e.target.value } }))}
                            className="w-24 bg-black/40 border border-white/10 rounded-lg py-1.5 px-2 text-white text-xs focus:outline-none focus:border-brand-red/50"
                        />
                    </div>
                ))}
            </div>
            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
            <button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full bg-brand-red text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
            >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isPending ? 'Guardando...' : 'Publicar Resultados'}
            </button>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CompetitionDetail({ competition, registrations, results, currentUser, isRegistered: initialIsRegistered }: Props) {
    const [isRegistered, setIsRegistered] = useState(initialIsRegistered);
    const [isPending, startTransition] = useTransition();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showUpload, setShowUpload] = useState(false);
    const [localStatus, setLocalStatus] = useState(competition.status);

    const isAdmin = currentUser?.is_official === true;
    const isOpen = localStatus === 'open';
    const isClosed = localStatus === 'closed';
    const isFinished = localStatus === 'finished';

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleRegister = () => {
        startTransition(async () => {
            try {
                await registerForCompetition(competition.id);
                setIsRegistered(true);
                showToast('¡Te has inscrito correctamente!');
            } catch (e: any) {
                showToast(e.message || 'Error al inscribirse.', 'error');
            }
        });
    };

    const handleUnregister = () => {
        startTransition(async () => {
            try {
                await unregisterFromCompetition(competition.id);
                setIsRegistered(false);
                showToast('Inscripción cancelada.');
            } catch (e: any) {
                showToast(e.message || 'Error.', 'error');
            }
        });
    };

    const handleStatusChange = (newStatus: string) => {
        startTransition(async () => {
            try {
                await updateCompetitionStatus(competition.id, newStatus);
                setLocalStatus(newStatus);
                showToast(`Estado actualizado a "${newStatus}".`);
            } catch (e: any) {
                showToast(e.message || 'Error.', 'error');
            }
        });
    };

    const dateObj = new Date(competition.date);
    const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[999] px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 transition-all ${toast.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.message}
                </div>
            )}

            {/* Back */}
            <Link href="/dashboard/competitions" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver a Competiciones
            </Link>

            {/* Hero */}
            <div className="relative rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
                <div className="h-64 md:h-80 relative">
                    {competition.image_url ? (
                        <>
                            <Image src={competition.image_url} alt={competition.title} fill className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-red via-red-900 to-black" />
                    )}

                    {/* Type badge */}
                    <div className="absolute top-5 left-5 z-10">
                        <span className="text-[9px] font-black bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-gray-300 uppercase tracking-widest">
                            {competition.type}
                        </span>
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-5 right-5 z-10">
                        <StatusBadge status={localStatus} />
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-6 left-6 right-6 z-10">
                        <h1 className="text-3xl md:text-5xl font-heading font-black text-white italic uppercase tracking-tighter leading-none drop-shadow-lg">
                            {competition.title}
                        </h1>
                        {competition.organizer && (
                            <p className="text-brand-red font-black tracking-widest text-xs uppercase mt-2">
                                por @{competition.organizer.username}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Meta info + actions row */}
            <div className="grid md:grid-cols-3 gap-4">
                {/* Date */}
                <div className="bg-brand-gray border border-white/5 rounded-2xl p-5 flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Fecha</p>
                        <p className="text-white font-bold text-sm capitalize">{formattedDate}</p>
                        <p className="text-gray-400 text-xs font-medium">{formattedTime}</p>
                    </div>
                </div>

                {/* Location */}
                <div className="bg-brand-gray border border-white/5 rounded-2xl p-5 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Ubicación</p>
                        <p className="text-white font-bold text-sm">{competition.location || 'Por confirmar'}</p>
                    </div>
                </div>

                {/* Participants */}
                <div className="bg-brand-gray border border-white/5 rounded-2xl p-5 flex items-start gap-3">
                    <Users className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Participantes</p>
                        <p className="text-white font-bold text-sm">
                            {registrations.length}
                            {competition.max_participants ? ` / ${competition.max_participants}` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Description */}
            {competition.description && (
                <div className="bg-brand-gray border border-white/5 rounded-2xl p-6">
                    <p className="text-gray-300 font-medium leading-relaxed text-sm">{competition.description}</p>
                </div>
            )}

            {/* ── Registration actions (only for non-finished) ── */}
            {currentUser && !isFinished && (
                <div className="bg-brand-gray border border-white/5 rounded-2xl p-6 space-y-3">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Tu Inscripción</h2>
                    {isOpen ? (
                        isRegistered ? (
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    <span className="text-green-400 font-black text-xs uppercase tracking-wider">Ya inscrito</span>
                                </div>
                                <button
                                    onClick={handleUnregister}
                                    disabled={isPending}
                                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-all text-xs font-bold disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                    Cancelar inscripción
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleRegister}
                                disabled={isPending || (!!competition.max_participants && registrations.length >= competition.max_participants)}
                                className="bg-brand-red text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                                {competition.max_participants && registrations.length >= competition.max_participants
                                    ? 'Plazas agotadas'
                                    : 'Inscribirme'}
                            </button>
                        )
                    ) : (
                        <p className="text-gray-500 text-sm font-medium">Las inscripciones están cerradas.</p>
                    )}
                </div>
            )}

            {/* ── Admin panel ── */}
            {isAdmin && (
                <div className="bg-brand-gray border border-brand-red/20 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-4 h-4 text-brand-red" />
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Panel de Administración</h2>
                    </div>

                    {/* Status controls */}
                    <div className="flex flex-wrap gap-2">
                        {!isFinished && isOpen && (
                            <button
                                onClick={() => handleStatusChange('closed')}
                                disabled={isPending}
                                className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-yellow-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <XCircle className="w-3.5 h-3.5" /> Cerrar inscripciones
                            </button>
                        )}
                        {!isFinished && isClosed && (
                            <button
                                onClick={() => handleStatusChange('open')}
                                disabled={isPending}
                                className="px-4 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <CheckCircle className="w-3.5 h-3.5" /> Reabrir inscripciones
                            </button>
                        )}
                    </div>

                    {/* Upload results */}
                    {!isFinished && registrations.length > 0 && (
                        <div className="border-t border-white/5 pt-4">
                            <button
                                onClick={() => setShowUpload(!showUpload)}
                                className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-[0.2em] bg-white/5 border border-white/10 px-4 py-3 rounded-xl hover:bg-white/10 transition-all w-full justify-between"
                            >
                                <span className="flex items-center gap-2"><Upload className="w-4 h-4 text-brand-red" /> Subir Resultados</span>
                                {showUpload ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {showUpload && (
                                <div className="mt-4">
                                    <UploadResultsForm
                                        competitionId={competition.id}
                                        registrations={registrations}
                                        onDone={() => {
                                            setShowUpload(false);
                                            setLocalStatus('finished');
                                            showToast('Resultados publicados correctamente.');
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Results / Ranking (finished) ── */}
            {isFinished && results.length > 0 && (
                <div className="bg-brand-gray border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
                        <Crown className="w-5 h-5 text-yellow-400" />
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Clasificación Final</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {results.map((result) => {
                            const medal = getMedalByPosition(result.position);
                            return (
                                <div
                                    key={result.id}
                                    className={`flex items-center gap-4 px-6 py-4 transition-all ${medal ? `${medal.rowBg} border-l-2 ${medal.border}` : 'hover:bg-white/3'}`}
                                >
                                    <div className={`text-2xl leading-none w-8 text-center`}>
                                        {medal ? medal.emoji : <span className="text-gray-500 font-black text-lg">#{result.position}</span>}
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-brand-gray border border-white/10 overflow-hidden relative shrink-0">
                                        {result.user?.avatar_url ? (
                                            <Image src={result.user.avatar_url} alt={result.user.full_name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-brand-red/20 text-white text-sm font-black">
                                                {result.user?.full_name?.[0] || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/dashboard/profile/${result.user?.username}`} className={`font-black text-sm hover:underline ${medal ? medal.text : 'text-white'}`}>
                                            {result.user?.full_name || result.user?.username}
                                        </Link>
                                        {result.score && (
                                            <p className="text-gray-400 text-xs font-medium">{result.score}</p>
                                        )}
                                    </div>
                                    <div className={`text-[9px] font-black uppercase tracking-wider ${medal ? medal.text : 'text-gray-500'}`}>
                                        {medal ? medal.label : `Pos. ${result.position}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Participants list (open / closed) ── */}
            {!isFinished && (
                <div className="bg-brand-gray border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3">
                        <Users className="w-5 h-5 text-brand-red" />
                        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                            Participantes Inscritos
                            <span className="ml-2 text-gray-500 font-bold text-xs">({registrations.length})</span>
                        </h2>
                    </div>
                    {registrations.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                            <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold text-sm">Aún no hay inscritos. ¡Sé el primero!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-0">
                            {registrations.map((reg, idx) => (
                                <div
                                    key={reg.id}
                                    className={`flex items-center gap-3 px-6 py-4 hover:bg-white/3 transition-all ${idx % 2 === 0 ? '' : 'sm:border-l sm:border-white/5'}`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-brand-gray border border-white/10 overflow-hidden relative shrink-0">
                                        {reg.user?.avatar_url ? (
                                            <Image src={reg.user.avatar_url} alt={reg.user.full_name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-brand-red/20 text-white text-xs font-black">
                                                {reg.user?.full_name?.[0] || '?'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/dashboard/profile/${reg.user?.username}`} className="text-white font-bold text-sm hover:text-brand-red transition-colors truncate block">
                                            {reg.user?.full_name || reg.user?.username}
                                        </Link>
                                        <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">Lvl {reg.user?.level || 0}</p>
                                    </div>
                                    {reg.user_id === currentUser?.id && (
                                        <span className="text-[8px] font-black text-brand-red uppercase tracking-wider border border-brand-red/30 bg-brand-red/10 px-2 py-0.5 rounded-full">Tú</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
