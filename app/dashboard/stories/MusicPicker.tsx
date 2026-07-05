'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Play, Pause, Music2, ChevronRight, Check, Loader2, MicVocal } from 'lucide-react';
import { clsx } from 'clsx';

interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    url: string;
    previewUrl: string;
    cover: string;
    genre: string;
}

interface MusicPickerProps {
    onSelect: (track: { url: string; title: string; artist: string; cover: string } | null) => void;
    onClose: () => void;
    selectedTrack?: { url: string; title: string; artist: string; cover?: string } | null;
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

function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MusicPicker({ onSelect, onClose, selectedTrack }: MusicPickerProps) {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // ── Fetch tracks from API ────────────────────────────────────────────────
    const fetchTracks = useCallback(async (q: string, cat: string) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            else if (cat) params.set('category', cat);

            const res = await fetch(`/api/music?${params}`, {
                signal: controller.signal,
            });

            if (!res.ok) throw new Error('API error');
            const data = await res.json();

            const mapped: Track[] = (data.tracks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: t.album || '',
                duration: t.duration || 30,
                url: t.url || t.previewUrl,
                previewUrl: t.url || t.previewUrl,
                cover: t.cover || '',
                genre: t.genre || '',
            }));

            setTracks(mapped);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('[Stories MusicPicker] Fetch error:', err);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Load popular on mount ────────────────────────────────────────────────
    useEffect(() => {
        fetchTracks('', '');
    }, [fetchTracks]);

    // ── Handle search with debounce ──────────────────────────────────────────
    const handleSearch = (value: string) => {
        setQuery(value);
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
        setQuery('');
        fetchTracks('', cat);
    };

