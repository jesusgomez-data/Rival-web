"use client";

import { useState, useRef } from "react";
import { Music, Play, Pause, Check, Search, X } from "lucide-react";
import { RIVAL_MUSIC_LIBRARY, MusicTrack } from "./music-data";
import { clsx } from "clsx";

interface MusicPickerProps {
    onSelect: (track: MusicTrack | null) => void;
    selectedTrackId: string | null;
    variant?: 'button' | 'embedded';
}

export default function MusicPicker({ onSelect, selectedTrackId, variant = 'button', placement = 'top' }: MusicPickerProps & { placement?: 'top' | 'bottom' }) {
    const [isOpen, setIsOpen] = useState(variant === 'embedded');
    const [searchQuery, setSearchQuery] = useState("");
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const filteredTracks = RIVAL_MUSIC_LIBRARY.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePreview = (e: React.MouseEvent, track: MusicTrack) => {
        e.stopPropagation();
        if (!audioRef.current) return;

        if (previewingId === track.id) {
            audioRef.current.pause();
            setPreviewingId(null);
        } else {
            // Stop any existing playback
            audioRef.current.pause();
            audioRef.current.src = track.url;
            audioRef.current.currentTime = 0;
            audioRef.current.muted = false;
            audioRef.current.volume = 1.0;

            audioRef.current.play().then(() => {
                setPreviewingId(track.id);
            }).catch(error => {
                console.error("Playback failed for:", track.title, error);
            });
        }
    };

    const handleSelect = (track: MusicTrack) => {
        if (selectedTrackId === track.id) {
            onSelect(null);
        } else {
            onSelect(track);
        }
        if (variant === 'button') setIsOpen(false);
        if (audioRef.current) {
            audioRef.current.pause();
            setPreviewingId(null);
        }
    };

    const selectedTrack = RIVAL_MUSIC_LIBRARY.find(t => t.id === selectedTrackId);

    if (variant === 'embedded') {
        return (
            <div className="w-full bg-brand-gray border border-white/10 rounded-[24px] shadow-2xl p-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                        <Music className="w-3 h-3 text-brand-red" />
                        Biblioteca Rival
                    </h4>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar Phonk, Rock, EDM..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-brand-red/50 transition-colors"
                    />
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredTracks.map(track => (
                        <div
                            key={track.id}
                            onClick={() => handleSelect(track)}
                            className={clsx(
                                "flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group",
                                selectedTrackId === track.id
                                    ? "bg-brand-red/10 border-brand-red/20"
                                    : "bg-white/5 border-transparent hover:bg-white/10"
                            )}
                        >
                            <button
                                onClick={(e) => handlePreview(e, track)}
                                className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-brand-red hover:scale-110 transition-transform"
                            >
                                {previewingId === track.id ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                            </button>

                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-white truncate leading-none mb-1">{track.title}</p>
                                <p className="text-[9px] text-gray-500 uppercase font-black tracking-tighter truncate">{track.artist} • {track.genre}</p>
                            </div>

                            {selectedTrackId === track.id && (
                                <Check className="w-4 h-4 text-brand-red shrink-0" />
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-[8px] text-gray-600 mt-4 text-center uppercase font-bold tracking-widest">
                    Música de código abierto • Rival Arena
                </p>
                <audio
                    ref={audioRef}
                    onEnded={() => setPreviewingId(null)}
                    onError={(e) => console.error("Audio Load Error in MusicPicker:", e)}
                    style={{ width: '1px', height: '1px', opacity: 0.01, position: 'absolute', pointerEvents: 'none' }}
                />
            </div>
        )
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "p-2 rounded-xl transition-all flex items-center gap-2 border",
                    selectedTrack
                        ? "bg-brand-red/10 border-brand-red/30 text-brand-red shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                )}
                title="Añadir Música"
            >
                <Music className={clsx("w-5 h-5", selectedTrack && "animate-pulse")} />
                {selectedTrack && (
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline truncate max-w-[80px]">
                        {selectedTrack.title}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={clsx(
                    "absolute left-0 w-72 md:w-80 bg-brand-gray border border-white/10 rounded-[24px] shadow-2xl p-4 z-[200] animate-in duration-200",
                    placement === 'top' ? "bottom-12 slide-in-from-bottom-2" : "top-12 slide-in-from-top-2"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                            <Music className="w-3 h-3 text-brand-red" />
                            Biblioteca Rival
                        </h4>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar Phonk, Rock, EDM..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-brand-red/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {filteredTracks.map(track => (
                            <div
                                key={track.id}
                                onClick={() => handleSelect(track)}
                                className={clsx(
                                    "flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group",
                                    selectedTrackId === track.id
                                        ? "bg-brand-red/10 border-brand-red/20"
                                        : "bg-white/5 border-transparent hover:bg-white/10"
                                )}
                            >
                                <button
                                    onClick={(e) => handlePreview(e, track)}
                                    className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-brand-red hover:scale-110 transition-transform"
                                >
                                    {previewingId === track.id ? (
                                        <Pause className="w-4 h-4 fill-current" />
                                    ) : (
                                        <Play className="w-4 h-4 fill-current ml-0.5" />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-white truncate leading-none mb-1">{track.title}</p>
                                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-tighter truncate">{track.artist} • {track.genre}</p>
                                </div>

                                {selectedTrackId === track.id && (
                                    <Check className="w-4 h-4 text-brand-red shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    <p className="text-[8px] text-gray-600 mt-4 text-center uppercase font-bold tracking-widest">
                        Música de código abierto • Rival Arena
                    </p>
                </div>
            )}
            <audio
                ref={audioRef}
                onEnded={() => setPreviewingId(null)}
                onError={(e) => console.error("Audio Load Error in MusicPicker (Button):", e)}
                style={{ width: '1px', height: '1px', opacity: 0.01, position: 'absolute', pointerEvents: 'none' }}
            />
        </div>
    );
}
