"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Music, Play, Pause, Check, Search, X, Volume2, Disc, Loader2 } from "lucide-react";
import { clsx } from "clsx";

export interface MusicTrack {
    id: string;
    title: string;
    artist: string;
    url: string;
    genre?: string;
    cover?: string;
    album?: string;
    duration?: number;
}

interface MusicPickerProps {
    onSelect: (track: MusicTrack | null) => void;
    selectedTrackId: string | null;
    variant?: 'button' | 'embedded' | 'inline';
    onClose?: () => void;
}

const CATEGORIES = [
    { id: '', label: '🔥 Popular' },
    { id: 'workout', label: '💪 Workout' },
    { id: 'latin', label: '💃 Latin' },
    { id: 'hiphop', label: '🎤 Hip-Hop' },
    { id: 'electronic', label: '⚡ EDM' },
    { id: 'rock', label: '🎸 Rock' },
    { id: 'pop', label: '🎶 Pop' },
    { id: 'chill', label: '😌 Chill' },
];

export default function MusicPicker({ onSelect, selectedTrackId, variant = 'button', onClose }: MusicPickerProps) {
    const [isOpen, setIsOpen] = useState(variant === 'embedded' || variant === 'inline');
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setMounted(true);
    }, []);
    const [category, setCategory] = useState("");
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // ── Fetch tracks from API ────────────────────────────────────────────────
    const fetchTracks = useCallback(async (query: string, cat: string) => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            else if (cat) params.set('category', cat);

            const res = await fetch(`/api/music?${params}`, {
                signal: controller.signal,
            });

            if (!res.ok) throw new Error('API error');
            const data = await res.json();

            const mapped: MusicTrack[] = (data.tracks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                artist: t.artist,
                url: t.url || t.previewUrl,
                genre: t.genre || '',
                cover: t.cover || '',
                album: t.album || '',
                duration: t.duration || 30,
            }));

            setTracks(mapped);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('[MusicPicker] Fetch error:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Load popular on open ─────────────────────────────────────────────────
    useEffect(() => {
        if (isOpen && tracks.length === 0) {
            fetchTracks('', '');
        }
    }, [isOpen, fetchTracks]);

    // ── Handle search with debounce ──────────────────────────────────────────
    const handleSearch = (value: string) => {
        setSearchQuery(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            if (value.trim()) {
                setCategory('');
                fetchTracks(value, '');
            } else {
                fetchTracks('', category);
            }
        }, 400);
    };

    // ── Handle category ──────────────────────────────────────────────────────
    const handleCategory = (cat: string) => {
        setCategory(cat);
        setSearchQuery('');
        fetchTracks('', cat);
    };

    // ── Close on escape ──────────────────────────────────────────────────────
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (onClose) onClose();
                else setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // ── Handle visibility & cleanup ──────────────────────────────────────────
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && audioRef.current) {
                audioRef.current.pause();
                setPreviewingId(null);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    // ── Prevent scroll when modal is open ────────────────────────────────────
    useEffect(() => {
        if (isOpen && variant === 'button') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, variant]);

    // ── Cleanup abort controller on unmount ───────────────────────────────────
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handlePreview = async (e: React.MouseEvent, track: MusicTrack) => {
        e.stopPropagation();

        if (previewingId === track.id) {
            audioRef.current?.pause();
            setPreviewingId(null);
            return;
        }

        try {
            // Desechar el audio anterior SIN que sus eventos contaminen al nuevo:
            // poner src="" dispara 'error' en el audio viejo, y su onerror
            // borraba el previewingId de la canción nueva (por eso "pausa"
            // parecía no funcionar: el estado siempre volvía a null).
            if (audioRef.current) {
                audioRef.current.onerror = null;
                audioRef.current.onended = null;
                audioRef.current.pause();
                audioRef.current.src = "";
            }

            const audio = new Audio();
            audio.volume = 0.9;
            audio.preload = 'auto';
            // Guardas: cada manejador solo actúa si SU audio sigue siendo el vigente
            audio.onended = () => {
                if (audioRef.current === audio) setPreviewingId(null);
            };
            audio.onerror = () => {
                if (audioRef.current === audio) {
                    console.warn('[MusicPicker] Preview error for:', track.title);
                    setPreviewingId(null);
                }
            };
            audio.src = track.url;

            // Registrar ANTES de esperar a que arranque (evita audios huérfanos)
            audioRef.current = audio;
            setPreviewingId(track.id);

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                await playPromise;
            }
        } catch (error) {
            console.warn("Playback Failure:", error);
            if (audioRef.current) {
                audioRef.current.pause();
                setPreviewingId(null);
            }
        }
    };

    const handleSelect = (track: MusicTrack) => {
        if (selectedTrackId === track.id) {
            onSelect(null);
            setSelectedTrack(null);
        } else {
            onSelect(track);
            setSelectedTrack(track);
        }
        if (variant === 'button') setIsOpen(false);
        if (audioRef.current) {
            audioRef.current.pause();
            setPreviewingId(null);
        }
    };

    const currentSelected = selectedTrack || tracks.find(t => t.id === selectedTrackId);

    const PickerContent = (isModal: boolean) => (
        <div className={clsx(
            "flex flex-col overflow-hidden transition-all duration-300 w-full",
            variant === 'inline'
                ? "border-none bg-transparent p-0"
                : "bg-brand-gray border",
            !isModal && variant !== 'inline' && "rounded-[24px] p-4 border border-white/10",
            isModal && "h-[85vh] sm:h-[650px] rounded-t-[32px] sm:rounded-[32px] border-t sm:border border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] sm:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]"
        )}>
            {/* Pull tab on mobile */}
            {isModal && (
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0 cursor-pointer" onClick={() => setIsOpen(false)} />
            )}
 
            {/* Header */}
            <div className={clsx("flex items-center justify-between p-4 sm:p-6 pb-2 relative", !isModal && "p-0 mb-4")}>
                <div className="flex items-center gap-3 pr-12">
                    <div className="p-2 bg-brand-red/10 rounded-xl shrink-0">
                        <Music className="w-5 h-5 text-brand-red" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tighter truncate">Biblioteca Rival</h4>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">Canciones reales · iTunes</p>
                    </div>
                </div>
 
                {(isModal || onClose) && variant !== 'inline' && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClose) onClose();
                            else setIsOpen(false);
                        }}
                        className="absolute right-4 top-3 sm:top-5 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all shrink-0 active:scale-95 z-50 border border-white/5"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Search */}
            <div className={clsx("px-4 sm:px-6 py-3 sm:py-4", !isModal && "p-0 mb-4")}>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                    <input
                        type="text"
                        placeholder="Busca Bad Bunny, Eminem, Shakira..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-11 pr-10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-red/30 focus:bg-black/60 transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => handleSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                            <X className="w-4 h-4 text-gray-500 hover:text-white transition-colors" />
                        </button>
                    )}
                </div>
            </div>

            {/* Categories */}
            <div className={clsx("px-4 sm:px-6 pb-3 overflow-x-auto no-scrollbar", !isModal && "px-0")}>
                <div className="flex gap-2 min-w-max">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategory(cat.id)}
                            className={clsx(
                                'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border transition-all whitespace-nowrap',
                                category === cat.id && !searchQuery
                                    ? 'bg-brand-red border-brand-red text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                            )}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tracks List */}
            <div className={clsx("flex-1 overflow-y-auto px-3 sm:px-4 pb-6 custom-scrollbar", !isModal && "max-h-[450px] p-0 mb-4")}>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                        <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Buscando canciones...</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {tracks.map(track => (
                            <div
                                key={track.id}
                                onClick={() => handleSelect(track)}
                                className={clsx(
                                    "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                                    selectedTrackId === track.id
                                        ? "bg-brand-red/10 border-brand-red/30 shadow-glow-sm"
                                        : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5"
                                )}
                            >
                                {/* Cover + Play */}
                                <button
                                    type="button"
                                    onClick={(e) => handlePreview(e, track)}
                                    className={clsx(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative z-10 overflow-hidden shrink-0",
                                        previewingId === track.id
                                            ? "scale-95 shadow-[0_0_15px_rgba(255,49,49,0.5)]"
                                            : selectedTrackId === track.id
                                                ? "scale-100"
                                                : "hover:scale-110"
                                    )}
                                >
                                    {track.cover ? (
                                        <img src={track.cover} alt={track.title} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <div className="w-full h-full bg-black/40 flex items-center justify-center rounded-xl">
                                            <Music className="w-5 h-5 text-brand-red" />
                                        </div>
                                    )}
                                    {/* Play/Pause overlay */}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                        {previewingId === track.id ? (
                                            <Pause className="w-5 h-5 fill-white text-white" />
                                        ) : (
                                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                        )}
                                    </div>
                                </button>

                                <div className="flex-1 min-w-0 relative z-10">
                                    <p className={clsx(
                                        "text-sm font-black truncate mb-0.5 italic",
                                        selectedTrackId === track.id ? "text-brand-red" : "text-white"
                                    )}>
                                        {track.title}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest truncate">{track.artist}</span>
                                        {track.genre && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[9px] text-brand-red/70 uppercase font-black tracking-tighter">{track.genre}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {selectedTrackId === track.id && (
                                    <div className="absolute inset-0 bg-brand-red/5 border-2 border-brand-red/30 rounded-2xl animate-pulse pointer-events-none" />
                                )}

                                {selectedTrackId === track.id && (
                                    <div className="absolute right-4 z-10 scale-110">
                                        <div className="bg-brand-red text-white p-1 rounded-full shadow-[0_0_15px_rgba(255,0,0,0.6)]">
                                            <Check className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                )}

                                {/* Animated progress for playing track */}
                                {previewingId === track.id && (
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-red/20 overflow-hidden">
                                        <div className="h-full bg-brand-red animate-progress-fast shadow-[0_0_10px_#dc2626]" style={{ width: '100%' }} />
                                    </div>
                                )}
                            </div>
                        ))}

                        {!isLoading && tracks.length === 0 && (
                            <div className="py-12 text-center">
                                <Disc className="w-12 h-12 text-gray-700 mx-auto mb-4 animate-spin-slow" />
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No se encontraron canciones</p>
                                <p className="text-[10px] text-gray-600 mt-2">Prueba con otro artista o canción</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-white/5 bg-black/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-gray-500" />
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Preview 30s</span>
                </div>
                <p className="text-[8px] text-gray-600 uppercase font-black tracking-[0.2em]">
                    Rival Fit · iTunes Music
                </p>
            </div>
        </div>
    );

    if (variant === 'embedded' || variant === 'inline') {
        return PickerContent(false);
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={clsx(
                    "p-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 border border-transparent group",
                    currentSelected
                        ? "bg-brand-red/15 text-brand-red shadow-glow-sm"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
                title="Añadir Música"
            >
                <Music className={clsx("w-5 h-5", currentSelected && "animate-pulse")} />
                {currentSelected && (
                    <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] italic">
                        {currentSelected.title}
                    </span>
                )}
            </button>

            {/* Bottom Sheet Drawer on Mobile / Centered Modal on Desktop */}
            {isOpen && mounted && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/85 backdrop-blur-sm sm:backdrop-blur-md cursor-pointer"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal/Drawer Container */}
                    <div className="relative z-10 w-full max-w-lg animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                        {PickerContent(true)}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
