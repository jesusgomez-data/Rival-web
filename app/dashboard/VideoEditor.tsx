"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Crop, Maximize, Scissors, Loader2, Play, Pause, Square, RectangleVertical, RectangleHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoEditorProps {
    videoSrc: string;
    videoFile: File;
    onSave: (processedFile: File, duration: number) => void;
    onCancel: () => void;
}

export default function VideoEditor({ videoSrc, videoFile, onSave, onCancel }: VideoEditorProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState<number>(9 / 16);
    const [aspectName, setAspectName] = useState<'9:16' | '1:1' | '4:5' | 'original'>('9:16');
    const [trimRange, setTrimRange] = useState({ start: 0, end: 15 }); // Max 60s
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processProgress, setProcessProgress] = useState(0);
    const [processError, setProcessError] = useState<string | null>(null);
    const [thumbnails, setThumbnails] = useState<string[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);
    const cropperVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pixelsRef = useRef<any>(null);

    // Load video metadata
    useEffect(() => {
        const v = document.createElement('video');
        v.src = videoSrc;
        v.onloadedmetadata = () => {
            setDuration(v.duration);
            const initialEnd = Math.min(v.duration, 60);
            setTrimRange({ start: 0, end: initialEnd });
            generateThumbnails(v.duration);
        };
    }, [videoSrc]);

    const generateThumbnails = async (videoDuration: number) => {
        const v = document.createElement('video');
        v.src = videoSrc;
        v.muted = true;
        v.playsInline = true;
        await v.play(); v.pause(); // Initialize

        const count = 8;
        const thumbs: string[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;

        for (let i = 0; i < count; i++) {
            const time = (i / count) * videoDuration;
            v.currentTime = time;
            await new Promise(r => {
                const onSeeked = () => { v.removeEventListener('seeked', onSeeked); r(true); };
                v.addEventListener('seeked', onSeeked);
                setTimeout(onSeeked, 1000); // safety
            });
            if (ctx) {
                ctx.drawImage(v, 0, 0, 100, 100);
                thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
            }
        }
        setThumbnails(thumbs);
    };

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        pixelsRef.current = croppedAreaPixels;
    }, []);

    const processVideo = async () => {
        if (!videoFile || !pixelsRef.current) return;

        setIsProcessing(true);
        setProcessProgress(0);
        setProcessError(null);

        const video = document.createElement('video');
        video.src = videoSrc;
        video.muted = true;
        video.playsInline = true;

        try {
            await video.play(); video.pause(); // Warm up

            video.currentTime = trimRange.start;
            await new Promise(r => {
                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    clearTimeout(timeout);
                    r(true);
                };
                const timeout = setTimeout(() => {
                    video.removeEventListener('seeked', onSeeked);
                    // Force resolve if stuck
                    r(true);
                }, 3000); // 3s max wait
                video.addEventListener('seeked', onSeeked);
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size based on crop
            canvas.width = pixelsRef.current.width;
            canvas.height = pixelsRef.current.height;

            const streamFn = (canvas as any).captureStream || (canvas as any).webkitCaptureStream;
            if (!streamFn) throw new Error("Browser doesn't support video capture");

            const stream = streamFn.call(canvas, 30);
            const recorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm',
                videoBitsPerSecond: 2500000
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);

            const recDuration = trimRange.end - trimRange.start;
            let frameReq: number;

            const draw = () => {
                if (ctx && video.readyState >= 2) {
                    ctx.drawImage(
                        video,
                        pixelsRef.current.x,
                        pixelsRef.current.y,
                        pixelsRef.current.width,
                        pixelsRef.current.height,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );
                    frameReq = requestAnimationFrame(draw);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: recorder.mimeType });
                if (blob.size < 2000) {
                    setProcessError("Error de captura");
                } else {
                    const file = new File([blob], "trimmed.mp4", { type: recorder.mimeType });
                    onSave(file, recDuration);
                }
                setIsProcessing(false);
            };

            recorder.start();
            await video.play();
            draw();

            const startTime = Date.now();
            const checkEnd = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                setProcessProgress(Math.min(99, (elapsed / recDuration) * 100));

                if (elapsed >= recDuration || video.currentTime >= trimRange.end) {
                    clearInterval(checkEnd);
                    cancelAnimationFrame(frameReq);
                    if (recorder.state === 'recording') recorder.stop();
                    video.pause();
                }
            }, 100);

        } catch (err: any) {
            setProcessError(err.message);
            setIsProcessing(false);
        }
    };

    const handleTrimChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'start' | 'end') => {
        const val = parseFloat(e.target.value);
        if (side === 'start') {
            setTrimRange(prev => ({ ...prev, start: Math.min(val, prev.end - 1) }));
            if (videoRef.current) videoRef.current.currentTime = val;
        } else {
            setTrimRange(prev => ({ ...prev, end: Math.max(val, prev.start + 1) }));
            if (videoRef.current) videoRef.current.currentTime = val;
        }
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            if (videoRef.current.currentTime >= trimRange.end) {
                videoRef.current.currentTime = trimRange.start;
            }
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden">
            <div className="w-full h-full bg-brand-gray/95 flex flex-col relative overflow-hidden">

                {/* Header */}
                <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/5 bg-black/20 z-[200] relative">
                    <button onClick={onCancel} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <h2 className="text-white font-black italic uppercase tracking-widest text-sm md:text-base hidden sm:block">Editar Video</h2>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (duration > 65) {
                                    alert(`El video dura ${Math.round(duration)}s. El límite es 60s. Usa la herramienta de recorte.`);
                                    return;
                                }
                                onSave(videoFile, duration);
                            }}
                            disabled={isProcessing}
                            className="bg-transparent border border-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all mr-2"
                        >
                            Original
                        </button>
                        <button
                            onClick={processVideo}
                            disabled={isProcessing}
                            className="flex items-center gap-2 bg-brand-red text-white px-4 md:px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-glow-sm hover:scale-105 transition-all disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            <span className="inline">Listo</span>
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative flex flex-col md:flex-row">

                    {/* Visual Cropper */}
                    <div className="flex-[1.5] relative bg-black flex items-center justify-center group">
                        <div className="absolute inset-x-0 top-4 z-10 flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setAspect(9 / 16); setAspectName('9:16') }} className={`p-2 md:p-3 rounded-lg backdrop-blur-md ${aspectName === '9:16' ? 'bg-brand-red text-white' : 'bg-black/60 text-gray-400'}`} title="9:16 (Story)">
                                <RectangleVertical className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={() => { setAspect(1); setAspectName('1:1') }} className={`p-2 md:p-3 rounded-lg backdrop-blur-md ${aspectName === '1:1' ? 'bg-brand-red text-white' : 'bg-black/60 text-gray-400'}`} title="1:1 (Square)">
                                <Square className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            <button onClick={() => { setAspect(4 / 5); setAspectName('4:5') }} className={`p-2 md:p-3 rounded-lg backdrop-blur-md ${aspectName === '4:5' ? 'bg-brand-red text-white' : 'bg-black/60 text-gray-400'}`} title="4:5 (Portrait)">
                                <RectangleVertical className="w-4 h-4 md:w-5 md:h-5 scale-x-125" />
                            </button>
                        </div>

                        <Cropper
                            video={videoSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspect}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={onCropComplete}
                            objectFit="contain"
                            classes={{
                                containerClassName: "bg-black",
                                mediaClassName: "rounded-lg"
                            }}
                            // @ts-ignore - videoProps might not be in types but is supported
                            videoProps={{
                                muted: false,
                                playsInline: true,
                                "webkit-playsinline": "true",
                                autoPlay: false
                            }}
                        />

                        {isProcessing && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-6">
                                <div className="relative">
                                    <svg className="w-24 h-24 transform -rotate-90">
                                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                                        <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * processProgress) / 100} className="text-brand-red transition-all duration-300" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center font-black italic text-xl text-white">
                                        {Math.round(processProgress)}%
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-white font-black uppercase text-sm tracking-widest italic animate-pulse">Procesando Video</p>
                                    <p className="text-gray-500 text-[10px] uppercase font-bold mt-1 mb-4">No cierres esta ventana</p>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Force skip processing
                                            setIsProcessing(false);
                                            onSave(videoFile, duration);
                                        }}
                                        className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase hover:bg-white/20 active:scale-95 transition-all shadow-glow-white"
                                    >
                                        ¿Tarda mucho? Omitir Edición
                                    </button>
                                </div>
                            </div>
                        )}

                        {processError && (
                            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 bg-red-500/90 backdrop-blur-xl p-6 rounded-3xl border border-white/20 z-[110] text-center shadow-2xl">
                                <X className="w-12 h-12 text-white mx-auto mb-4" />
                                <h3 className="text-white font-black uppercase italic mb-2">Error de procesamiento</h3>
                                <p className="text-white/80 text-xs font-bold leading-relaxed mb-4">{processError}</p>
                                <button onClick={() => setProcessError(null)} className="w-full bg-white text-brand-red py-3 rounded-xl text-[10px] font-black uppercase">Reintentar</button>
                            </div>
                        )}
                    </div>

                    {/* Controls Panel */}
                    <div className="flex-1 p-3 md:p-8 flex flex-col justify-between bg-black/20 border-t md:border-t-0 md:border-l border-white/5">

                        {/* Trim Controls */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                                        <Scissors className="w-3 h-3" /> Duración
                                    </h3>
                                    <p className="text-2xl font-black italic text-white tracking-tight">
                                        {Math.round(trimRange.end - trimRange.start)}s
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-600 block mb-1">LIMIT: 60s</span>
                                    <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black text-brand-red italic">
                                        {Math.floor(trimRange.start)}s — {Math.floor(trimRange.end)}s
                                    </span>
                                </div>
                            </div>

                            {/* Filmstrip & Trimmer */}
                            <div className="relative h-20 bg-black/40 rounded-2xl overflow-hidden border border-white/10 group">
                                <div className="absolute inset-0 flex">
                                    {thumbnails.map((src, i) => (
                                        <div key={i} className="flex-1 h-full overflow-hidden opacity-40 group-hover:opacity-60 transition-opacity">
                                            <img src={src} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>

                                {/* Trimmer handles */}
                                <div className="absolute inset-0">
                                    <input
                                        type="range" min="0" max={duration} step="0.1"
                                        value={trimRange.start}
                                        onChange={(e) => handleTrimChange(e, 'start')}
                                        className="absolute top-0 w-full h-1/2 accent-brand-red bg-transparent appearance-none cursor-pointer z-10"
                                    />
                                    <input
                                        type="range" min="0" max={duration} step="0.1"
                                        value={trimRange.end}
                                        onChange={(e) => handleTrimChange(e, 'end')}
                                        className="absolute bottom-0 w-full h-1/2 accent-white bg-transparent appearance-none cursor-pointer z-10"
                                    />

                                    {/* Highlight segment */}
                                    <div
                                        className="absolute h-full border-x-4 border-brand-red bg-brand-red/10"
                                        style={{
                                            left: `${(trimRange.start / duration) * 100}%`,
                                            right: `${100 - (trimRange.end / duration) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <p className="text-[9px] text-gray-500 font-bold text-center uppercase">Desliza para elegir el inicio y el fin</p>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex flex-col items-center gap-6">
                            <button
                                onClick={togglePlay}
                                className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all shadow-xl"
                            >
                                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white translate-x-0.5" />}
                            </button>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[9px] font-black text-gray-600 block uppercase mb-1">Zoom</span>
                                    <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full accent-brand-red" />
                                </div>
                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                                    <span className="text-[9px] font-black text-gray-600 block uppercase mb-1">Formato</span>
                                    <div className="flex justify-between items-center text-white font-black italic text-sm">
                                        {aspectName.toUpperCase()}
                                        <Crop className="w-4 h-4 text-brand-red" />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Hidden video for playback preview logic */}
                <video
                    ref={videoRef}
                    src={videoSrc}
                    className="hidden"
                    playsInline
                    webkit-playsinline="true"
                    muted={false} // Only mute if explicitly needed, usually audio is wanted
                    onTimeUpdate={() => {
                        if (videoRef.current && videoRef.current.currentTime >= trimRange.end) {
                            if (isPlaying) {
                                videoRef.current.currentTime = trimRange.start;
                            } else {
                                videoRef.current.pause();
                            }
                        }
                        setCurrentTime(videoRef.current?.currentTime || 0);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />
            </div>
        </div>
    );
}
