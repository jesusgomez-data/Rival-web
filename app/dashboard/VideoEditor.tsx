"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Play, Pause, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoEditorProps {
    videoSrc: string;
    videoFile: File;
    onSave: (file: File, range: { start: number, end: number }) => void;
    onCancel: () => void;
}

export default function VideoEditor({ videoSrc, videoFile, onSave, onCancel }: VideoEditorProps) {
    const [trimRange, setTrimRange] = useState({ start: 0, end: 30 });
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [thumbnails, setThumbnails] = useState<string[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const PIXELS_PER_SECOND = 40;
    const WINDOW_DURATION = 30;
    const WINDOW_WIDTH = 300;
    const THUMBNAIL_COUNT = 15;

    useEffect(() => {
        const v = document.createElement('video');
        v.src = videoSrc;
        v.preload = "metadata";
        v.crossOrigin = "anonymous";

        v.onloadedmetadata = async () => {
            const videoDuration = v.duration;
            setDuration(videoDuration);
            setTrimRange({ start: 0, end: Math.min(videoDuration, WINDOW_DURATION) });
            generateThumbnails(v, videoDuration);
        };
    }, [videoSrc]);

    const generateThumbnails = async (video: HTMLVideoElement, totalDuration: number) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = 80; canvas.height = 140;

        const thumbs: string[] = [];
        const interval = totalDuration / THUMBNAIL_COUNT;

        for (let i = 0; i < THUMBNAIL_COUNT; i++) {
            const time = i * interval;
            video.currentTime = time;
            await new Promise((resolve) => {
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
                    resolve(true);
                };
                video.addEventListener('seeked', onSeeked);
                setTimeout(resolve, 500);
            });
        }
        setThumbnails(thumbs);
    };

    const handleScroll = () => {
        if (!duration || !scrollRef.current) return;
        const scrollLeft = scrollRef.current.scrollLeft;
        const newStart = scrollLeft / PIXELS_PER_SECOND;
        const actualStart = Math.max(0, Math.min(newStart, duration - Math.min(duration, WINDOW_DURATION)));
        const actualEnd = Math.min(actualStart + WINDOW_DURATION, duration);
        setTrimRange({ start: actualStart, end: actualEnd });
        if (videoRef.current) videoRef.current.currentTime = actualStart;
    };

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const handleTimeUpdate = () => {
            if (video.currentTime >= trimRange.end || video.currentTime < trimRange.start - 0.5) {
                video.currentTime = trimRange.start;
                if (!video.paused) video.play().catch(() => { });
            }
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [trimRange]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col safe-area-inset font-sans select-none overflow-hidden h-full">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 shrink-0 z-50">
                <button onClick={onCancel} className="p-2 -ml-2 text-white/90 hover:text-white"><X className="w-7 h-7" /></button>
                <div className="flex flex-col items-center">
                    <span className="text-white text-[11px] font-black uppercase tracking-[0.2em] italic">Story Editor</span>
                    <span className="text-brand-red text-[10px] font-bold tracking-widest">{formatTime(trimRange.start)} — {formatTime(trimRange.end)}</span>
                </div>
                <button
                    onClick={() => onSave(videoFile, trimRange)}
                    className="text-brand-red font-black text-xs uppercase tracking-widest px-6 py-2 bg-white/10 rounded-full border border-brand-red/20 active:scale-95 transition-all"
                >
                    Siguiente
                </button>
            </div>

            {/* Video Preview */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative px-4">
                <video
                    ref={videoRef} src={videoSrc} className="max-h-[85%] max-w-full rounded-2xl object-contain shadow-2xl border border-white/5"
                    playsInline autoPlay muted={isMuted}
                    onLoadedData={(e) => { e.currentTarget.volume = 1; }}
                    onClick={() => { if (videoRef.current) videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); }}
                />
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
                    <div className="flex justify-end pt-2">
                        <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-4 bg-black/40 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto active:scale-90 shadow-xl transition-all">
                            {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-[#050505] p-6 pb-14 shrink-0 border-t border-white/10 relative">
                <div className="mb-4 flex items-center justify-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desliza para elegir el momento</span>
                </div>
                <div className="relative h-20 flex items-center justify-center">
                    <div className="absolute h-full z-30 pointer-events-none rounded-xl border-4 border-brand-red shadow-[0_0_20px_rgba(239,68,68,0.4)] bg-brand-red/5" style={{ width: `${WINDOW_WIDTH}px` }}>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-brand-red px-2 py-0.5 rounded-full uppercase tracking-tighter">30s</div>
                    </div>
                    <div ref={scrollRef} onScroll={handleScroll} className="w-full h-full overflow-x-auto overflow-y-hidden flex items-center scroll-smooth touch-pan-x no-scrollbar">
                        <div className="shrink-0 h-full" style={{ width: `calc(50% - ${WINDOW_WIDTH / 2}px)` }} />
                        <div className="h-16 relative flex items-center bg-white/5 border-y border-white/10 shrink-0 overflow-hidden rounded-md" style={{ width: `${duration * PIXELS_PER_SECOND}px` }}>
                            <div className="absolute inset-0 flex">
                                {thumbnails.length > 0 ? (
                                    thumbnails.map((src, i) => (<img key={i} src={src} className="h-full flex-1 object-cover opacity-60 border-r border-black/20" alt="" />))
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse"><div className="w-full h-px bg-white/10" /></div>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 h-full" style={{ width: `calc(50% - ${WINDOW_WIDTH / 2}px)` }} />
                    </div>
                </div>
                <div className="flex justify-between items-center mt-6 px-1">
                    <div className="flex flex-col flex-1"><span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Inicio</span><span className="text-xs font-black text-white">{formatTime(trimRange.start)}</span></div>
                    <div className="flex flex-col items-center flex-1"><span className="text-sm font-black italic text-brand-red">{(trimRange.end - trimRange.start).toFixed(1)}s</span></div>
                    <div className="flex flex-col items-end flex-1"><span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Fin</span><span className="text-xs font-black text-white">{formatTime(trimRange.end)}</span></div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
