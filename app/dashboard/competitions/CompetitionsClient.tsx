'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, ExternalLink, Trophy, Filter, Plus, Users, Calendar, Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import { COMPETITIONS_DATA, Competition } from './data';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import EventRegistrationModal from './EventRegistrationModal';
import { createCompetition } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCompetition {
    id: string;
    title: string;
    description?: string;
    type: string;
    date: string;
    location?: string;
    image_url?: string;
    status: string;
    max_participants?: number;
    organizer?: { full_name: string; username: string; avatar_url?: string };
    _count?: Array<{ count: number }>;
}

interface Props {
    staticCompetitions: Competition[];
    dbCompetitions: DbCompetition[];
    isAdmin: boolean;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    if (status === 'open')
        return <span className="text-[8px] font-black uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">Abierto</span>;
    if (status === 'closed')
        return <span className="text-[8px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Cerrado</span>;
    return <span className="text-[8px] font-black uppercase tracking-wider bg-brand-red/15 text-brand-red border border-brand-red/30 px-2 py-0.5 rounded-full">Finalizado</span>;
}

// ─── Create competition modal ─────────────────────────────────────────────────

function CreateCompetitionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        title: '', description: '', type: 'OTHER', date: '', location: '',
        image_url: '', status: 'open', max_participants: '', registration_deadline: '',
    });

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title || !form.date) { setError('Título y fecha son obligatorios.'); return; }
        startTransition(async () => {
            try {
                await createCompetition({
                    title: form.title,
                    description: form.description,
                    type: form.type,
                    date: form.date,
                    location: form.location,
                    image_url: form.image_url || undefined,
                    status: form.status,
                    max_participants: form.max_participants ? parseInt(form.max_participants) : undefined,
                    registration_deadline: form.registration_deadline || undefined,
                });
                onCreated();
                onClose();
            } catch (err: any) {
                setError(err.message || 'Error al crear la competición.');
            }
        });
    };

    const inputCls = "w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-brand-red/50 transition-all font-medium";
    const labelCls = "block text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1.5";

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#111] border border-white/10 rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-white/5">
                    <h2 className="text-lg font-heading font-black text-white italic uppercase">Nueva Competición</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div>
                        <label className={labelCls}>Título *</label>
                        <input className={inputCls} placeholder="Nombre de la competición" value={form.title} onChange={e => set('title', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Tipo</label>
                            <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
                                {['HYROX','CROSSFIT','OCR','RUNNING','TRIATHLON','HYBRID','OTHER'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Estado</label>
                            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                                <option value="open">Abierto</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Fecha y hora *</label>
                        <input type="datetime-local" className={inputCls} value={form.date} onChange={e => set('date', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Ubicación</label>
                        <input className={inputCls} placeholder="Ciudad, País" value={form.location} onChange={e => set('location', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>URL de imagen</label>
                        <input className={inputCls} placeholder="https://..." value={form.image_url} onChange={e => set('image_url', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Máx. participantes</label>
                            <input type="number" min="1" className={inputCls} placeholder="Ilimitado" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Fecha límite inscripción</label>
                            <input type="datetime-local" className={inputCls} value={form.registration_deadline} onChange={e => set('registration_deadline', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Descripción</label>
                        <textarea className={clsx(inputCls, 'resize-none h-24')} placeholder="Describe el evento..." value={form.description} onChange={e => set('description', e.target.value)} />
                    </div>
                    {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
                    <button type="submit" disabled={isPending} className="w-full bg-brand-red text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isPending ? 'Creando...' : 'Crear Competición'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── DB Competition card ──────────────────────────────────────────────────────

function DbCompetitionCard({ competition }: { competition: DbCompetition }) {
    const participantCount = competition._count?.[0]?.count ?? 0;
    const dateObj = new Date(competition.date);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-brand-gray border border-white/5 rounded-[32px] overflow-hidden hover:border-brand-red/30 hover:shadow-[0_0_30px_rgba(220,38,38,0.15)] transition-all duration-300"
        >
            {/* Image */}
            <div className="h-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-brand-gray via-transparent to-transparent z-10" />
                {/* Status */}
                <div className="absolute top-4 left-4 z-20">
                    <StatusBadge status={competition.status} />
                </div>
                <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white border border-white/10 px-3 py-1 rounded-xl flex flex-col items-center shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {dateObj.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                    </span>
                    <span className="text-xl font-heading font-black leading-none">{dateObj.getDate()}</span>
                </div>
                {competition.image_url ? (
                    <Image src={competition.image_url} alt={competition.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-red via-red-900 to-black opacity-60" />
                )}
            </div>

            {/* Content */}
            <div className="p-6 relative z-20 -mt-10">
                <div className="bg-brand-gray/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest">
                            {competition.type}
                        </span>
                        <span className="text-[9px] font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />{participantCount}
                        </span>
                    </div>

                    <h3 className="text-xl font-heading font-black text-white italic uppercase leading-tight mb-1 group-hover:text-brand-red transition-colors">
                        {competition.title}
                    </h3>

                    {competition.organizer && (
                        <p className="text-xs text-brand-red font-bold uppercase tracking-wider mb-4 truncate">
                            @{competition.organizer.username}
                        </p>
                    )}

                    <div className="space-y-2 mb-6">
                        {competition.location && (
                            <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                {competition.location}
                            </div>
                        )}
                        {competition.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                {competition.description}
                            </p>
                        )}
                    </div>

                    <Link
                        href={`/dashboard/competitions/${competition.id}`}
                        className="w-full bg-brand-red text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-600 transition-all group/btn"
                    >
                        Ver competición <Trophy className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Static competition card (unchanged) ─────────────────────────────────────

function StaticCompetitionCard({ competition }: { competition: Competition }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-brand-gray border border-white/5 rounded-[32px] overflow-hidden hover:border-brand-red/30 hover:shadow-[0_0_30px_rgba(220,38,38,0.15)] transition-all duration-300"
        >
            <div className="h-48 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-brand-gray via-transparent to-transparent z-10" />
                {competition.is_featured && (
                    <div className="absolute top-4 left-4 z-20 bg-brand-red text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg border border-white/20">
                        Destacado
                    </div>
                )}
                <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white border border-white/10 px-3 py-1 rounded-xl flex flex-col items-center shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {new Date(competition.date).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                    </span>
                    <span className="text-xl font-heading font-black leading-none">
                        {new Date(competition.date).getDate()}
                    </span>
                </div>
                <Image src={competition.image_url} alt={competition.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>

            <div className="p-6 relative z-20 -mt-10">
                <div className="bg-brand-gray/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-black bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 uppercase tracking-widest">
                            {competition.type}
                        </span>
                    </div>

                    <h3 className="text-xl font-heading font-black text-white italic uppercase leading-tight mb-1 group-hover:text-brand-red transition-colors">
                        {competition.name}
                    </h3>

                    <p className="text-xs text-brand-red font-bold uppercase tracking-wider mb-4 truncate">
                        {competition.organizer}
                    </p>

                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            {competition.location}
                        </div>
                        {competition.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                {competition.description}
                            </p>
                        )}
                    </div>

                    <Link
                        href={competition.registration_url || '#'}
                        target="_blank"
                        className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-brand-red hover:text-white transition-all group/btn"
                    >
                        Inscribirse <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompetitionsClient({ staticCompetitions, dbCompetitions, isAdmin }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [showCreate, setShowCreate] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('new') === 'true') setShowCreate(true);
    }, [searchParams]);

    const types = ['ALL', 'HYROX', 'CROSSFIT', 'OCR', 'RUNNING', 'TRIATHLON', 'HYBRID', 'OTHER'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredStatic = useMemo(() => {
        return staticCompetitions.filter(comp => {
            const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                comp.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === 'ALL' || comp.type === selectedType;
            const isFuture = new Date(comp.date) >= today;
            return matchesSearch && matchesType && isFuture;
        });
    }, [searchTerm, selectedType, staticCompetitions]);

    const filteredDb = useMemo(() => {
        return dbCompetitions.filter(comp => {
            const matchesSearch = comp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (comp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === 'ALL' || comp.type === selectedType;
            return matchesSearch && matchesType;
        });
    }, [searchTerm, selectedType, dbCompetitions]);

    const totalResults = filteredStatic.length + filteredDb.length;

    const showToastMsg = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Toast */}
            {toast && (
                <div className="fixed top-6 right-6 z-[999] px-5 py-3 rounded-2xl font-bold text-sm shadow-2xl flex items-center gap-2 bg-green-500/90 text-white transition-all">
                    <CheckCircle className="w-4 h-4" /> {toast}
                </div>
            )}

            {/* Create modal */}
            {showCreate && (
                <CreateCompetitionModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => showToastMsg('Competición creada correctamente.')}
                />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-heading font-black text-white glow-text tracking-tighter uppercase italic flex items-center gap-3">
                        <Trophy className="w-8 h-8 md:w-10 md:h-10 text-brand-red" />
                        Próximas Batallas
                    </h1>
                    <p className="text-gray-400 font-medium max-w-xl mt-2 text-sm md:text-base">
                        Encuentra tu próximo desafío. Hyrox, CrossFit, Triatlón y más. Compite, mide tu nivel y domina el terreno.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 bg-brand-red text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 transition-all shadow-lg shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Crear Competición
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="sticky top-20 z-40 bg-background/80 backdrop-blur-xl py-4 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-2xl md:border md:border-white/5 md:bg-brand-gray/50">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-red transition-colors w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o ciudad..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/50 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide mask-fade-right">
                        {types.map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={clsx(
                                    "px-4 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                                    selectedType === type
                                        ? "bg-brand-red text-white border-brand-red shadow-glow"
                                        : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                {type === 'ALL' ? 'Todos' : type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Community competitions (from DB) */}
            {filteredDb.length > 0 && (
                <div>
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <Trophy className="w-3 h-3 text-brand-red" />
                        Competiciones de la Comunidad
                        <span className="text-gray-700 font-bold">({filteredDb.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredDb.map(comp => (
                                <DbCompetitionCard key={comp.id} competition={comp} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Static upcoming events */}
            <div>
                {filteredDb.length > 0 && (
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-brand-red" />
                        Eventos Oficiales
                        <span className="text-gray-700 font-bold">({filteredStatic.length})</span>
                    </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredStatic.length > 0 ? (
                            filteredStatic.map((comp) => (
                                <StaticCompetitionCard key={comp.id} competition={comp} />
                            ))
                        ) : filteredDb.length === 0 ? (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-50">
                                <Filter className="w-16 h-16 text-gray-700 mb-4" />
                                <p className="text-gray-500 font-black uppercase tracking-[0.2em]">No se encontraron eventos</p>
                            </div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>

            {/* Promo Banner */}
            <div className="bg-gradient-to-r from-brand-red/20 to-transparent border border-brand-red/20 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-black via-transparent to-transparent z-10 hidden md:block" />
                <Image
                    src="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop"
                    alt="Community"
                    fill
                    className="object-cover opacity-20 group-hover:opacity-30 transition-opacity mix-blend-overlay"
                />
                <div className="relative z-20 max-w-2xl">
                    <h3 className="text-2xl font-heading font-black text-white italic uppercase mb-2">¿Organizas una competición?</h3>
                    <p className="text-gray-300 mb-6 font-medium">
                        Publica tu evento en Rival y llega a miles de atletas buscando su próximo desafío. Gestión de inscripciones, leaderboard en vivo y más.
                    </p>
                    <EventRegistrationModal />
                </div>
            </div>
        </div>
    );
}
