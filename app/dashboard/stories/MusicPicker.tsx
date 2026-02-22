'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Play, Pause, Music2, ChevronRight, Check, Loader2, MicVocal } from 'lucide-react';
import { clsx } from 'clsx';
import { RIVAL_MUSIC_LIBRARY } from '../music-data';

interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    url: string;
    previewUrl: string;
    cover: string;
    license: string;
    tags: string[];
    category: string;
}

interface MusicPickerProps {
    onSelect: (track: { url: string; title: string; artist: string; cover: string } | null) => void;
    onClose: () => void;
    selectedTrack?: { url: string; title: string; artist: string; cover?: string } | null;
}

const CATEGORIES = [
    { id: '', label: '🔥 Popular' },
    { id: 'workout', label: '💪 Workout' },
    { id: 'electronic', label: '⚡ Electrónica' },
    { id: 'hiphop', label: '🎤 Hip-Hop' },
    { id: 'rock', label: '🎸 Rock' },
    { id: 'chill', label: '😌 Chill' },
    { id: 'latin', label: '💃 Latin' },
];

// Genre → photo mapping for covers
const GENRE_PHOTOS: Record<string, string> = {
    Motivational: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80',
    Epic: 'https://images.unsplash.com/photo-1526401485004-46910ecc8e2d?w=200&q=80',
    Aggressive: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80',
    Motivacion: 'https://images.unsplash.com/photo-1601422407692-ad6a68a27e4f?w=200&q=80',
    Phonk: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80',
    Electronic: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80',
    Trance: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&q=80',
    Ambient: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80',
    Chill: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=200&q=80',
    Deep: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80',
    Rock: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200&q=80',
};

function genreToCover(genre: string): string {
    return GENRE_PHOTOS[genre] || 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=200&q=80';
}

function genreToCategory(genre: string): string {
    const map: Record<string, string> = {
        Motivational: 'workout', Epic: 'workout', Aggressive: 'workout', Motivacion: 'workout',
        Phonk: 'hiphop',
        Electronic: 'electronic', Trance: 'electronic', Ambient: 'electronic', Deep: 'electronic',
        Chill: 'chill',
        Rock: 'rock',
    };
    return map[genre] || '';
}

// Convert the music library into Track objects (always available, no fetch needed)
const FALLBACK_TRACKS: Track[] = RIVAL_MUSIC_LIBRARY.map(t => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.genre,
    duration: 210,
    url: t.url,
    previewUrl: t.url,
    cover: genreToCover(t.genre),
    license: 'Royalty Free',
    tags: [t.genre.toLowerCase()],
    category: genreToCategory(t.genre),
}));

function filterTracks(tracks: Track[], query: string, category: string): Track[] {
    let result = [...tracks];
    if (category) result = result.filter(t => t.category === category);
    if (query) {
        const q = query.toLowerCase();
        const searched = result.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.tags.some(tag => tag.includes(q))
        );
        if (searched.length > 0) result = searched;
    }
    return result.length > 0 ? result : tracks;
}

function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MusicPicker({ onSelect, onClose, selectedTrack }: MusicPickerProps) {
    const [allTracks] = useState<Track[]>(FALLBACK_TRACKS);
    const [tracks, setTracks] = useState<Track[]>(FALLBACK_TRACKS);
    const [isLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Filter locally — instant, no network needed ──────────────────────────
    const applyFilter = useCallback((q: string, cat: string) => {
        setTracks(filterTracks(allTracks, q, cat));
    }, [allTracks]);

    const handleSearch = (value: string) => {
        setQuery(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            applyFilter(value, category);
        }, 300);
    };

    const handleCategory = (cat: string) => {
        setCategory(cat);
        setQuery('');
        applyFilter('', cat);
    };

    // ── Audio playback ────────────────────────────────────────────────────────
    const togglePlay = (track: Track) => {
        if (playingId === track.id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }

        // Stop previous
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        // ⚠️ Do NOT set crossOrigin — archive.org and SoundHelix don't send
        // Access-Control-Allow-Origin headers, so setting crossOrigin causes
        // the browser to block the audio entirely (CORS error).
        const audio = new Audio();
        audio.volume = 0.9;
        audio.preload = 'auto';
        audio.ontimeupdate = () => setCurrentTime(Math.floor(audio.currentTime));
        audio.onloadedmetadata = () => setDuration(Math.floor(audio.duration));
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
            console.warn('[MusicPicker] Audio error:', track.url);
            setPlayingId(null);
        };

        // Set src AFTER attaching events
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
        };
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
                                Royalty Free · {tracks.length} canciones
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
                            placeholder="Buscar canción o artista..."
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
                            <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Cargando...</p>
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
                                        <img
                                            src={track.cover}
                                            alt={track.title}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Now-playing bars */}
                                        {isPlaying ? (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <NowPlayingBars />
                                            </div>
                                        ) : (
                                            /* Small play badge — always visible so mobile users know it's tappable */
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
                                            {track.artist} · {track.album}
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
                            Música royalty-free ·{' '}
                            <a href="https://www.soundhelix.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">SoundHelix</a>
                            {' & '}
                            <a href="https://archive.org" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">Archive.org</a>
                            {' '}· Gratis para uso personal
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
