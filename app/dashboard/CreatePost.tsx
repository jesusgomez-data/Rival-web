"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Loader2, X, Smile, Trophy, Activity, AlertCircle } from "lucide-react";
import MentionInput from "@/components/MentionInput";
import Image from "next/image";
import MusicPicker from "./MusicPicker";
import { MusicTrack } from "./music-data";
import { useUploads } from "./UploadContext";
import dynamic from 'next/dynamic';

// Import correctly for SSR safety
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export default function CreatePost({ currentUser, onSuccess }: { currentUser: any, onSuccess?: () => void }) {
    const [mounted, setMounted] = useState(false);
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
    const [trimError, setTrimError] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [trimProgress, setTrimProgress] = useState(0);

    const trimmerVideoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const { startUpload } = useUploads();

    // Prevent hydration issues
    useEffect(() => {
        setMounted(true);
        function handleClickOutside(event: MouseEvent) {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!mounted) return null;

    const processTrimming = async () => {
        if (!trimmerVideoRef.current || !trimmerVideoUrl) return;

        const video = trimmerVideoRef.current;
        setIsTrimmingLoading(true);
        setTrimProgress(1);
        setTrimError(null);

        try {
            video.pause();
            video.currentTime = trimStart;
            video.muted = true;

            await new Promise(r => {
                const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(true); };
                video.addEventListener('seeked', onSeeked);
                setTimeout(onSeeked, 1500);
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 640;

            const streamFn = (canvas as any).captureStream || (canvas as any).webkitCaptureStream || (canvas as any).mozCaptureStream;
            if (!streamFn) throw new Error("Captura no soportada.");

            const stream = streamFn.call(canvas, 30);
            const recorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm',
                videoBitsPerSecond: 1000000
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);

            const recDuration = Math.min(60, video.duration - trimStart);
            let frameReq: number;

            const draw = () => {
                if (ctx && video.readyState >= 2) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    frameReq = requestAnimationFrame(draw);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: recorder.mimeType });
                if (blob.size < 2000) {
                    setTrimError("Error de captura");
                } else {
                    const file = new File([blob], "trimmed.mp4", { type: recorder.mimeType });
                    setPreview(URL.createObjectURL(file));
                    setPendingFile(file);
                    setDuration(recDuration);
                    setIsVideoTrimming(false);
                    setTrimmerVideoUrl(null);
                }
                setIsTrimmingLoading(false);
                setTrimProgress(0);
            };

            recorder.start();
            try {
                await video.play();
                draw();
                const startT = Date.now();
                const interval = setInterval(() => {
                    const elap = (Date.now() - startT) / 1000;
                    setTrimProgress(Math.min(99, (elap / recDuration) * 100));
                    if (elap >= recDuration) {
                        clearInterval(interval);
                        cancelAnimationFrame(frameReq);
                        if (recorder.state === 'recording') recorder.stop();
                        video.pause();
                    }
                }, 500);
            } catch (e) {
                throw new Error("Toca el video para iniciar (iPhone)");
            }
        } catch (err: any) {
            setTrimError(err.message);
            setIsTrimmingLoading(false);
        }
    };

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        let file = pendingFile || fileInputRef.current?.files?.[0];
        if (postType === 'standard' && !content.trim() && !file) return;
        if (postType === 'pr' && (!exercise || !weight)) return;

        // Corrected to match UploadContext structure
        startUpload({
            postType,
            content,
            file,
            exercise,
            weight,
            sport,
            selectedTrack,
            currentUser,
            preview
        });

        setContent(""); setExercise(""); setWeight(""); setPreview(null);
        setDuration(null); setPendingFile(null); setShowEmojiPicker(false);
        setPostType('standard'); setSelectedTrack(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onSuccess?.();
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('video/')) {
                const docVideo = document.createElement('video');
                docVideo.preload = 'metadata';
                docVideo.onloadedmetadata = () => {
                    const dur = docVideo.duration;
                    setVideoDuration(dur);
                    setDuration(dur);
                    if (dur > 60 || file.size > 48 * 1024 * 1024) {
                        setTrimStart(0);
                        setPendingFile(file);
                        setTrimmerVideoUrl(URL.createObjectURL(file));
                        setIsVideoTrimming(true);
                    } else {
                        setPreview(URL.createObjectURL(file));
                    }
                };
                docVideo.src = URL.createObjectURL(file);
            } else {
                setPreview(URL.createObjectURL(file));
                setDuration(null);
            }
        }
    };

    return (
        <div className="bg-brand-gray/30 border border-white/10 rounded-[28px] p-4 md:p-6 backdrop-blur-md mb-8 relative z-10 w-full animate-in fade-in duration-500">
            <div className="flex gap-2 mb-4 md:mb-6">
                <button type="button" onClick={() => setPostType('standard')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${postType === 'standard' ? 'bg-white/10 border-white/20 text-white shadow-inner' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><Activity className="w-3.5 h-3.5 text-brand-red" />Actualización</button>
                <button type="button" onClick={() => setPostType('pr')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border ${postType === 'pr' ? 'bg-white/10 border-white/20 text-white shadow-inner' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><Trophy className="w-3.5 h-3.5 text-brand-yellow" />Nuevo PR</button>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <form onSubmit={handlePost} className="space-y-4">
                        {postType === 'pr' && (
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                <input type="text" placeholder="EJERCICIO" value={exercise} onChange={(e) => setExercise(e.target.value.toUpperCase())} className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all uppercase" />
                                <input type="text" placeholder="PESO (KG/LBS)" value={weight} onChange={(e) => setWeight(e.target.value.toUpperCase())} className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[10px] font-bold text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all uppercase" />
                            </div>
                        )}
                        <div className="relative group">
                            <MentionInput value={content} onChange={setContent} placeholder={postType === 'pr' ? "¿Cómo te sentiste en este levantamiento?" : currentUser ? `¿Qué hay de nuevo, ${currentUser.username || 'Atleta'}?` : "¿Qué hay de nuevo?"} className="w-full bg-black/20 border border-white/5 rounded-[24px] p-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-red/30 transition-all resize-none min-h-[120px] shadow-inner" />
                            <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                <div className="relative" ref={emojiPickerRef}>
                                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-500 hover:text-brand-red transition-colors"><Smile className="w-5 h-5" /></button>
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-full right-0 mb-4 z-[100] scale-75 md:scale-100 origin-bottom-right">
                                            <EmojiPicker
                                                theme={"dark" as any}
                                                onEmojiClick={(ed) => setContent(p => p + ed.emoji)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {preview && (
                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group animate-in zoom-in-95">
                                {preview.startsWith('data:image') || preview.includes('image') ? (
                                    <Image src={preview} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <video src={preview} className="w-full h-full object-cover" controls playsInline />
                                )}
                                <button type="button" onClick={() => { setPreview(null); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={handleFileChange} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"><ImageIcon className="w-4 h-4 text-brand-red" /> Multimedia</button>
                                <MusicPicker onSelect={setSelectedTrack} selectedTrackId={selectedTrack?.id || null} />
                            </div>
                            <button type="submit" disabled={(postType === 'standard' && !content.trim() && !preview) || (postType === 'pr' && (!exercise || !weight))} className="bg-brand-red text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-glow-sm hover:shadow-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3 ml-auto"><Send className="w-4 h-4" /><span>{postType === 'pr' ? 'Publicar PR' : 'Publicar'}</span></button>
                        </div>
                    </form>
                </div>
            </div>

            {isVideoTrimming && trimmerVideoUrl && (
                <div className="fixed inset-0 z-[500] bg-black/98 flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-brand-gray border border-white/10 w-full max-w-md rounded-[40px] p-6 shadow-2xl relative">
                        <button onClick={() => { setIsVideoTrimming(false); setTrimmerVideoUrl(null); }} className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 p-2 rounded-full"><X className="w-5 h-5" /></button>
                        <div className="mb-6 text-center">
                            <h3 className="text-xl font-black text-white italic uppercase">Recortar Video</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Tu video dura {Math.round(videoDuration)}s - Recorta a máximo 60s</p>
                        </div>
                        <div className="relative aspect-square bg-black rounded-3xl overflow-hidden border border-white/10 mb-6">
                            <video ref={trimmerVideoRef} src={trimmerVideoUrl} className="w-full h-full object-contain" loop muted playsInline autoPlay />
                            {trimError && (
                                <div className="absolute inset-x-4 top-4 z-50 bg-red-500/90 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                    <p className="text-white text-[10px] font-black uppercase text-center mb-1">¡Atención!</p>
                                    <p className="text-white text-[11px] font-bold text-center leading-tight">{trimError}</p>
                                    <button onClick={() => setTrimError(null)} className="mt-3 w-full py-2 bg-white/20 rounded-xl text-[9px] font-black text-white uppercase">Entendido</button>
                                </div>
                            )}
                            {isTrimmingLoading && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                                    <div className="w-16 h-16 border-4 border-brand-red/20 border-t-brand-red rounded-full animate-spin" />
                                    <span className="text-white font-black italic text-xl">{Math.round(trimProgress)}%</span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end px-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase">Punto de inicio</label>
                                    <span className="text-xl font-black text-brand-red italic tracking-tighter">{Math.floor(trimStart)}s</span>
                                </div>
                                <input type="range" min="0" max={Math.max(0, videoDuration - 60)} step="0.5" value={trimStart} onChange={(e) => { const val = parseFloat(e.target.value); setTrimStart(val); if (trimmerVideoRef.current) trimmerVideoRef.current.currentTime = val; }} className="w-full accent-brand-red h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" />
                            </div>
                            <button onClick={processTrimming} disabled={isTrimmingLoading} className="w-full bg-brand-red text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow transition-all hover:scale-[1.02] flex items-center justify-center gap-3 relative overflow-hidden">
                                {isTrimmingLoading ? (
                                    <><div className="absolute inset-0 bg-white/10" style={{ width: `${trimProgress}%` }} /><Loader2 className="w-5 h-5 animate-spin relative z-10" />Procesando {Math.round(trimProgress)}%</>
                                ) : <><Activity className="w-4 h-4" /> Confirmar Recorte</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
