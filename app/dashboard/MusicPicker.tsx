"use client";

import { useState, useRef, useEffect } from "react";
import { Music, Play, Pause, Check, Search, X, Volume2, Disc } from "lucide-react";
import { RIVAL_MUSIC_LIBRARY, MusicTrack } from "./music-data";
import { clsx } from "clsx";

interface MusicPickerProps {
    onSelect: (track: MusicTrack | null) => void;
    selectedTrackId: string | null;
    variant?: 'button' | 'embedded';
    onClose?: () => void;
}

export default function MusicPicker({ onSelect, selectedTrackId, variant = 'button', onClose }: MusicPickerProps) {
    const [isOpen, setIsOpen] = useState(variant === 'embedded');
    const [searchQuery, setSearchQuery] = useState("");
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Close on escape
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

    // Handle App Visibility and Cleanup
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

    // Prevent scroll when modal is open
    useEffect(() => {
        if (isOpen && variant === 'button') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen, variant]);

    const filteredTracks = RIVAL_MUSIC_LIBRARY.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.genre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePreview = async (e: React.MouseEvent, track: MusicTrack) => {
        e.stopPropagation();
        if (!audioRef.current) return;

        if (previewingId === track.id) {
            audioRef.current.pause();
            setPreviewingId(null);
        } else {
            try {
                // Pause and clear
                audioRef.current.pause();

                // Assign new source and volume
                audioRef.current.src = track.url;
                audioRef.current.load();
                audioRef.current.volume = 1.0;

                // Set explicitly as playsInline
                const playPromise = audioRef.current.play();

                if (playPromise !== undefined) {
                    await playPromise;
                    setPreviewingId(track.id);
                }
            } catch (error) {
                console.error("Playback Failure:", error);
                setPreviewingId(null);
            }
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

    const PickerContent = (isModal: boolean) => (
        <div className={clsx(
            "bg-brand-gray border border-white/10 flex flex-col overflow-hidden transition-all duration-300",
            isModal ? "w-full max-w-lg h-[80vh] sm:h-[600px] rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]" : "w-full rounded-[24px] p-4"
        )}>
            {/* Header */}
            <div className={clsx("flex items-center justify-between p-6 pb-2 relative", !isModal && "p-0 mb-4")}>
                <div className="flex items-center gap-3 pr-12">
                    <div className="p-2 bg-brand-red/10 rounded-xl shrink-0">
                        <Music className="w-5 h-5 text-brand-red" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tighter truncate">Biblioteca Rival</h4>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">Ritmo para tu post</p>
                    </div>
                </div>

                {(isModal || onClose) && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClose) onClose();
                            else setIsOpen(false);
                        }}
                        className="absolute right-4 top-5 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all shrink-0 shadow-xl border border-white/10 active:scale-95 z-50"
                        title="Cerrar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* Search */}
            <div className={clsx("px-6 py-4", !isModal && "p-0 mb-4")}>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-red transition-colors" />
                    <input
                        type="text"
                        placeholder="Busca Phonk, Reggaeton, Rock..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-red/30 focus:bg-black/60 transition-all shadow-inner"
                    />
                </div>
            </div>

            {/* Tracks List */}
            <div className={clsx("flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar", !isModal && "max-h-[450px] p-0 mb-4")}>
                <div className="grid gap-2">
                    {filteredTracks.map(track => (
                        <div
                            key={track.id}
                            onClick={() => handleSelect(track)}
                            className={clsx(
                                "flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                                selectedTrackId === track.id
                                    ? "bg-brand-red/10 border-brand-red/30 shadow-glow-sm"
                                    : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5"
                            )}
                        >
                            <button
                                type="button"
                                onClick={(e) => handlePreview(e, track)}
                                className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative z-10",
                                    previewingId === track.id
                                        ? "bg-brand-red text-white scale-95 shadow-[0_0_15px_rgba(255,49,49,0.5)]"
                                        : selectedTrackId === track.id
                                            ? "bg-brand-red/20 text-brand-red scale-100"
                                            : "bg-black/40 text-brand-red hover:scale-110"
                                )}
                            >
                                {previewingId === track.id ? (
                                    <Pause className="w-5 h-5 fill-current" />
                                ) : (
                                    <Play className="w-5 h-5 fill-current ml-0.5" />
                                )}
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
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-[9px] text-brand-red/70 uppercase font-black tracking-tighter">{track.genre}</span>
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

                            {/* Animated background lines for playing track */}
                            {previewingId === track.id && (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-red/20 overflow-hidden">
                                    <div className="h-full bg-brand-red animate-progress-fast shadow-[0_0_10px_#dc2626]" style={{ width: '100%' }} />
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredTracks.length === 0 && (
                        <div className="py-12 text-center">
                            <Disc className="w-12 h-12 text-gray-700 mx-auto mb-4 animate-spin-slow" />
                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">No se encontraron ritmos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Volume2 className="w-3 h-3 text-gray-500" />
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Sonido Optimizado</span>
                </div>
                <p className="text-[8px] text-gray-600 uppercase font-black tracking-[0.2em]">
                    Rival Fit • Music Library
                </p>
            </div>

            <audio
                ref={audioRef}
                onEnded={() => setPreviewingId(null)}
                style={{ display: 'none' }}
                preload="auto"
                playsInline
                crossOrigin="anonymous"
            />
        </div>
    );

    if (variant === 'embedded') {
        return PickerContent(false);
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={clsx(
                    "p-3 rounded-2xl transition-all flex items-center gap-2 border group",
                    selectedTrack
                        ? "bg-brand-red/10 border-brand-red/30 text-brand-red shadow-glow-sm"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                )}
                title="Añadir Música"
            >
                <Music className={clsx("w-5 h-5", selectedTrack && "animate-pulse")} />
                {selectedTrack && (
                    <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] italic">
                        {selectedTrack.title}
                    </span>
                )}
            </button>

            {/* Centered Modal Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative z-10 w-full flex justify-center animate-in zoom-in-95 duration-300 slide-in-from-bottom-5">
                        {PickerContent(true)}
                    </div>
                </div>
            )}
        </div>
    );
}
