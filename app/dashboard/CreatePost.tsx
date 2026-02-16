
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
import { useUploads } from "./UploadContext";

export default function CreatePost({ currentUser, onSuccess }: { currentUser: any, onSuccess?: () => void }) {
    const [content, setContent] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'pr'>('standard');
    const [exercise, setExercise] = useState("");
    const [weight, setWeight] = useState("");
    const [sport, setSport] = useState("Cross Training");
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
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
    const { startUpload } = useUploads();

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
        let file = pendingFile || fileInputRef.current?.files?.[0];

        if (postType === 'standard' && !content.trim() && !file) return;
        if (postType === 'pr' && (!exercise || !weight)) return;

        // Mandar a segundo plano
        startUpload({
            content,
            file,
            postType,
            exercise,
            weight,
            sport,
            selectedTrack,
            currentUser,
            preview
        });

        // Limpiar y cerrar inmediatamente
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

        // Cerrar modal
        onSuccess?.();
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

                    if (dur > 60 || file.size > 48 * 1024 * 1024) {
                        // Auto-open trimmer for videos longer than 1 minute OR > 48MB (to use compression)
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
        if (!trimmerVideoRef.current || !trimmerVideoUrl) {
            alert("Error: No se encontró el video.");
            return;
        }

        const video = trimmerVideoRef.current;
        setIsTrimmingLoading(true);
        setTrimProgress(5);

        try {
            // 1. Asegurar que el video esté listo y posicionado
            if (video.readyState < 2) {
                await new Promise(r => {
                    const check = () => video.readyState >= 2 ? r(true) : setTimeout(check, 100);
                    check();
                });
            }

            video.pause();
            video.currentTime = trimStart;
            video.muted = true;

            await new Promise(r => {
                video.onseeked = () => r(true);
                setTimeout(r, 2000);
            });

            // 2. DETECCIÓN DE SOPORTE E IMPLEMENTACIÓN CANVAS (Bridge para iOS)
            // iOS Chrome/Safari NO soporta video.captureStream(), así que usamos un Canvas como puente.
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 640;

            const stream = canvas.captureStream ? canvas.captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : null;

            if (!stream) {
                throw new Error("Tu navegador no permite la captura de video necesaria para el recorte.");
            }

            // 3. CONFIGURACIÓN GRABADORA (Codec compatible iOS)
            const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4' : 'video/webm';
            const recorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 1500000 // Reducimos un poco para asegurar fluidez en móvil
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            const recordingDuration = Math.min(60, video.duration - trimStart);
            let animationFrameId: number;

            // Función para dibujar los frames al canvas
            const drawFrame = () => {
                if (ctx && !video.paused && !video.ended) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    animationFrameId = requestAnimationFrame(drawFrame);
                }
            };

            // 4. INICIO DE GRABACIÓN
            recorder.start();
            await video.play();
            drawFrame(); // Iniciar loop de dibujo

            const startTime = Date.now();
            const updateInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                setTrimProgress(Math.min(99, (elapsed / recordingDuration) * 100));
                if (elapsed >= recordingDuration) stopTrimming();
            }, 500);

            const stopTrimming = () => {
                clearInterval(updateInterval);
                cancelAnimationFrame(animationFrameId);
                if (recorder.state === 'recording') {
                    recorder.stop();
                    video.pause();
                }
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: mimeType });
                if (blob.size < 5000) { // Un video real debe pesar más
                    alert("No se pudo procesar el video correctamente. Por favor intenta un recorte más largo.");
                    setIsTrimmingLoading(false);
                    return;
                }

                const file = new File([blob], "trimmed.mp4", { type: mimeType });
                const url = URL.createObjectURL(file);
                setPreview(url);
                setPendingFile(file);
                setDuration(recordingDuration);

                // Cerrar modal
                setIsVideoTrimming(false);
                setTrimmerVideoUrl(null);
                setIsTrimmingLoading(false);
                setTrimProgress(0);
            };

            // Seguridad por si falla el evento 'ended'
            setTimeout(stopTrimming, (recordingDuration + 1) * 1000);

        } catch (err: any) {
            console.error("Trimmer failure:", err);
            alert("Error: " + err.message);
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
                                    {/* Subida en segundo plano activa manejada por UploadContext */}
                                    {fileInputRef.current?.files?.[0]?.type.startsWith('video/') || (pendingFile?.type.startsWith('video/')) ? (
                                        <video src={preview} controls className="max-h-[300px] w-full object-contain" />
                                    ) : (
                                        <img src={preview} alt="Preview" className="max-h-[300px] w-full object-contain" />
                                    )}
                                </div>

                                {/* Remove Button */}
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

                                {/* Trimming Indicator / Button */}
                                {duration !== null && duration > 60 && (
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
                                {duration !== null && duration <= 60 && (fileInputRef.current?.files?.[0]?.type.startsWith('video/') || pendingFile?.type.startsWith('video/')) && (
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
                                disabled={(postType === 'standard' && !content.trim() && !preview) || (postType === 'pr' && (!exercise || !weight))}
                                className="bg-brand-red text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-glow-sm hover:shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-3 ml-auto"
                            >
                                <Send className="w-4 h-4" />
                                <span>{postType === 'pr' ? 'Publicar PR' : 'Publicar'}</span>
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
                                autoPlay
                            />
                            {/* Visual feedback when loading or seeking */}
                            {isTrimmingLoading && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                                    <div className="w-16 h-16 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-white font-black italic text-xl">{Math.round(trimProgress)}%</span>
                                        <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">Procesando...</span>
                                    </div>
                                </div>
                            )}
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
