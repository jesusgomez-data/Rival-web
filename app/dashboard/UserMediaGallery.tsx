"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getUserMedia } from "./community/actions";
import { Play, Volume2, VolumeX, X } from "lucide-react";
import { isImageUrl } from "@/lib/utils";

const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'm4v'];
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'];

function isVideoItem(item: any) {
    const ext = item.media_url?.split('.').pop()?.toLowerCase() || '';
    return (VIDEO_EXTS.includes(ext) || item.media_type === 'video') && !IMAGE_EXTS.includes(ext);
}

function MediaCard({ item, isActive, globalMuted, onMuteChange }: {
    item: any;
    isActive: boolean;
    globalMuted: boolean;
    onMuteChange: (m: boolean) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const isVideo = isVideoItem(item);

    useEffect(() => {
        if (!videoRef.current || !isVideo) return;
        if (isActive) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, [isActive, isVideo]);

    useEffect(() => {
        if (!videoRef.current || !isVideo || !isActive) return;
        const interval = setInterval(() => {
            const v = videoRef.current;
            if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
        }, 100);
        return () => clearInterval(interval);
    }, [isVideo, isActive]);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
        else { videoRef.current.pause(); setIsPlaying(false); }
    };

    return (
        <div className="relative w-full h-screen snap-start snap-always flex-shrink-0 bg-black overflow-hidden">
            {isVideo ? (
                <>
                    <video
                        ref={videoRef}
                        key={item.uniqueId || item.id}
                        src={item.media_url}
                        className="absolute inset-0 w-full h-full object-cover"
                        loop
                        playsInline
                        muted={globalMuted}
                        onClick={togglePlay}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />
                    {/* Progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-10">
                        <div className="h-full bg-brand-red" style={{ width: `${progress}%`, transition: 'width 0.1s linear' }} />
                    </div>
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
                    {/* Play/pause indicator */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/50 backdrop-blur-sm p-6 rounded-full">
                                <Play className="w-16 h-16 text-white fill-white" />
                            </div>
                        </div>
                    )}
                    {/* Mute button - right side like VideoFeed */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onMuteChange(!globalMuted); }}
                        className="absolute bottom-8 right-4 z-20 p-3 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40"
                    >
                        {globalMuted ? <VolumeX className="w-7 h-7 text-white" /> : <Volume2 className="w-7 h-7 text-white" />}
                    </button>
                </>
            ) : (
                <>
                    <img
                        src={item.media_url}
                        alt="Media"
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30 pointer-events-none" />
                </>
            )}
        </div>
    );
}

