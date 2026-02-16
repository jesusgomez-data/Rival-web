"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createUserPost, createPRPost } from './community/actions';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Image from 'next/image';

interface UploadTask {
    id: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    error?: string;
    caption: string;
    preview?: string;
    type: 'standard' | 'pr';
}

interface UploadContextType {
    startUpload: (data: any) => void;
    cancelUpload: (id: string) => void;
    activeUploads: UploadTask[];
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
    const [uploads, setUploads] = useState<UploadTask[]>([]);
    const supabase = createClient();

    const startUpload = useCallback(async (data: {
        content: string;
        file: File | null;
        postType: 'standard' | 'pr';
        exercise?: string;
        weight?: string;
        sport?: string;
        selectedTrack?: any;
        currentUser: any;
        preview?: string;
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

        try {
            let mediaUrl = null;
            let mediaType = null;

            // 1. Storage Upload (Direct)
            // 1. Storage Upload (Direct with Retry)
            if (data.file) {
                // Large File Handling
                const isLargeFile = data.file.size > 100 * 1024 * 1024; // 100MB
                if (isLargeFile) {
                    // Optional: You could use a toast here if you had one, for now console/caption update
                    console.log("Large file detected, keeping upload robust.");
                }

                const fileExt = data.file.name.split('.').pop() || (data.file.type.startsWith('video/') ? 'mp4' : 'jpg');
                const cleanFileName = data.file.name.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize
                const userId = data.currentUser?.id || 'anon';
                const fileName = `${userId}/${Date.now()}_${cleanFileName}.${fileExt}`;
                const mimeType = data.file.type || (fileExt === 'mp4' ? 'video/mp4' : 'image/jpeg');

                let uploadData = null;
                let uploadError = null;
                let attempts = 0;
                const maxAttempts = 3;

                while (attempts < maxAttempts && !uploadData) {
                    attempts++;
                    try {
                        console.log(`Upload attempt ${attempts}/${maxAttempts} for ${fileName}`);
                        const result = await supabase.storage
                            .from('posts')
                            .upload(fileName, data.file, {
                                cacheControl: '3600',
                                upsert: true,
                                contentType: mimeType,
                                duplex: 'half' // Helps with some streaming uploads
                            } as any);

                        if (result.error) throw result.error;
                        uploadData = result.data;
                    } catch (err: any) {
                        console.error(`Attempt ${attempts} failed:`, err.message);
                        uploadError = err;

                        // Wait before retry (exponential backoff: 1s, 2s, 4s...)
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
                mediaType = mimeType.startsWith('video/') ? 'video' : 'image';
                setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 60, status: 'processing' } : u));
            }

            // 2. Database Creation
            const formData = new FormData();
            if (data.selectedTrack) {
                formData.append("music_url", data.selectedTrack.url);
                formData.append("music_title", data.selectedTrack.title);
                formData.append("music_artist", data.selectedTrack.artist);
            }

            let res;
            if (data.postType === 'pr') {
                formData.append("exercise", data.exercise || '');
                formData.append("weight", data.weight || '');
                formData.append("sport", data.sport || '');
                if (mediaUrl) formData.append("media_url", mediaUrl);
                else if (data.file) formData.append("media", data.file);
                res = await createPRPost(formData);
            } else {
                formData.append("content", data.content);
                if (mediaUrl) {
                    formData.append("media_url", mediaUrl);
                    formData.append("media_type", mediaType!);
                } else if (data.file) {
                    formData.append("media", data.file);
                }
                res = await createUserPost(formData);
            }

            if (res?.error) throw new Error(res.error);

            setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'completed', progress: 100 } : u));

            // Auto-remove completed after 5 seconds
            setTimeout(() => {
                setUploads(prev => prev.filter(u => u.id !== id));
            }, 5000);

        } catch (error: any) {
            console.error("Background upload failed:", error);
            let errorMessage = error.message || "Error desconocido";

            // Detect common Safari/Mobile upload errors for large files
            if (errorMessage.includes("Load failed") || errorMessage.includes("NetworkError") || errorMessage.includes("Failed to fetch")) {
                errorMessage = "Error de conexión. El video podría ser muy pesado para tu red. Intenta con WiFi o un video más corto.";
            } else if (errorMessage.toLowerCase().includes("maximum allowed size")) {
                errorMessage = "El video es demasiado grande para el límite actual del servidor. Aumenta el 'File Size Limit' en el Dashboard de Supabase (Storage > posts > Configuration).";
            }

            setUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: errorMessage } : u));
        }
    }, [supabase]);

    const cancelUpload = (id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    };

    return (
        <UploadContext.Provider value={{ startUpload, cancelUpload, activeUploads: uploads }}>
            {children}

            {/* Global Task Indicator */}
            {uploads.length > 0 && (
                <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[1000] flex flex-col gap-3 w-[280px] sm:w-[320px]">
                    {uploads.map(task => (
                        <div key={task.id} className="bg-brand-gray/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-right-4 duration-300">
                            <div className="flex gap-3">
                                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 overflow-hidden shrink-0 relative">
                                    {task.preview ? (
                                        <Image src={task.preview} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brand-red">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                                            {task.status === 'uploading' ? 'Subiendo...' :
                                                task.status === 'completed' ? '¡Publicado!' :
                                                    task.status === 'error' ? 'Error' : 'Procesando'}
                                        </span>
                                        {task.status === 'completed' ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                        ) : task.status === 'error' ? (
                                            <button onClick={() => cancelUpload(task.id)}>
                                                <XCircle className="w-3.5 h-3.5 text-brand-red" />
                                            </button>
                                        ) : (
                                            <Loader2 className="w-3.5 h-3.5 text-brand-red animate-spin" />
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-white truncate mb-2 italic">
                                        {task.caption || 'Publicación sin texto'}
                                    </p>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${task.status === 'error' ? 'bg-brand-red' : 'bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.5)]'}`}
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                    {task.error && (
                                        <p className="text-[8px] text-brand-red mt-1 truncate">{task.error}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </UploadContext.Provider>
    );
}

export function useUploads() {
    const context = useContext(UploadContext);
    if (!context) throw new Error('useUploads must be used within an UploadProvider');
    return context;
}
