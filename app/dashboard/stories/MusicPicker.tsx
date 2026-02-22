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
    license: string;
    tags: string[];
}

interface MusicPickerProps {
    onSelect: (track: { url: string; title: string; artist: string; cover: string } | null) => void;
    onClose: () => void;
    selectedTrack?: { url: string; title: string; artist: string; cover?: string } | null;
}

const CATEGORIES = [
    { id: '', label: '🔥 Popular', emoji: '🔥' },
    { id: 'workout', label: '💪 Workout', emoji: '💪' },
    { id: 'electronic', label: '⚡ Electrónica', emoji: '⚡' },
    { id: 'hiphop', label: '🎤 Hip-Hop', emoji: '🎤' },
    { id: 'rock', label: '🎸 Rock', emoji: '🎸' },
    { id: 'chill', label: '😌 Chill', emoji: '😌' },
    { id: 'latin', label: '💃 Latin', emoji: '💃' },
];

// ─── Guaranteed offline fallback tracks (SoundHelix + Bensound — verified CDN) ──
const FALLBACK_TRACKS: Track[] = [
    { id: 'w1', title: 'Ominous Drive', artist: 'SoundHelix', album: 'Energy', duration: 183, category: 'workout', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&q=80', license: 'Free', tags: ['workout', 'energetic'] } as any,
    { id: 'w2', title: 'Epic Cinematic', artist: 'SoundHelix', album: 'Epic', duration: 210, category: 'workout', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', cover: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&q=80', license: 'Free', tags: ['workout', 'epic'] } as any,
    { id: 'w3', title: 'Power Drive', artist: 'SoundHelix', album: 'Power', duration: 195, category: 'workout', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', cover: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=200&q=80', license: 'Free', tags: ['workout', 'drive'] } as any,
    { id: 'w4', title: 'Iron Beat', artist: 'SoundHelix', album: 'Sport', duration: 225, category: 'workout', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', cover: 'https://images.unsplash.com/photo-1526401485004-46910ecc8e2d?w=200&q=80', license: 'Free', tags: ['workout', 'beat'] } as any,
    { id: 'w5', title: 'Grind Session', artist: 'SoundHelix', album: 'Sport', duration: 185, category: 'workout', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', cover: 'https://images.unsplash.com/photo-1601422407692-ad6a68a27e4f?w=200&q=80', license: 'Free', tags: ['workout', 'grind'] } as any,
    { id: 'e1', title: 'Neon Pulse', artist: 'SoundHelix', album: 'Electronic', duration: 198, category: 'electronic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', cover: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80', license: 'Free', tags: ['electronic', 'dance'] } as any,
    { id: 'e2', title: 'Digital Horizon', artist: 'SoundHelix', album: 'EDM', duration: 220, category: 'electronic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', cover: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=200&q=80', license: 'Free', tags: ['electronic', 'club'] } as any,
    { id: 'e3', title: 'Bass Drop', artist: 'SoundHelix', album: 'Bass House', duration: 215, category: 'electronic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80', license: 'Free', tags: ['electronic', 'bass'] } as any,
    { id: 'e4', title: 'Techno Grid', artist: 'SoundHelix', album: 'Techno', duration: 240, category: 'electronic', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80', license: 'Free', tags: ['electronic', 'techno'] } as any,
    { id: 'h1', title: 'Street Anthem', artist: 'SoundHelix', album: 'Hip Hop', duration: 188, category: 'hiphop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', cover: 'https://images.unsplash.com/photo-1547355253-ff0740f859b4?w=200&q=80', license: 'Free', tags: ['hiphop', 'rap'] } as any,
    { id: 'h2', title: 'Trap Vibes', artist: 'SoundHelix', album: 'Trap', duration: 195, category: 'hiphop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', cover: 'https://images.unsplash.com/photo-1499415479124-43c32433a620?w=200&q=80', license: 'Free', tags: ['hiphop', 'trap'] } as any,
    { id: 'h3', title: 'City Hustle', artist: 'SoundHelix', album: 'Urban', duration: 200, category: 'hiphop', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', cover: 'https://images.unsplash.com/photo-1540039155733-5bb30b4f5e62?w=200&q=80', license: 'Free', tags: ['hiphop', 'urban'] } as any,
    { id: 'r1', title: 'Thunder Rise', artist: 'SoundHelix', album: 'Rock', duration: 205, category: 'rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200&q=80', license: 'Free', tags: ['rock', 'guitar'] } as any,
    { id: 'r2', title: 'Electric Sky', artist: 'SoundHelix', album: 'Rock Mix', duration: 215, category: 'rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', cover: 'https://images.unsplash.com/photo-1511735111819-9a3edb58b7e0?w=200&q=80', license: 'Free', tags: ['rock', 'electric'] } as any,
    { id: 'r3', title: 'Metal Storm', artist: 'SoundHelix', album: 'Hard Rock', duration: 230, category: 'rock', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', cover: 'https://images.unsplash.com/photo-1501386761578-eaa54b5e66ec?w=200&q=80', license: 'Free', tags: ['rock', 'metal'] } as any,
    { id: 'c1', title: 'Acoustic Breeze', artist: 'Bensound', album: 'Acoustic', duration: 210, category: 'chill', url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3', previewUrl: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3', cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=80', license: 'Free', tags: ['chill', 'acoustic'] } as any,
    { id: 'c2', title: 'Creative Minds', artist: 'Bensound', album: 'Ambient', duration: 215, category: 'chill', url: 'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3', previewUrl: 'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3', cover: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=200&q=80', license: 'Free', tags: ['chill', 'ambient'] } as any,
    { id: 'c3', title: 'Little Idea', artist: 'Bensound', album: 'Indie', duration: 198, category: 'chill', url: 'https://www.bensound.com/bensound-music/bensound-littleidea.mp3', previewUrl: 'https://www.bensound.com/bensound-music/bensound-littleidea.mp3', cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&q=80', license: 'Free', tags: ['chill', 'indie'] } as any,
    { id: 'c4', title: 'Sweet', artist: 'Bensound', album: 'Chill', duration: 202, category: 'chill', url: 'https://www.bensound.com/bensound-music/bensound-sweet.mp3', previewUrl: 'https://www.bensound.com/bensound-music/bensound-sweet.mp3', cover: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&q=80', license: 'Free', tags: ['chill', 'sweet'] } as any,
    { id: 'l1', title: 'Happy Rock', artist: 'Bensound', album: 'Upbeat', duration: 205, category: 'latin', url: 'https://www.bensound.com/bensound-music/bensound-happyrock.mp3', previewUrl: 'https://www.bensound.com/bensound-music/bensound-happyrock.mp3', cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&q=80', license: 'Free', tags: ['latin', 'rock', 'happy'] } as any,
    { id: 'l2', title: 'Ukulele', artist: 'Bensound', album: 'Tropical', duration: 195, category: 'latin', url: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3', previewUrl: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3', cover: 'https://images.unsplash.com/photo-1547355253-ff0740f859b4?w=200&q=80', license: 'Free', tags: ['latin', 'tropical', 'ukulele'] } as any,
    { id: 'l3', title: 'Tenderness', artist: 'Bensound', album: 'Latin', duration: 212, category: 'latin', url: 'https://www.bensound.com/bensound-music/bensound-tenderness.mp3', previewUrl: 'https://www.bensound.com/bensound-music/bensound-tenderness.mp3', cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80', license: 'Free', tags: ['latin', 'romantic'] } as any,
];

function filterTracks(tracks: Track[], query: string, category: string): Track[] {
    let result = [...tracks];
    if (category) result = result.filter((t: any) => t.category === category);
    if (query) {
        const q = query.toLowerCase();
        result = result.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.tags.some((tag: string) => tag.includes(q))
        );
    }
    return result.length > 0 ? result : tracks;
}

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

    // ── Load tracks: try API first, always fall back to local data ──────────
    const fetchTracks = useCallback(async (q: string, cat: string) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (cat) params.set('category', cat);
            const res = await fetch(`/api/music?${params.toString()}`, { signal: AbortSignal.timeout(4000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data.tracks || data.tracks.length === 0) throw new Error('empty');
            setTracks(data.tracks);
        } catch {
            // API failed — use local fallback (always has data)
            setTracks(filterTracks(FALLBACK_TRACKS, q, cat));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTracks('', '');
    }, [fetchTracks]);

    const handleSearch = (value: string) => {
        setQuery(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            fetchTracks(value, category);
        }, 400);
    };

    const handleCategory = (cat: string) => {
        setCategory(cat);
        setQuery('');
        fetchTracks('', cat);
    };

    const togglePlay = (track: Track) => {
        if (playingId === track.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            const audio = new Audio(track.previewUrl || track.url);
            audio.volume = 0.8;
            audio.crossOrigin = 'anonymous';
            audio.ontimeupdate = () => setCurrentTime(Math.floor(audio.currentTime));
            audio.onloadedmetadata = () => setDuration(Math.floor(audio.duration));
            audio.onended = () => setPlayingId(null);
            audio.onerror = () => {
                // Audio failed to load — just mark it as stopped
                setPlayingId(null);
            };
            audio.play().catch(() => setPlayingId(null));
            audioRef.current = audio;
            setPlayingId(track.id);
            setCurrentTime(0);
        }
    };

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
        onSelect({
            url: track.url,
            title: track.title,
            artist: track.artist,
            cover: track.cover,
        });
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
                        <div className="w-8 h-8 rounded-xl bg-brand-red/10 flex items-center justify-center">
                            <Music2 className="w-4 h-4 text-brand-red" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">
                                Música
                            </h3>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                Royalty Free · {tracks.length} canciones
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
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
                            onChange={(e) => handleSearch(e.target.value)}
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
                        {CATEGORIES.map((cat) => (
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

                {/* Active Track Banner */}
                {selectedTrack && (
                    <div className="mx-5 mb-3 bg-brand-red/10 border border-brand-red/20 rounded-2xl p-3 flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-brand-red/20 flex items-center justify-center">
                            {selectedTrack.cover ? (
                                <img src={selectedTrack.cover} alt="cover" className="w-full h-full object-cover" />
                            ) : (
                                <Music2 className="w-5 h-5 text-brand-red" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-white truncate">{selectedTrack.title}</p>
                            <p className="text-[10px] text-brand-red font-bold uppercase tracking-widest truncate">{selectedTrack.artist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                            <button
                                onClick={handleRemove}
                                className="text-[10px] font-black text-gray-400 hover:text-brand-red uppercase tracking-widest transition-colors"
                            >
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
                            <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Cargando música...</p>
                        </div>
                    ) : tracks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <MicVocal className="w-10 h-10 text-gray-700" />
                            <p className="text-[11px] text-gray-500 font-black uppercase tracking-widest text-center">
                                No se encontró.<br />Prueba otra búsqueda.
                            </p>
                        </div>
                    ) : (
                        tracks.map((track) => {
                            const isPlaying = playingId === track.id;
                            const isSelected = selectedTrack?.url === track.url;

                            return (
                                <div
                                    key={track.id}
                                    className={clsx(
                                        'flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group',
                                        isSelected
                                            ? 'bg-brand-red/10 border-brand-red/30'
                                            : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                                    )}
                                >
                                    {/* Cover */}
                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5">
                                        {track.cover ? (
                                            <img
                                                src={track.cover}
                                                alt={track.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-brand-red/10">
                                                <Music2 className="w-5 h-5 text-brand-red/50" />
                                            </div>
                                        )}

                                        {/* Play button overlay */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); togglePlay(track); }}
                                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-5 h-5 text-white" />
                                            ) : (
                                                <Play className="w-5 h-5 text-white fill-white" />
                                            )}
                                        </button>

                                        {/* Now playing bars */}
                                        {isPlaying && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <NowPlayingBars />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0" onClick={() => handleSelect(track)}>
                                        <p className={clsx(
                                            'text-sm font-black truncate leading-tight',
                                            isSelected ? 'text-brand-red' : 'text-white'
                                        )}>
                                            {track.title}
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-bold truncate uppercase tracking-wide">
                                            {track.artist}
                                        </p>
                                        {isPlaying && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brand-red transition-all"
                                                        style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                                                    />
                                                </div>
                                                <span className="text-[9px] text-gray-500 font-mono">
                                                    {formatDuration(currentTime)}
                                                </span>
                                            </div>
                                        )}
                                        {!isPlaying && (
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
                                                : 'bg-white/5 border-white/10 hover:border-white/30 group-hover:border-white/20'
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
                            <a href="https://www.bensound.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">Bensound</a>
                            {' & '}
                            <a href="https://www.soundhelix.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">SoundHelix</a>
                            {' '}· Gratis para uso personal
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Animated bars indicator while song plays
function NowPlayingBars() {
    return (
        <div className="flex items-end gap-[2px] h-5">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="w-[3px] bg-brand-red rounded-full"
                    style={{
                        animation: `musicBar 0.8s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.15}s`,
                        height: '100%',
                    }}
                />
            ))}
            <style>{`
                @keyframes musicBar {
                    from { transform: scaleY(0.2); }
                    to { transform: scaleY(1); }
                }
            `}</style>
        </div>
    );
}
