"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Loader2, X, Smile, Sparkles } from "lucide-react";
import { createUserPost, createPRPost, updatePost, createWodPost } from "./community/actions";
import MentionInput from "@/components/MentionInput";
import { createClient } from "@/utils/supabase/client";
import { Trophy, Activity, AlertCircle, Dumbbell } from "lucide-react";
import Image from "next/image";
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import MusicPicker from "./MusicPicker";
import { MusicTrack } from "./music-data";
import WodCreator, { WodBlock, WodSummary } from "@/components/training/WodCreator";
import { useLanguage } from "@/app/LanguageContext";
import VideoEditor from "@/components/video/VideoEditor";
import clsx from "clsx";

export default function CreatePost({ currentUser, onSuccess, initialPostType, initialData, editingPostId }: { currentUser: any, onSuccess?: () => void, initialPostType?: 'standard' | 'pr' | 'wod', initialData?: any, editingPostId?: string }) {
    const { language } = useLanguage();
    const [content, setContent] = useState(initialData?.caption || initialData?.content || "");
    const [isPosting, setIsPosting] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [postType, setPostType] = useState<'standard' | 'pr' | 'wod'>(initialPostType || 'standard');
    const [wodData, setWodData] = useState<{ title: string, blocks: WodBlock[], summary: WodSummary, originalWodPostId?: string } | null>(
        initialPostType === 'wod' && initialData ? initialData : null
    );
    const [originalWodPostId, setOriginalWodPostId] = useState<string | null>(
        initialPostType === 'wod' && (initialData?.original_wod_post_id || initialData?.postId) 
            ? (initialData.original_wod_post_id || initialData.postId) 
            : null
    );
    const [exercise, setExercise] = useState("");
    const [weight, setWeight] = useState("");
    const [sport, setSport] = useState("Cross Training");
    const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
    const [scheduledFor, setScheduledFor] = useState<string>(initialData?.date || new Date().toISOString().split('T')[0]);
    const [duration, setDuration] = useState<number | null>(null);
    const [showWodFooter, setShowWodFooter] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isVideoEditing, setIsVideoEditing] = useState(false);
    const [editorVideoFile, setEditorVideoFile] = useState<File | null>(null);
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
        if (postType === 'wod' && !wodData) return;

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
                const fileExt = file.name.split('.').pop();
                const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

                setUploadProgress(30);
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                    .from('posts')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabaseClient.storage
                    .from('posts')
                    .getPublicUrl(fileName);

                mediaUrl = publicUrl;
                mediaType = file.type.startsWith('video/') ? 'video' : 'image';
                setUploadProgress(80);
            } catch (error) {
                console.error("Direct upload failed:", error);

                if (file.size > 200 * 1024 * 1024) {
                    alert("Error al subir el archivo directamente y es demasiado grande (>200MB).");
                    setIsPosting(false);
                    setUploadProgress(0);
                    return;
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
            } else if (postType === 'wod' && wodData) {
                const finalWodData = {
                    ...wodData,
                    media_url: mediaUrl || (wodData as any).media_url || null,
                    original_wod_post_id: originalWodPostId
                };
                const finalCaption = showWodFooter && content.trim() ? content.trim() : '';

                if (editingPostId) {
                    res = await updatePost(editingPostId, finalCaption, JSON.stringify(finalWodData), scheduledFor);
                } else {
                    formData.append("content", finalCaption);
                    formData.append("wod_data", JSON.stringify(finalWodData));
                    formData.append("media_type", "wod");
                    if (scheduledFor) formData.append("scheduled_for", scheduledFor);
                    res = await createWodPost(formData);
                }
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
                setWodData(null);
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
                        // Auto-open editor for videos longer than 1 minute to suggest trimming
                        setEditorVideoFile(file);
                        setIsVideoEditing(true);
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

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setContent((prev: string) => prev + emojiData.emoji);
    };

    return (
        <div className="bg-brand-gray/30 border border-white/10 rounded-[24px] md:rounded-[28px] p-3 md:p-6 backdrop-blur-md mb-8 relative z-10 w-full overflow-hidden">
            {/* Post Type Selector */}
            <div className="flex gap-2 mb-4 md:mb-6 overflow-x-auto no-scrollbar pb-2">
                <button
                    type="button"
                    onClick={() => setPostType('standard')}
                    className={clsx(
                        "flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0",
                        postType === 'standard' ? "bg-white/10 border-white/20 text-white shadow-inner" : "border-transparent text-gray-500 hover:text-gray-300"
                    )}
                >
                    <Activity className="w-3.5 h-3.5 text-brand-red" />
                    {language === 'es' ? 'ACTUALIZACIÓN' : 'UPDATE'}
                </button>
                <button
                    type="button"
                    onClick={() => setPostType('pr')}
                    className={clsx(
                        "flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0",
                        postType === 'pr' ? "bg-brand-red/10 border-brand-red/30 text-brand-red shadow-[0_0_15px_rgba(220,38,38,0.1)]" : "border-transparent text-gray-500 hover:text-gray-300"
                    )}
                >
                    <Trophy className="w-3.5 h-3.5" />
                    {language === 'es' ? 'NUEVO PR' : 'NEW PR'}
                </button>
                <button
                    type="button"
                    onClick={() => setPostType('wod')}
                    className={clsx(
                        "flex items-center gap-1.5 px-3 md:px-6 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all whitespace-nowrap shrink-0",
                        postType === 'wod' ? "bg-brand-blue/10 border-brand-blue/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "border-transparent text-gray-500 hover:text-gray-300"
                    )}
                >
                    <Dumbbell className="w-3.5 h-3.5" />
                    {language === 'es' ? 'WOD' : 'WORKOUT'}
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
                            ) : postType === 'wod' ? (
                                <div className="space-y-6">
                                    {/* Footer Toggle */}
                                    <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Descripción / Pie de página</span>
                                            <span className="text-[9px] text-gray-600 font-medium mt-0.5">{showWodFooter ? 'Se mostrará texto bajo el WOD' : 'Sin descripción • WOD limpio'}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowWodFooter(prev => !prev)}
                                            className={clsx(
                                                "relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none border",
                                                showWodFooter
                                                    ? "bg-brand-red border-brand-red shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                                                    : "bg-white/5 border-white/10"
                                            )}
                                        >
                                            <span className={clsx(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300",
                                                showWodFooter ? "left-6" : "left-0.5"
                                            )} />
                                        </button>
                                    </div>

                                    {/* Caption Textarea - Only if footer enabled */}
                                    {showWodFooter && (
                                        <MentionInput
                                            as="textarea"
                                            value={content}
                                            onChange={setContent}
                                            placeholder="Escribe una descripción o motivación para este WOD..."
                                            className="w-full bg-transparent text-white placeholder:text-gray-500 text-sm md:text-lg resize-none focus:outline-none min-h-[60px]"
                                        />
                                    )}

                                    <div className="border-t border-white/5 pt-6">
                                        <WodCreator
                                            onUpdate={(data) => {
                                                setWodData(data);
                                                if (data.date) setScheduledFor(data.date);
                                            }}
                                            initialData={wodData ? { ...wodData, date: scheduledFor } : undefined}
                                        />
                                    </div>
                                </div>
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
                                {/* Edit Button */}
                                {!isPosting && (fileInputRef.current?.files?.[0]?.type.startsWith('video/') || pendingFile?.type.startsWith('video/')) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditorVideoFile(pendingFile || fileInputRef.current?.files?.[0] || null);
                                            setIsVideoEditing(true);
                                        }}
                                        className="absolute bottom-3 right-3 bg-brand-red text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-glow transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        EDITAR VIDEO PRO
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
                                disabled={isPosting || (postType === 'standard' && !content.trim() && !preview) || (postType === 'pr' && (!exercise || !weight)) || (postType === 'wod' && !wodData?.title)}
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
            {/* Video Editor Modal */}
            {isVideoEditing && editorVideoFile && (
                <VideoEditor
                    videoFile={editorVideoFile}
                    onSave={(editedFile, dur) => {
                        const url = URL.createObjectURL(editedFile);
                        setPreview(url);
                        setDuration(dur);
                        setPendingFile(editedFile);
                        setIsVideoEditing(false);
                        setEditorVideoFile(null);
                    }}
                    onCancel={() => {
                        setIsVideoEditing(false);
                        setEditorVideoFile(null);
                    }}
                />
            )}
        </div>
    );
}
