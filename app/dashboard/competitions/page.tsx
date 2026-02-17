'use client';

import { useState, useMemo } from 'react';
import { Search, MapPin, ExternalLink, Trophy, Filter } from 'lucide-react';
import { COMPETITIONS_DATA, Competition } from './data';
import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import EventRegistrationModal from './EventRegistrationModal';

export default function CompetitionsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string | 'ALL'>('ALL');

    const filteredCompetitions = useMemo(() => {
        return COMPETITIONS_DATA.filter(comp => {
            const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                comp.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = selectedType === 'ALL' || comp.type === selectedType;

            // Filter out past events
            const eventDate = new Date(comp.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isFuture = eventDate >= today;

            return matchesSearch && matchesType && isFuture;
        });
    }, [searchTerm, selectedType]);

    const types = ['ALL', 'HYROX', 'CROSSFIT', 'OCR', 'RUNNING', 'TRIATHLON', 'HYBRID'];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
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
            </div>

            {/* Filters */}
            <div className="sticky top-20 z-40 bg-background/80 backdrop-blur-xl py-4 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-2xl md:border md:border-white/5 md:bg-brand-gray/50">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search */}
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

                    {/* Type Tabs */}
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

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {filteredCompetitions.length > 0 ? (
                        filteredCompetitions.map((comp) => (
                            <CompetitionCard key={comp.id} competition={comp} />
                        ))
                    ) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-50">
                            <Filter className="w-16 h-16 text-gray-700 mb-4" />
                            <p className="text-gray-500 font-black uppercase tracking-[0.2em]">No se encontraron eventos</p>
                        </div>
                    )}
                </AnimatePresence>
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

function CompetitionCard({ competition }: { competition: Competition }) {
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
                <Image
                    src={competition.image_url}
                    alt={competition.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                />
            </div>

            {/* Content */}
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
