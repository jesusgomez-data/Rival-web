
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Loader2, X, Smile } from "lucide-react";
import { createUserPost, createPRPost } from "./community/actions";
import MentionInput from "@/components/MentionInput";
import { createClient } from "@/utils/supabase/client";
import { Trophy, Activity, AlertCircle } from "lucide-react";
import Image from "next/image";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import MusicPicker from "./MusicPicker";
import { MusicTrack } from "./music-data";

export default function CreatePost({ currentUser, onSuccess }: { currentUser: any, onSuccess?: () => void }) {
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'pr'>('standard');
    const [exercise, setExercise] = useState("");
    const [weight, setWeight] = useState("");
    const [sport, setSport] = useState("Cross Training");
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isVideoTrimming, setIsVideoTrimming] = useState(false);
    const [trimmerVideoUrl, setTrimmerVideoUrl] = useState<string | null>(null);
    const [trimStart, setTrimStart] = useState(0);
    const [isTrimmingLoading, setIsTrimmingLoading] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const trimmerVideoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const supabaseClient = createClient();

    // Close emoji picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        // Use pendingFile (trimmed or original) if available, otherwise check input
        let file = pendingFile || fileInputRef.current?.files?.[0];

        if (postType === 'standard' && !content.trim() && !file) return;
        if (postType === 'pr' && (!exercise || !weight)) return;

        setIsPosting(true);
        setUploadProgress(10);

        const formData = new FormData();

        if (selectedTrack) {
            formData.append("music_url", selectedTrack.url);
            formData.append("music_title", selectedTrack.title);
            formData.append("music_artist", selectedTrack.artist);
        }

        let mediaUrl = null;
        let mediaType = null;

        // DIRECT CLIENT UPLOAD for larger files and reliability
        if (file && file.size > 0) {
            try {
                const fileExt = file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
                const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

                console.log(`Starting direct upload: ${fileName} (${file.type}, ${file.size} bytes)`);
                setUploadProgress(30);

                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('posts')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabaseClient.storage
                    .from('posts')
                    .getPublicUrl(fileName);

                mediaUrl = publicUrl;
                mediaType = file.type.startsWith('video/') ? 'video' : 'image';
                setUploadProgress(80);
                console.log("Direct upload successful:", mediaUrl);
            } catch (error) {
                console.error("Direct upload failed, falling back to server action:", error);

                // If direct upload fails, we check size. Server actions have ~4.5MB limit on Vercel
                if (file.size > 4.5 * 1024 * 1024) {
                    console.warn("File is > 4.5MB and direct upload failed. Server fallback might fail on Vercel.");
                }

                // We don't alert the user anymore, just try to fallback silently
                // or if it's REALLY large (>100MB) we give a heads up
                if (file.size > 100 * 1024 * 1024) {
                    alert("El archivo es muy grande. Si la subida falla, intenta con una conexión más estable.");
                }
            }
        }

        let res;
        try {
            if (postType === 'pr') {
                formData.append("exercise", exercise);
                formData.append("weight", weight);
                formData.append("sport", sport);
                if (mediaUrl) formData.append("media_url", mediaUrl);
                else if (file) formData.append("media", file);
                res = await createPRPost(formData);
            } else {
                formData.append("content", content);
                if (mediaUrl) {
                    formData.append("media_url", mediaUrl);
                    formData.append("media_type", mediaType!);
                } else if (file) {
                    formData.append("media", file);
                }
                res = await createUserPost(formData);
            }

            setUploadProgress(100);

            if (res?.error) {
                alert(`Error al publicar: ${res.error}`);
            } else {
                setContent("");
                setExercise("");
                setWeight("");
                setPreview(null);
                setDuration(null);
                setPendingFile(null);
                setShowEmojiPicker(false);
                setPostType('standard');
                setSelectedTrack(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
                onSuccess?.();
            }
        } catch (error: any) {
            console.error("Post error:", error);
            alert(`Ocurrió un error inesperado al publicar: ${error?.message || String(error)}`);
        } finally {
            setIsPosting(false);
            setUploadProgress(0);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // No file size limit - all videos accepted, will be trimmed if needed
            if (file.type.startsWith('video/')) {
                const docVideo = document.createElement('video');
                docVideo.preload = 'metadata';
                docVideo.onloadedmetadata = () => {
                    const dur = docVideo.duration;
                    setVideoDuration(dur);
                    setDuration(dur);
                    window.URL.revokeObjectURL(docVideo.src);

                    if (dur > 60) {
                        // Auto-open trimmer for videos longer than 1 minute
                        setTrimStart(0);
                        setPendingFile(file);
                        setTrimmerVideoUrl(URL.createObjectURL(file));
                        setIsVideoTrimming(true);
                        return;
                    }

                    const url = URL.createObjectURL(file);
                    setPreview(url);
                };
                docVideo.onerror = () => {
                    alert("Error al procesar el video. Asegúrate de que sea un formato compatible.");
                };
                docVideo.src = URL.createObjectURL(file);
            } else {
                const url = URL.createObjectURL(file);
                setPreview(url);
                setDuration(null);
            }
        } else {
            setPreview(null);
            setDuration(null);
        }
    };

    const [trimProgress, setTrimProgress] = useState(0);

    const processTrimming = async () => {
        if (!trimmerVideoRef.current || !trimmerVideoUrl) return;

        setIsTrimmingLoading(true);
        setTrimProgress(0);
        const video = trimmerVideoRef.current;

        try {
            const captureStream = (video as any).captureStream || (video as any).mozCaptureStream;

            if (!captureStream) {
                alert("Tu navegador no soporta el recorte de video directo. Por favor, intenta subir un video de menos de 1 minuto.");
                setIsTrimmingLoading(false);
                setIsVideoTrimming(false);
                setTrimmerVideoUrl(null);
                return;
            }

            const stream = captureStream.call(video);
            const supportedTypes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/ogg'];
            let mimeType = '';
            for (const type of supportedTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            if (!mimeType) {
                alert("Formato de video no compatible para recorte en este navegador.");
                setIsTrimmingLoading(false);
                return;
            }

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            let safetyTimeout: any;
            let progressInterval: any;

            recorder.onstop = () => {
                if (safetyTimeout) clearTimeout(safetyTimeout);
                if (progressInterval) clearInterval(progressInterval);

                if (chunks.length === 0) {
                    alert("Error: No se capturaron datos del video. Por favor, intenta de nuevo y asegúrate de que el video se reproduce correctamente.");
                    setIsTrimmingLoading(false);
                    return;
                }

                const blob = new Blob(chunks, { type: mimeType });
                const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
                const fileName = pendingFile ? pendingFile.name.replace(/\.[^/.]+$/, "") : "trimmed_video";
                const trimmedFile = new File([blob], `${fileName}_trimmed.${extension}`, { type: mimeType });

                const url = URL.createObjectURL(trimmedFile);
                setPreview(url);
                setDuration(Math.min(60, video.duration - trimStart));
                setPendingFile(trimmedFile);

                setIsVideoTrimming(false);
                setTrimmerVideoUrl(null);
                setIsTrimmingLoading(false);
                setTrimProgress(0);
            };

            recorder.onerror = (err) => {
                console.error("MediaRecorder Error:", err);
                alert("Ocurrió un error al procesar el video.");
                setIsTrimmingLoading(false);
            };

            const recordingDuration = Math.min(60, (video.duration - trimStart));

            const startRecording = () => {
                video.onseeked = null; // Prevent multi-triggering
                video.play().then(() => {
                    recorder.start();

                    const startTime = Date.now();
                    progressInterval = setInterval(() => {
                        const elapsed = (Date.now() - startTime) / 1000;
                        const percent = Math.min(99, (elapsed / recordingDuration) * 100);
                        setTrimProgress(percent);
                    }, 500);

                    safetyTimeout = setTimeout(() => {
                        if (recorder.state === 'recording') {
                            recorder.stop();
                            video.pause();
                        }
                    }, (recordingDuration + 1) * 1000);

                    video.onended = () => {
                        if (recorder.state === 'recording') {
                            recorder.stop();
                        }
                    };
                }).catch(err => {
                    console.error("Play failed during trimming:", err);
                    alert("No se pudo iniciar la captura del video. Intenta presionar 'Play' manualmente si es necesario.");
                    setIsTrimmingLoading(false);
                });
            };

            // Prepare for seek
            video.muted = true;
            video.currentTime = trimStart;

            // Check if seek is needed or already there
            if (Math.abs(video.currentTime - trimStart) < 0.1) {
                startRecording();
            } else {
                video.onseeked = startRecording;
            }

        } catch (err) {
            console.error("Trimming error:", err);
            setIsTrimmingLoading(false);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setContent(prev => prev + emojiData.emoji);
    };

    return (
        <div className="bg-brand-gray/30 border border-white/10 rounded-[28px] p-4 md:p-6 backdrop-blur-md mb-8 relative z-10 w-full">
            {/* Post Type Selector */}
            <div className="flex gap-2 mb-4 md:mb-6">
                <button
                    type="button"
                    onClick={() => setPostType('standard')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${postType === 'standard' ? 'bg-white/10 border-white/20 text-white shadow-inner' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Activity className="w-3.5 h-3.5 text-brand-red" />
                    Actualización
                </button>
                <button
                    type="button"
                    onClick={() => setPostType('pr')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${postType === 'pr' ? 'bg-brand-red/10 border-brand-red/30 text-brand-red shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    <Trophy className="w-3.5 h-3.5" />
                    Nuevo PR
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                {/* Avatar - Visible on larger screens */}
                <div className="hidden sm:block shrink-0">
                    <div className="w-12 h-12 rounded-full border-2 border-white/10 bg-black/40 overflow-hidden relative shadow-xl">
                        {currentUser?.user_metadata?.avatar_url ? (
                            <Image src={currentUser.user_metadata.avatar_url} alt="User" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-800">ME</div>
                        )}
                    </div>
                </div>

                {/* Form Container */}
                <div className="flex-1 min-w-0">
                    <form onSubmit={handlePost} className="flex flex-col gap-4">
                        {/* Text / PR Inputs */}
                        <div className="bg-black/40 rounded-2xl p-4 border border-white/5 focus-within:border-brand-red/30 transition-all shadow-inner">
                            {postType === 'standard' ? (
                                <MentionInput
                                    as="textarea"
                                    value={content}
                                    onChange={setContent}
                                    placeholder="¿Qué estás entrenando hoy?"
                                    className="w-full bg-transparent text-white placeholder:text-gray-500 text-sm md:text-lg resize-none focus:outline-none min-h-[80px] md:min-h-[100px]"
                                />
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ejercicio</label>
                                        <input
                                            type="text"
                                            placeholder="p.ej. Back Squat"
                                            value={exercise}
                                            onChange={(e) => setExercise(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 text-sm italic font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Peso (kg)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="p.ej. 140"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-brand-red font-black focus:outline-none focus:border-brand-red/50 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Disciplina / Comentario</label>
                                        <input
                                            type="text"
                                            placeholder="p.ej. Cross Training / Sede Norte"
                                            value={sport}
                                            onChange={(e) => setSport(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-red/50 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Media Preview */}
                        {preview && (
                            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner group transition-all w-full">
                                <div className="flex items-center justify-center bg-black/20 min-h-[120px] max-h-[300px]">
                                    {isPosting && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3">
                                            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-red transition-all duration-300"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                            <span className="text-xl font-black text-white italic">{uploadProgress}%</span>
                                        </div>
                                    )}
                                    {fileInputRef.current?.files?.[0]?.type.startsWith('video/') || (pendingFile?.type.startsWith('video/')) ? (
                                        <video src={preview} controls className="max-h-[300px] w-full object-contain" />
                                    ) : (
                                        <img src={preview} alt="Preview" className="max-h-[300px] w-full object-contain" />
                                    )}
                                </div>

                                {/* Remove Button */}
                                {!isPosting && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPreview(null);
                                            setDuration(null);
                                            setPendingFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                        className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-brand-red transition-all z-10 backdrop-blur-md border border-white/10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {/* Trimming Indicator / Button */}
                                {duration !== null && duration > 60 && !isPosting && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-red/95 to-brand-red/80 text-white px-4 py-3 flex items-center justify-between backdrop-blur-md">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase tracking-widest leading-none mb-0.5 text-white/90">Demasiado Largo</span>
                                                <span className="text-xs font-bold italic">{Math.round(duration)}s</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setTrimStart(0);
                                                setTrimmerVideoUrl(preview);
                                                setIsVideoTrimming(true);
                                            }}
                                            className="px-3 py-1.5 bg-white text-brand-red rounded-lg font-black uppercase text-[10px] shadow-xl hover:scale-105 active:scale-95 transition-all"
                                        >
                                            RECORTAR
                                        </button>
                                    </div>
                                )}

                                {/* Manual Trim Button */}
                                {duration !== null && duration <= 60 && !isPosting && (fileInputRef.current?.files?.[0]?.type.startsWith('video/') || pendingFile?.type.startsWith('video/')) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTrimStart(0);
                                            setTrimmerVideoUrl(preview);
                                            setIsVideoTrimming(true);
                                        }}
                                        className="absolute bottom-3 right-3 bg-black/60 hover:bg-brand-red text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 transition-all flex items-center gap-2"
                                    >
                                        <Activity className="w-3 h-3" />
                                        Recortar
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Actions Bar */}
                        <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                {/* Media Upload */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-3 text-gray-400 hover:text-brand-red hover:bg-brand-red/5 rounded-2xl transition-all border border-transparent hover:border-brand-red/20 group flex items-center gap-2"
                                    title="Añadir Multimedia"
                                >
                                    <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Multimedia</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                {/* Emoji Picker */}
                                {postType === 'standard' && (
                                    <div ref={emojiPickerRef} className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`p-3 rounded-2xl transition-all border border-transparent flex items-center gap-2 group ${showEmojiPicker ? 'text-yellow-400 bg-yellow-400/5 border-yellow-400/20' : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/5 hover:border-yellow-400/20'}`}
                                            title="Añadir Emoji"
                                        >
                                            <Smile className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </button>
                                        {showEmojiPicker && (
                                            <div className="absolute top-14 left-0 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                                                <div className="relative">
                                                    <div className="absolute -top-2 left-4 w-4 h-4 bg-[#1e1e1e] rotate-45 border-l border-t border-white/10" />
                                                    <EmojiPicker
                                                        theme={Theme.DARK}
                                                        onEmojiClick={onEmojiClick}
                                                        width={320}
                                                        height={400}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Music Picker */}
                                <MusicPicker
                                    onSelect={setSelectedTrack}
                                    selectedTrackId={selectedTrack?.id || null}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isPosting || (postType === 'standard' && !content.trim() && !preview) || (postType === 'pr' && (!exercise || !weight))}
                                className="bg-brand-red text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-glow-sm hover:shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-3 ml-auto"
                            >
                                {isPosting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Publicando</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>{postType === 'pr' ? 'Publicar PR' : 'Publicar'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            {/* Video Trimmer Modal */}
            {isVideoTrimming && trimmerVideoUrl && (
                <div className="fixed inset-0 z-[500] bg-black/98 flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto">
                    <div className="bg-brand-gray border border-white/10 w-full max-w-md rounded-[40px] p-6 md:p-10 shadow-2xl relative my-auto">
                        <button
                            onClick={() => { setIsVideoTrimming(false); setTrimmerVideoUrl(null); }}
                            className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>

                        <div className="mb-6 md:mb-8 text-center px-4">
                            <h3 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter">Recortar Video</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tu video dura {Math.round(videoDuration)}s - Recorta a máximo 60s</p>
                        </div>

                        <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border border-white/10 mb-6 md:mb-8 shadow-inner">
                            <video
                                ref={trimmerVideoRef}
                                src={trimmerVideoUrl}
                                className="w-full h-full object-contain"
                                loop
                                muted
                                playsInline
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Punto de inicio</label>
                                    <span className="text-xl font-black text-brand-red italic tracking-tighter">{Math.floor(trimStart)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={Math.max(0, videoDuration - 60)}
                                    step="0.5"
                                    value={trimStart}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setTrimStart(val);
                                        if (trimmerVideoRef.current) trimmerVideoRef.current.currentTime = val;
                                    }}
                                    className="w-full accent-brand-red h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[8px] font-bold text-gray-600 uppercase tracking-widest px-1">
                                    <span>Inicio</span>
                                    <span>Fin - 60s</span>
                                </div>
                            </div>

                            <button
                                onClick={processTrimming}
                                disabled={isTrimmingLoading}
                                className="w-full bg-brand-red text-white py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-glow transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden"
                            >
                                {isTrimmingLoading ? (
                                    <>
                                        <div className="absolute inset-0 bg-white/10" style={{ width: `${trimProgress}%`, transition: 'width 0.3s ease' }} />
                                        <div className="flex items-center gap-3 relative z-10">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Procesando {Math.round(trimProgress)}%
                                        </div>
                                    </>
                                ) : (
                                    <><Activity className="w-4 h-4 md:w-5 md:h-5" /> Confirmar Recorte</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