    // ── Audio playback ───────────────────────────────────────────────────────
    const togglePlay = (track: Track) => {
        if (playingId === track.id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        // Stop previous — desconectando sus eventos para que el 'error' que
        // dispara src='' no borre el estado de la canción nueva
        if (audioRef.current) {
            audioRef.current.onerror = null;
            audioRef.current.onended = null;
            audioRef.current.ontimeupdate = null;
            audioRef.current.onloadedmetadata = null;
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        const audio = new Audio();
        audio.volume = 0.9;
        audio.preload = 'auto';
        audio.ontimeupdate = () => {
            if (audioRef.current === audio) setCurrentTime(Math.floor(audio.currentTime));
        };
        audio.onloadedmetadata = () => {
            if (audioRef.current === audio) setDuration(Math.floor(audio.duration));
        };
        audio.onended = () => {
            if (audioRef.current === audio) setPlayingId(null);
        };
        audio.onerror = () => {
            if (audioRef.current === audio) {
                console.warn('[MusicPicker] Audio error:', track.url);
                setPlayingId(null);
            }
        };

        audio.src = track.url;

        const promise = audio.play();
        if (promise !== undefined) {
            promise.catch(err => {
                console.warn('[MusicPicker] play() rejected:', err.message);
                setPlayingId(null);
            });
        }

        audioRef.current = audio;
        setPlayingId(track.id);
        setCurrentTime(0);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Al salir de la app / cambiar de pestaña: silencio inmediato
    // (los new Audio() no están en el DOM y el apagado global no los ve)
    useEffect(() => {
        const onHide = () => {
            if (document.hidden) {
                audioRef.current?.pause();
                setPlayingId(null);
            }
        };
        document.addEventListener('visibilitychange', onHide);
        return () => document.removeEventListener('visibilitychange', onHide);
    }, []);

    const handleSelect = (track: Track) => {
        if (playingId === track.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        }
        onSelect({ url: track.url, title: track.title, artist: track.artist, cover: track.cover });
        onClose();
    };

    const handleRemove = () => {
        audioRef.current?.pause();
        setPlayingId(null);
        onSelect(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative w-full max-w-md bg-[#0d0d0d] rounded-t-[32px] sm:rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-red/10 flex items-center justify-center">
                            <Music2 className="w-4 h-4 text-brand-red" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Música</h3>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                iTunes · {tracks.length} canciones
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-5 pt-4 pb-3 shrink-0">
                    <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3 border border-white/5 focus-within:border-brand-red/50 transition-all">
                        <Search className="w-4 h-4 text-gray-500 shrink-0" />
                        <input
                            type="text"
                            placeholder="Busca Bad Bunny, Drake, Shakira..."
                            value={query}
                            onChange={e => handleSearch(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none font-medium"
                        />
                        {query && (
                            <button onClick={() => handleSearch('')}>
                                <X className="w-4 h-4 text-gray-500 hover:text-white transition-colors" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="px-5 pb-3 shrink-0 overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 min-w-max">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategory(cat.id)}
                                className={clsx(
                                    'px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide border transition-all whitespace-nowrap',
                                    category === cat.id && !query
                                        ? 'bg-brand-red border-brand-red text-white shadow-[0_0_12px_rgba(220,38,38,0.3)]'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Currently Selected Banner */}
                {selectedTrack && (
                    <div className="mx-5 mb-3 bg-brand-red/10 border border-brand-red/20 rounded-2xl p-3 flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-brand-red/20 flex items-center justify-center">
                            {selectedTrack.cover
                                ? <img src={selectedTrack.cover} alt="cover" className="w-full h-full object-cover" />
                                : <Music2 className="w-5 h-5 text-brand-red" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white truncate">{selectedTrack.title}</p>
                            <p className="text-[10px] text-brand-red font-bold uppercase tracking-widest truncate">{selectedTrack.artist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                            <button onClick={handleRemove} className="text-[10px] font-black text-gray-400 hover:text-brand-red uppercase tracking-widest transition-colors">
                                Quitar
                            </button>
                        </div>
                    </div>
                )}

                {/* Track List */}
                <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-1.5 no-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                            <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Buscando canciones...</p>
                        </div>
                    ) : tracks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <MicVocal className="w-10 h-10 text-gray-700" />
                            <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest text-center">
                                No encontrado.<br />Prueba otra búsqueda.
                            </p>
                        </div>
                    ) : (
                        tracks.map(track => {
                            const isPlaying = playingId === track.id;
                            const isSelected = selectedTrack?.url === track.url;

                            return (
                                <div
                                    key={track.id}
                                    className={clsx(
                                        'flex items-center gap-3 p-3 rounded-2xl border transition-all group',
                                        isSelected
                                            ? 'bg-brand-red/10 border-brand-red/30'
                                            : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                                    )}
                                >
                                    {/* Cover — tap to play/pause */}
                                    <button
                                        onClick={e => { e.stopPropagation(); togglePlay(track); }}
                                        className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 focus:outline-none focus:ring-2 focus:ring-brand-red"
                                        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                                    >
                                        {track.cover ? (
                                            <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-black/40 flex items-center justify-center">
                                                <Music2 className="w-5 h-5 text-brand-red" />
                                            </div>
                                        )}

                                        {/* Now-playing bars */}
                                        {isPlaying ? (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <NowPlayingBars />
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                <div className="w-7 h-7 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
                                                    <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        )}
                                    </button>

                                    {/* Track Info — tap to select */}
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelect(track)}>
                                        <p className={clsx(
                                            'text-sm font-black truncate leading-tight',
                                            isSelected ? 'text-brand-red' : 'text-white'
                                        )}>
                                            {track.title}
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-bold truncate uppercase tracking-wide">
                                            {track.artist}{track.album ? ` · ${track.album}` : ''}
                                        </p>

                                        {/* Progress bar when playing */}
                                        {isPlaying ? (
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-red transition-all duration-200"
                                                        style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                                                    />
                                                </div>
                                                <span className="text-[9px] text-gray-500 font-mono shrink-0">
                                                    {formatDuration(currentTime)}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-[9px] text-gray-600 font-mono mt-0.5">
                                                {formatDuration(track.duration)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Select button */}
                                    <button
                                        onClick={() => handleSelect(track)}
                                        className={clsx(
                                            'w-8 h-8 rounded-full shrink-0 flex items-center justify-center border transition-all',
                                            isSelected
                                                ? 'bg-brand-red border-brand-red shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                                                : 'bg-white/5 border-white/10 hover:border-white/30'
                                        )}
                                    >
                                        {isSelected ? (
                                            <Check className="w-4 h-4 text-white" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                        )}
                                    </button>
                                </div>
                            );
                        })
                    )}

                    {/* Attribution */}
                    <div className="pt-4 pb-2 text-center">
                        <p className="text-[9px] text-gray-700 font-bold">
                            Previews de 30s ·{' '}
                            <span className="text-gray-600">iTunes Music</span>
                            {' '}· Rival Fit
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Animated EQ bars shown while a track plays
function NowPlayingBars() {
    return (
        <div className="flex items-end gap-[2px] h-5">
            {[1, 2, 3].map(i => (
                <div
                    key={i}
                    className="w-[3px] bg-brand-red rounded-full"
                    style={{ animation: `musicBar 0.8s ease-in-out infinite alternate`, animationDelay: `${i * 0.15}s`, height: '100%' }}
                />
            ))}
            <style>{`
                @keyframes musicBar {
                    from { transform: scaleY(0.2); }
                    to   { transform: scaleY(1); }
                }
            `}</style>
        </div>
    );
}
