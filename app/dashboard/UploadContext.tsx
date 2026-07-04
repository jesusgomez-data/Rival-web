"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createUserPost, createPRPost, createWodPost } from './explore/actions';
import { Loader2, CheckCircle2, XCircle, Clock, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import PRCelebrationModal from './training/session/PRCelebrationModal';

interface UploadTask {
    id: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    error?: string;
    caption: string;
    preview?: string;
    type: 'standard' | 'pr' | 'wod';
}

interface UploadContextType {
    startUpload: (data: any) => void;
    startStoryUpload: (data: any) => void;
    cancelUpload: (id: string) => void;
    activeUploads: UploadTask[];
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

// ── Robustez de subidas ─────────────────────────────────────────
const MAX_FILE_MB = 200;
const UPLOAD_TIMEOUT_MS = 180_000; // 3 min por intento: nunca dejar el spinner colgado

async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.`)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

function fileTooBigError(file: File): string | null {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
        const sizeMb = Math.round(file.size / (1024 * 1024));
        return `El archivo pesa ${sizeMb} MB (máx. ${MAX_FILE_MB} MB). Recorta el vídeo o bájale la calidad e inténtalo de nuevo.`;
    }
    return null;
}

// ¿Formato de vídeo que Android/Chrome no pueden reproducir? (.MOV/HEVC de iPhone)
function needsTranscode(file: File): boolean {
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    const isVideoFile = type.startsWith('video/') || /\.(mov|m4v|hevc|3gp)$/.test(name);
    if (!isVideoFile) return false;
    return type.includes('quicktime') || /\.(mov|m4v|hevc|3gp)$/.test(name);
}

// Máx. duración que re-codificamos en el dispositivo (más allá, subimos el original)
const MAX_TRANSCODE_SECONDS = 300;

function getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
            const d = v.duration;
            URL.revokeObjectURL(v.src);
            resolve(isFinite(d) && d > 0 ? d : 0);
        };
        v.onerror = () => resolve(0);
        v.src = URL.createObjectURL(file);
    });
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
    const [uploads, setUploads] = useState<UploadTask[]>([]);
    const [celebrationPRs, setCelebrationPRs] = useState<any[]>([]);
    const [celebrationUser, setCelebrationUser] = useState<string>("");
    const supabase = createClient();

    const startUpload = useCallback(async (data: {
        content: string;
        file: File | null;
        postType: 'standard' | 'pr' | 'wod';
        exercise?: string;
        weight?: string;
        sport?: string;
        totalTime?: string;
        scoreType?: string;
        scoreLabel?: string;
        selectedTrack?: any;
        currentUser: any;
        preview?: string;
        wodData?: any;
        scheduledFor?: string;
        coverFile?: File | null;
    }) => {
        const id = Math.random().toString(36).substring(7);
        const newTask: UploadTask = {
            id,
            progress: 0,
            status: 'uploading',
            caption: data.content || `${data.exercise}: ${data.weight}kg`,
            preview: data.preview,
            type: data.postType
        };

        setUploads(prev => [newTask, ...prev]);

        // Guardia de tamaño: error claro inmediato en vez de subida eterna
        if (data.file) {
            const sizeError = fileTooBigError(data.file);
            if (sizeError) {
                setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: sizeError } : u));
                return;
            }
        }

        try {
            let mediaUrl = null;
            let mediaType = null;

            // Compatibilidad universal: los .MOV/HEVC de iPhone no se ven en
            // Android/Chrome. El dispositivo que grabó el vídeo SÍ sabe leerlo,
            // así que lo re-codificamos aquí antes de subir. Si algo falla,
            // subimos el original: nunca bloqueamos la publicación.
            let fileToUpload = data.file;
            if (data.file && needsTranscode(data.file)) {
                try {
                    setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'processing', caption: 'Optimizando vídeo para todos los dispositivos...' } : u));
                    const duration = await getVideoDuration(data.file);
                    if (duration > 0 && duration <= MAX_TRANSCODE_SECONDS) {
                        fileToUpload = await trimVideoInBackground(data.file, { start: 0, end: duration }, (p) => {
                            setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: Math.min(45, Math.round(p * 0.45)) } : u));
                        });
                    }
                } catch (transcodeErr) {
                    console.warn('[startUpload] Transcode falló; se sube el original:', transcodeErr);
                    fileToUpload = data.file;
                }
                setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'uploading', caption: data.content || `${data.exercise}: ${data.weight}kg` } : u));
            }

            if (fileToUpload) {
                const fileExt = fileToUpload.name.split('.').pop() || (fileToUpload.type.startsWith('video/') ? 'mp4' : 'jpg');
                const cleanFileName = fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_');
                const userId = data.currentUser?.id || 'anon';
                const fileName = `${userId}/${Date.now()}_${cleanFileName}.${fileExt}`;
                const mimeType = fileToUpload.type || (fileExt === 'mp4' ? 'video/mp4' : 'image/jpeg');

                let uploadData = null;
                let uploadError = null;
                let attempts = 0;
                const maxAttempts = 3;

                while (attempts < maxAttempts && !uploadData) {
                    attempts++;
                    try {
                        const result = await withTimeout<{ data: any; error: any }>(
                            supabase.storage
                                .from('posts')
                                .upload(fileName, fileToUpload, {
                                    cacheControl: '3600',
                                    upsert: true,
                                    contentType: mimeType,
                                    duplex: 'half'
                                } as any),
                            UPLOAD_TIMEOUT_MS,
                            'La subida del archivo'
                        );

                        if (result.error) throw result.error;
                        uploadData = result.data;
                    } catch (err: any) {
                        uploadError = err;
                        if (attempts < maxAttempts) {
                            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts - 1)));
                        }
                    }
                }

                if (!uploadData && uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('posts')
                    .getPublicUrl(fileName);

                mediaUrl = publicUrl;
                const videoExtensions = ['mp4', 'mov', 'webm', 'ogg', 'm4v'];
                const isVideo = mimeType.startsWith('video/') || videoExtensions.includes(fileExt.toLowerCase());
                mediaType = isVideo ? 'video' : 'image';

                setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 60, status: 'processing' } : u));
            }

            // Upload cover/thumbnail if provided
            let thumbnailUrl: string | null = null;
            if (data.coverFile) {
                const coverExt = data.coverFile.name.split('.').pop() || 'jpg';
                const userId = data.currentUser?.id || 'anon';
                const coverFileName = `${userId}/cover_${Date.now()}.${coverExt}`;
                const { error: coverError } = await supabase.storage
                    .from('posts')
                    .upload(coverFileName, data.coverFile, { cacheControl: '3600', upsert: true });
                if (!coverError) {
                    const { data: { publicUrl: coverUrl } } = supabase.storage.from('posts').getPublicUrl(coverFileName);
                    thumbnailUrl = coverUrl;
                }
            }

            const formData = new FormData();
            if (data.scheduledFor) {
                formData.append("scheduled_for", data.scheduledFor);
            }
            if (data.selectedTrack) {
                formData.append("music_url", data.selectedTrack.url);
                formData.append("music_title", data.selectedTrack.title);
                formData.append("music_artist", data.selectedTrack.artist);
            }

            let res: any;
            if (data.postType === 'pr') {
                formData.append("exercise", data.exercise || '');
                formData.append("weight", data.weight || '');
                formData.append("sport", data.sport || '');
                if (mediaUrl) formData.append("media_url", mediaUrl);
                else if (fileToUpload) formData.append("media", fileToUpload);
                res = await createPRPost(formData);
            } else if (data.postType === 'wod') {
                formData.append("content", data.content);
                if (data.wodData) {
                    formData.append("wod_data", JSON.stringify({ ...data.wodData, media_url: mediaUrl }));
                }
                res = await createWodPost(formData);
            } else {
                formData.append("content", data.content);
                if (mediaUrl) {
                    formData.append("media_url", mediaUrl);
                    formData.append("media_type", mediaType!);
                } else if (fileToUpload) {
                    formData.append("media", fileToUpload);
                }
                if (thumbnailUrl) formData.append("thumbnail_url", thumbnailUrl);
                res = await createUserPost(formData);
            }

            if (res?.error) throw new Error(res.error);
            setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'completed', progress: 100 } : u));
            if (data.postType === 'pr' && res?.prDetails && res.prDetails.isNewPR) {
                setCelebrationPRs([res.prDetails]);
                setCelebrationUser(res.prDetails.userName || data.currentUser?.username || data.currentUser?.full_name || data.currentUser?.email?.split('@')[0] || "Atleta");
            }
            setTimeout(() => setUploads(prev => prev.filter(u => u.id !== id)), 5000);

        } catch (error: any) {
            console.error("Background upload failed:", error);
            setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: error.message || "Error" } : u));
        }
    }, [supabase]);

    const startStoryUpload = useCallback(async (data: {
        file: File | null;
        trimRange?: { start: number, end: number };
        overlays: any[];
        selectedTrack?: any;
        currentUser: any;
        previewUrl?: string;
    }) => {
        const id = `story_${Math.random().toString(36).substring(7)}`;
        const newTask: UploadTask = {
            id,
            progress: 0,
            status: 'processing',
            caption: 'Publicando Historia...',
            preview: data.previewUrl,
            type: 'standard'
        };

        setUploads(prev => [newTask, ...prev]);

        try {
            let finalFile = data.file;

            // 1. Background Trimming if needed
            if (data.file && data.file.type.startsWith('video/') && data.trimRange) {
                setUploads(prev => prev.map(u => u.id === id ? { ...u, caption: 'Recortando video...' } : u));
                finalFile = await trimVideoInBackground(data.file, data.trimRange, (progress) => {
                    setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: progress * 0.5 } : u));
                });
            }

            // 2. Upload to Storage
            setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 50, status: 'uploading', caption: 'Subiendo historia...' } : u));

            if (!finalFile) throw new Error("No se pudo procesar el archivo multimedia.");

            // .MOV/HEVC sin recorte previo → re-codificar para que se vea en Android
            // (el recorte ya re-codifica, así que solo aplica si no hubo trim)
            if (needsTranscode(finalFile) && !data.trimRange) {
                try {
                    setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'processing', caption: 'Optimizando vídeo...' } : u));
                    const duration = await getVideoDuration(finalFile);
                    if (duration > 0 && duration <= MAX_TRANSCODE_SECONDS) {
                        finalFile = await trimVideoInBackground(finalFile, { start: 0, end: duration }, (p) => {
                            setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: Math.min(45, Math.round(p * 0.45)) } : u));
                        });
                    }
                } catch (e) {
                    console.warn('[startStoryUpload] Transcode falló; se sube el original:', e);
                }
            }

            const storySizeError = fileTooBigError(finalFile);
            if (storySizeError) throw new Error(storySizeError);

            const fileExt = finalFile.name?.split('.').pop()?.toLowerCase() || 'mp4';
            const userId = data.currentUser?.id || 'anonymous';
            const fileName = `${userId}/story_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await withTimeout<{ data: any; error: any }>(
                supabase.storage.from('posts').upload(fileName, finalFile),
                UPLOAD_TIMEOUT_MS,
                'La subida de la historia'
            );
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(fileName);

            // 3. Save to DB
            setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 90, status: 'processing', caption: 'Finalizando...' } : u));

            const metadata = {
                overlays: data.overlays,
                music: data.selectedTrack ? {
                    url: data.selectedTrack.url,
                    title: data.selectedTrack.title,
                    artist: data.selectedTrack.artist
                } : null
            };

            const { error: dbError } = await supabase.from('stories').insert({
                user_id: data.currentUser.id,
                media_url: publicUrl,
                media_type: finalFile.type.startsWith('video/') ? 'video' : 'image',
                duration_seconds: 30,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                metadata: metadata,
                music_url: data.selectedTrack?.url || null,
                music_title: data.selectedTrack?.title || null,
                music_artist: data.selectedTrack?.artist || null
            });

            if (dbError) throw dbError;

            setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'completed', progress: 100, caption: '¡Historia subida!' } : u));
            setTimeout(() => setUploads(prev => prev.filter(u => u.id !== id)), 5000);

        } catch (error: any) {
            console.error("Story background task failed:", error);
            setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: error.message } : u));
        }
    }, [supabase]);

    const trimVideoInBackground = async (file: File, range: { start: number, end: number }, onProgress: (p: number) => void): Promise<File> => {
        return new Promise(async (resolve, reject) => {
            try {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.muted = false;
                video.volume = 1;
                video.playsInline = true;

                await new Promise(r => video.onloadedmetadata = r);

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d')!;

                // Capturar el stream del canvas
                // @ts-ignore
                const canvasStream = canvas.captureStream ? canvas.captureStream(30) : (canvas as any).webkitCaptureStream ? (canvas as any).webkitCaptureStream(30) : null;

                if (!canvasStream) throw new Error("Tu navegador no soporta captura de video desde canvas.");

                let audioTracks: MediaStreamTrack[] = [];
                try {
                    // @ts-ignore
                    const videoStream = video.captureStream ? video.captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : (video as any).webkitCaptureStream ? (video as any).webkitCaptureStream() : null;
                    if (videoStream) audioTracks = videoStream.getAudioTracks();
                } catch (e) {
                    console.warn("No se pudo capturar el audio del video:", e);
                }

                const finalStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

                // Detectar el mejor MIME type soportado
                const possibleTypes = [
                    'video/mp4;codecs=h264,aac',
                    'video/mp4',
                    'video/webm;codecs=h264,opus',
                    'video/webm;codecs=vp9,opus',
                    'video/webm'
                ];

                let mimeType = '';
                for (const type of possibleTypes) {
                    if (MediaRecorder.isTypeSupported(type)) {
                        mimeType = type;
                        break;
                    }
                }

                if (!mimeType) throw new Error("No se encontró un formato de video soportado para grabar.");

                const recorder = new MediaRecorder(finalStream, {
                    mimeType,
                    videoBitsPerSecond: 2500000 // 2.5 Mbps para buena calidad
                });
                const chunks: Blob[] = [];

                recorder.ondataavailable = (e) => chunks.push(e.data);
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    resolve(new File([blob], `trimmed_${Date.now()}.mp4`, { type: mimeType }));
                };

                video.currentTime = range.start;
                await new Promise(r => video.onseeked = r);

                recorder.start();
                video.play();

                const recDuration = range.end - range.start;
                const interval = setInterval(() => {
                    if (video.currentTime >= range.end || video.ended) {
                        clearInterval(interval);
                        recorder.stop();
                        video.pause();
                        onProgress(100);
                    } else {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const progress = ((video.currentTime - range.start) / recDuration) * 100;
                        onProgress(progress);
                    }
                }, 100);

            } catch (err) {
                reject(err);
            }
        });
    };

    const cancelUpload = (id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    };

    return (
        <UploadContext.Provider value={{ startUpload, startStoryUpload, cancelUpload, activeUploads: uploads }}>
            {children}

            {/* Global Task Indicator - Premium Redesign */}
            <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[1000] flex flex-col gap-4 w-[300px] sm:w-[340px]">
                <AnimatePresence>
                    {uploads.map(task => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className="group relative overflow-hidden"
                        >
                            {/* Background with Glassmorphism */}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all group-hover:border-brand-red/30" />

                            {/* Decorative Glow */}
                            <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-red/10 blur-[40px] rounded-full pointer-events-none" />

                            <div className="relative p-4 sm:p-5 flex gap-4 items-center">
                                {/* Preview Thumbnail */}
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0 relative shadow-inner group-hover:scale-105 transition-transform">
                                    {task.preview ? (
                                        <Image src={task.preview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-red/20 to-transparent">
                                            <Clock className="w-6 h-6 text-brand-red animate-pulse" />
                                        </div>
                                    )}
                                    {/* Small Overlay Icon based on State */}
                                    <div className="absolute top-1 right-1">
                                        {task.status === 'completed' && (
                                            <div className="bg-green-500 rounded-full p-0.5 shadow-lg">
                                                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-red italic drop-shadow-sm">
                                            {task.status === 'uploading' ? 'Subiendo' :
                                                task.status === 'completed' ? 'Listo' :
                                                    task.status === 'error' ? 'Error' : 'Procesando'}
                                        </span>

                                        {task.status !== 'completed' && task.status !== 'error' ? (
                                            <Loader2 className="w-4 h-4 text-brand-red animate-spin opacity-80" />
                                        ) : (
                                            <button
                                                onClick={() => cancelUpload(task.id)}
                                                className={`p-1 rounded-lg transition-colors ${task.status === 'completed' ? 'hover:bg-white/10' : 'hover:bg-red-500/20'
                                                    }`}
                                            >
                                                <XCircle className={`w-4 h-4 ${task.status === 'completed' ? 'text-gray-400' : 'text-brand-red'}`} />
                                            </button>
                                        )}
                                    </div>

                                    <h4 className="text-[11px] font-black text-white truncate italic uppercase tracking-tight">
                                        {task.caption || 'Publicando historia...'}
                                    </h4>

                                    {/* Progress Bar Container */}
                                    <div className="relative mt-1">
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-full backdrop-blur-sm shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${task.progress}%` }}
                                                transition={{ duration: 0.5, ease: "easeOut" }}
                                                className={`h-full rounded-full transition-all relative ${task.status === 'error' ? 'bg-red-500' : 'bg-brand-red'
                                                    }`}
                                            >
                                                {/* Bar Shine Effect */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                                            </motion.div>
                                        </div>

                                        {/* Status Detail Text */}
                                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                                            {task.status === 'processing' && task.progress < 50 ? 'Recortando y preparando...' :
                                                task.status === 'uploading' ? 'Sincronizando con la arena...' :
                                                    task.status === 'completed' ? '¡Publicado con éxito!' :
                                                        task.status === 'error' ? task.error : 'Finalizando...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {celebrationPRs.length > 0 && (
                <PRCelebrationModal
                    achievements={celebrationPRs}
                    onClose={() => setCelebrationPRs([])}
                    userName={celebrationUser}
                />
            )}
        </UploadContext.Provider>
    );
}

export function useUploads() {
    const context = useContext(UploadContext);
    if (!context) throw new Error('useUploads must be used within an UploadProvider');
    return context;
}
