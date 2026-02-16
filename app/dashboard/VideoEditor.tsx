"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Crop, Maximize, Scissors, Loader2, Play, Pause, Square, RectangleVertical, Smartphone } from 'lucide-react';
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
    const [aspect, setAspect] = useState<number | undefined>(undefined); // Undefined = original/free
    const [aspectName, setAspectName] = useState<'9:16' | '1:1' | '4:5' | 'original'>('original');

    const [trimRange, setTrimRange] = useState({ start: 0, end: 60 });
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processProgress, setProcessProgress] = useState(0);
    const [processError, setProcessError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const pixelsRef = useRef<any>(null);
    const processingRef = useRef<{ abort: boolean }>({ abort: false });

    // Load video metadata
    useEffect(() => {
        const v = document.createElement('video');
        v.src = videoSrc;
        v.preload = "metadata";
        v.onloadedmetadata = () => {
            setDuration(v.duration);
            // Default trim: full video up to 60s
            setTrimRange({ start: 0, end: Math.min(v.duration, 60) });
        };
    }, [videoSrc]);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        pixelsRef.current = croppedAreaPixels;
    }, []);

    // ROBUST PROCESSING: Real-time Play & Record (Best for Mobile)
    const processVideo = async () => {
        if (!videoFile) return;

        setIsProcessing(true);
        setProcessError(null);
        setProcessProgress(0);
        processingRef.current.abort = false;

        const video = document.createElement('video');
        video.src = videoSrc;
        video.crossOrigin = "anonymous";
        video.muted = false; // We want sound!
        video.playsInline = true;

        try {
            await video.play(); video.pause(); // Warmup

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Use actual video dimensions (Original Quality) unless cropped
            const width = pixelsRef.current?.width || video.videoWidth;
            const height = pixelsRef.current?.height || video.videoHeight;

            canvas.width = width;
            canvas.height = height;

            // Stream creation
            // @ts-ignore
            const streamFn = canvas.captureStream || canvas.webkitCaptureStream;
            if (!streamFn) throw new Error("Tu navegador no soporta la edición de video.");

            const stream = streamFn.call(canvas, 30); // 30 FPS stable

            // Use supported MIME type
            let mimeType = 'video/webm;codecs=vp8';
            if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
            else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) mimeType = 'video/webm;codecs=h264';

            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 2500000 // 2.5 Mbps (Reasonable quality/size balance)
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

            // Setup Recording Logic
            video.currentTime = trimRange.start;

            await new Promise(resolve => {
                const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(true); };
                video.addEventListener('seeked', onSeeked);
                // Safety timeout
                setTimeout(() => resolve(true), 1000);
            });

            const recDuration = trimRange.end - trimRange.start;
            let animationFrame: number;

            // Drawing Loop
            const draw = () => {
                if (processingRef.current.abort) return;

                if (video.paused || video.ended) {
                    // Check if finished
                } else {
                    ctx?.drawImage(
                        video,
                        pixelsRef.current?.x || 0, pixelsRef.current?.y || 0,
                        width, height,
                        0, 0, width, height
                    );
                    animationFrame = requestAnimationFrame(draw);

                    // Update progress
                    const currentProgress = ((video.currentTime - trimRange.start) / recDuration) * 100;
                    setProcessProgress(Math.min(99, Math.max(0, currentProgress)));
                }
            };

            recorder.onstop = () => {
                cancelAnimationFrame(animationFrame);
                const blob = new Blob(chunks, { type: mimeType });

                if (blob.size < 1000) {
                    // If recording failed (empty), fallback to original file but warn
                    console.warn("Recording empty, using original");
                    setProcessError("Error de captura. Intenta 'Subir Original'.");
                } else {
                    const newFile = new File([blob], `trimmed_${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`, { type: mimeType });
                    onSave(newFile, recDuration);
                }
                setIsProcessing(false);
            };

            // Start everything
            recorder.start();
            video.play();
            draw();

            // Monitor end time
            const checkInterval = setInterval(() => {
                if (processingRef.current.abort) {
                    clearInterval(checkInterval);
                    if (recorder.state === 'recording') recorder.stop();
                    video.pause();
                    return;
                }

                if (video.currentTime >= trimRange.end || video.ended) {
                    clearInterval(checkInterval);
                    if (recorder.state === 'recording') recorder.stop();
                    video.pause();
                }
            }, 100);

        } catch (err: any) {
            console.error(err);
            setProcessError("Error iniciando grabación. Prueba 'Subir Original'.");
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col safe-area-inset">
            {/* Dark Backdrop */}
            <div className="absolute inset-0 bg-black/95" />

            {/* ERROR / PROCESSING OVERLAY */}
            <AnimatePresence>
                {(isProcessing || processError) && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                    >
                        {processError ? (
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl max-w-sm w-full">
                                <Maximize className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-white font-black text-xl italic uppercase mb-2">Error</h3>
                                <p className="text-gray-300 text-sm mb-6">{processError}</p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => onSave(videoFile, duration)}
                                        className="w-full bg-white text-black py-3 rounded-xl font-black uppercase tracking-wider text-xs hover:scale-105 transition-transform"
                                    >
                                        SUBIR ORIGINAL (Sin editar)
                                    </button>
                                    <button
                                        onClick={() => { setProcessError(null); setIsProcessing(false); }}
                                        className="w-full bg-transparent border border-white/20 text-white py-3 rounded-xl font-bold uppercase text-xs"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative w-full max-w-xs text-center flex flex-col items-center">
                                <div className="w-24 h-24 border-4 border-white/10 border-t-brand-red rounded-full animate-spin mx-auto mb-6" />
                                <h3 className="text-white font-black text-2xl italic uppercase mb-2">Procesando...</h3>
                                <p className="text-gray-400 text-xs uppercase font-bold tracking-widest mb-8">
                                    {Math.round(processProgress)}% Completado
                                </p>
                                <button
                                    onClick={() => {
                                        processingRef.current.abort = true;
                                        setProcessError("Proceso cancelado.");
                                    }}
                                    className="px-6 py-2 bg-white/10 rounded-full text-[10px] text-gray-400 uppercase font-bold border border-white/5 mb-4"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        processingRef.current.abort = true;
                                        setIsProcessing(false);
                                        onSave(videoFile, duration);
                                    }}
                                    className="bg-brand-red text-white px-4 py-2 rounded-full text-[10px] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-glow-sm"
                                >
                                    ¿Tarda mucho? Omitir
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN LAYOUT */}
            <div className="relative z-10 flex flex-col h-full pointer-events-auto">

                {/* 1. TOP HEADER */}
                <div className="h-16 flex items-center justify-between px-4 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
                    <button onClick={onCancel} className="p-2 -ml-2 text-white/50 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>

                    <span className="text-white text-xs font-black italic uppercase tracking-widest opacity-80">
                        Editor de Video
                    </span>

                    <button
                        onClick={processVideo}
                        className="bg-brand-red text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-glow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Check className="w-3 h-3" />
                        SUBIR
                    </button>
                </div>

                {/* 2. VIDEO AREA (CROPPER) */}
                <div className="flex-1 relative bg-black/20 overflow-hidden w-full flex items-center justify-center">
                    <Cropper
                        video={videoSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect} // undefined = original aspect ratio
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        objectFit="contain"
                        showGrid={false}
                        classes={{
                            containerClassName: "bg-black/50",
                            mediaClassName: "max-h-full" // Ensure it fits
                        }}
                        // @ts-ignore
                        videoProps={{
                            muted: false,
                            playsInline: true,
                            "webkit-playsinline": "true",
                            autoPlay: false,
                            ref: videoRef // Link ref for playback control
                        }}
                    />

                    {/* Floating Controls for Aspect Ratio */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-[200]">
                        <button
                            onClick={() => { setAspect(undefined); setAspectName('original'); }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${aspectName === 'original' ? 'bg-brand-red text-white' : 'bg-black/40 text-gray-300'}`}
                            title="Original"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { setAspect(9 / 16); setAspectName('9:16'); }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${aspectName === '9:16' ? 'bg-brand-red text-white' : 'bg-black/40 text-gray-300'}`}
                        >
                            <RectangleVertical className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => { setAspect(1); setAspectName('1:1'); }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-all ${aspectName === '1:1' ? 'bg-brand-red text-white' : 'bg-black/40 text-gray-300'}`}
                        >
                            <Square className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 3. BOTTOM CONTROLS (Trim + Info) */}
                <div className="bg-[#0a0a0a] border-t border-white/10 p-5 pb-8 shrink-0 flex flex-col gap-4 z-[200]">

                    {/* Trim Slider Info */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-white">
                            <Scissors className="w-3 h-3 text-brand-red" />
                            <span className="text-xl font-black italic tracking-tighter">
                                {Math.round(trimRange.end - trimRange.start)}s
                            </span>
                        </div>
                        <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">
                            Máximo 60s
                        </div>
                    </div>

                    {/* Simple Range Slider (Native inputs for stability) */}
                    <div className="relative h-12 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                        <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center">
                            <span className="text-[9px] text-white/20 font-black uppercase">Linea de Tiempo</span>
                        </div>

                        {/* Start Handler */}
                        <div
                            className="absolute z-20 top-0 bottom-0 left-0 bg-black/60 border-r-2 border-white"
                            style={{ width: `${(trimRange.start / (duration || 0.1)) * 100}%` }}
                        />

                        {/* End Handler */}
                        <div
                            className="absolute z-20 top-0 bottom-0 right-0 bg-black/60 border-l-2 border-white"
                            style={{ width: `${100 - (trimRange.end / (duration || 0.1)) * 100}%` }}
                        />

                        {/* Visual Representation of Trim */}
                        <div
                            className="absolute top-0 bottom-0 bg-brand-red/10"
                            style={{
                                left: `${(trimRange.start / (duration || 0.1)) * 100}%`,
                                right: `${100 - (trimRange.end / (duration || 0.1)) * 100}%`
                            }}
                        />

                        {/* Two range inputs covering full width for logic */}
                        <input
                            type="range" min={0} max={duration || 60} step={0.1}
                            value={trimRange.start}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setTrimRange(prev => ({ ...prev, start: Math.min(v, prev.end - 1) }));
                                if (videoRef.current) {
                                    videoRef.current.currentTime = v;
                                    setIsPlaying(false);
                                }
                            }}
                            className="absolute top-0 w-full h-1/2 opacity-0 z-30 pointer-events-auto cursor-col-resize"
                        />
                        <input
                            type="range" min={0} max={duration || 60} step={0.1}
                            value={trimRange.end}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                setTrimRange(prev => ({ ...prev, end: Math.max(v, prev.start + 1) }));
                                if (videoRef.current) {
                                    videoRef.current.currentTime = v;
                                    setIsPlaying(false);
                                }
                            }}
                            className="absolute bottom-0 w-full h-1/2 opacity-0 z-30 pointer-events-auto cursor-col-resize"
                        />
                    </div>

                    {/* Play/Pause Main Control */}
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={() => {
                                if (videoRef.current) {
                                    if (videoRef.current.paused) videoRef.current.play();
                                    else videoRef.current.pause();
                                    setIsPlaying(!videoRef.current.paused);
                                }
                            }}
                            className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-glow-white"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black translate-x-0.5" />}
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <button
                            onClick={() => onSave(videoFile, duration)}
                            className="text-[10px] text-gray-500 font-bold uppercase underline hover:text-white transition-colors p-2"
                        >
                            Subir Original Sin Editar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