export default function UserMediaGallery({ userId, limit }: { userId: string; limit?: number }) {
    const [mediaItems, setMediaItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [globalMuted, setGlobalMuted] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) document.querySelectorAll('video').forEach(v => v.pause());
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, []);

    useEffect(() => {
        if (!userId) return;
        getUserMedia(userId).then((data) => {
            const flattened: any[] = [];
            (data || []).forEach((item: any) => {
                let url = item.media_url;
                if (url && typeof url === 'string' && (url.trim().startsWith('{') || url.trim().startsWith('['))) {
                    try {
                        const parsed = JSON.parse(url.trim());
                        if (Array.isArray(parsed)) {
                            if (item.media_type !== 'class_result') {
                                parsed.forEach((subUrl: string, idx: number) => {
                                    if (typeof subUrl === 'string') {
                                        flattened.push({
                                            ...item,
                                            uniqueId: `${item.id}-${idx}`,
                                            media_url: subUrl
                                        });
                                    }
                                });
                            }
                        } else {
                            const resolvedUrl = parsed.image || parsed.backgroundImage || parsed.media_url || parsed.mediaUrl || parsed.url;
                            if (resolvedUrl) {
                                flattened.push({
                                    ...item,
                                    uniqueId: item.id,
                                    media_url: resolvedUrl
                                });
                            }
                        }
                    } catch (e) {
                        console.warn("[UserMediaGallery] Error parsing JSON media:", e);
                    }
                } else if (url) {
                    flattened.push({
                        ...item,
                        uniqueId: item.id,
                        media_url: url
                    });
                }
            });

            const valid = flattened.filter((item: any) => {
                return item.media_type !== 'class_result' && isImageUrl(item.media_url);
            });
            setMediaItems(valid);
            setIsLoading(false);
        });
    }, [userId]);

    // Scroll to the tapped item when viewer opens
    useEffect(() => {
        if (lightboxIndex !== null && scrollContainerRef.current) {
            setActiveIndex(lightboxIndex);
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                scrollContainerRef.current?.scrollTo({ top: lightboxIndex * window.innerHeight });
            });
        }
    }, [lightboxIndex]);

    // Detect active card via scroll (same as VideoFeed)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const idx = Math.round(container.scrollTop / window.innerHeight);
            if (idx !== activeIndex && idx >= 0 && idx < mediaItems.length) {
                setActiveIndex(idx);
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [activeIndex, mediaItems.length]);

    // Keyboard nav
    useEffect(() => {
        if (lightboxIndex === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setLightboxIndex(null); return; }
            const dir = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1
                : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
            if (!dir) return;
            const next = activeIndex + dir;
            if (next >= 0 && next < mediaItems.length) {
                scrollContainerRef.current?.scrollTo({ top: next * window.innerHeight, behavior: 'smooth' });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [lightboxIndex, activeIndex, mediaItems.length]);

    // Lock body scroll while viewer is open
    useEffect(() => {
        document.body.style.overflow = lightboxIndex !== null ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [lightboxIndex]);

    if (isLoading) return <div className="p-6 bg-brand-gray border border-white/5 rounded-3xl animate-pulse h-40" />;
    if (mediaItems.length === 0) return null;

    const displayItems = limit ? mediaItems.slice(0, limit) : mediaItems;

    return (
        <>
            {/* Grid thumbnail section */}
            <div className="p-6 bg-brand-gray border border-white/5 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-white font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                        <span className="w-1 h-3 bg-brand-red rounded-full" />
                        MEDIA GALLERY
                    </h2>
                    <span className="text-xs text-gray-500">{mediaItems.length} items</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {displayItems.map((item, index) => {
                        const isVideo = isVideoItem(item);
                        return (
                            <div
                                key={item.uniqueId || item.id}
                                className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-white/5 group"
                                onClick={() => setLightboxIndex(index)}
                            >
                                {isVideo ? (
                                    <>
                                        {item.cover_url || item.thumbnail_url ? (
                                            <img src={item.cover_url || item.thumbnail_url} alt="Video thumbnail" className="w-full h-full object-cover" />
                                        ) : (
                                            <video src={`${item.media_url}#t=0.5`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                        )}
                                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                                            <div className="w-9 h-9 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <Image src={item.media_url} alt="User media" fill className="object-cover" sizes="(max-width: 768px) 33vw, 200px" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {limit && mediaItems.length > limit && (
                    <button className="w-full text-center text-xs text-gray-400 hover:text-white mt-2" onClick={() => setLightboxIndex(limit)}>
                        Ver todos ({mediaItems.length})
                    </button>
                )}
            </div>

            {/* VideoFeed-style fullscreen viewer */}
            {lightboxIndex !== null && (
                <div className="fixed inset-0 bg-black" style={{ zIndex: 200 }}>
                    {/* Close */}
                    <button
                        onClick={() => setLightboxIndex(null)}
                        className="absolute right-4 p-2 rounded-full bg-black/50 text-white/80 hover:text-white transition-colors"
                        style={{ zIndex: 300, top: 'max(1rem, env(safe-area-inset-top))' }}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Counter */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 text-white/60 text-xs font-bold tracking-widest"
                        style={{ zIndex: 300, top: 'max(1rem, env(safe-area-inset-top))' }}
                    >
                        {activeIndex + 1} / {mediaItems.length}
                    </div>

                    {/* Snap-scroll reel container — same as VideoFeed */}
                    <div
                        ref={scrollContainerRef}
                        className="w-full h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                    >
                        {mediaItems.map((item, index) => (
                            <MediaCard
                                key={item.uniqueId || item.id}
                                item={item}
                                isActive={index === activeIndex}
                                globalMuted={globalMuted}
                                onMuteChange={setGlobalMuted}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
