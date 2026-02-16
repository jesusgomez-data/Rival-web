"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Scissors, Play, Pause, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoEditorProps {
    videoSrc: string;
    videoFile: File;
    onSave: (processedFile: File, duration: number) => void;
    onCancel: () => void;
}

export default function VideoEditor({ videoSrc, videoFile, onSave, onCancel }: VideoEditorProps) {
    const [trimRange, setTrimRange] = useState({ start: 0, end: 60 });
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processProgress, setProcessProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");

    const videoRef = useRef<HTMLVideoElement>(null);
    const abortController = useRef<AbortController | null>(null);

    // Initial Load
    useEffect(() => {
        const v = document.createElement('video');
        v.src = videoSrc;
        v.preload = "metadata";
        v.onloadedmetadata = () => {
            setDuration(v.duration);
            setTrimRange({ start: 0, end: Math.min(v.duration, 60) });
        };
    }, [videoSrc]);

    // Playback Loop
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (video.currentTime >= trimRange.end) {
                video.pause();
                video.currentTime = trimRange.start;
                setIsPlaying(false);
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

    const processVideo = async () => {
        setIsProcessing(true);
        setStatusMessage("Preparando...");
        setProcessProgress(0);
        abortController.current = new AbortController();

        const fallbackToOriginal = (reason: string) => {
            console.warn("Fallback triggered:", reason);
            setStatusMessage("Subiendo original...");
            setTimeout(() => {
                onSave(videoFile, duration);
            }, 500);
        };

        try {
            const video = document.createElement('video');
            video.src = videoSrc;
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = "anonymous";

            await video.play(); video.pause();

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) throw new Error("Canvas context failed");

            // @ts-ignore
            const streamFn = canvas.captureStream || canvas.webkitCaptureStream;
            if (!streamFn) return fallbackToOriginal("No capture support");

            const stream = streamFn.call(canvas, 30);
            const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';

            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 2500000
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

            video.currentTime = trimRange.start;
            await new Promise(r => {
                const once = () => { video.removeEventListener('seeked', once); r(true); };
                video.addEventListener('seeked', once);
                setTimeout(once, 1000);
            });

            const recDuration = trimRange.end - trimRange.start;

            // If trim is full video, just upload original
            if (Math.abs(recDuration - duration) < 0.5) {
                return fallbackToOriginal("Full video selected");
            }

            let animationFrame: number;
            const draw = () => {
                if (video.paused || video.ended) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                animationFrame = requestAnimationFrame(draw);
                const progress = ((video.currentTime - trimRange.start) / recDuration) * 100;
                setProcessProgress(Math.min(99, progress));
            };

            recorder.onstop = () => {
                cancelAnimationFrame(animationFrame);
                const blob = new Blob(chunks, { type: mimeType });

                if (blob.size < 1000) {
                    return fallbackToOriginal("Empty recording");
                }

                const newFile = new File([blob], `trimmed.mp4`, { type: mimeType });
                onSave(newFile, recDuration);
                setIsProcessing(false);
            };

            recorder.start();
            video.play();
            draw();
            setStatusMessage("Procesando clip...");

            const checkInt = setInterval(() => {
                if (abortController.current?.signal.aborted) {
                    clearInterval(checkInt);
                    recorder.stop();
                    return;
                }
                if (video.currentTime >= trimRange.end || video.ended) {
                    clearInterval(checkInt);
                    recorder.stop();
                    video.pause();
                }
            }, 100);

        } catch (err) {
            console.error(err);
            fallbackToOriginal("Exception");
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col safe-area-inset font-sans">

            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 bg-[#111] border-b border-white/10 shrink-0 z-50">
                <button
                    onClick={onCancel}
                    className="p-4 -ml-2 text-gray-400 hover:text-white active:scale-95 transition-transform"
                >
                    <X className="w-8 h-8" />
                </button>

                <span className="text-white text-sm font-black uppercase tracking-wider">
                    Recortar
                </span>

                <button
                    onClick={() => {
                        if (duration > 65) {
                            alert(`El video dura ${Math.round(duration)}s. El límite es 60s.`);
                            return;
                        }
                        onSave(videoFile, duration);
                    }}
                    className="text-xs font-bold text-gray-500 uppercase underline decoration-gray-500/50"
                >
                    Omitir
                </button>
            </div>

            {/* Video Player */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">
                <video
                    ref={videoRef}
                    src={videoSrc}
                    className="max-h-full max-w-full object-contain pointer-events-auto"
                    playsInline
                    webkit-playsinline="true"
                    muted={false}
                    onClick={() => {
                        if (videoRef.current) {
                            videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
                        }
                    }}
                />

                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-20 h-20 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                            <Play className="w-10 h-10 fill-white text-white translate-x-1" />
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-[#111] border-t border-white/10 p-6 pb-12 flex flex-col gap-6 shrink-0 z-50">

                {/* Sliders Separados */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Inicio Slider */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                            <span>Inicio</span>
                            <span className="text-white">{trimRange.start.toFixed(1)}s</span>
                        </div>
                        <input
                            type="range" min={0} max={duration || 100} step={0.1}
                            value={trimRange.start}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setTrimRange(p => ({ ...p, start: Math.min(val, p.end - 1) }));
                                if (videoRef.current) {
                                    videoRef.current.pause();
                                    videoRef.current.currentTime = val;
                                }
                            }}
                            className="w-full h-10 bg-transparent cursor-pointer appearance-none"
                            style={{
                                backgroundImage: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(trimRange.start / duration) * 100}%, #333 ${(trimRange.start / duration) * 100}%, #333 100%)`,
                                height: '6px',
                                borderRadius: '999px'
                            }}
                        />
                    </div>

                    {/* Fin Slider */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                            <span>Fin</span>
                            <span className="text-white">{trimRange.end.toFixed(1)}s</span>
                        </div>
                        <input
                            type="range" min={0} max={duration || 100} step={0.1}
                            value={trimRange.end}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setTrimRange(p => ({ ...p, end: Math.max(val, p.start + 1) }));
                                if (videoRef.current) {
                                    videoRef.current.pause();
                                    videoRef.current.currentTime = val;
                                }
                            }}
                            className="w-full h-10 bg-transparent cursor-pointer appearance-none"
                            style={{
                                backgroundImage: `linear-gradient(to right, #333 0%, #333 ${(trimRange.end / duration) * 100}%, #ef4444 ${(trimRange.end / duration) * 100}%, #ef4444 100%)`,
                                height: '6px',
                                borderRadius: '999px'
                            }}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Duración Final:</span>
                    <span className="text-xl font-black italic text-brand-red">{Math.round(trimRange.end - trimRange.start)}s</span>
                </div>

                {/* Main Action */}
                <button
                    onClick={processVideo}
                    disabled={isProcessing}
                    className="w-full bg-brand-red text-white h-14 rounded-xl font-black uppercase tracking-widest text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                    {isProcessing ? "Procesando..." : (
                        <>
                            <Check className="w-6 h-6" />
                            GUARDAR
                        </>
                    )}
                </button>
            </div>

            {/* PROCESSING OVERLAY */}
            <AnimatePresence>
                {isProcessing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[100000] bg-black/95 flex flex-col items-center justify-center p-8 text-center"
                    >
                        <AlertTriangle className="w-12 h-12 text-brand-red mb-4 animate-bounce" />
                        <h3 className="text-white text-xl font-black italic uppercase mb-2">
                            {statusMessage}
                        </h3>
                        <p className="text-gray-400 text-sm mb-8 animate-pulse">
                            No cierres esta ventana
                        </p>

                        <div className="w-full max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden mb-8">
                            <div
                                className="h-full bg-brand-red transition-all duration-300"
                                style={{ width: `${processProgress}%` }}
                            />
                        </div>

                        <button
                            onClick={() => {
                                abortController.current?.abort();
                                onSave(videoFile, duration); // Fallback manual
                            }}
                            className="text-xs text-gray-500 font-bold uppercase underline"
                        >
                            ¿Tarda mucho? Omitir
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
